'use client';

import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Grid from '@mui/material/Grid';
import { LoadingButton } from '@mui/lab';
import { Card, Stack, Button, Typography, CardContent } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Form, Field, RHFTextField, RHFPhoneInput } from 'src/components/hook-form';

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

// ----------------------------------------------------------------------

export function ClientCreateForm() {
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
        country: 'GR',
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

  const onSubmit = async (data: ClientFormValuesInput) => {
    try {
      setIsSubmitting(true);

      // Make API call to create client
      const response = await axiosInstance.post(endpoints.fsa.clients.list, data);

      if (response.data.success) {
        toast.success(t('clients.clientCreated'));
        router.push('/dashboard/clients');
      } else {
        throw new Error(response.data.message || t('clients.failedToCreate'));
      }
    } catch (error) {
      console.error('Error creating client:', error);
      const errorMessage = error instanceof Error ? error.message : t('clients.failedToCreate');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <CustomBreadcrumbs
        heading={t('clients.createClient')}
        links={[
          { name: t('clients.breadcrumbs.dashboard'), href: '/dashboard' },
          { name: t('clients.breadcrumbs.clients'), href: '/dashboard/clients' },
          { name: t('clients.breadcrumbs.create') },
        ]}
        sx={{ mb: 5 }}
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
                  <RHFTextField name="email" label={`${t('clients.form.email')} *`} type="email" />
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <RHFPhoneInput name="phone" label={t('clients.form.phone')} />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                  <RHFTextField
                    name="vatNumber"
                    label={`${t('clients.form.vatNumber')} (${t('clients.optional')})`}
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
                  <RHFPhoneInput
                    name="contactPerson.phone"
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
                {t('clients.createClient')}
              </LoadingButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Form>
  );
}
