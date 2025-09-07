import { Grid, Container, Typography } from '@mui/material';

import { FsaStatsCards } from '../fsa-stats-cards';
import { FsaTechnicianStatus } from '../fsa-technician-status';
import { FsaRecentWorkOrders } from '../fsa-recent-work-orders';

// ----------------------------------------------------------------------

export function FsaDashboardView() {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Field Service Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12}>
          <FsaStatsCards />
        </Grid>

        {/* Recent Work Orders */}
        <Grid item xs={12} md={8}>
          <FsaRecentWorkOrders />
        </Grid>

        {/* Technician Status */}
        <Grid item xs={12} md={4}>
          <FsaTechnicianStatus />
        </Grid>
      </Grid>
    </Container>
  );
}
