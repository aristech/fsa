'use client';

import type { BoxProps } from '@mui/material/Box';

import useSWR from 'swr';
import { useBoolean, usePopover } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import ListItemButton from '@mui/material/ListItemButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { copyTaskShareUrl } from 'src/utils/task-sharing';

import { useTranslate } from 'src/locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { RealtimeIndicator } from 'src/components/realtime-indicator';
// Status dropdown has been removed; statuses remain static and used elsewhere

// ----------------------------------------------------------------------

type Props = BoxProps & {
  taskName: string;
  taskStatus: string;
  taskId: string;
  workOrderId?: string;
  workOrderNumber?: string;
  workOrderTitle?: string;
  clientId?: string;
  onDelete: () => void;
  onCloseDetails: () => void;
  onChangeWorkOrder?: (workOrder: { id: string; number?: string; label: string } | null) => void;
  // onChangeStatus removed from toolbar per latest requirements
  completeStatus?: boolean;
  onToggleComplete?: (newValue: boolean) => void;
  onCreateReport?: () => void;
  isPrivate?: boolean;
  isCreator?: boolean;
  onTogglePrivate?: () => void;
};

export function KanbanDetailsToolbar({
  sx,
  taskName,
  taskId,
  onDelete,
  taskStatus,
  workOrderId,
  workOrderNumber,
  workOrderTitle,
  clientId,
  onCloseDetails,
  onChangeWorkOrder,
  completeStatus,
  onToggleComplete,
  onCreateReport,
  isPrivate = false,
  isCreator = false,
  onTogglePrivate,
  ...other
}: Props) {
  const smUp = useMediaQuery((theme) => theme.breakpoints.up('sm'));
  const { t } = useTranslate('common');
  const actionsMenu = usePopover();
  const workOrderSearchDialog = useBoolean();

  const confirmDialog = useBoolean();

  const [completed, setCompleted] = useState<boolean>(!!completeStatus);
  const [isUpdatingWorkOrder, setIsUpdatingWorkOrder] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleShareTask = async () => {
    await copyTaskShareUrl({ taskId });
    actionsMenu.onClose();
  };
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<{
    id: string;
    number?: string;
    title?: string;
    label: string;
  } | null>(
    workOrderId
      ? {
          id: workOrderId,
          number: workOrderNumber,
          title: workOrderTitle,
          label: workOrderTitle || workOrderNumber || workOrderId,
        }
      : null
  );

  // Server-side search for work orders
  const workOrderSearchUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    params.append('limit', '50'); // Fetch more results for search
    return `${endpoints.fsa.workOrders.list}?${params.toString()}`;
  }, [debouncedSearch]);

  const axiosFetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);
  const { data: workOrdersResp, isLoading: isLoadingWorkOrders } = useSWR(
    workOrderSearchDialog.value ? workOrderSearchUrl : null,
    axiosFetcher
  );

  // Memoize work orders array to prevent unnecessary re-renders
  const workOrders = useMemo(
    () => workOrdersResp?.data?.workOrders || [],
    [workOrdersResp?.data?.workOrders]
  );

  // When work orders load, hydrate selected with title if available
  useEffect(() => {
    if (selectedWorkOrder && workOrders.length) {
      const match = workOrders.find((wo: any) => wo._id === selectedWorkOrder.id);
      if (match) {
        const newLabel = match.title || match.number || match._id;
        const newTitle = match.title;
        if (newLabel !== selectedWorkOrder.label || newTitle !== selectedWorkOrder.title) {
          setSelectedWorkOrder({
            id: match._id,
            number: match.number,
            title: newTitle,
            label: newLabel,
          });
        }
      }
    }
  }, [selectedWorkOrder, workOrders]);

  // Fetch clients for display purposes
  const { data: clientsData } = useSWR(endpoints.fsa.clients.list, async (url) => {
    const response = await axiosInstance.get(url, { params: { limit: 100 } });
    return response.data;
  });
  const clients = useMemo(
    () => (Array.isArray(clientsData?.data?.clients) ? clientsData.data.clients : []),
    [clientsData?.data?.clients]
  );

  // Handler for work order selection with client auto-update
  const handleSelectWorkOrder = useCallback(
    async (
      workOrder: {
        id: string;
        number?: string;
        title?: string;
        label: string;
        clientId?: string;
        client?: any;
      } | null
    ) => {
      if (isUpdatingWorkOrder) return;

      try {
        setIsUpdatingWorkOrder(true);

        if (!workOrder) {
          // Clear work order
          const taskData: any = {
            id: taskId,
            workOrderId: undefined,
            workOrderNumber: undefined,
            workOrderTitle: undefined,
          };

          await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, { taskData });

          setSelectedWorkOrder(null);
          onChangeWorkOrder?.(null);
          workOrderSearchDialog.onFalse();

          toast.success(t('workOrderCleared', { defaultValue: 'Work order cleared' }));
          return;
        }

        // Fetch full work order details to get client info
        let workOrderClientId = workOrder.clientId || workOrder.client?._id;
        let workOrderClientName = workOrder.client?.name;
        let workOrderClientCompany = workOrder.client?.company;

        // If client data not in work order object, fetch it
        if (!workOrderClientId) {
          try {
            const woDetails = await axiosInstance.get(
              endpoints.fsa.workOrders.details(workOrder.id)
            );
            const woData = woDetails?.data?.data;
            workOrderClientId = woData?.clientId || woData?.client?._id;
            workOrderClientName = woData?.clientName || woData?.client?.name;
            workOrderClientCompany = woData?.clientCompany || woData?.client?.company;
          } catch (err) {
            console.warn('Failed to fetch work order details:', err);
          }
        }

        // Handle case where clientId is an object (populated client data)
        if (
          workOrderClientId &&
          typeof workOrderClientId === 'object' &&
          (workOrderClientId as any)._id
        ) {
          workOrderClientId = (workOrderClientId as any)._id;
        }

        // Build task update data
        const taskData: any = {
          id: taskId,
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.number,
          workOrderTitle: workOrder.label,
        };

        // Check if we need to update the client
        const needsClientUpdate = workOrderClientId && workOrderClientId !== clientId;

        if (needsClientUpdate) {
          taskData.clientId = workOrderClientId;
          if (workOrderClientName) taskData.clientName = workOrderClientName;
          if (workOrderClientCompany) taskData.clientCompany = workOrderClientCompany;
        }

        // Single API call with all updates
        await axiosInstance.post(`${endpoints.kanban}?endpoint=update-task`, { taskData });

        // Update local state
        setSelectedWorkOrder(workOrder);
        onChangeWorkOrder?.(workOrder);
        workOrderSearchDialog.onFalse();

        // Show appropriate success message
        if (needsClientUpdate) {
          const client = clients.find((c: any) => c._id === workOrderClientId);
          const clientDisplayName = client?.name || workOrderClientName || 'new client';
          toast.success(
            t('workOrderAndClientUpdated', {
              defaultValue: `Work order updated. Client automatically changed to ${clientDisplayName}`,
            })
          );
        } else {
          toast.success(t('workOrderUpdated', { defaultValue: 'Work order updated' }));
        }
      } catch (error) {
        console.error('Failed to update work order:', error);
        toast.error(t('failedToUpdateWorkOrder', { defaultValue: 'Failed to update work order' }));
      } finally {
        setIsUpdatingWorkOrder(false);
      }
    },
    [taskId, isUpdatingWorkOrder, clientId, clients, t, onChangeWorkOrder, workOrderSearchDialog]
  );

  // Handler for clicking a work order in the list
  const handleWorkOrderClick = useCallback(
    (workOrder: any) => {
      const woLabel = workOrder.title || workOrder.number || workOrder._id;
      handleSelectWorkOrder({
        id: workOrder._id,
        number: workOrder.number,
        title: workOrder.title,
        label: woLabel,
        clientId: workOrder.clientId,
        client: workOrder.client,
      });
    },
    [handleSelectWorkOrder]
  );

  const renderActionsMenu = () => (
    <Menu
      open={actionsMenu.open}
      anchorEl={actionsMenu.anchorEl}
      onClose={actionsMenu.onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <MenuItem onClick={handleShareTask}>
        <ListItemIcon>
          <Iconify icon="solar:share-bold" />
        </ListItemIcon>
        <ListItemText primary={t('share', { defaultValue: 'Share' })} />
      </MenuItem>

      <MenuItem
        onClick={() => {
          actionsMenu.onClose();
          workOrderSearchDialog.onTrue();
        }}
      >
        <ListItemIcon>
          <Iconify icon="solar:document-bold" />
        </ListItemIcon>
        <ListItemText primary={t('changeWorkOrder', { defaultValue: 'Change Work Order' })} />
      </MenuItem>

      <MenuItem
        onClick={() => {
          actionsMenu.onClose();
          onCreateReport?.();
        }}
      >
        <ListItemIcon>
          <Iconify icon="eva:file-text-fill" />
        </ListItemIcon>
        <ListItemText primary={t('createReport', { defaultValue: 'Create Report' })} />
      </MenuItem>

      <MenuItem
        onClick={() => {
          actionsMenu.onClose();
          confirmDialog.onTrue();
        }}
        sx={{ color: 'error.main' }}
      >
        <ListItemIcon>
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText primary={t('delete', { defaultValue: 'Delete' })} />
      </MenuItem>
    </Menu>
  );

  const renderWorkOrderSearchDialog = () => (
    <Dialog
      open={workOrderSearchDialog.value}
      onClose={() => {
        setSearchValue('');
        workOrderSearchDialog.onFalse();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:document-bold" width={24} />
          {t('searchWorkOrders', { defaultValue: 'Search Work Orders' })}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('searchWorkOrderHint', {
              defaultValue:
                "Search by work order number, title, or client. If the work order belongs to a different client, the task's client will be automatically updated.",
            })}
          </Typography>
        </Box>

        <TextField
          fullWidth
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t('searchWorkOrders', { defaultValue: 'Search work orders...' })}
          disabled={isUpdatingWorkOrder}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: isUpdatingWorkOrder ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : null,
          }}
          sx={{ mb: 2 }}
        />

        {selectedWorkOrder && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('currentWorkOrder', { defaultValue: 'Current work order' })}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedWorkOrder.label}
            </Typography>
          </Box>
        )}

        {isLoadingWorkOrders ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : workOrders.length > 0 ? (
          <List
            sx={{
              maxHeight: 400,
              overflow: 'auto',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
            }}
          >
            {workOrders.map((workOrder: any) => {
              const woLabel = workOrder.title || workOrder.number || workOrder._id;
              let clientName = '';
              let clientCompany = '';

              if (workOrder.client?.name) {
                clientName = workOrder.client.name;
                clientCompany = workOrder.client.company || '';
              } else if (workOrder.clientId) {
                const client = clients.find((c: any) => c._id === workOrder.clientId);
                clientName = client?.name || '';
                clientCompany = client?.company || '';
              }

              const willUpdateClient = workOrder.clientId && workOrder.clientId !== clientId;

              return (
                <ListItem key={workOrder._id} disablePadding>
                  <ListItemButton
                    onClick={() => handleWorkOrderClick(workOrder)}
                    disabled={isUpdatingWorkOrder}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Iconify
                        icon="solar:document-bold"
                        width={20}
                        sx={{ color: 'primary.main' }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {woLabel}
                      </Typography>
                    </Box>
                    {clientName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 3, mt: 0.5 }}>
                        <Iconify
                          icon="solar:user-bold"
                          width={14}
                          sx={{ color: 'text.secondary' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {clientName}
                          {clientCompany && ` (${clientCompany})`}
                        </Typography>
                        {willUpdateClient && (
                          <Tooltip
                            title={t('clientWillBeUpdated', {
                              defaultValue: 'Task client will be updated to match work order',
                            })}
                          >
                            <Iconify
                              icon="solar:info-circle-bold"
                              width={14}
                              sx={{ color: 'warning.main', ml: 0.5 }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        ) : searchValue ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {t('noWorkOrdersFound', { defaultValue: 'No work orders found' })}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {t('typeToSearch', { defaultValue: 'Type to search work orders...' })}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            if (!isUpdatingWorkOrder && selectedWorkOrder) {
              handleSelectWorkOrder(null);
            }
          }}
          color="error"
          variant="outlined"
          disabled={isUpdatingWorkOrder || !selectedWorkOrder}
        >
          {t('clearWorkOrder', { defaultValue: 'Clear Work Order' })}
        </Button>
        <Button
          onClick={() => {
            setSearchValue('');
            workOrderSearchDialog.onFalse();
          }}
          variant="contained"
          disabled={isUpdatingWorkOrder}
        >
          {t('close', { defaultValue: 'Close' })}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {taskName} </strong>?
        </>
      }
      action={
        <Button variant="contained" color="error" onClick={onDelete}>
          Delete
        </Button>
      }
    />
  );

  return (
    <>
      <Box
        sx={[
          (theme) => ({
            display: 'flex',
            alignItems: 'center',
            p: theme.spacing(2.5, 1, 2.5, 2.5),
            borderBottom: `solid 1px ${theme.vars?.palette.divider}`,
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {!smUp && (
          <Tooltip title="Close">
            <IconButton onClick={onCloseDetails} sx={{ mr: 2, ml: -1 }}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Tooltip>
        )}

        <RealtimeIndicator variant="icon" sx={{ mr: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Button
              size="small"
              variant="soft"
              {...(selectedWorkOrder && { color: 'success' })}
              endIcon={<Iconify icon="eva:search-fill" width={16} sx={{ ml: -0.5 }} />}
              onClick={workOrderSearchDialog.onTrue}
              sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, px: { xs: 1, sm: 1.5 } }}
            >
              {t('workOrder', { defaultValue: 'Work Order' })}
            </Button>
          </Box>
        </Box>
        <Box component="span" sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
          {/* Lock button - only show when task is private and user is creator */}
          {isPrivate && (
            <Tooltip title={t('makePublic', { defaultValue: 'Make task public' })}>
              <IconButton onClick={onTogglePrivate} color="error" size="small">
                <Iconify
                  sx={{
                    minWidth: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                    fontWeight: 600,
                    borderRadius: '50%',
                  }}
                  icon="solar:lock-bold"
                />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip
            title={
              completed
                ? t('completed', { defaultValue: 'Completed' })
                : t('markComplete', { defaultValue: 'Mark complete' })
            }
          >
            <IconButton
              size="small"
              onClick={() => {
                const next = !completed;
                setCompleted(next);
                onToggleComplete?.(next);
              }}
            >
              <Iconify
                sx={{
                  minWidth: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  fontWeight: 600,
                  bgcolor: completed ? 'success.main' : '#fff',
                  borderRadius: '50%',
                }}
                icon={completed ? 'eva:checkmark-fill' : 'eva:checkmark-circle-2-outline'}
              />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('actions', { defaultValue: 'Actions' })}>
            <IconButton onClick={actionsMenu.onOpen} size="small">
              <Iconify
                sx={{
                  minWidth: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  fontWeight: 600,

                  borderRadius: '50%',
                }}
                icon="eva:more-vertical-fill"
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ display: 'flex' }}>
        {selectedWorkOrder && (
          <Tooltip
            title={
              selectedWorkOrder.number && selectedWorkOrder.title
                ? `${selectedWorkOrder.number} - ${selectedWorkOrder.title}`
                : selectedWorkOrder.label
            }
            placement="top"
          >
            <Box
              sx={{
                m: 0.8,
                maxWidth: { xs: 180, sm: 300 },
                overflow: 'hidden',
              }}
            >
              {selectedWorkOrder.number && selectedWorkOrder.title ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Typography
                    variant="caption"
                    color="primary.main"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedWorkOrder.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedWorkOrder.number}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedWorkOrder.number}
                </Typography>
              )}
            </Box>
          </Tooltip>
        )}
      </Box>

      {renderActionsMenu()}
      {renderWorkOrderSearchDialog()}
      {renderConfirmDialog()}
    </>
  );
}
