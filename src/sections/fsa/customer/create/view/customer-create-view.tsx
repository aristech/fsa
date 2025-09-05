import { Container, Typography } from '@mui/material';

import { CustomerCreateForm } from '../customer-create-form';

// ----------------------------------------------------------------------

export function CustomerCreateView() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Create Customer
      </Typography>

      <CustomerCreateForm />
    </Container>
  );
}
