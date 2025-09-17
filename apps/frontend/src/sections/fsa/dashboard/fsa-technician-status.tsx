'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Card,
  Chip,
  Link,
  Stack,
  Avatar,
  Skeleton,
  CardHeader,
  Typography,
  CardContent,
} from '@mui/material';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

const getStatusColor = (status: string) => {
  switch (status) {
    case 'tracking':
      return 'success';
    case 'busy':
      return 'warning';
    case 'offline':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'tracking':
      return 'eva:radio-button-on-fill';
    case 'busy':
      return 'eva:clock-fill';
    case 'offline':
      return 'eva:radio-button-off-fill';
    default:
      return 'eva:radio-button-off-fill';
  }
};

// ----------------------------------------------------------------------

export function FsaTechnicianStatus() {
  const theme = useTheme();

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

  // Fetch work orders for context
  const { data: workOrdersData } = useSWR(endpoints.fsa.workOrders.list, async (url: string) => {
    const response = await axiosInstance.get(url, { params: { limit: 1000 } });
    return response.data;
  });

  // Process technician data with real information
  const technicians = useMemo(() => {
    if (!personnelData?.data || !activeSessionsData?.data) return [];

    const personnel = personnelData.data;
    const activeSessions = activeSessionsData.data;
    const workOrders = workOrdersData?.data?.workOrders || [];

    // Create a map of active sessions by personnel ID
    const sessionsByPersonnel = new Map();
    activeSessions.forEach((session: any) => {
      sessionsByPersonnel.set(session.personnelId, session);
    });

    // Create a map of work orders by ID for quick lookup
    const workOrdersById = new Map();
    workOrders.forEach((wo: any) => {
      workOrdersById.set(wo._id, wo);
    });

    return personnel
      .filter((person: any) => person.isActive && person.status === 'active')
      .slice(0, 6) // Show max 6 technicians
      .map((person: any) => {
        const activeSession = sessionsByPersonnel.get(person._id);
        const currentWorkOrder = activeSession
          ? workOrdersById.get(activeSession.workOrderId)
          : null;

        let status = 'offline';
        if (activeSession) {
          status = 'tracking';
        } else if (person.status === 'active') {
          status = 'busy';
        }

        return {
          id: person._id,
          name:
            person.user?.name ||
            `${person.user?.firstName || ''} ${person.user?.lastName || ''}`.trim() ||
            'Unknown',
          avatar: person.user?.avatar || null,
          status,
          currentWorkOrder: currentWorkOrder ? currentWorkOrder.workOrderNumber : null,
          workOrderTitle: currentWorkOrder ? currentWorkOrder.title : null,
          location: currentWorkOrder?.location || null,
          sessionStartTime: activeSession ? new Date(activeSession.startTime) : null,
        };
      });
  }, [personnelData, activeSessionsData, workOrdersData]);

  const isLoading = personnelLoading || sessionsLoading;

  return (
    <Card>
      <CardHeader
        title="Technician Status"
        action={
          <Link
            href="/dashboard/personnel"
            color="primary"
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            View All
            <Iconify icon="eva:arrow-ios-forward-fill" width={16} />
          </Link>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <Stack
                key={index}
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Skeleton variant="circular" width={40} height={40} />
                <Stack spacing={0.5} sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Stack>
              </Stack>
            ))
          ) : technicians.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No active technicians found
            </Typography>
          ) : (
            technicians.map((technician: any) => (
              <Stack
                key={technician.id}
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Avatar
                  src={technician.avatar || ''}
                  alt={technician.name}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  }}
                >
                  {technician.name.charAt(0)}
                </Avatar>

                <Stack spacing={0.5} sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2">{technician.name}</Typography>
                    <Chip
                      icon={<Iconify icon={getStatusIcon(technician.status)} width={12} />}
                      label={technician.status}
                      color={getStatusColor(technician.status)}
                      size="small"
                      variant="soft"
                    />
                  </Stack>
                  {technician.currentWorkOrder && (
                    <Typography variant="caption" color="text.secondary">
                      Working on: {technician.currentWorkOrder}
                    </Typography>
                  )}
                  {technician.workOrderTitle && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.7rem' }}
                    >
                      {technician.workOrderTitle}
                    </Typography>
                  )}
                  {technician.sessionStartTime && (
                    <Typography variant="caption" color="text.secondary">
                      Started: {technician.sessionStartTime.toLocaleTimeString()}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            ))
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
