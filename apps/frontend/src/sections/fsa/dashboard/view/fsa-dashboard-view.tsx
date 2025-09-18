'use client';

import { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import { Container, Typography } from '@mui/material';

import { useTenant } from 'src/hooks/use-tenant';

import { ApiClient } from 'src/lib/api-client';
import { useTranslate } from 'src/locales/use-locales';

import { FsaStatsCards } from '../fsa-stats-cards';
import FsaOnboarding from '../../onboarding/fsa-onboarding';
import { FsaTechnicianStatus } from '../fsa-technician-status';
import { FsaRecentWorkOrders } from '../fsa-recent-work-orders';

// ----------------------------------------------------------------------

export function FsaDashboardView() {
  const { tenantName } = useTenant();
  const { t } = useTranslate('common');
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnyData, setHasAnyData] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchCounts() {
      try {
        const [clientsRes, workOrdersRes, personnelRes] = await Promise.all([
          ApiClient.get(`/api/v1/clients?limit=1&offset=0`),
          ApiClient.get(`/api/v1/work-orders?page=1&limit=1`),
          ApiClient.get(`/api/v1/personnel`),
        ]);

        const clientsPayload: any = (clientsRes as any).data;
        const workOrdersPayload: any = (workOrdersRes as any).data;
        const personnelPayload: any = (personnelRes as any).data;

        const clientsTotal = clientsPayload?.data?.total ?? clientsPayload?.total ?? 0;
        const workOrdersTotal = workOrdersPayload?.data?.pagination?.total ?? 0;
        const personnelCount = Array.isArray(personnelPayload?.data)
          ? personnelPayload.data.length
          : Array.isArray(personnelPayload)
          ? personnelPayload.length
          : 0;

        const anyData = clientsTotal > 0 || workOrdersTotal > 0 || personnelCount > 0;
        if (isMounted) {
          setHasAnyData(anyData);
        }
      } catch (e) {
        // If calls fail (permissions or network), default to showing dashboard to avoid blocking
        if (isMounted) setHasAnyData(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isLoading && !hasAnyData) {
    return (
      <Container maxWidth="xl">
        <FsaOnboarding tenantName={tenantName || undefined} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        {t('dashboard.title', { tenant: tenantName })}
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
        </Grid>
      </Grid>
    </Container>
  );
}
