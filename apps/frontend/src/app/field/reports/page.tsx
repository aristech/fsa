'use client';

import dayjs from 'dayjs';
import { Iconify } from '@/components/iconify';
import React, { useState, useCallback } from 'react';
import {
  MobileCard,
  MobileModal,
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileDatePicker,
} from '@/components/mobile';

import { Box, Fab, Chip, alpha, Divider, useTheme, Typography } from '@mui/material';

// Mock data for reports
interface MockReport {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'incident' | 'maintenance' | 'inspection';
  client: string;
  project: string;
  date: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdBy: string;
  description: string;
  attachments: number;
}

const mockReports: MockReport[] = [
  {
    id: '1',
    title: 'Daily Work Report - Building A',
    type: 'daily',
    client: 'ABC Corporation',
    project: 'HVAC Installation',
    date: new Date(2024, 0, 15),
    status: 'submitted',
    createdBy: 'John Smith',
    description: 'Completed installation of main HVAC unit and tested all systems.',
    attachments: 3,
  },
  {
    id: '2',
    title: 'Incident Report - Electrical Issue',
    type: 'incident',
    client: 'XYZ Industries',
    project: 'Electrical Maintenance',
    date: new Date(2024, 0, 14),
    status: 'approved',
    createdBy: 'Mike Johnson',
    description: 'Reported and resolved electrical panel malfunction in Building B.',
    attachments: 5,
  },
  {
    id: '3',
    title: 'Weekly Progress Report',
    type: 'weekly',
    client: 'DEF Construction',
    project: 'Plumbing Renovation',
    date: new Date(2024, 0, 12),
    status: 'draft',
    createdBy: 'Sarah Wilson',
    description: 'Weekly progress update on plumbing renovation project.',
    attachments: 2,
  },
  {
    id: '4',
    title: 'Safety Inspection Report',
    type: 'inspection',
    client: 'GHI Manufacturing',
    project: 'Safety Compliance',
    date: new Date(2024, 0, 10),
    status: 'submitted',
    createdBy: 'David Brown',
    description: 'Monthly safety inspection completed for all equipment.',
    attachments: 8,
  },
];

const reportTypes = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'incident', label: 'Incident Report' },
  { value: 'maintenance', label: 'Maintenance Report' },
  { value: 'inspection', label: 'Inspection Report' },
];

const reportStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const clients = [
  { value: 'abc-corp', label: 'ABC Corporation' },
  { value: 'xyz-industries', label: 'XYZ Industries' },
  { value: 'def-construction', label: 'DEF Construction' },
  { value: 'ghi-manufacturing', label: 'GHI Manufacturing' },
];

