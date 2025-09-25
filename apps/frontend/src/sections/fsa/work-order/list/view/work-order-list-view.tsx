import { Container } from '@mui/material';

import { WorkOrderList } from '../work-order-list';

// ----------------------------------------------------------------------

export function WorkOrderListView() {
  return (
    <Container maxWidth="xl">
      <WorkOrderList />
    </Container>
  );
}
