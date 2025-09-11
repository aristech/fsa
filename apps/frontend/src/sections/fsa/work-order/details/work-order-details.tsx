'use client';

import useSWR from 'swr';

import {
  Card,
  Grid,
  Chip,
  Stack,
  Button,
  Slider,
  Divider,
  Typography,
  CardContent,
  LinearProgress,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

// Server-driven UI

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

export function WorkOrderDetails({ id }: Props) {
  // Fetch work order data
  const { data: detailsRes } = useSWR(
    endpoints.fsa.workOrders.details(id),
    (url: string) => axiosInstance.get(url).then((r) => r.data),
    { revalidateOnFocus: true }
  );

  // Fetch progress summary from backend
  const { data: summaryRes } = useSWR(
    endpoints.fsa.workOrders.summary(id),
    (url: string) => axiosInstance.get(url).then((r) => r.data),
    { revalidateOnFocus: true }
  );
  const summary = summaryRes?.data as
    | {
        progressMode?: 'computed' | 'manual' | 'weighted';
        progress?: number;
        tasksTotal?: number;
        tasksCompleted?: number;
        tasksInProgress?: number;
        tasksBlocked?: number;
        startedAt?: string | null;
        completedAt?: string | null;
        status?: string;
      }
    | undefined;

  const workOrder = detailsRes?.data;

  return (
    <>
      <CustomBreadcrumbs
        heading={workOrder?.workOrderNumber || 'Work Order'}
        links={[
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Work Orders', href: '/dashboard/work-orders' },
          ...(workOrder?.workOrderNumber ? [{ name: workOrder.workOrderNumber }] : []),
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Iconify icon="eva:edit-fill" />}>
              Edit
            </Button>
            <Button variant="contained" startIcon={<Iconify icon="eva:checkmark-fill" />}>
              Complete
            </Button>
          </Stack>
        }
        sx={{ mb: 5 }}
      />

      <Grid container spacing={3}>
        {/* Header card with client and metadata */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Stack spacing={1}>
                    <Typography variant="h5">{workOrder?.title || '—'}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={workOrder?.status || 'created'} size="small" variant="soft" />
                      <Chip
                        label={workOrder?.priority || 'medium'}
                        size="small"
                        variant="outlined"
                      />
                      {workOrder?.workOrderNumber && (
                        <Chip label={workOrder.workOrderNumber} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                    <Typography variant="body2" color="text.secondary">
                      Client
                    </Typography>
                    <Typography variant="subtitle2">
                      {typeof workOrder?.clientId === 'object' ? workOrder?.clientId?.name : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {workOrder?.scheduledDate
                        ? `Scheduled: ${fDateTime(workOrder.scheduledDate)}`
                        : 'Not scheduled'}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        {/* Progress Summary */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Progress</Typography>
                  {summary?.progressMode && (
                    <Chip label={summary.progressMode} size="small" variant="outlined" />
                  )}
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, summary?.progress ?? 0))}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {(summary?.progress ?? 0).toString()}% • {summary?.tasksCompleted ?? 0}/
                  {summary?.tasksTotal ?? 0} completed
                  {typeof summary?.tasksInProgress === 'number' ? ` • ${summary?.tasksInProgress ?? 0} in progress`
                    : ''}
                </Typography>

                {/* Manual slider when mode is manual */}
                {summary?.progressMode === 'manual' && (
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      Adjust progress
                    </Typography>
                    <Slider
                      value={summary?.progress ?? 0}
                      step={1}
                      min={0}
                      max={100}
                      valueLabelDisplay="auto"
                      onChangeCommitted={async (_e, value) => {
                        try {
                          // Persist manual progress on Work Order
                          await axiosInstance.put(endpoints.fsa.workOrders.details(id), {
                            progressManual: Array.isArray(value) ? value[0] : value,
                          });
                        } catch {
                          // noop; could add a toast
                        }
                      }}
                    />
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        {/* Main Information */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h5">{workOrder?.title || '—'}</Typography>
                  <Chip
                    label={workOrder?.status || 'created'}
                    color={getStatusColor(workOrder?.status || 'created')}
                    variant="soft"
                  />
                  <Chip
                    label={workOrder?.priority || 'medium'}
                    color={getPriorityColor(workOrder?.priority || 'medium')}
                    variant="soft"
                  />
                </Stack>

                <Typography variant="body1" color="text.secondary">
                  {workOrder?.details || 'No details provided'}
                </Typography>

                <Divider />

                <Stack spacing={2}>
                  <Typography variant="h6">Work Order Information</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Work Order Number
                        </Typography>
                        <Typography variant="body2">{workOrder?.workOrderNumber || '—'}</Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Scheduled Date
                        </Typography>
                        <Typography variant="body2">
                          {workOrder?.scheduledDate ? fDateTime(workOrder.scheduledDate) : '—'}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Estimated Duration
                        </Typography>
                        <Typography variant="body2">
                          {(() => {
                            const ed: any = (workOrder as any)?.estimatedDuration;
                            if (!ed) return '—';
                            if (typeof ed === 'number') return `${ed} min`;
                            if (typeof ed?.value === 'number' && ed?.unit)
                              return `${ed.value} ${ed.unit}`;
                            return '—';
                          })()}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>

                <Divider />

                {workOrder?.location?.address && (
                  <Stack spacing={2}>
                    <Typography variant="h6">Location</Typography>
                    <Typography variant="body2">{workOrder.location.address}</Typography>
                  </Stack>
                )}

                {(workOrder as any)?.notes && (
                  <>
                    <Divider />
                    <Stack spacing={2}>
                      <Typography variant="h6">Notes</Typography>
                      <Typography variant="body2">{(workOrder as any).notes}</Typography>
                    </Stack>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {/* Client Information */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Client</Typography>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">
                      {typeof workOrder?.clientId === 'object' ? workOrder.clientId.name : '—'}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Assigned Personnel */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Assigned Personnel</Typography>
                  {Array.isArray(workOrder?.personnelIds) && workOrder.personnelIds.length > 0 ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {workOrder.personnelIds.map((p: any) => (
                        <Chip
                          key={p._id}
                          label={p?.user?.name || p?.employeeId || '—'}
                          size="small"
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Work Order History */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">History</Typography>
                  <Stack spacing={2}>
                    {Array.isArray(workOrder?.history) &&
                      workOrder.history.map((entry: any, index: number) => (
                        <Stack key={index} spacing={0.5}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip
                              label={entry.status}
                              color={getStatusColor(entry.status)}
                              variant="soft"
                              size="small"
                            />
                            <Typography variant="caption" color="text.secondary">
                              {entry.timestamp ? fDateTime(entry.timestamp) : ''}
                            </Typography>
                          </Stack>
                          {entry.userId && (
                            <Typography variant="body2" color="text.secondary">
                              {entry.userId}
                            </Typography>
                          )}
                          {entry.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {entry.notes}
                            </Typography>
                          )}
                        </Stack>
                      ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
