'use client';

import { useTheme } from '@mui/material/styles';
import { Card, Link, Stack, CardHeader, Typography, CardContent } from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const RECENT_WORK_ORDERS = [
  {
    id: '1',
    workOrderNumber: 'WO-000001',
    title: 'HVAC System Maintenance',
    customer: 'TechCorp Solutions',
    status: 'in-progress',
    priority: 'high',
    scheduledDate: new Date('2024-01-15T09:00:00'),
    technician: 'John Smith',
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

  return (
    <Card>
      <CardHeader
        title="Recent Work Orders"
        action={
          <Link
            href="/dashboard/fsa/work-orders"
            color="primary"
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            View All
            <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
          </Link>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          {RECENT_WORK_ORDERS.map((workOrder) => (
            <Stack
              key={workOrder.id}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: 2,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle2">{workOrder.workOrderNumber}</Typography>
                  <Label color={getStatusColor(workOrder.status)} variant="soft">
                    {workOrder.status}
                  </Label>
                  <Label color={getPriorityColor(workOrder.priority)} variant="soft">
                    {workOrder.priority}
                  </Label>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {workOrder.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {workOrder.customer} • {workOrder.technician}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {fDateTime(workOrder.scheduledDate)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
