'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Grid from '@mui/material/Grid';
import { Card, Stack, Button, MenuItem, Typography, CardContent } from '@mui/material';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Form, RHFSelect, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const workOrderSchema = zod.object({
  customerId: zod.string().min(1, 'Customer is required'),
  title: zod.string().min(1, 'Title is required'),
  description: zod.string().min(1, 'Description is required'),
  priority: zod.enum(['low', 'medium', 'high', 'urgent']),
  category: zod.string().min(1, 'Category is required'),
  location: zod.object({
    address: zod.string().min(1, 'Address is required'),
    city: zod.string().min(1, 'City is required'),
    state: zod.string().min(1, 'State is required'),
    zipCode: zod.string().min(1, 'ZIP code is required'),
  }),
  scheduledDate: zod.string().optional(),
  estimatedDuration: zod.number().min(1, 'Duration must be at least 1 minute'),
  notes: zod.string().optional(),
});

type WorkOrderFormValues = zod.infer<typeof workOrderSchema>;

// ----------------------------------------------------------------------

const CUSTOMERS = [
  { id: '1', name: 'TechCorp Solutions' },
  { id: '2', name: 'ABC Manufacturing' },
  { id: '3', name: 'XYZ Office Building' },
  { id: '4', name: 'Safety First Corp' },
];

const CATEGORIES = [
  'HVAC Maintenance',
  'Electrical Work',
  'Plumbing',
  'Fire Safety',
  'General Maintenance',
  'Emergency Repair',
];

// ----------------------------------------------------------------------

export function WorkOrderCreateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      customerId: '',
      title: '',
      description: '',
      priority: 'medium',
      category: '',
      location: {
        address: '',
        city: '',
        state: '',
        zipCode: '',
      },
      scheduledDate: '',
      estimatedDuration: 60,
      notes: '',
    },
  });

  const { handleSubmit, control } = methods;

  const onSubmit = async (data: WorkOrderFormValues) => {
    try {
      setIsSubmitting(true);
      console.log('Creating work order:', data);
      // TODO: Implement API call
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      console.error('Error creating work order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <CustomBreadcrumbs
        heading="Create Work Order"
        links={[
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Work Orders', href: '/dashboard/work-orders' },
          { name: 'Create' },
        ]}
        sx={{ mb: 5 }}
      />

      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <RHFSelect name="customerId" label="Customer" placeholder="Select customer">
                    {CUSTOMERS.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </MenuItem>
                    ))}
                  </RHFSelect>
                </Grid>

                <Grid item xs={12} md={6}>
                  <RHFSelect name="category" label="Category" placeholder="Select category">
                    {CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </RHFSelect>
                </Grid>

                <Grid item xs={12}>
                  <RHFTextField name="title" label="Title" />
                </Grid>

                <Grid item xs={12}>
                  <RHFTextField name="description" label="Description" multiline rows={3} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <RHFSelect name="priority" label="Priority">
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </RHFSelect>
                </Grid>

                <Grid item xs={12} md={6}>
                  <RHFTextField
                    name="estimatedDuration"
                    label="Estimated Duration (minutes)"
                    type="number"
                  />
                </Grid>
              </Grid>
            </Stack>

            {/* Location Information */}
            <Stack spacing={2}>
              <Typography variant="h6">Location Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <RHFTextField name="location.address" label="Address" />
                </Grid>

                <Grid item xs={12} md={4}>
                  <RHFTextField name="location.city" label="City" />
                </Grid>

                <Grid item xs={12} md={4}>
                  <RHFTextField name="location.state" label="State" />
                </Grid>

                <Grid item xs={12} md={4}>
                  <RHFTextField name="location.zipCode" label="ZIP Code" />
                </Grid>
              </Grid>
            </Stack>

            {/* Additional Information */}
            <Stack spacing={2}>
              <Typography variant="h6">Additional Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <RHFTextField
                    name="scheduledDate"
                    label="Scheduled Date"
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <RHFTextField
                    name="notes"
                    label="Notes"
                    multiline
                    rows={3}
                    placeholder="Additional notes or special instructions..."
                  />
                </Grid>
              </Grid>
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" href="/dashboard/work-orders">
                Cancel
              </Button>
              <Button type="submit" variant="contained" loading={isSubmitting}>
                Create Work Order
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Form>
  );
}
