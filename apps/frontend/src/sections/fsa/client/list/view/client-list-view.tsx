import { Container, Typography } from '@mui/material';

import { ClientList } from '../client-list';

// ----------------------------------------------------------------------

export function ClientListView() {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Clients
      </Typography>

      <ClientList />
    </Container>
  );
}
