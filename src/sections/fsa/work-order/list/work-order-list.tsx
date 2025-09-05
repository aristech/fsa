'use client';

import { useState } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import {
  Card,
  Chip,
  Table,
  Stack,
  Button,
  Popover,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const WORK_ORDERS = [
  {
    id: '1',
    workOrderNumber: 'WO-000001',
    title: 'HVAC System Maintenance',
    customer: 'TechCorp Solutions',
    status: 'in-progress',
    priority: 'high',
    scheduledDate: new Date('2024-01-15T09:00:00'),
    technician: 'John Smith',
    estimatedDuration: 120,
  },
  {
    id: '2',
    workOrderNumber: 'WO-000002',
    title: 'Electrical Panel Inspection',
    customer: 'ABC Manufacturing',
    status: 'assigned',
    priority: 'medium',
    scheduledDate: new Date('2024-01-15T14:00:00'),
    technician: 'Sarah Johnson',
    estimatedDuration: 90,
  },
  {
    id: '3',
    workOrderNumber: 'WO-000003',
    title: 'Plumbing Repair',
    customer: 'XYZ Office Building',
    status: 'completed',
    priority: 'low',
    scheduledDate: new Date('2024-01-14T10:00:00'),
    technician: 'Mike Wilson',
    estimatedDuration: 60,
  },
  {
    id: '4',
    workOrderNumber: 'WO-000004',
    title: 'Fire Safety System Check',
    customer: 'Safety First Corp',
    status: 'created',
    priority: 'urgent',
    scheduledDate: new Date('2024-01-16T08:00:00'),
    technician: null,
    estimatedDuration: 180,
  },
];

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
  const [tableData] = useState(WORK_ORDERS);
  const popover = usePopover();

  return (
    <>
      <Card>
        <CustomBreadcrumbs
          heading="Work Orders"
          links={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Work Orders' }]}
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
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Technician</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">{row.workOrderNumber}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {row.title}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>{row.customer}</TableCell>

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

                  <TableCell>{row.technician || 'Unassigned'}</TableCell>

                  <TableCell>{fDateTime(row.scheduledDate)}</TableCell>

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
              ))}
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
