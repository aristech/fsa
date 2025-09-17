'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import { Card, Stack, Skeleton, Typography, CardContent } from '@mui/material';

import { fNumber } from 'src/utils/format-number';

import { useTranslate } from 'src/locales/use-locales';
import { useClient } from 'src/contexts/client-context';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

export function FsaStatsCards() {
  const theme = useTheme();
  const { selectedClient } = useClient();
  const { t } = useTranslate('common');

  // Build URLs with client filter
  const workOrdersUrl = selectedClient
    ? `${endpoints.fsa.workOrders.list}?clientId=${selectedClient._id}&limit=1000`
    : `${endpoints.fsa.workOrders.list}?limit=1000`;

  // Fetch work orders data (filtered by client if selected)
  const { data: workOrdersData, isLoading: workOrdersLoading } = useSWR(
    workOrdersUrl,
    async (url: string) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );

  // Fetch personnel data (always fetch all for online status)
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

  // Fetch online users data
  const { data: onlineUsersData, isLoading: onlineUsersLoading } = useSWR(
    endpoints.users.online,
    async (url: string) => {
      try {
        const response = await axiosInstance.get(url);
        return response.data;
      } catch (_error) {
        // Fallback if endpoint doesn't exist - use active sessions as proxy for online status
        console.log('Online users endpoint not available, falling back to active sessions');
        return { data: [] };
      }
    },
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Calculate stats from real data
  const stats = useMemo(() => {
    const workOrders = workOrdersData?.data?.workOrders || [];
    const personnel = personnelData?.data || [];
    const activeSessions = activeSessionsData?.data || [];
    const onlineUsers = onlineUsersData?.data || [];

    // Calculate completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = workOrders.filter((wo: any) => {
      if (wo.status !== 'completed') return false;
      const completedDate = new Date(wo.completedAt || wo.updatedAt);
      return completedDate >= today;
    }).length;

    // Count online technicians - prioritize actual online users, fallback to active sessions
    let techniciansOnline = 0;
    if (onlineUsers.length > 0) {
      // Use actual online users data if available
      const onlineUserIds = new Set(onlineUsers.map((user: any) => user._id));
      techniciansOnline = personnel.filter((p: any) => {
        const userId = p?.user?._id || p?.userId;
        return userId && onlineUserIds.has(userId) && p.isActive;
      }).length;
    } else {
      // Fallback to active time sessions as proxy for online status
      const activePersonnelIds = new Set(activeSessions.map((session: any) => session.personnelId));
      techniciansOnline = personnel.filter(
        (p: any) => activePersonnelIds.has(p._id) && p.isActive
      ).length;
    }

    // Count personnel currently being time tracked
    const personnelBeingTracked = activeSessions.length;

    return [
      {
        title: t('dashboard.totalWorkOrders', { defaultValue: 'Total Work Orders' }),
        value: workOrders.length,
        icon: 'solar:clipboard-list-bold-duotone',
        color: 'primary',
        loading: workOrdersLoading,
      },
      {
        title: t('dashboard.completedToday', { defaultValue: 'Completed Today' }),
        value: completedToday,
        icon: 'solar:check-circle-bold-duotone',
        color: 'success',
        loading: workOrdersLoading,
      },
      {
        title: t('dashboard.techniciansOnline', { defaultValue: 'Technicians Online' }),
        value: techniciansOnline,
        icon: 'solar:users-group-rounded-bold-duotone',
        color: 'info',
        loading: personnelLoading || onlineUsersLoading,
      },
      {
        title: t('dashboard.activeTimeTracking', { defaultValue: 'Active Time Tracking' }),
        value: personnelBeingTracked,
        icon: 'solar:clock-circle-bold-duotone',
        color: 'warning',
        loading: sessionsLoading,
      },
    ];
  }, [
    workOrdersData,
    personnelData,
    activeSessionsData,
    onlineUsersData,
    workOrdersLoading,
    personnelLoading,
    sessionsLoading,
    onlineUsersLoading,
    t,
  ]);

  return (
    <Grid container spacing={3}>
      {stats.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title as string}>
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
