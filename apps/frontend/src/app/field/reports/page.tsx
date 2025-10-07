'use client';

import type { IReport, ReportSearchParams } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import useSWR, { mutate } from 'swr';
import { useMemo, useState, useCallback } from 'react';
import { ReportCreateDrawer } from '@/sections/field/reports/report-create-drawer';

import { Box, Fab, Chip, alpha, useTheme, Typography, InputAdornment } from '@mui/material';

import { formatDate } from 'src/utils/format-date';

import { endpoints } from 'src/lib/axios';
import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import {
  MobileCard,
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileDatePicker,
} from 'src/components/mobile';

import { ReportDetailsDrawer } from 'src/sections/fsa/reports/components/report-details-drawer';

// ----------------------------------------------------------------------

const reportTypes = [
  { value: '', label: 'All Types' },
  { value: 'daily', label: 'Daily Report', icon: 'eva:calendar-fill' },
  { value: 'weekly', label: 'Weekly Report', icon: 'eva:clock-fill' },
  { value: 'monthly', label: 'Monthly Report', icon: 'eva:calendar-outline' },
  { value: 'incident', label: 'Incident Report', icon: 'eva:alert-triangle-fill' },
  { value: 'maintenance', label: 'Maintenance Report', icon: 'eva:settings-fill' },
  { value: 'inspection', label: 'Inspection Report', icon: 'eva:search-fill' },
  { value: 'completion', label: 'Completion Report', icon: 'eva:checkmark-circle-fill' },
  { value: 'safety', label: 'Safety Report', icon: 'eva:shield-fill' },
];

const reportStatuses = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
];

