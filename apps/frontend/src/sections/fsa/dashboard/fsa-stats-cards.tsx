'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import { Card, Stack, Skeleton, Typography, CardContent } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

export function FsaStatsCards() {
  const theme = useTheme();

  // Fetch work orders data
  const { data: workOrdersData, isLoading: workOrdersLoading } = useSWR(
    endpoints.fsa.workOrders.list,
    async (url: string) => {
      const response = await axiosInstance.get(url, { params: { limit: 1000 } });
      return response.data;
    }
  );

  // Fetch personnel data
  const { data: personnelData, isLoading: personnelLoading } = useSWR(
    endpoints.fsa.personnel.list,
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );

  // Fetch active time sessions
  const { data: activeSessionsData, isLoading: sessionsLoading } = useSWR(
    endpoints.fsa.timeEntries.activeSessions,
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );

  // Calculate stats from real data
  const stats = useMemo(() => {
    const workOrders = workOrdersData?.data?.workOrders || [];
    const personnel = personnelData?.data || [];
    const activeSessions = activeSessionsData?.data || [];

    // Calculate completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = workOrders.filter((wo: any) => {
      if (wo.status !== 'completed') return false;
      const completedDate = new Date(wo.completedAt || wo.updatedAt);
      return completedDate >= today;
    }).length;

    // Count active personnel (those with active time sessions)
    const activePersonnelIds = new Set(activeSessions.map((session: any) => session.personnelId));
    const techniciansOnline = personnel.filter(
      (p: any) => activePersonnelIds.has(p._id) && p.isActive
    ).length;

    return [
      {
        title: 'Total Work Orders',
        value: workOrders.length,
        icon: 'solar:clipboard-list-bold-duotone',
        color: 'primary',
        loading: workOrdersLoading,
      },
      {
        title: 'Active Work Orders',
        value: workOrders.filter((wo: any) =>
          ['assigned', 'in-progress', 'scheduled'].includes(wo.status)
        ).length,
        icon: 'solar:clock-circle-bold-duotone',
        color: 'info',
        loading: workOrdersLoading,
      },
      {
        title: 'Completed Today',
        value: completedToday,
        icon: 'solar:check-circle-bold-duotone',
        color: 'success',
        loading: workOrdersLoading,
      },
      {
        title: 'Technicians Online',
        value: techniciansOnline,
        icon: 'solar:users-group-rounded-bold-duotone',
        color: 'warning',
        loading: personnelLoading || sessionsLoading,
      },
    ];
  }, [
    workOrdersData,
    personnelData,
    activeSessionsData,
    workOrdersLoading,
    personnelLoading,
    sessionsLoading,
  ]);

  return (
    <Grid container spacing={3}>
      {stats.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <div>
                  {stat.loading ? (
                    <Skeleton variant="text" width={60} height={40} />
                  ) : (
                    <Typography variant="h4">{fNumber(stat.value)}</Typography>
                  )}
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {stat.title}
                  </Typography>
                </div>
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: alpha((theme.palette as any)[stat.color].main, 0.08),
                  }}
                >
                  <Iconify
                    icon={stat.icon as any}
                    width={32}
                    sx={{ color: (theme.palette as any)[stat.color].main }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
