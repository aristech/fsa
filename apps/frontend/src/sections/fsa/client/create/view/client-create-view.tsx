import { Container, Typography } from '@mui/material';

import { ClientCreateForm } from '../client-create-form';

// ----------------------------------------------------------------------

export function ClientCreateView() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Create Client
      </Typography>

      <ClientCreateForm />
    </Container>
  );
}
