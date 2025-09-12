'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Grid from '@mui/material/Grid';
import { LoadingButton } from '@mui/lab';
import { Card, Stack, Button, Typography, CardContent } from '@mui/material';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Form, RHFTextField } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const clientSchema = zod.object({
  name: zod.string().min(1, 'Client name is required'),
  email: zod.string().email('Please enter a valid email address'),
  phone: zod.string().optional(),
  company: zod.string().optional(),
  vatNumber: zod.string().optional(),
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
      email: zod
        .string()
        .email('Please enter a valid email address')
        .optional()
        .or(zod.literal('')),
      phone: zod.string().optional(),
    })
    .optional(),
  notes: zod.string().optional(),
});

type ClientFormValuesInput = zod.input<typeof clientSchema>;

type Client = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactPerson?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  client: Client;
};

// ----------------------------------------------------------------------

export function ClientEditForm({ client }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const methods = useForm<ClientFormValuesInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      vatNumber: '',
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
        country: '',
      },
      contactPerson: {
        name: '',
        email: '',
        phone: '',
      },
      notes: '',
    },
  });

  const { handleSubmit, reset } = methods;

  // Update form values when client data changes
  useEffect(() => {
    if (client) {
      reset({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        company: client.company || '',
        vatNumber: client.vatNumber || '',
        address: {
          street: client.address?.street || '',
          city: client.address?.city || '',
          state: client.address?.state || '',
          zipCode: client.address?.zipCode || '',
          country: client.address?.country || 'US',
        },
        billingAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        contactPerson: {
          name: client.contactPerson?.name || '',
          email: client.contactPerson?.email || '',
          phone: client.contactPerson?.phone || '',
        },
        notes: client.notes || '',
      });
    }
  }, [client, reset]);

  const onSubmit = async (data: ClientFormValuesInput) => {
    try {
      setIsSubmitting(true);
      console.log('Updating client:', data);

      // Make API call to update client
      const response = await axiosInstance.put(endpoints.fsa.clients.details(client._id), data);

      if (response.data.success) {
        toast.success('Client updated successfully!');
        router.push('/dashboard/clients');
      } else {
        throw new Error(response.data.message || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update client';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <CustomBreadcrumbs
        heading="Edit Client"
        links={[
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Clients', href: '/dashboard/clients' },
          { name: client.name, href: `/dashboard/clients/${client._id}` },
          { name: 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Stack spacing={2}>
              <Typography variant="h6">Basic Information</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="name" label="Client Name *" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="company" label="Company (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="vatNumber" label="VAT Number (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="email" label="Email *" type="email" />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <RHFTextField name="phone" label="Phone (Optional)" />
                </Grid>
              </Grid>
            </Stack>

            {/* Address Information */}
            <Stack spacing={2}>
              <Typography variant="h6">Address Information</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <RHFTextField name="address.street" label="Street Address *" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="address.city" label="City *" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="address.state" label="State *" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="address.zipCode" label="ZIP Code *" />
                </Grid>
              </Grid>
            </Stack>

            {/* Billing Address */}
            <Stack spacing={2}>
              <Typography variant="h6">Billing Address (Optional)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <RHFTextField name="billingAddress.street" label="Street Address (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="billingAddress.city" label="City (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="billingAddress.state" label="State (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="billingAddress.zipCode" label="ZIP Code (Optional)" />
                </Grid>
              </Grid>
            </Stack>

            {/* Contact Person */}
            <Stack spacing={2}>
              <Typography variant="h6">Contact Person (Optional)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="contactPerson.name" label="Name (Optional)" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="contactPerson.email" label="Email (Optional)" type="email" />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <RHFTextField name="contactPerson.phone" label="Phone (Optional)" />
                </Grid>
              </Grid>
            </Stack>

            {/* Notes */}
            <Stack spacing={2}>
              <Typography variant="h6">Additional Information (Optional)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <RHFTextField
                    name="notes"
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    placeholder="Additional notes about the client..."
                  />
                </Grid>
              </Grid>
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" href="/dashboard/clients">
                Cancel
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Update Client
              </LoadingButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Form>
  );
}
