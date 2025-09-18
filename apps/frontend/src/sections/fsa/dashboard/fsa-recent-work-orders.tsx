'use client';

import useSWR from 'swr';
import React, { useMemo } from 'react';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Link,
  Chip,
  Grid,
  Menu,
  Stack,
  Tooltip,
  Skeleton,
  MenuItem,
  CardHeader,
  Typography,
  IconButton,
  CardContent,
  LinearProgress,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { useTranslate } from 'src/locales/use-locales';
import { useClient } from 'src/contexts/client-context';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

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
    case 'scheduled':
      return 'info';
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

export function FsaRecentWorkOrders() {
  const theme = useTheme();
  const { selectedClient } = useClient();
  const { t } = useTranslate('common');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedAttachments, setSelectedAttachments] = React.useState<any[]>([]);

  const handleAttachmentMenuOpen = (event: React.MouseEvent<HTMLElement>, attachments: any[]) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedAttachments(attachments);
  };

  const handleAttachmentMenuClose = () => {
    setAnchorEl(null);
    setSelectedAttachments([]);
  };

  const handleDownloadAttachment = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleAttachmentMenuClose();
  };

  // Build URL with client filter
  const workOrdersUrl = selectedClient
    ? `${endpoints.fsa.workOrders.list}?clientId=${selectedClient._id}&limit=10&sort=-createdAt`
    : `${endpoints.fsa.workOrders.list}?limit=10&sort=-createdAt`;

  // Fetch work orders data
  const { data: workOrdersData, isLoading } = useSWR(workOrdersUrl, async (url: string) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });

  // Fetch progress summaries for work orders
  const workOrderIds = workOrdersData?.data?.workOrders?.slice(0, 5).map((wo: any) => wo._id) || [];
  const { data: summariesData } = useSWR(
    workOrderIds.length > 0 ? `summaries-${workOrderIds.join(',')}` : null,
    async () => {
      if (workOrderIds.length === 0) return {};
      const summaries = await Promise.all(
        workOrderIds.map(async (id: string) => {
          try {
            const response = await axiosInstance.get(endpoints.fsa.workOrders.summary(id));
            return { id, data: response.data?.data };
          } catch {
            return { id, data: null };
          }
        })
      );
      return summaries.reduce((acc: any, { id, data }) => {
        acc[id] = data;
        return acc;
      }, {});
    }
  );

  // Fetch personnel data for technician names
  const { data: personnelData } = useSWR(endpoints.fsa.personnel.list, async (url: string) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });

  // Process work orders data
  const recentWorkOrders = useMemo(() => {
    if (!workOrdersData?.data?.workOrders) return [];

    const workOrders = workOrdersData.data.workOrders;
    const personnel = personnelData?.data || [];

    // Create a map of personnel by ID for quick lookup
    const personnelById = new Map();
    personnel.forEach((person: any) => {
      personnelById.set(person._id, person);
    });

    return workOrders.slice(0, 5).map((workOrder: any) => {
      // Prepare assigned personnel
      const personnelObjs = (workOrder.personnelIds || [])
        .map((id: any) => (typeof id === 'string' ? personnelById.get(id) : id))
        .filter(Boolean);

      const attachmentsCount = Array.isArray(workOrder.attachments)
        ? workOrder.attachments.length
        : 0;

      // Get client details
      const clientData = typeof workOrder.clientId === 'object' ? workOrder.clientId : null;

      // Get progress data
      const progressData = summariesData?.[workOrder._id] || null;

      return {
        id: workOrder._id,
        workOrderNumber: workOrder.workOrderNumber,
        title: workOrder.title,
        customer:
          workOrder.clientName ||
          workOrder.client?.name ||
          clientData?.name ||
          t('unknownClient', { defaultValue: 'Unknown Client' }),
        clientPhone: clientData?.phone || null,
        clientEmail: clientData?.email || null,
        status: workOrder.status,
        priority: workOrder.priority,
        scheduledDate: workOrder.scheduledDate
          ? new Date(workOrder.scheduledDate)
          : new Date(workOrder.createdAt),
        location: workOrder.location?.address || workOrder.location || null,
        createdAt: new Date(workOrder.createdAt),
        detailsHtml: (workOrder.details as string) || '',
        personnel: personnelObjs,
        attachmentsCount,
        attachments: workOrder.attachments || [],
        progress: progressData?.progress || 0,
        tasksTotal: progressData?.tasksTotal || 0,
        tasksCompleted: progressData?.tasksCompleted || 0,
      };
    });
  }, [workOrdersData, personnelData, summariesData, t]);

  const renderDetailsPreview = (html: string) => (
    <Box
      sx={{
        '& p': { m: 0 },
        color: 'text.secondary',
        fontSize: '12px',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 3,
        overflow: 'hidden',
      }}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );

  return (
    <Card>
      <CardHeader
        title={t('dashboard.recentWorkOrders', { defaultValue: 'Recent Work Orders' })}
        action={
          <Link
            href="/dashboard/work-orders"
            color="primary"
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {t('viewAll', { defaultValue: 'View All' })}
            <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
          </Link>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, index) => (
              <Stack
                key={index}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Stack spacing={1} sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Skeleton variant="text" width={100} height={20} />
                    <Skeleton
                      variant="rectangular"
                      width={60}
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                    <Skeleton
                      variant="rectangular"
                      width={50}
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                  </Stack>
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="text" width="60%" height={16} />
                </Stack>
                <Skeleton variant="text" width={80} height={16} />
              </Stack>
            ))
          ) : recentWorkOrders.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              {t('dashboard.noWorkOrdersFound', { defaultValue: 'No work orders found' })}
            </Typography>
          ) : (
            recentWorkOrders.map((wo: any) => (
              <Stack
                key={wo.id}
                spacing={2}
                sx={{
                  p: 3,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                }}
              >
                {/* Header row with title and status */}
                <Stack
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Link
                        href={`/dashboard/work-orders/${wo.id}`}
                        sx={{
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {wo.title}
                        </Typography>
                      </Link>
                      <Label color={getStatusColor(wo.status)} variant="soft">
                        {wo.status}
                      </Label>
                      <Label color={getPriorityColor(wo.priority)} variant="soft">
                        {wo.priority}
                      </Label>
                    </Stack>
                    {wo.workOrderNumber && wo.title !== wo.workOrderNumber && (
                      <Typography variant="body2" color="text.secondary">
                        {wo.workOrderNumber}
                      </Typography>
                    )}
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    {wo.attachmentsCount > 0 && (
                      <Tooltip
                        title={`${wo.attachmentsCount} ${t('attachments', { defaultValue: 'attachments' })} - ${t('clickToViewDownload', { defaultValue: 'Click to view/download' })}`}
                      >
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            if (wo.attachments.length === 1) {
                              // Single attachment - download directly
                              handleDownloadAttachment(
                                wo.attachments[0].url,
                                wo.attachments[0].name
                              );
                            } else {
                              // Multiple attachments - show menu
                              handleAttachmentMenuOpen(event, wo.attachments);
                            }
                          }}
                        >
                          <Iconify icon="eva:attach-2-fill" width={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${wo.tasksCompleted}/${wo.tasksTotal} ${t('tasks', { defaultValue: 'tasks' })}`}
                      sx={{ minWidth: 'auto' }}
                    />
                  </Stack>
                </Stack>

                {/* Progress bar */}
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {t('progress', { defaultValue: 'Progress' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {wo.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, wo.progress))}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Stack>

                {/* Client and Personnel Info */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('client', { defaultValue: 'Client' })}
                      </Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {wo.customer}
                        </Typography>
                        {wo.clientPhone && (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Iconify icon="eva:phone-fill" width={14} />
                            <Typography variant="caption" color="text.secondary">
                              {wo.clientPhone}
                            </Typography>
                          </Stack>
                        )}
                        {wo.clientEmail && (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Iconify icon="eva:email-fill" width={14} />
                            <Typography variant="caption" color="text.secondary">
                              {wo.clientEmail}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                        <Iconify icon="eva:people-fill" width={14} />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          {t('assignedPersonnel', { defaultValue: 'Assigned Personnel' })}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2">{wo?.personnel?.length}</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>

                {/* Schedule and Location */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Iconify icon="eva:calendar-fill" width={16} />
                      <Typography variant="caption" color="text.secondary">
                        {t('scheduled', { defaultValue: 'Scheduled:' })}
                      </Typography>
                      <Typography variant="body2">{fDateTime(wo.scheduledDate)}</Typography>
                    </Stack>
                  </Grid>
                  {wo.location && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Iconify icon="eva:pin-fill" width={16} />
                        <Typography variant="body2" noWrap>
                          {wo.location}
                        </Typography>
                      </Stack>
                    </Grid>
                  )}
                </Grid>

                {/* Details preview */}
                {wo.detailsHtml && (
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('details', { defaultValue: 'Details' })}
                    </Typography>
                    {renderDetailsPreview(wo.detailsHtml)}
                  </Stack>
                )}
              </Stack>
            ))
          )}
        </Stack>

        {/* Attachment Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleAttachmentMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {selectedAttachments.map((attachment, index) => (
            <MenuItem
              key={index}
              onClick={() => handleDownloadAttachment(attachment.url, attachment.name)}
              sx={{ minWidth: 200 }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                <Iconify icon="eva:file-text-fill" width={16} />
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {attachment.name}
                </Typography>
              </Stack>
            </MenuItem>
          ))}
        </Menu>
      </CardContent>
    </Card>
  );
}
