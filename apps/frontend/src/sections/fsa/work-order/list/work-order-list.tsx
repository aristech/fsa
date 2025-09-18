'use client';

import { useState } from 'react';
import { usePopover } from 'minimal-shared/hooks';
import useSWR, { type SWRConfiguration } from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';

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
  IconButton,
  Typography,
  LinearProgress,
  TablePagination,
  CircularProgress,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';
import { formatEstimatedDuration, formatMinutesToDuration } from 'src/utils/format-duration';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { View403 } from 'src/sections/error';

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
  clientId: string | { _id: string; name: string; email: string; phone: string; company: string };
  status: 'created' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate?: string;
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
  progressMode?: 'computed' | 'manual' | 'weighted';
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
  const [deleting, setDeleting] = useState(false);

  // Get clientId from URL parameters
  const clientId = searchParams.get('clientId');

  // Build API URL with client filter and pagination
  const apiUrl = clientId
    ? `${endpoints.fsa.workOrders.list}?clientId=${clientId}&page=${page + 1}&limit=${rowsPerPage}`
    : `${endpoints.fsa.workOrders.list}?page=${page + 1}&limit=${rowsPerPage}`;

  // Fetch work orders data
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: { workOrders: WorkOrder[]; pagination: { total: number; pages: number } };
  }>(apiUrl, fetcher, swrOptions);

  const workOrders = data?.data?.workOrders ?? [];
  const pagination = data?.data?.pagination ?? { total: 0, pages: 0 };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('workOrder', { defaultValue: 'Work Order' })}</TableCell>
                <TableCell>{t('client', { defaultValue: 'Client' })}</TableCell>
                <TableCell>{t('status', { defaultValue: 'Status' })}</TableCell>
                <TableCell>{t('priority', { defaultValue: 'Priority' })}</TableCell>
                <TableCell width={220}>{t('progress', { defaultValue: 'Progress' })}</TableCell>
                <TableCell>{t('personnel', { defaultValue: 'Personnel' })}</TableCell>
                <TableCell>{t('scheduled', { defaultValue: 'Scheduled:' })}</TableCell>
                <TableCell>{t('duration', { defaultValue: 'Duration' })}</TableCell>
                <TableCell align="right">{t('actions', { defaultValue: 'Actions' })}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Stack spacing={2} alignItems="center">
                      <Iconify
                        icon="solar:file-text-bold"
                        width={48}
                        sx={{ color: 'text.disabled' }}
                      />
                      <Typography variant="h6" color="text.secondary">
                        {clientId
                          ? t('noWorkOrdersForClient', {
                              defaultValue: 'No work orders found for this client',
                            })
                          : t('dashboard.noWorkOrdersFound', {
                              defaultValue: 'No work orders found',
                            })}
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        {clientId
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
              ) : (
                workOrders.map((row: WorkOrder) => (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">{row.workOrderNumber}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.title}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {typeof row.clientId === 'object'
                        ? row.clientId.name
                        : t('unknownClient', { defaultValue: 'Unknown Client' })}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.status}
                        color={getStatusColor(row.status)}
                        variant="soft"
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.priority}
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
                            <Chip label={row.progressMode} size="small" variant="outlined" />
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
                          {row.personnelIds.map((personnel, index) => (
                            <Chip
                              key={personnel._id}
                              label={personnel.user?.name || personnel.employeeId}
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
          count={pagination.total}
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
            if (!selectedId) return;
            setDeleteOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 2 }} />
          {t('delete', { defaultValue: 'Delete' })}
        </MenuItem>
      </Popover>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('deleteWorkOrderTitle', { defaultValue: 'Delete Work Order' })}
        content={
          <>
            {t('deleteWorkOrderConfirm', {
              defaultValue: 'Are you sure you want to delete this work order?',
            })}
            <br />
            {t('deleteWorkOrderCleanup', {
              defaultValue: 'This will clean up related references.',
            })}
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={async () => {
              if (!selectedId) return;
              try {
                setDeleting(true);
                await axiosInstance.delete(endpoints.fsa.workOrders.details(selectedId));
                toast.success(t('workOrderDeleted', { defaultValue: 'Work order deleted' }));
                setDeleteOpen(false);
                setSelectedId(null);
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
          >
            {deleting
              ? t('deleting', { defaultValue: 'Deleting...' })
              : t('delete', { defaultValue: 'Delete' })}
          </Button>
        }
      />
    </>
  );
}
