import { Card, Grid, Chip, Stack, Button, Divider, Typography, CardContent } from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

// Mock data - in real app, this would come from API
const WORK_ORDER = {
  id: '1',
  workOrderNumber: 'WO-000001',
  title: 'HVAC System Maintenance',
  description: 'Routine maintenance and inspection of HVAC system in main office building',
  customer: {
    id: '1',
    name: 'TechCorp Solutions',
    email: 'contact@techcorp.com',
    phone: '+1-555-0456',
    address: '123 Business Ave, New York, NY 10001',
  },
  technician: {
    id: '1',
    name: 'John Smith',
    phone: '+1-555-0123',
  },
  status: 'in-progress',
  priority: 'high',
  category: 'HVAC Maintenance',
  location: {
    address: '123 Business Ave',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
  },
  scheduledDate: new Date('2024-01-15T09:00:00'),
  estimatedDuration: 120,
  actualDuration: null,
  cost: {
    labor: 0,
    materials: 0,
    total: 0,
  },
  materials: [],
  notes: 'Customer prefers morning appointments',
  history: [
    {
      status: 'created',
      timestamp: new Date('2024-01-14T10:00:00'),
      user: 'Admin User',
      notes: 'Work order created',
    },
    {
      status: 'assigned',
      timestamp: new Date('2024-01-14T14:30:00'),
      user: 'Admin User',
      notes: 'Assigned to John Smith',
    },
    {
      status: 'in-progress',
      timestamp: new Date('2024-01-15T09:00:00'),
      user: 'John Smith',
      notes: 'Started work on HVAC system',
    },
  ],
  createdAt: new Date('2024-01-14T10:00:00'),
  updatedAt: new Date('2024-01-15T09:00:00'),
};

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

export function WorkOrderDetails({ id }: Props) {
  const workOrder = WORK_ORDER; // In real app, fetch by id

  return (
    <>
      <CustomBreadcrumbs
        heading={workOrder.workOrderNumber}
        links={[
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Work Orders', href: '/dashboard/work-orders' },
          { name: workOrder.workOrderNumber },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Iconify icon="eva:edit-fill" />}>
              Edit
            </Button>
            <Button variant="contained" startIcon={<Iconify icon="eva:checkmark-fill" />}>
              Complete
            </Button>
          </Stack>
        }
        sx={{ mb: 5 }}
      />

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h5">{workOrder.title}</Typography>
                  <Chip
                    label={workOrder.status}
                    color={getStatusColor(workOrder.status)}
                    variant="soft"
                  />
                  <Chip
                    label={workOrder.priority}
                    color={getPriorityColor(workOrder.priority)}
                    variant="soft"
                  />
                </Stack>

                <Typography variant="body1" color="text.secondary">
                  {workOrder.description}
                </Typography>

                <Divider />

                <Stack spacing={2}>
                  <Typography variant="h6">Work Order Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Work Order Number
                        </Typography>
                        <Typography variant="body2">{workOrder.workOrderNumber}</Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Category
                        </Typography>
                        <Typography variant="body2">{workOrder.category}</Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Scheduled Date
                        </Typography>
                        <Typography variant="body2">
                          {fDateTime(workOrder.scheduledDate)}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Estimated Duration
                        </Typography>
                        <Typography variant="body2">
                          {workOrder.estimatedDuration} minutes
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  <Typography variant="h6">Location</Typography>
                  <Typography variant="body2">
                    {workOrder.location.address}
                    <br />
                    {workOrder.location.city}, {workOrder.location.state}{' '}
                    {workOrder.location.zipCode}
                  </Typography>
                </Stack>

                {workOrder.notes && (
                  <>
                    <Divider />
                    <Stack spacing={2}>
                      <Typography variant="h6">Notes</Typography>
                      <Typography variant="body2">{workOrder.notes}</Typography>
                    </Stack>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Customer Information */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Customer</Typography>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">{workOrder.customer.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {workOrder.customer.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {workOrder.customer.phone}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {workOrder.customer.address}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Technician Information */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Assigned Technician</Typography>
                  {workOrder.technician ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">{workOrder.technician.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {workOrder.technician.phone}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No technician assigned
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Work Order History */}
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">History</Typography>
                  <Stack spacing={2}>
                    {workOrder.history.map((entry, index) => (
                      <Stack key={index} spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip
                            label={entry.status}
                            color={getStatusColor(entry.status)}
                            variant="soft"
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {fDateTime(entry.timestamp)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {entry.user}
                        </Typography>
                        {entry.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {entry.notes}
                          </Typography>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
