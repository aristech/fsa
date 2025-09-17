'use client';

import type { IReport } from 'src/lib/models/Report';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import {
  Box,
  Chip,
  Menu,
  Table,
  Avatar,
  Tooltip,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
  ListItemIcon,
  ListItemText,
  TableContainer,
  TablePagination,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

interface ReportsTableProps {
  reports: IReport[];
  onReportSelect: (report: IReport) => void;
  onReportUpdate: (report: IReport) => void;
  onReportDelete: (report: IReport) => void;
}

export function ReportsTable({
  reports,
  onReportSelect,
  onReportUpdate,
  onReportDelete,
}: ReportsTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReport, setSelectedReport] = useState<IReport | null>(null);

  const menuOpen = useBoolean();

  // Handle page change
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  // Handle rows per page change
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Handle row click
  const handleRowClick = useCallback(
    (report: IReport) => {
      onReportSelect(report);
    },
    [onReportSelect]
  );

  // Handle menu open
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, report: IReport) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
      setSelectedReport(report);
      menuOpen.onTrue();
    },
    [menuOpen]
  );

  // Handle menu close
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedReport(null);
    menuOpen.onFalse();
  }, [menuOpen]);

  // Get status color
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

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'urgent':
        return 'error';
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

  // Paginated reports
  const paginatedReports = reports.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
        <Scrollbar>
          <Table size="medium" sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell>Report</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Report Date</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Total Cost</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedReports.map((report) => (
                <TableRow
                  key={report._id}
                  hover
                  onClick={() => handleRowClick(report)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.light',
                          width: 40,
                          height: 40,
                        }}
                      >
                        <Iconify icon={getTypeIcon(report.type)} width={20} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {report._id.slice(-8)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip label={report.type} size="small" sx={{ textTransform: 'capitalize' }} />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={report.status.replace('_', ' ')}
                      color={getStatusColor(report.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={report.priority}
                      color={getPriorityColor(report.priority) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {report.location || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {report.client?.name ||
                        report.clientData?.name ||
                        (typeof report.clientId === 'object' && report.clientId ? (report.clientId as any)?.name : undefined) ||
                        '-'}
                    </Typography>
                    {(report.client?.company ||
                      report.clientData?.company ||
                      (typeof report.clientId === 'object' && report.clientId ? (report.clientId as any)?.company : undefined)) && (
                      <Typography variant="caption" color="text.secondary">
                        {report.client?.company ||
                          report.clientData?.company ||
                          (typeof report.clientId === 'object' && report.clientId ? (report.clientId as any)?.company : undefined)}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {dayjs(report.reportDate).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {report.createdBy?.name ||
                              report.createdByData?.name ||
                              report.createdBy?.email ||
                              report.createdByData?.email ||
                              'Unknown User'}
                          </Typography>
                          {(report.createdBy?.email || report.createdByData?.email) && (
                            <Typography variant="caption" color="text.secondary">
                              {report.createdBy?.email || report.createdByData?.email}
                            </Typography>
                          )}
                        </Box>
                      }
                      arrow
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        {report.createdBy?.name?.charAt(0)?.toUpperCase() ||
                          report.createdByData?.name?.charAt(0)?.toUpperCase() ||
                          report.createdBy?.email?.charAt(0)?.toUpperCase() ||
                          'U'}
                      </Avatar>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ${report.totalCost.toFixed(2)}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="More actions">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, report)}>
                        <Iconify icon="eva:more-vertical-fill" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>

      <TablePagination
        page={page}
        component="div"
        count={reports.length}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        rowsPerPageOptions={[5, 10, 25]}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen.value}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            if (selectedReport) {
              handleRowClick(selectedReport);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Iconify icon="eva:eye-fill" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (selectedReport) {
              // Handle edit action
              handleRowClick(selectedReport);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Iconify icon="eva:edit-fill" />
          </ListItemIcon>
          <ListItemText>Edit Report</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (selectedReport) {
              // Handle export action
              // This would trigger the export functionality
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Iconify icon="eva:download-fill" />
          </ListItemIcon>
          <ListItemText>Export PDF</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (selectedReport) {
              onReportDelete(selectedReport);
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Iconify icon="eva:trash-2-fill" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete Report</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
