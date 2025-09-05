import { Container, Typography } from '@mui/material';

import { CustomerList } from '../customer-list';

// ----------------------------------------------------------------------

export function CustomerListView() {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Customers
      </Typography>

      <CustomerList />
    </Container>
  );
}
