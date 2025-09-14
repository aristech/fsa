'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';
import { useTabs } from 'minimal-shared/hooks';

import { Box, Tab, Tabs, Chip, Avatar, Drawer, Button, useTheme, Typography } from '@mui/material';

import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { ReportOverviewTab } from './report-overview-tab';
import { ReportMaterialsTab } from './report-materials-tab';
import { ReportAttachmentsTab } from './report-attachments-tab';
import { ReportTimeEntriesTab } from './report-time-entries-tab';

// ----------------------------------------------------------------------

interface ReportDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  report: IReport;
  onUpdate: (updatedReport: IReport) => void;
}

export function ReportDetailsDrawer({ open, onClose, report, onUpdate }: ReportDetailsDrawerProps) {
  const theme = useTheme();
  const tabs = useTabs('overview');

  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'submitted':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'published':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return 'eva:calendar-fill';
      case 'weekly':
        return 'eva:clock-fill';
      case 'monthly':
        return 'eva:calendar-outline';
      case 'incident':
        return 'eva:alert-triangle-fill';
      case 'maintenance':
        return 'eva:settings-fill';
      case 'inspection':
        return 'eva:search-fill';
      case 'completion':
        return 'eva:checkmark-circle-fill';
      case 'safety':
        return 'eva:shield-fill';
      default:
        return 'eva:file-text-fill';
    }
  };

  const canEdit = report.status === 'draft' || report.status === 'rejected';
  const canSubmit = report.status === 'draft';
  const canApprove = report.status === 'submitted' || report.status === 'under_review';

  // Action handlers
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const response = await ReportService.submitReport(report._id);
      if (response.success) {
        toast.success('Report submitted for review');
        onUpdate({ ...report, status: 'submitted', submittedAt: new Date() });
      } else {
        toast.error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }, [report, onUpdate]);

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      const response = await ReportService.approveReport(report._id);
      if (response.success) {
        toast.success('Report approved');
        onUpdate({
          ...report,
          status: 'approved',
          approvedAt: new Date(),
          // approvedBy would be set by the API
        });
      } else {
        toast.error('Failed to approve report');
      }
    } catch (error) {
      console.error('Error approving report:', error);
      toast.error('Failed to approve report');
    } finally {
      setApproving(false);
    }
  }, [report, onUpdate]);

  const handleExport = useCallback(async () => {
    try {
      await ReportService.exportReport(report._id, 'pdf');
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  }, [report._id]);

  const renderHeader = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header Row */}
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: 0 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.light',
              width: 48,
              height: 48,
              flexShrink: 0,
            }}
          >
            <Iconify icon={getTypeIcon(report.type)} width={24} />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip label={report.type} size="small" sx={{ textTransform: 'capitalize' }} />
              <Chip
                label={report.status.replace('_', ' ')}
                color={getStatusColor(report.status) as any}
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
              <Chip
                label={report.priority}
                color={
                  report.priority === 'high' || report.priority === 'urgent' ? 'error' : 'default'
                }
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary">
              {dayjs(report.reportDate).format('MMM DD, YYYY')} • Created by{' '}
              {report.createdBy?.name ||
                report.createdByData?.name ||
                report.createdBy?.email ||
                report.createdByData?.email ||
                'Unknown User'}
            </Typography>
          </Box>
        </Box>

        <Button variant="text" size="small" onClick={onClose} sx={{ flexShrink: 0, ml: 1 }}>
          <Iconify icon="eva:close-fill" width={20} />
        </Button>
      </Box>

      {/* Client and Work Order Info */}
      {(report.client?.name ||
        report.clientData?.name ||
        report.workOrder?.number ||
        report.workOrderData?.number) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          {(report.client?.name || report.clientData?.name) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="eva:people-fill" width={16} />
              <Typography variant="body2" color="text.secondary">
                {report.client?.name || report.clientData?.name}
                {(report.client?.company || report.clientData?.company) &&
                  ` (${report.client?.company || report.clientData?.company})`}
              </Typography>
            </Box>
          )}

          {(report.workOrder?.number || report.workOrderData?.number) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="eva:folder-fill" width={16} />
              <Typography variant="body2" color="text.secondary">
                {report.workOrder?.number || report.workOrderData?.number} -{' '}
                {report.workOrder?.title || report.workOrderData?.title}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Cost Summary */}
      {report.totalCost > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total Cost:
          </Typography>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            ${report.totalCost.toFixed(2)}
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderTabs = () => (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={tabs.value}
        onChange={tabs.onChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            minWidth: 'auto',
            px: 2,
            py: 1.5,
          },
        }}
      >
        <Tab value="overview" label="Overview" />
        <Tab value="materials" label={`Materials (${report.materialsUsed?.length || 0})`} />
        <Tab value="time" label={`Time (${report.timeEntries?.length || 0})`} />
        <Tab
          value="attachments"
          label={`Files (${(report.attachments?.length || 0) + (report.photos?.length || 0)})`}
        />
      </Tabs>
    </Box>
  );

  const renderTabContent = () => {
    switch (tabs.value) {
      case 'overview':
        return <ReportOverviewTab report={report} onUpdate={onUpdate} />;
      case 'materials':
        return <ReportMaterialsTab report={report} onUpdate={onUpdate} canEdit={canEdit} />;
      case 'time':
        return <ReportTimeEntriesTab report={report} onUpdate={onUpdate} canEdit={canEdit} />;
      case 'attachments':
        return <ReportAttachmentsTab report={report} onUpdate={onUpdate} canEdit={canEdit} />;
      default:
        return null;
    }
  };

  const renderActions = () => (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        p: 3,
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Button
        variant="outlined"
        onClick={handleExport}
        startIcon={<Iconify icon="eva:download-fill" width={16} />}
        sx={{ flex: 1 }}
      >
        Export PDF
      </Button>

      {canSubmit && (
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={<Iconify icon="eva:paper-plane-fill" width={16} />}
          sx={{ flex: 1 }}
        >
          Submit for Review
        </Button>
      )}

      {canApprove && (
        <Button
          variant="contained"
          onClick={handleApprove}
          disabled={approving}
          startIcon={<Iconify icon="eva:checkmark-circle-fill" width={16} />}
          sx={{ flex: 1 }}
        >
          Approve
        </Button>
      )}
    </Box>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: {
          sx: {
            width: { xs: '100%', sm: 600 },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {renderHeader()}
      {renderTabs()}

      <Scrollbar fillContent sx={{ flex: 1 }}>
        <Box sx={{ p: 3 }}>{renderTabContent()}</Box>
      </Scrollbar>

      {renderActions()}
    </Drawer>
  );
}
