'use client';

import type { IReport, ReportStats, ReportSearchParams } from 'src/lib/models/Report';

import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Stack,
  Button,
  Tooltip,
  Container,
  Typography,
  IconButton,
} from '@mui/material';

import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { ReportsTable } from '../components/reports-table';
import { ReportsStats } from '../components/reports-stats';
import { ReportsFilters } from '../components/reports-filters';
import { ReportCreateDrawer } from '../components/report-create-drawer';
import { ReportDetailsDrawer } from '../components/report-details-drawer';

// ----------------------------------------------------------------------

export function ReportsView() {
  const [reports, setReports] = useState<IReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportSearchParams>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Drawer states
  const detailsDrawer = useBoolean();
  const createDrawer = useBoolean();
  const [selectedReport, setSelectedReport] = useState<IReport | null>(null);

  // Load reports data
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const [reportsResponse, statsResponse] = await Promise.all([
        ReportService.getAllReports(filters),
        ReportService.getDashboardStats('30'),
      ]);

      if (reportsResponse.success) {
        setReports(reportsResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handle report selection
  const handleReportSelect = useCallback(
    (report: IReport) => {
      setSelectedReport(report);
      detailsDrawer.onTrue();
    },
    [detailsDrawer]
  );

  // Handle report update
  const handleReportUpdate = useCallback((updatedReport: IReport) => {
    setReports((prev) =>
      prev.map((report) => (report._id === updatedReport._id ? updatedReport : report))
    );
    setSelectedReport(updatedReport);
  }, []);

  // Handle report creation
  const handleReportCreate = useCallback(
    (newReport: IReport) => {
      setReports((prev) => [newReport, ...prev]);
      createDrawer.onFalse();
      toast.success('Report created successfully');
    },
    [createDrawer]
  );

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: Partial<ReportSearchParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Handle CSV export
  const handleExportCSV = useCallback(async () => {
    try {
      // Get all reports for export (without pagination)
      const exportFilters = { ...filters, limit: 1000 };
      const response = await ReportService.getAllReports(exportFilters);

      if (response.success) {
        const csvData = convertReportsToCSV(response.data);
        downloadCSV(csvData, 'reports-export.csv');
        toast.success('Reports exported successfully');
      }
    } catch (error) {
      console.error('Error exporting reports:', error);
      toast.error('Failed to export reports');
    }
  }, [filters]);

  // Convert reports to CSV format
  const convertReportsToCSV = (reportsData: IReport[]) => {
    const headers = [
      'ID',
      'Type',
      'Status',
      'Priority',
      'Location',
      'Report Date',
      'Created By',
      'Client',
      'Work Order',
      'Total Cost',
      'Total Hours',
      'Materials Count',
      'Time Entries Count',
      'Created At',
      'Updated At',
    ];

    const rows = reportsData.map((report) => [
      report._id,
      report.type,
      report.status,
      report.priority,
      report.location || '',
      new Date(report.reportDate).toLocaleDateString(),
      report.createdBy?.name ||
        report.createdByData?.name ||
        report.createdBy?.email ||
        report.createdByData?.email ||
        'Unknown User',
      report.client?.name || report.clientData?.name || '',
      report.workOrder?.number || report.workOrderData?.number || '',
      report.totalCost.toFixed(2),
      report.totalHours?.toFixed(2) || '0',
      report.materialsUsed.length.toString(),
      report.timeEntries.length.toString(),
      new Date(report.createdAt).toLocaleString(),
      new Date(report.updatedAt).toLocaleString(),
    ]);

    return [headers, ...rows];
  };

  // Download CSV file
  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Container maxWidth="xl">
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and track all field service reports
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Tooltip title="Export to CSV">
              <IconButton onClick={handleExportCSV} color="primary">
                <Iconify icon="eva:download-fill" />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={createDrawer.onTrue}
            >
              Create Report
            </Button>
          </Stack>
        </Box>

        {/* Stats Cards */}
        {stats && <ReportsStats stats={stats} />}

        {/* Filters */}
        <Card>
          <ReportsFilters filters={filters} onFiltersChange={handleFiltersChange} />
        </Card>

        {/* Reports Table */}
        <Card>
          {reports.length > 0 ? (
            <ReportsTable
              reports={reports}
              onReportSelect={handleReportSelect}
              onReportUpdate={handleReportUpdate}
            />
          ) : (
            <EmptyContent
              title="No reports found"
              description="Get started by creating your first report"
              imgUrl="/assets/illustrations/illustration_empty_content.svg"
              action={
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="eva:plus-fill" />}
                  onClick={createDrawer.onTrue}
                >
                  Create Report
                </Button>
              }
            />
          )}
        </Card>
      </Stack>

      {/* Drawers */}
      {selectedReport && (
        <ReportDetailsDrawer
          open={detailsDrawer.value}
          onClose={detailsDrawer.onFalse}
          report={selectedReport}
          onUpdate={handleReportUpdate}
        />
      )}

      <ReportCreateDrawer
        open={createDrawer.value}
        onClose={createDrawer.onFalse}
        onSuccess={handleReportCreate}
      />
    </Container>
  );
}
