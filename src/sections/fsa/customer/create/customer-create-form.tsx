'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Grid from '@mui/material/Grid';
import { Card, Stack, Button, Typography, CardContent } from '@mui/material';

import { Form, RHFTextField } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const customerSchema = zod.object({
  name: zod.string().min(1, 'Customer name is required'),
  email: zod.string().email('Invalid email address'),
  phone: zod.string().optional(),
  company: zod.string().optional(),
  address: zod.object({
    street: zod.string().min(1, 'Street address is required'),
    city: zod.string().min(1, 'City is required'),
    state: zod.string().min(1, 'State is required'),
    zipCode: zod.string().min(1, 'ZIP code is required'),
    country: zod.string().min(1, 'Country is required').default('US'),
  }),
  billingAddress: zod
    .object({
      street: zod.string().optional(),
      city: zod.string().optional(),
      state: zod.string().optional(),
      zipCode: zod.string().optional(),
      country: zod.string().optional(),
    })
    .optional(),
  contactPerson: zod
    .object({
      name: zod.string().optional(),
      email: zod.email().optional(),
      phone: zod.string().optional(),
    })
    .optional(),
  notes: zod.string().optional(),
});

type CustomerFormValuesInput = zod.input<typeof customerSchema>;
type CustomerFormValues = zod.output<typeof customerSchema>;

// ----------------------------------------------------------------------

export function CustomerCreateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<CustomerFormValuesInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
      },
      billingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
      },
      contactPerson: {
        name: '',
        email: '',
        phone: '',
      },
      notes: '',
    },
  });

  const { handleSubmit } = methods;

  const onSubmit = async (data: CustomerFormValuesInput) => {
    try {
      setIsSubmitting(true);
      console.log('Creating customer:', data);
      // TODO: Implement API call
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <CustomBreadcrumbs
        heading="Create Customer"
        links={[
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Customers', href: '/dashboard/customers' },
          { name: 'Create' },
        ]}
        sx={{ mb: 5 }}
      />

      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Stack spacing={2}>
              <Typography variant="h6">Basic Information</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="name" label="Customer Name" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="company" label="Company" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="email" label="Email" type="email" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="phone" label="Phone" />
                </Grid>
              </Grid>
            </Stack>

            {/* Address Information */}
            <Stack spacing={2}>
              <Typography variant="h6">Address Information</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <RHFTextField name="address.street" label="Street Address" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="address.city" label="City" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="address.state" label="State" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="address.zipCode" label="ZIP Code" />
                </Grid>
              </Grid>
            </Stack>

            {/* Billing Address */}
            <Stack spacing={2}>
              <Typography variant="h6">Billing Address (Optional)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <RHFTextField name="billingAddress.street" label="Street Address" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="billingAddress.city" label="City" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="billingAddress.state" label="State" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="billingAddress.zipCode" label="ZIP Code" />
                </Grid>
              </Grid>
            </Stack>

            {/* Contact Person */}
            <Stack spacing={2}>
              <Typography variant="h6">Contact Person (Optional)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="contactPerson.name" label="Name" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="contactPerson.email" label="Email" type="email" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="contactPerson.phone" label="Phone" />
                </Grid>
              </Grid>
            </Stack>

            {/* Notes */}
            <Stack spacing={2}>
              <Typography variant="h6">Additional Information</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <RHFTextField
                    name="notes"
                    label="Notes"
                    multiline
                    rows={3}
                    placeholder="Additional notes about the customer..."
                  />
                </Grid>
              </Grid>
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" href="/dashboard/customers">
                Cancel
              </Button>
              <Button type="submit" variant="contained" loading={isSubmitting}>
                Create Customer
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Form>
  );
}