export default function FieldReportsPage() {
  const theme = useTheme();

  // State management
  const [selectedReport, setSelectedReport] = useState<IReport | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states (default to showing only user's assigned reports in field environment)
  const [filters, setFilters] = useState<ReportSearchParams>({
    page: 1,
    limit: 20,
    type: '',
    status: '',
    search: '',
    dateFrom: undefined,
    dateTo: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    assignedToMe: true, // Field technicians should only see their assigned reports
  });

  // Data fetching
  const {
    data: reportsData,
    error,
    isLoading,
  } = useSWR(
    [endpoints.fsa.reports.list, filters],
    ([url]) => ReportService.getAllReports(filters),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  const reports = reportsData?.data || [];
  const pagination = useMemo(
    () => reportsData?.pagination || { total: 0, pages: 1, page: 1 },
    [reportsData?.pagination]
  );

  // Handlers
  const handleFilterChange = useCallback((key: keyof ReportSearchParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      page: 1,
      limit: 20,
      type: '',
      status: '',
      search: '',
      dateFrom: undefined,
      dateTo: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      assignedToMe: true, // Keep assignedToMe enabled in field environment
    });
  }, []);

  const handleReportSelect = useCallback((report: IReport) => {
    setSelectedReport(report);
    setDetailsDrawerOpen(true);
  }, []);

  const handleCreateReport = useCallback(() => {
    setCreateDrawerOpen(true);
  }, []);

  const handleReportCreated = useCallback(
    (newReport: IReport) => {
      setCreateDrawerOpen(false);
      mutate([endpoints.fsa.reports.list, filters]);
      toast.success('Report created successfully');
    },
    [filters]
  );

  const handleReportUpdated = useCallback(
    (updatedReport: IReport) => {
      setSelectedReport(updatedReport);
      mutate([endpoints.fsa.reports.list, filters]);
    },
    [filters]
  );

  const handleLoadMore = useCallback(() => {
    if (pagination.page < pagination.pages) {
      setFilters((prev) => ({ ...prev, page: prev.page! + 1 }));
    }
  }, [pagination]);

  // Utility functions
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

  const getTypeIcon = (type: string) => {
    const typeConfig = reportTypes.find((t) => t.value === type);
    return typeConfig?.icon || 'eva:file-text-fill';
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Failed to load reports</Typography>
        <MobileButton
          variant="outline"
          onClick={() => mutate([endpoints.fsa.reports.list, filters])}
          sx={{ mt: 2 }}
        >
          Retry
        </MobileButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          padding: theme.spacing(2, 3),
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Reports
          </Typography>
          <MobileButton
            variant="outline"
            size="small"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<Iconify icon="eva:funnel-fill" width={16} />}
          >
            Filters
          </MobileButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {pagination.total} report{pagination.total !== 1 ? 's' : ''} found
        </Typography>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Box
          sx={{
            padding: theme.spacing(2, 3),
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <MobileInput
              label="Search"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search reports..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" />
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <MobileSelect
                  label="Type"
                  value={filters.type || ''}
                  onChange={(value) => handleFilterChange('type', value)}
                  options={reportTypes}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <MobileSelect
                  label="Status"
                  value={filters.status || ''}
                  onChange={(value) => handleFilterChange('status', value)}
                  options={reportStatuses}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <MobileDatePicker
                  label="From Date"
                  value={filters.dateFrom ? dayjs(filters.dateFrom) : null}
                  onChange={(date) => handleFilterChange('dateFrom', date?.toDate())}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <MobileDatePicker
                  label="To Date"
                  value={filters.dateTo ? dayjs(filters.dateTo) : null}
                  onChange={(date) => handleFilterChange('dateTo', date?.toDate())}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <MobileButton
                variant="primary"
                onClick={() => setShowFilters(false)}
                icon={<Iconify icon="eva:search-fill" width={16} />}
                sx={{ flex: 1 }}
              >
                Apply Filters
              </MobileButton>
              <MobileButton variant="outline" onClick={handleClearFilters} sx={{ flex: 1 }}>
                Clear
              </MobileButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* Reports List */}
      <Box sx={{ flex: 1, overflow: 'auto', padding: theme.spacing(2, 3) }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <MobileCard key={index} sx={{ opacity: 0.6 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: 'grey.200',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ height: 20, backgroundColor: 'grey.200', borderRadius: 1, mb: 1 }} />
                    <Box
                      sx={{
                        height: 16,
                        backgroundColor: 'grey.100',
                        borderRadius: 1,
                        mb: 1,
                        width: '60%',
                      }}
                    />
                    <Box
                      sx={{
                        height: 14,
                        backgroundColor: 'grey.100',
                        borderRadius: 1,
                        width: '40%',
                      }}
                    />
                  </Box>
                </Box>
              </MobileCard>
            ))
          ) : reports.length > 0 ? (
            reports.map((report: IReport) => (
              <MobileCard
                key={report._id}
                variant="outlined"
                size="medium"
                onTap={() => handleReportSelect(report)}
                sx={{ cursor: 'pointer' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify
                      icon={getTypeIcon(report.type)}
                      width={24}
                      sx={{ color: theme.palette.primary.main }}
                    />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                      </Typography>
                      <Chip
                        label={report.status.replace('_', ' ')}
                        color={getStatusColor(report.status) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>

                    {(report.client?.name || report.workOrder?.number) && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {report.client?.name}
                        {report.client?.name && report.workOrder?.number && ' • '}
                        {report.workOrder?.number}
                      </Typography>
                    )}

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {report.location || 'No location specified'}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Iconify icon="eva:calendar-fill" width={14} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(report.reportDate)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Iconify icon="eva:person-fill" width={14} />
                          <Typography variant="caption" color="text.secondary">
                            {report.createdBy.name}
                          </Typography>
                        </Box>
                      </Box>

                      {report.totalCost > 0 && (
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                          {formatCurrency(report.totalCost)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </MobileCard>
            ))
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: theme.spacing(4),
                textAlign: 'center',
              }}
            >
              <Iconify
                icon="eva:file-text-outline"
                width={64}
                sx={{ color: theme.palette.text.disabled, mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Reports Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {filters.search || filters.type || filters.status
                  ? 'Try adjusting your filters'
                  : 'Create your first report to get started'}
              </Typography>
              <MobileButton
                variant="primary"
                onClick={handleCreateReport}
                startIcon={<Iconify icon="eva:plus-fill" width={16} />}
              >
                Create First Report
              </MobileButton>
            </Box>
          )}

          {/* Load More Button */}
          {reports.length > 0 && pagination.page < pagination.pages && (
            <MobileButton variant="outline" onClick={handleLoadMore} fullWidth sx={{ mt: 2 }}>
              Load More ({pagination.total - reports.length} remaining)
            </MobileButton>
          )}
        </Box>
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Create report"
        onClick={handleCreateReport}
        sx={{
          position: 'fixed',
          bottom: '100px', // Account for bottom navigation on all screen sizes
          right: '24px',
          zIndex: theme.zIndex.speedDial,
          boxShadow: theme.shadows[8],
          '&:hover': {
            boxShadow: theme.shadows[12],
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <Iconify icon="eva:plus-fill" width={24} />
      </Fab>

      {/* Create Report Drawer */}
      <ReportCreateDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={handleReportCreated}
      />

      {/* Report Details Drawer */}
      {selectedReport && (
        <ReportDetailsDrawer
          open={detailsDrawerOpen}
          onClose={() => setDetailsDrawerOpen(false)}
          report={selectedReport}
          onUpdate={handleReportUpdated}
        />
      )}
    </Box>
  );
}
