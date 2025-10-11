'use client';

import { useMemo, useState } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePopover, useBoolean } from 'minimal-shared/hooks';

import {
  Box,
  Card,
  Chip,
  Stack,
  Table,
  Button,
  Popover,
  MenuItem,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  IconButton,
  Typography,
  LinearProgress,
  InputAdornment,
  TablePagination,
  CircularProgress,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';
import { truncateText } from 'src/utils/text-truncate';
import { formatEstimatedDuration, formatMinutesToDuration } from 'src/utils/format-duration';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CascadeDeleteDialog, type CascadeDeleteInfo } from 'src/components/cascade-delete-dialog';

import { View403 } from 'src/sections/error';
import { KanbanTaskCreateDialog } from 'src/sections/kanban/components/kanban-task-create-dialog';

// ----------------------------------------------------------------------

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

// ----------------------------------------------------------------------

interface WorkOrder {
  _id: string;
  workOrderNumber: string;
  title: string;
  details?: string;
  clientId: string | { _id: string; name: string; email: string; phone: string; company: string };
  status: 'created' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate?: string;
  location?: { address?: string };
  personnelIds?: Array<{
    _id: string;
    employeeId: string;
    user?: { name: string };
    role?: { name: string };
  }>;
  estimatedDuration?: { value?: number; unit?: 'hours' | 'days' | 'weeks' | 'months' } | number;
  actualDuration?: number; // in minutes
  // Progress fields
  progress?: number;
  progressMode?: 'computed' | 'manual';
  tasksTotal?: number;
  tasksCompleted?: number;
  tasksInProgress?: number;
  tasksBlocked?: number;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in-progress':
      return 'info';
    case 'assigned':
      return 'warning';
    case 'created':
      return 'default';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

// ----------------------------------------------------------------------

export function WorkOrderList() {
  const popover = usePopover();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslate('common');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cascadeDeleteInfo, setCascadeDeleteInfo] = useState<CascadeDeleteInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Task creation dialog state
  const taskCreateDialog = useBoolean();
  const [selectedWorkOrderForTask, setSelectedWorkOrderForTask] = useState<WorkOrder | null>(null);

  // Get clientId from URL parameters
  const clientId = searchParams.get('clientId');

