'use client';

import { useSearchParams } from 'next/navigation';
import { usePopover } from 'minimal-shared/hooks';
import useSWR, { type SWRConfiguration } from 'swr';

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
  CircularProgress,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { fetcher, endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

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
  technicianId?: string | { _id: string; employeeId: string; userId: string };
  estimatedDuration: number;
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

  // Get clientId from URL parameters
  const clientId = searchParams.get('clientId');

  // Build API URL with client filter
  const apiUrl = clientId
    ? `${endpoints.fsa.workOrders.list}?clientId=${clientId}`
    : endpoints.fsa.workOrders.list;

  // Fetch work orders data
  const { data, error, isLoading } = useSWR(apiUrl, fetcher, swrOptions);

  const workOrders = data?.data?.workOrders || [];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">Failed to load work orders</Typography>
      </Box>
    );
  }

  return (
    <>
      <Card>
        <CustomBreadcrumbs
          heading={clientId ? 'Work Orders (Filtered)' : 'Work Orders'}
          links={[
            { name: 'Dashboard', href: '/dashboard' },
            { name: 'Work Orders' },
            ...(clientId ? [{ name: 'Filtered by Client' }] : []),
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              href="/dashboard/work-orders/new"
            >
              New Work Order
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Work Order</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Technician</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Stack spacing={2} alignItems="center">
                      <Iconify
                        icon="solar:file-search-bold"
                        width={48}
                        sx={{ color: 'text.disabled' }}
                      />
                      <Typography variant="h6" color="text.secondary">
                        {clientId ? 'No work orders found for this client' : 'No work orders found'}
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        {clientId
                          ? 'This client does not have any work orders yet.'
                          : 'Create your first work order to get started.'}
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
                      {typeof row.clientId === 'object' ? row.clientId.name : 'Unknown Client'}
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
                      {typeof row.technicianId === 'object'
                        ? row.technicianId.employeeId
                        : 'Unassigned'}
                    </TableCell>

                    <TableCell>
                      {row.scheduledDate ? fDateTime(row.scheduledDate) : 'Not scheduled'}
                    </TableCell>

                    <TableCell>{row.estimatedDuration} min</TableCell>

                    <TableCell align="right">
                      <IconButton
                        color={popover.open ? 'inherit' : 'default'}
                        onClick={popover.onOpen}
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
        <MenuItem onClick={popover.onClose}>
          <Iconify icon="solar:eye-bold" sx={{ mr: 2 }} />
          View
        </MenuItem>

        <MenuItem onClick={popover.onClose}>
          <Iconify icon="solar:pen-bold" sx={{ mr: 2 }} />
          Edit
        </MenuItem>

        <MenuItem onClick={popover.onClose} sx={{ color: 'error.main' }}>
          <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Popover>
    </>
  );
}
