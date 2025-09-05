import { Container, Typography } from '@mui/material';

import { WorkOrderCreateForm } from '../work-order-create-form';

// ----------------------------------------------------------------------

export function WorkOrderCreateView() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Create Work Order
      </Typography>

      <WorkOrderCreateForm />
    </Container>
  );
}
