'use client';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Grid from '@mui/material/Grid';
import { LoadingButton } from '@mui/lab';
import { Card, Stack, Button, Container, Typography, CardContent } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { PhoneInput } from 'src/components/phone-input';
import { Form, Field, RHFTextField } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const createClientSchema = (t: any) =>
  zod.object({
    name: zod.string().min(1, t('clients.form.validation.clientNameRequired')),
    email: zod.string().email({ message: t('clients.form.validation.emailRequired') }),
    phone: zod.string().optional(),
    company: zod.string().optional(),
    vatNumber: zod.string().optional(),
    address: zod.object({
      street: zod.string().min(1, t('clients.form.validation.streetRequired')),
      city: zod.string().min(1, t('clients.form.validation.cityRequired')),
      state: zod.string().min(1, t('clients.form.validation.stateRequired')),
      zipCode: zod.string().min(1, t('clients.form.validation.zipCodeRequired')),
      country: zod.string().min(1, t('clients.form.validation.countryRequired')).default('GR'),
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
          .email({ message: t('clients.form.validation.contactEmailInvalid') })
          .optional()
          .or(zod.literal('')),
        phone: zod.string().optional(),
      })
      .optional(),
    notes: zod.string().optional(),
  });

type ClientFormValuesInput = zod.input<ReturnType<typeof createClientSchema>>;

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
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
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
  const { t } = useTranslate('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const methods = useForm<ClientFormValuesInput>({
    resolver: zodResolver(createClientSchema(t)),
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
        country: 'GR',
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
          street: client.billingAddress?.street || '',
          city: client.billingAddress?.city || '',
          state: client.billingAddress?.state || '',
          zipCode: client.billingAddress?.zipCode || '',
          country: client.billingAddress?.country || '',
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

      // Make API call to update client
      const response = await axiosInstance.put(endpoints.fsa.clients.details(client._id), data);

      if (response.data.success) {
        toast.success(t('clients.clientUpdated'));
        router.push('/dashboard/clients');
      } else {
        throw new Error(response.data.message || t('clients.failedToUpdate'));
      }
    } catch (error) {
      console.error('Error updating client:', error);
      const errorMessage = error instanceof Error ? error.message : t('clients.failedToUpdate');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <CustomBreadcrumbs
          heading={t('clients.editClient')}
          links={[
            { name: t('clients.breadcrumbs.dashboard'), href: '/dashboard' },
            { name: t('clients.breadcrumbs.clients'), href: '/dashboard/clients' },
            { name: client.name, href: `/dashboard/clients/${client._id}` },
            { name: t('clients.breadcrumbs.edit') },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <CardContent>
            <Stack spacing={3}>
              {/* Basic Information */}
              <Stack spacing={2}>
                <Typography variant="h6">{t('clients.form.clientName')}</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <RHFTextField name="name" label={`${t('clients.form.clientName')} *`} />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <RHFTextField
                      name="company"
                      label={`${t('clients.form.company')} (${t('clients.optional')})`}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <RHFTextField
                      name="vatNumber"
                      label={`${t('clients.form.vatNumber')} (${t('clients.optional')})`}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <RHFTextField
                      name="email"
                      label={`${t('clients.form.email')} *`}
                      type="email"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <PhoneInput
                      value={methods.getValues('phone')}
                      onChange={(value) => {
                        methods.setValue('phone', value);
                      }}
                      label={`${t('clients.form.phone')} (${t('clients.optional')})`}
                    />
                  </Grid>
                </Grid>
              </Stack>

              {/* Address Information */}
              <Stack spacing={2}>
                <Typography variant="h6">{t('clients.form.address')}</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <RHFTextField name="address.street" label={`${t('clients.form.street')} *`} />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <RHFTextField name="address.city" label={`${t('clients.form.city')} *`} />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <RHFTextField name="address.state" label={`${t('clients.form.state')} *`} />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <RHFTextField name="address.zipCode" label={`${t('clients.form.zipCode')} *`} />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <Field.CountrySelect
                      name="address.country"
                      label={`${t('clients.form.country')} *`}
                      displayValue="code"
                    />
                  </Grid>
                </Grid>
              </Stack>

              {/* Billing Address */}
              {/* <Stack spacing={2}>
                <Typography variant="h6">
                  {t('clients.form.billingAddress')} ({t('clients.optional')})
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <RHFTextField
                      name="billingAddress.street"
                      label={`${t('clients.form.street')} (${t('clients.optional')})`}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <RHFTextField
                      name="billingAddress.city"
                      label={`${t('clients.form.city')} (${t('clients.optional')})`}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <RHFTextField
                      name="billingAddress.state"
                      label={`${t('clients.form.state')} (${t('clients.optional')})`}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <RHFTextField
                      name="billingAddress.zipCode"
                      label={`${t('clients.form.zipCode')} (${t('clients.optional')})`}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                    <Field.CountrySelect
                      name="billingAddress.country"
                      label={`${t('clients.form.country')} (${t('clients.optional')})`}
                      displayValue="code"
                    />
                  </Grid>
                </Grid>
              </Stack> */}

              {/* Contact Person */}
              <Stack spacing={2}>
                <Typography variant="h6">
                  {t('clients.form.contactPerson')} ({t('clients.optional')})
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <RHFTextField
                      name="contactPerson.name"
                      label={`${t('clients.form.contactName')} (${t('clients.optional')})`}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <RHFTextField
                      name="contactPerson.email"
                      label={`${t('clients.form.contactEmail')} (${t('clients.optional')})`}
                      type="email"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <PhoneInput
                      value={methods.getValues('contactPerson.phone')}
                      onChange={(value) => {
                        methods.setValue('contactPerson.phone', value);
                      }}
                      label={`${t('clients.form.contactPhone')} (${t('clients.optional')})`}
                    />
                  </Grid>
                </Grid>
              </Stack>

              {/* Notes */}
              <Stack spacing={2}>
                <Typography variant="h6">
                  {t('clients.form.notes')} ({t('clients.optional')})
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <RHFTextField
                      name="notes"
                      label={`${t('clients.form.notes')} (${t('clients.optional')})`}
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
                  {t('clients.cancel')}
                </Button>
                <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                  {t('clients.save')}
                </LoadingButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Form>
    </Container>
  );
}
