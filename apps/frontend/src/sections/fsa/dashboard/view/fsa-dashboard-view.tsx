'use client';

import Grid from '@mui/material/Grid';
import { Container, Typography } from '@mui/material';

import { useTenant } from 'src/hooks/use-tenant';

import { FsaStatsCards } from '../fsa-stats-cards';
import { FsaTechnicianStatus } from '../fsa-technician-status';
import { FsaRecentWorkOrders } from '../fsa-recent-work-orders';
import { FsaRecentTasks } from '../fsa-recent-tasks';

// ----------------------------------------------------------------------

export function FsaDashboardView() {
  const { tenantName } = useTenant();

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        {`${tenantName} | Field Service Dashboard`}
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid size={{ xs: 12 }}>
          <FsaStatsCards />
        </Grid>

        {/* Recent Work Orders */}
        <Grid size={{ xs: 12, md: 8 }}>
          <FsaRecentWorkOrders />
        </Grid>

        {/* Technician Status */}
        <Grid size={{ xs: 12, md: 4 }}>
          <FsaTechnicianStatus />
           <FsaRecentTasks />
        </Grid>

        {/* Recent Tasks (Kanban) */}
       
      </Grid>
    </Container>
  );
}
