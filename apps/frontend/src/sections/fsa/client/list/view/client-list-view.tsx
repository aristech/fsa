'use client';

import { Container, Typography } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

import { ClientList } from '../client-list';

// ----------------------------------------------------------------------

export function ClientListView() {
  const { t } = useTranslate('dashboard');

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        {t('clients.title')}
      </Typography>

      <ClientList />
    </Container>
  );
}
