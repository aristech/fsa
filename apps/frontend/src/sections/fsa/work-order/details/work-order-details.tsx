'use client';

import useSWR, { mutate } from 'swr';
import { useBoolean } from 'minimal-shared/hooks';

import {
  Card,
  Chip,
  Grid,
  Stack,
  Button,
  Slider,
  Divider,
  Container,
  Typography,
  CardContent,
  LinearProgress,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { fDateTime } from 'src/utils/format-time';
import {
  calculateTimeProgress,
  formatEstimatedDuration,
  formatMinutesToDuration,
} from 'src/utils/format-duration';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AnalyticsOrderTimeline } from 'src/sections/overview/analytics/analytics-order-timeline';
import { KanbanTaskCreateDialog } from 'src/sections/kanban/components/kanban-task-create-dialog';

import { WorkOrderDetailsAttachments } from './work-order-details-attachments';
import { WorkOrderPersonnelSelection } from '../create/work-order-personnel-selection';

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

const getTimelineType = (eventType: string, entityType: string) => {
  // Map timeline events to the color types expected by AnalyticsOrderTimeline
  if (entityType === 'work_order') {
    switch (eventType) {
      case 'created':
        return 'order1'; // primary
      case 'completed':
        return 'order2'; // success
      case 'assigned':
        return 'order3'; // info
      case 'status_changed':
        return 'order4'; // warning
      default:
        return 'order1';
    }
  } else {
    // Task events
    switch (eventType) {
      case 'created':
        return 'order3'; // info
      case 'completed':
        return 'order2'; // success
      case 'status_changed':
        return 'order4'; // warning
      default:
        return 'order1';
    }
  }
};

