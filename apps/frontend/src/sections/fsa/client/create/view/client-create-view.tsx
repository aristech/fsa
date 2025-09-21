'use client';

import { Container, Typography } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

import { ClientCreateForm } from '../client-create-form';

// ----------------------------------------------------------------------

export function ClientCreateView() {
  const { t } = useTranslate('dashboard');

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 5 }}>
        {t('clients.createClient')}
      </Typography>

      <ClientCreateForm />
    </Container>
  );
}