  // Build API URL with client filter and pagination (search is now client-side)
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: '1', // Always fetch first page, we'll handle pagination client-side
      limit: '1000', // Fetch more records for client-side filtering
    });

    if (clientId) params.append('clientId', clientId);
    // Remove search param - now client-side

    return `${endpoints.fsa.workOrders.list}?${params.toString()}`;
  }, [clientId]); // Remove searchTerm from dependencies

  // Fetch work orders data
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: { workOrders: WorkOrder[]; pagination: { total: number; pages: number } };
  }>(apiUrl, fetcher, swrOptions);

  // Client-side search filtering
  const filteredWorkOrders = useMemo(() => {
    const allWorkOrders = data?.data?.workOrders ?? [];
    if (!searchTerm.trim()) return allWorkOrders;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return allWorkOrders.filter((workOrder) => {
      // Search in work order fields
      const workOrderMatches =
        workOrder.title?.toLowerCase().includes(lowerSearchTerm) ||
        workOrder.workOrderNumber?.toLowerCase().includes(lowerSearchTerm) ||
        workOrder.details?.toLowerCase().includes(lowerSearchTerm) ||
        workOrder.location?.address?.toLowerCase().includes(lowerSearchTerm);

      // Search in client fields
      const client = typeof workOrder.clientId === 'object' ? workOrder.clientId : null;
      const clientMatches =
        client &&
        (client.name?.toLowerCase().includes(lowerSearchTerm) ||
          client.company?.toLowerCase().includes(lowerSearchTerm) ||
          client.email?.toLowerCase().includes(lowerSearchTerm) ||
          client.phone?.toLowerCase().includes(lowerSearchTerm));

      // Search in personnel fields
      const personnelMatches = workOrder.personnelIds?.some(
        (personnel) =>
          personnel.user?.name?.toLowerCase().includes(lowerSearchTerm) ||
          personnel.role?.name?.toLowerCase().includes(lowerSearchTerm)
      );

      return workOrderMatches || clientMatches || personnelMatches;
    });
  }, [data?.data?.workOrders, searchTerm]);

  // Client-side pagination
  const paginatedWorkOrders = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredWorkOrders.slice(startIndex, endIndex);
  }, [filteredWorkOrders, page, rowsPerPage]);

  // Update pagination info for client-side filtering
  const clientPagination = {
    total: filteredWorkOrders.length,
    pages: Math.ceil(filteredWorkOrders.length / rowsPerPage),
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleCreateTaskFromWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrderForTask(workOrder);
    taskCreateDialog.onTrue();
  };

  const handleTaskCreateSuccess = () => {
    taskCreateDialog.onFalse();
    setSelectedWorkOrderForTask(null);
    // Optionally refresh the work order list or show success message
    toast.success(t('taskCreatedSuccessfully', { defaultValue: 'Task created successfully!' }));
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <View403 />;
  }

  return (
    <>
      <Card>
        <CustomBreadcrumbs
          heading={
            clientId
              ? t('pages.workOrdersFiltered', { defaultValue: 'Work Orders (Filtered)' })
              : t('pages.workOrders', { defaultValue: 'Work Orders' })
          }
          links={[
            { name: t('dashboard.title', { tenant: '' }), href: '/dashboard' },
            { name: t('pages.workOrders', { defaultValue: 'Work Orders' }) },
            ...(clientId
              ? [{ name: t('filteredByClient', { defaultValue: 'Filtered by Client' }) }]
              : []),
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              href="/dashboard/work-orders/new"
            >
              {t('newWorkOrder', { defaultValue: 'New Work Order' })}
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        {/* Search Input */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t('searchWorkOrders', {
              defaultValue: 'Search work orders, clients, personnel...',
            })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400 }}
          />
        </Box>

        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>
                  {truncateText(t('workOrder', { defaultValue: 'Work Order' }))}
                </TableCell>
                <TableCell>{truncateText(t('client', { defaultValue: 'Client' }))}</TableCell>
                <TableCell>{truncateText(t('status', { defaultValue: 'Status' }))}</TableCell>
                <TableCell>{truncateText(t('priority', { defaultValue: 'Priority' }))}</TableCell>
                <TableCell width={220}>
                  {truncateText(t('progress', { defaultValue: 'Progress' }))}
                </TableCell>
                <TableCell>{truncateText(t('personnel', { defaultValue: 'Personnel' }))}</TableCell>
                <TableCell>
                  {truncateText(t('scheduled', { defaultValue: 'Scheduled:' }))}
                </TableCell>
                <TableCell>{truncateText(t('duration', { defaultValue: 'Duration' }))}</TableCell>
                <TableCell align="right">
                  {truncateText(t('actions', { defaultValue: 'Actions' }))}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedWorkOrders.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Stack spacing={2} alignItems="center">
                      <Iconify
                        icon="solar:file-text-bold"
                        width={48}
                        sx={{ color: 'text.disabled' }}
                      />
                      <Typography variant="h6" color="text.secondary">
                        {searchTerm.trim()
                          ? t('noSearchResults', {
                              defaultValue: 'No work orders found matching your search',
                            })
                          : clientId
                            ? t('noWorkOrdersForClient', {
                                defaultValue: 'No work orders found for this client',
                              })
                            : t('dashboard.noWorkOrdersFound', {
                                defaultValue: 'No work orders found',
                              })}
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        {searchTerm.trim()
                          ? t('noSearchResultsHint', {
                              defaultValue: 'Try adjusting your search terms or filters.',
                            })
                          : clientId
                            ? t('noWorkOrdersForClientHint', {
                                defaultValue: 'This client does not have any work orders yet.',
                              })
                            : t('createFirstWorkOrderHint', {
                                defaultValue: 'Create your first work order to get started.',
                              })}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedWorkOrders.map((row: WorkOrder) => (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">{truncateText(row.title)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {truncateText(row?.location?.address)}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {typeof row.clientId === 'object'
                        ? truncateText(row.clientId.name)
                        : t('unknownClient', { defaultValue: 'Unknown Client' })}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={truncateText(row.status)}
                        color={getStatusColor(row.status)}
                        variant="soft"
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={truncateText(row.priority)}
                        color={getPriorityColor(row.priority)}
                        variant="soft"
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {(row.progress ?? 0).toString()}%
                          </Typography>
                          {row.progressMode && (
                            <Chip
                              label={truncateText(row.progressMode)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, Math.min(100, row.progress ?? 0))}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {`${row.tasksCompleted ?? 0}/${row.tasksTotal ?? 0} ${t('completed', { defaultValue: 'completed' })}`}
                          {typeof row.tasksInProgress === 'number'
                            ? ` • ${row.tasksInProgress ?? 0} ${t('inProgress', { defaultValue: 'in progress' })}`
                            : ''}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {row.personnelIds && row.personnelIds.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {row.personnelIds.map((personnel) => (
                            <Chip
                              key={personnel._id}
                              label={truncateText(personnel.user?.name || personnel.employeeId)}
                              size="small"
                              variant="outlined"
                              sx={{ mb: 0.5 }}
                            />
                          ))}
                        </Stack>
                      ) : (
                        t('unassigned', { defaultValue: 'Unassigned' })
                      )}
                    </TableCell>

                    <TableCell>
                      {row.scheduledDate
                        ? fDateTime(row.scheduledDate)
                        : t('notScheduled', { defaultValue: 'Not scheduled' })}
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {t('estimatedShort', { defaultValue: 'Est:' })}{' '}
                          {formatEstimatedDuration(row.estimatedDuration as any)}
                        </Typography>
                        <Typography variant="body2">
                          {row.actualDuration
                            ? formatMinutesToDuration(row.actualDuration)
                            : '0 min'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="right">
                      <IconButton
                        color={popover.open ? 'inherit' : 'default'}
                        onClick={(event) => {
                          setSelectedId(row._id);
                          popover.onOpen(event);
                        }}
                      >
                        <Iconify icon="eva:more-vertical-fill" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={clientPagination.total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      <Popover
        open={popover.open}
        onClose={popover.onClose}
        anchorEl={popover.open ? popover.anchorEl : null}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 160 },
        }}
      >
        <MenuItem
          onClick={() => {
            popover.onClose();
            if (selectedId) router.push(`/dashboard/work-orders/${selectedId}`);
          }}
        >
          <Iconify icon="solar:eye-bold" sx={{ mr: 2 }} />
          {t('view', { defaultValue: 'View' })}
        </MenuItem>

        <MenuItem
          onClick={() => {
            popover.onClose();
            if (selectedId) router.push(`/dashboard/work-orders/${selectedId}/edit`);
          }}
        >
          <Iconify icon="solar:pen-bold" sx={{ mr: 2 }} />
          {t('edit', { defaultValue: 'Edit' })}
        </MenuItem>

        <MenuItem
          onClick={() => {
            popover.onClose();
            if (selectedId) {
              // Find the selected work order data
              const selectedWorkOrder = data?.data?.workOrders?.find(
                (wo: WorkOrder) => wo._id === selectedId
              );
              if (selectedWorkOrder) {
                // Open task creation dialog with pre-populated data
                handleCreateTaskFromWorkOrder(selectedWorkOrder);
              }
            }
          }}
        >
          <Iconify icon="solar:task-square-bold" sx={{ mr: 2 }} />
          {t('addTask', { defaultValue: '+ Add Task' })}
        </MenuItem>

        <MenuItem
          onClick={async () => {
            popover.onClose();
            if (!selectedId) return;

            try {
              // Fetch related data count before showing dialog
              const response = await axiosInstance.get(
                `${endpoints.fsa.workOrders.details(selectedId)}/delete-info`
              );
              setCascadeDeleteInfo(response.data.data);
              setDeleteOpen(true);
            } catch (fetchError) {
              console.error('Failed to fetch delete info:', fetchError);
              toast.error('Failed to load deletion information');
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 2 }} />
          {t('delete', { defaultValue: 'Delete' })}
        </MenuItem>
      </Popover>

      {cascadeDeleteInfo && (
        <CascadeDeleteDialog
          open={deleteOpen}
          onCloseAction={() => {
            setDeleteOpen(false);
            setCascadeDeleteInfo(null);
          }}
          onConfirmAction={async (cascadeDelete) => {
            if (!selectedId) return;
            try {
              setDeleting(true);
              await axiosInstance.delete(
                `${endpoints.fsa.workOrders.details(selectedId)}${cascadeDelete ? '?cascade=true' : ''}`
              );
              toast.success(t('workOrderDeleted', { defaultValue: 'Work order deleted' }));
              setDeleteOpen(false);
              setSelectedId(null);
              setCascadeDeleteInfo(null);
              // Refresh list via SWR
              await mutate();
            } catch (e) {
              console.error('Failed to delete work order', e);
              toast.error(
                t('workOrderDeleteFailed', { defaultValue: 'Failed to delete work order' })
              );
            } finally {
              setDeleting(false);
            }
          }}
          title={t('deleteWorkOrderTitle', { defaultValue: 'Delete Work Order' })}
          entityName={
            data?.data?.workOrders?.find((wo: any) => wo._id === selectedId)?.title || 'Work Order'
          }
          entityType="work-order"
          info={cascadeDeleteInfo}
          loading={deleting}
        />
      )}

      {/* Task Creation Dialog */}
      <KanbanTaskCreateDialog
        open={taskCreateDialog.value}
        onClose={() => {
          taskCreateDialog.onFalse();
          setSelectedWorkOrderForTask(null);
        }}
        onSuccess={handleTaskCreateSuccess}
        status="todo"
        // Pre-populate with work order data
        initialWorkOrderId={selectedWorkOrderForTask?._id}
        initialClientId={
          selectedWorkOrderForTask?.clientId
            ? typeof selectedWorkOrderForTask.clientId === 'string'
              ? selectedWorkOrderForTask.clientId
              : selectedWorkOrderForTask.clientId._id
            : undefined
        }
      />
    </>
  );
}
