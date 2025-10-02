import { Container } from '@mui/material';

import { ClientCreateForm } from '../client-create-form';

// ----------------------------------------------------------------------

export function ClientCreateView() {
  return (
    <Container maxWidth="xl">
      <ClientCreateForm />
    </Container>
  );
}
