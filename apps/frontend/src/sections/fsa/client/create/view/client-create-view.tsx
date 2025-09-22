'use client';

import { Container } from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';

import { ClientCreateForm } from '../client-create-form';

// ----------------------------------------------------------------------

export function ClientCreateView() {
  const { t } = useTranslate('dashboard');

  return (
    <Container maxWidth="xl">
      

      <ClientCreateForm />
    </Container>
  );
}