export function WorkOrderDetails({ id }: Props) {
  const { t } = useTranslate('common');
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

  // Task creation dialog state
  const taskCreateDialog = useBoolean();

  const handleCreateTask = () => {
    taskCreateDialog.onTrue();
  };

  const handleTaskCreateSuccess = () => {
    taskCreateDialog.onFalse();
    // Optionally show success message or refresh data
  };

  // Fetch timeline data
  const { data: timelineRes } = useSWR(
    `/api/v1/work-orders/${id}/timeline`,
    (url: string) => axiosInstance.get(url).then((r) => r.data),
    { revalidateOnFocus: true }
  );

  // Transform timeline data for AnalyticsOrderTimeline component
  const timelineList =
    timelineRes?.data?.timeline?.map((entry: any) => ({
      id: entry._id,
      type: getTimelineType(entry.eventType, entry.entityType),
      title: entry.title,
      time: entry.timestamp,
    })) || [];

  const summary = summaryRes?.data as
    | {
        progressMode?: 'computed' | 'manual';
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
    <Container maxWidth="xl">
      <CustomBreadcrumbs
        heading={
          workOrder?.title ||
          workOrder?.workOrderNumber ||
          t('workOrder', { defaultValue: 'Work Order' })
        }
        links={[
          { name: t('dashboard.title', { tenant: '' }), href: '/dashboard' },
          {
            name: t('pages.workOrders', { defaultValue: 'Work Orders' }),
            href: '/dashboard/work-orders',
          },
          ...(workOrder?.title || workOrder?.workOrderNumber
            ? [{ name: workOrder?.title || workOrder?.workOrderNumber }]
            : []),
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:task-square-bold" />}
              onClick={handleCreateTask}
            >
              {t('addTask', { defaultValue: '+ Add Task' })}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:edit-fill" />}
              href={paths.dashboard.fsa.workOrders.edit(id)}
            >
              {t('edit', { defaultValue: 'Edit' })}
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
                      {t('client', { defaultValue: 'Client' })}
                    </Typography>
                    <Typography variant="subtitle2">
                      {typeof workOrder?.clientId === 'object' ? workOrder?.clientId?.name : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {workOrder?.scheduledDate
                        ? `${t('scheduled', { defaultValue: 'Scheduled:' })} ${fDateTime(workOrder.scheduledDate)}`
                        : t('notScheduled', { defaultValue: 'Not scheduled' })}
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
                  <Typography variant="h6">
                    {t('progress', { defaultValue: 'Progress' })}
                  </Typography>
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
                  {summary?.tasksTotal ?? 0} {t('completed', { defaultValue: 'completed' })}
                  {typeof summary?.tasksInProgress === 'number'
                    ? ` • ${summary?.tasksInProgress ?? 0} ${t('inProgress', { defaultValue: 'in progress' })}`
                    : ''}
                </Typography>

                {/* Manual slider when mode is manual */}
                {summary?.progressMode === 'manual' && (
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      {t('adjustProgress', { defaultValue: 'Adjust progress' })}
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

                {/* Details (rendered with Editor) */}
                <Stack spacing={1}>
                  <Typography variant="h6">{t('details', { defaultValue: 'Details' })}</Typography>
                  <Editor
                    value={(workOrder as any)?.details || ''}
                    editable={false}
                    immediatelyRender
                    slotProps={{
                      wrapper: {
                        sx: {
                          '& .ProseMirror': {
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'background.default',
                            border: (theme: any) => `1px solid ${theme.palette.divider}`,
                          },
                        },
                      },
                    }}
                  />
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  <Typography variant="h6">
                    {t('workOrderInformation', { defaultValue: 'Work Order Information' })}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {t('workOrderNumber', { defaultValue: 'Work Order Number' })}
                        </Typography>
                        <Typography variant="body2">{workOrder?.workOrderNumber || '—'}</Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {t('scheduledDate', { defaultValue: 'Scheduled Date' })}
                        </Typography>
                        <Typography variant="body2">
                          {workOrder?.scheduledDate ? fDateTime(workOrder.scheduledDate) : '—'}
                        </Typography>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {t('duration', { defaultValue: 'Duration' })}
                        </Typography>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            <strong>{t('estimated', { defaultValue: 'Estimated:' })}</strong>{' '}
                            {formatEstimatedDuration((workOrder as any)?.estimatedDuration)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>{t('actual', { defaultValue: 'Actual:' })}</strong>{' '}
                            {(workOrder as any)?.actualDuration
                              ? formatMinutesToDuration((workOrder as any).actualDuration)
                              : '0 min'}
                          </Typography>
                          {(workOrder as any)?.actualDuration &&
                            (workOrder as any)?.estimatedDuration && (
                              <Typography variant="caption" color="text.secondary">
                                {calculateTimeProgress(
                                  (workOrder as any).actualDuration,
                                  (workOrder as any).estimatedDuration
                                )}
                                % {t('ofEstimatedTime', { defaultValue: 'of estimated time' })}
                              </Typography>
                            )}
                        </Stack>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {t('laborCost', { defaultValue: 'Labor Cost' })}
                        </Typography>
                        <Typography variant="body2">
                          {(workOrder as any)?.cost?.labor
                            ? `${(workOrder as any).cost.labor.toFixed(2)}€`
                            : '0.00€'}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>

                <Divider />

                {workOrder?.location?.address && (
                  <Stack spacing={2}>
                    <Typography variant="h6">
                      {t('location', { defaultValue: 'Location' })}
                    </Typography>
                    <Typography variant="body2">{workOrder.location.address}</Typography>
                  </Stack>
                )}

                {(workOrder as any)?.notes && (
                  <>
                    <Divider />
                    <Stack spacing={2}>
                      <Typography variant="h6">{t('notes', { defaultValue: 'Notes' })}</Typography>
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
                  <Typography variant="h6">{t('client', { defaultValue: 'Client' })}</Typography>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">
                      {typeof workOrder?.clientId === 'object' ? workOrder.clientId.name : '—'}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Assigned Personnel - consistent UI */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <WorkOrderPersonnelSelection
                    value={
                      Array.isArray(workOrder?.personnelIds)
                        ? workOrder.personnelIds
                            .map((p: any) => (typeof p === 'string' ? p : p._id))
                            .filter(Boolean)
                        : []
                    }
                    onChange={async (personnelIds) => {
                      try {
                        await axiosInstance.put(endpoints.fsa.workOrders.details(id), {
                          personnelIds,
                        });
                        await mutate(endpoints.fsa.workOrders.details(id));
                      } catch (e) {
                        console.error('Failed to update assigned personnel', e);
                      }
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">
                    {t('attachmentsTitle', { defaultValue: 'Attachments' })}
                  </Typography>
                  <WorkOrderDetailsAttachments
                    attachments={(workOrder as any)?.attachments || []}
                    workOrderId={id}
                    onChange={async (attachments) => {
                      try {
                        await axiosInstance.put(endpoints.fsa.workOrders.details(id), {
                          attachments,
                        });
                        // Refresh the work order data to show updated attachments
                        await mutate(endpoints.fsa.workOrders.details(id));
                      } catch (error) {
                        console.error('Failed to update work order attachments:', error);
                      }
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Work Order Timeline */}
            <AnalyticsOrderTimeline
              title={t('timeline', { defaultValue: 'Timeline' })}
              subheader={t('workOrderTimelineSubheader', {
                defaultValue: 'Track all changes to this work order and related tasks',
              })}
              list={timelineList}
            />
          </Stack>
        </Grid>
      </Grid>

      {/* Task Creation Dialog */}
      <KanbanTaskCreateDialog
        open={taskCreateDialog.value}
        onClose={() => taskCreateDialog.onFalse()}
        onSuccess={handleTaskCreateSuccess}
        status="todo"
        // Pre-populate with work order data
        initialWorkOrderId={workOrder?._id}
        initialClientId={
          workOrder?.clientId
            ? typeof workOrder.clientId === 'string'
              ? workOrder.clientId
              : workOrder.clientId._id
            : undefined
        }
      />
    </Container>
  );
}
