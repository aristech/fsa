'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

import { useTheme } from '@mui/material/styles';
import { Card, Link, Stack, Skeleton, CardHeader, Typography, CardContent } from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in-progress':
      return 'info';
    case 'assigned':
      return 'warning';
    case 'created':
      return 'default';
    case 'scheduled':
      return 'info';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

// ----------------------------------------------------------------------

export function FsaRecentWorkOrders() {
  const theme = useTheme();

  // Fetch work orders data
  const { data: workOrdersData, isLoading } = useSWR(
    endpoints.fsa.workOrders.list,
    async (url: string) => {
      const response = await axiosInstance.get(url, {
        params: {
          limit: 10,
          sort: '-createdAt', // Get most recent first
        },
      });
      return response.data;
    }
  );

  // Fetch personnel data for technician names
  const { data: personnelData } = useSWR(endpoints.fsa.personnel.list, async (url: string) => {
    const response = await axiosInstance.get(url);
    return response.data;
  });

  // Process work orders data
  const recentWorkOrders = useMemo(() => {
    if (!workOrdersData?.data?.workOrders) return [];

    const workOrders = workOrdersData.data.workOrders;
    const personnel = personnelData?.data || [];

    // Create a map of personnel by ID for quick lookup
    const personnelById = new Map();
    personnel.forEach((person: any) => {
      personnelById.set(person._id, person);
    });

    return workOrders.slice(0, 5).map((workOrder: any) => {
      // Get assigned personnel names
      const assignedPersonnel =
        workOrder.personnelIds
          ?.map((id: string) => {
            const person = personnelById.get(id);
            return person
              ? `${person.user?.firstName || ''} ${person.user?.lastName || ''}`.trim()
              : 'Unknown';
          })
          .join(', ') || 'Unassigned';

      return {
        id: workOrder._id,
        workOrderNumber: workOrder.workOrderNumber,
        title: workOrder.title,
        customer: workOrder.clientName || workOrder.client?.name || 'Unknown Client',
        status: workOrder.status,
        priority: workOrder.priority,
        scheduledDate: workOrder.scheduledDate
          ? new Date(workOrder.scheduledDate)
          : new Date(workOrder.createdAt),
        technician: assignedPersonnel,
        createdAt: new Date(workOrder.createdAt),
      };
    });
  }, [workOrdersData, personnelData]);

  return (
    <Card>
      <CardHeader
        title="Recent Work Orders"
        action={
          <Link
            href="/dashboard/work-orders"
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
            Array.from({ length: 3 }).map((_, index) => (
              <Stack
                key={index}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Stack spacing={1} sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Skeleton variant="text" width={100} height={20} />
                    <Skeleton
                      variant="rectangular"
                      width={60}
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                    <Skeleton
                      variant="rectangular"
                      width={50}
                      height={20}
                      sx={{ borderRadius: 1 }}
                    />
                  </Stack>
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="text" width="60%" height={16} />
                </Stack>
                <Skeleton variant="text" width={80} height={16} />
              </Stack>
            ))
          ) : recentWorkOrders.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No work orders found
            </Typography>
          ) : (
            recentWorkOrders.map((workOrder: any) => (
              <Link
                key={workOrder.id}
                href={`/dashboard/work-orders/${workOrder.id}`}
                sx={{ textDecoration: 'none' }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      bgcolor: theme.palette.action.hover,
                    },
                    cursor: 'pointer',
                  }}
                >
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2">{workOrder.workOrderNumber}</Typography>
                      <Label color={getStatusColor(workOrder.status)} variant="soft">
                        {workOrder.status}
                      </Label>
                      <Label color={getPriorityColor(workOrder.priority)} variant="soft">
                        {workOrder.priority}
                      </Label>
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {workOrder.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {workOrder.customer} • {workOrder.technician}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {fDateTime(workOrder.scheduledDate)}
                  </Typography>
                </Stack>
              </Link>
            ))
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
