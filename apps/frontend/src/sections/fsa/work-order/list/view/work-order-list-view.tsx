import { Container, Typography } from '@mui/material';

import { WorkOrderList } from '../work-order-list';

// ----------------------------------------------------------------------

export function WorkOrderListView() {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Work Orders
      </Typography>

      <WorkOrderList />
    </Container>
  );
}
