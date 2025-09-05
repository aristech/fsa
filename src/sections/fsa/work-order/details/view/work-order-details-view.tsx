import { Container, Typography } from '@mui/material';

import { WorkOrderDetails } from '../work-order-details';

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

export function WorkOrderDetailsView({ id }: Props) {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Work Order Details
      </Typography>

      <WorkOrderDetails id={id} />
    </Container>
  );
}