export default function FieldReportsPage() {
  const theme = useTheme();
  const [reports] = useState<MockReport[]>(mockReports);
  const [filteredReports, setFilteredReports] = useState<MockReport[]>(mockReports);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MockReport | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    client: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  });

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = reports;

    if (filters.type) {
      filtered = filtered.filter((report) => report.type === filters.type);
    }

    if (filters.status) {
      filtered = filtered.filter((report) => report.status === filters.status);
    }

    if (filters.client) {
      filtered = filtered.filter((report) =>
        report.client.toLowerCase().includes(filters.client.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((report) => report.date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((report) => report.date <= filters.dateTo!);
    }

    setFilteredReports(filtered);
  }, [reports, filters]);

  const clearFilters = useCallback(() => {
    setFilters({
      type: '',
      status: '',
      client: '',
      dateFrom: null,
      dateTo: null,
    });
    setFilteredReports(reports);
  }, [reports]);

  const handleReportSelect = useCallback((report: MockReport) => {
    setSelectedReport(report);
    setDetailModalOpen(true);
  }, []);

  const handleCreateReport = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'submitted':
        return 'info';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return 'eva:calendar-fill';
      case 'weekly':
        return 'eva:clock-fill';
      case 'incident':
        return 'eva:alert-triangle-fill';
      case 'maintenance':
        return 'eva:settings-fill';
      case 'inspection':
        return 'eva:search-fill';
      default:
        return 'eva:file-text-fill';
    }
  };

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

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
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and create field reports
        </Typography>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          padding: theme.spacing(2, 3),
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Filters
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileSelect
                label="Report Type"
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value)}
                options={[{ value: '', label: 'All Types' }, ...reportTypes]}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileSelect
                label="Status"
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                options={[{ value: '', label: 'All Status' }, ...reportStatuses]}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileInput
                label="Client"
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                placeholder="Search client..."
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileDatePicker
                label="From Date"
                value={filters.dateFrom ? dayjs(filters.dateFrom) : null}
                onChange={(date) => handleFilterChange('dateFrom', date?.toDate() || null)}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileDatePicker
                label="To Date"
                value={filters.dateTo ? dayjs(filters.dateTo) : null}
                onChange={(date) => handleFilterChange('dateTo', date?.toDate() || null)}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: '120px' }}>
              <MobileButton variant="outline" onClick={clearFilters} fullWidth>
                Clear Filters
              </MobileButton>
            </Box>
          </Box>

          <MobileButton
            variant="primary"
            onClick={applyFilters}
            fullWidth
            icon={<Iconify icon="eva:search-fill" width={16} />}
          >
            Apply Filters
          </MobileButton>
        </Box>
      </Box>

      {/* Reports List */}
      <Box sx={{ flex: 1, overflow: 'auto', padding: theme.spacing(2, 3) }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredReports.map((report) => (
            <MobileCard
              key={report.id}
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                      {report.title}
                    </Typography>
                    <Chip
                      label={report.status}
                      color={getStatusColor(report.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {report.client} • {report.project}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {report.description}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:calendar-fill" width={14} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(report.date)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:person-fill" width={14} />
                      <Typography variant="caption" color="text.secondary">
                        {report.createdBy}
                      </Typography>
                    </Box>
                    {report.attachments > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Iconify icon="eva:paperclip-fill" width={14} />
                        <Typography variant="caption" color="text.secondary">
                          {report.attachments} files
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </MobileCard>
          ))}

          {filteredReports.length === 0 && (
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
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or create a new report
              </Typography>
            </Box>
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
          bottom: { xs: '100px', sm: '24px' },
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

      {/* Report Detail Modal */}
      <MobileModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Report Details"
        size="large"
        actions={
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <MobileButton
              variant="outline"
              size="medium"
              icon={<Iconify icon="eva:edit-fill" width={16} />}
              onClick={() => console.log('Edit report')}
            >
              Edit
            </MobileButton>
            <MobileButton
              variant="primary"
              size="medium"
              icon={<Iconify icon="eva:download-fill" width={16} />}
              onClick={() => console.log('Download report')}
            >
              Download
            </MobileButton>
          </Box>
        }
      >
        {selectedReport && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify
                  icon={getTypeIcon(selectedReport.type)}
                  width={28}
                  sx={{ color: theme.palette.primary.main }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {selectedReport.title}
                </Typography>
                <Chip
                  label={selectedReport.status}
                  color={getStatusColor(selectedReport.status) as any}
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Client
                </Typography>
                <Typography variant="body1">{selectedReport.client}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Project
                </Typography>
                <Typography variant="body1">{selectedReport.project}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Date
                </Typography>
                <Typography variant="body1">{formatDate(selectedReport.date)}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Created By
                </Typography>
                <Typography variant="body1">{selectedReport.createdBy}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Description
                </Typography>
                <Typography variant="body1">{selectedReport.description}</Typography>
              </Box>

              {selectedReport.attachments > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Attachments
                  </Typography>
                  <Typography variant="body1">
                    {selectedReport.attachments} file{selectedReport.attachments > 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </MobileModal>

      {/* Create Report Modal */}
      <MobileModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Report"
        size="large"
        actions={
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            <MobileButton variant="outline" size="medium" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </MobileButton>
            <MobileButton
              variant="primary"
              size="medium"
              icon={<Iconify icon="eva:save-fill" width={16} />}
              onClick={() => console.log('Create report')}
            >
              Create Report
            </MobileButton>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <MobileInput label="Report Title" placeholder="Enter report title..." />

          <MobileSelect label="Report Type" value="" onChange={() => {}} options={reportTypes} />

          <MobileSelect label="Client" value="" onChange={() => {}} options={clients} />

          <MobileInput label="Project" placeholder="Enter project name..." />

          <MobileDatePicker label="Report Date" value={null} onChange={() => {}} />

          <MobileInput
            label="Description"
            placeholder="Enter report description..."
            multiline
            rows={4}
          />
        </Box>
      </MobileModal>
    </Box>
  );
}
