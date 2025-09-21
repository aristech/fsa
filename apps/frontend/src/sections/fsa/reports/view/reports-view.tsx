'use client';

import type { IReport, ReportSearchParams } from 'src/lib/models/Report';

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

import { useTranslate } from 'src/locales/use-locales';
import { useClient } from 'src/contexts/client-context';
import { ReportService } from 'src/lib/services/report-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { ConfirmationDialog } from 'src/components/confirmation-dialog';

import { ReportCreateDrawer } from 'src/sections/field/reports/report-create-drawer';

import { ReportsTable } from '../components/reports-table';
import { ReportsFilters } from '../components/reports-filters';
import { ReportDetailsDrawer } from '../components/report-details-drawer';

// ----------------------------------------------------------------------

export function ReportsView() {
  const { t } = useTranslate('dashboard');
  const { selectedClient } = useClient();
  const [reports, setReports] = useState<IReport[]>([]);
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

  // Delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<IReport | null>(null);

  // Load reports data
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      // Add client filter to the params if a client is selected
      const filtersWithClient = selectedClient
        ? { ...filters, clientId: selectedClient._id }
        : filters;

      const reportsResponse = await ReportService.getAllReports(filtersWithClient);

      if (reportsResponse.success) {
        setReports(reportsResponse.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error(t('reports.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [filters, selectedClient, t]);

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
      toast.success(t('reports.reportCreated'));
    },
    [createDrawer, t]
  );

  // Handle report deletion
  const handleReportDelete = useCallback((report: IReport) => {
    setReportToDelete(report);
    setDeleteConfirmOpen(true);
  }, []);

  // Handle confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!reportToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await ReportService.deleteReport(reportToDelete._id);

      if (response.success) {
        setReports((prev) => prev.filter((report) => report._id !== reportToDelete._id));
        setDeleteConfirmOpen(false);
        setReportToDelete(null);
        toast.success(t('reports.reportDeleted'));
      } else {
        toast.error(response.message || t('reports.failedToDelete'));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error(t('reports.failedToDelete'));
    } finally {
      setDeleteLoading(false);
    }
  }, [reportToDelete, t]);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: Partial<ReportSearchParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Convert reports to CSV format
  const convertReportsToCSV = useCallback(
    (reportsData: IReport[]) => {
      const headers = [
        t('reports.table.id'),
        t('reports.table.type'),
        t('reports.table.status'),
        t('reports.table.priority'),
        t('reports.table.location'),
        t('reports.table.reportDate'),
        t('reports.table.createdBy'),
        t('reports.table.client'),
        t('reports.table.workOrder'),
        t('reports.table.totalCost'),
        t('reports.table.totalHours'),
        t('reports.table.materialsCount'),
        t('reports.table.timeEntriesCount'),
        t('reports.table.createdAt'),
        t('reports.table.updatedAt'),
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
    },
    [t]
  );

  // Handle CSV export
  const handleExportCSV = useCallback(async () => {
    try {
      // Get all reports for export (without pagination)
      const exportFilters = selectedClient
        ? { ...filters, limit: 1000, clientId: selectedClient._id }
        : { ...filters, limit: 1000 };

      const response = await ReportService.getAllReports(exportFilters);

      if (response.success) {
        const csvData = convertReportsToCSV(response.data);
        const filename = selectedClient
          ? `reports-export-${selectedClient.name}.csv`
          : 'reports-export.csv';
        downloadCSV(csvData, filename);
        toast.success(t('reports.reportExportSuccess'));
      }
    } catch (error) {
      console.error('Error exporting reports:', error);
      toast.error(t('reports.failedToExport'));
    }
  }, [filters, selectedClient, convertReportsToCSV, t]);

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
              {t('reports.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('reports.subtitle')}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Tooltip title={t('reports.exportToCSV')}>
              <IconButton onClick={handleExportCSV} color="primary">
                <Iconify icon="eva:download-fill" />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={createDrawer.onTrue}
            >
              {t('reports.createReport')}
            </Button>
          </Stack>
        </Box>

        {/* Stats Cards */}

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
              onReportDelete={handleReportDelete}
            />
          ) : (
            <EmptyContent
              title={t('reports.noReportsFound')}
              description={t('reports.noReportsDescription')}
              action={
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="eva:plus-fill" />}
                  onClick={createDrawer.onTrue}
                >
                  {t('reports.createReport')}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        title={t('reports.deleteReport')}
        message={t('reports.deleteConfirmMessage', { type: reportToDelete?.type })}
        confirmText={t('reports.delete')}
        cancelText={t('reports.cancel')}
        confirmColor="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setReportToDelete(null);
        }}
        loading={deleteLoading}
        icon="solar:trash-bin-trash-bold"
      />
    </Container>
  );
}
