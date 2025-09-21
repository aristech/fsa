'use client';

import useSWR from 'swr';

import { Box, Card, Typography, CircularProgress } from '@mui/material';

import { fetcher, endpoints } from 'src/lib/axios';
import { useTranslate } from 'src/locales/use-locales';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ClientEditForm } from 'src/sections/fsa/client/edit/client-edit-form';

// ----------------------------------------------------------------------

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
  id: string;
};

export function ClientEditView({ id }: Props) {
  const { t } = useTranslate('dashboard');
  const { data, error, isLoading } = useSWR(
    endpoints.fsa.clients.details(id),
    fetcher<{ success: boolean; data: Client }>
  );

  const client = data?.data;

  if (isLoading) {
    return (
      <Card>
        <CustomBreadcrumbs
          heading={t('clients.editClient')}
          links={[
            { name: t('clients.breadcrumbs.dashboard'), href: '/dashboard' },
            { name: t('clients.breadcrumbs.clients'), href: '/dashboard/clients' },
            { name: t('clients.breadcrumbs.edit') },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </Card>
    );
  }

  if (error || !client) {
    return (
      <Card>
        <CustomBreadcrumbs
          heading={t('clients.editClient')}
          links={[
            { name: t('clients.breadcrumbs.dashboard'), href: '/dashboard' },
            { name: t('clients.breadcrumbs.clients'), href: '/dashboard/clients' },
            { name: t('clients.breadcrumbs.edit') },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <Typography color="error">{t('clients.failedToLoad')}</Typography>
        </Box>
      </Card>
    );
  }

  return <ClientEditForm client={client} />;
}
