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

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

// Enhanced status system with more descriptive states
const getStatusColor = (status: string) => {
  switch (status) {
    case 'working':
      return 'success';
    case 'available':
      return 'info';
    case 'on_break':
      return 'warning';
    case 'stale_session':
      return 'error';
    case 'offline':
      return 'default';
    case 'unavailable':
      return 'secondary';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'working':
      return 'eva:play-circle-fill';
    case 'available':
      return 'eva:checkmark-circle-fill';
    case 'on_break':
      return 'eva:pause-circle-fill';
    case 'stale_session':
      return 'eva:alert-triangle-fill';
    case 'offline':
      return 'eva:radio-button-off-fill';
    case 'unavailable':
      return 'eva:clock-fill';
    default:
      return 'eva:radio-button-off-fill';
  }
};

const getStatusLabel = (status: string, t: any) => {
  switch (status) {
    case 'working':
      return t('status.working', { defaultValue: 'Working' });
    case 'available':
      return t('status.available', { defaultValue: 'Available' });
    case 'on_break':
      return t('status.onBreak', { defaultValue: 'On Break' });
    case 'stale_session':
      return t('status.staleSession', { defaultValue: 'Connection Lost' });
    case 'offline':
      return t('status.offline', { defaultValue: 'Offline' });
    case 'unavailable':
      return t('status.unavailable', { defaultValue: 'Unavailable' });
    default:
      return t('status.unknown', { defaultValue: 'Unknown' });
  }
};

// Helper function to check if current time is within work hours
const isWithinWorkHours = (availability: any) => {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const daySchedule = availability?.[dayNames[currentDay]];

  if (!daySchedule?.available) return false;

  const [startHour, startMin] = (daySchedule.start || '09:00').split(':').map(Number);
  const [endHour, endMin] = (daySchedule.end || '17:00').split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  return currentTime >= startTime && currentTime <= endTime;
};

// Helper function to determine if user is online
const isUserOnline = (user: any, thresholdMinutes = 60) => {
  // First check explicit isOnline status (most reliable)
  if (user?.isOnline === true) return true;
  if (user?.isOnline === false) return false;

  // Fallback to lastLoginAt check for backward compatibility
  if (!user?.lastLoginAt) return false;

  try {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    const loginDate = new Date(user.lastLoginAt);

    // Check if date is valid
    if (isNaN(loginDate.getTime())) return false;

    return loginDate > threshold;
  } catch (error) {
    console.warn('Error parsing user online status:', user, error);
    return false;
  }
};

// ----------------------------------------------------------------------

export function FsaTechnicianStatus() {
  const theme = useTheme();
  const { t } = useTranslate('common');

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
      .slice(0, 8) // Show max 8 technicians (increased for better overview)
      .map((person: any) => {
        const activeSession = sessionsByPersonnel.get(person._id);
        const currentWorkOrder = activeSession
          ? workOrdersById.get(activeSession.workOrderId)
          : null;

        // Enhanced status determination logic
        let status = 'offline';
        let statusDetails = '';
        const isInField = false;

        // Check if session exists and is recent
        if (activeSession) {
          const sessionAge = Date.now() - new Date(activeSession.lastHeartbeat || activeSession.checkInTime).getTime();
          const isSessionStale = sessionAge > 30 * 60 * 1000; // 30 minutes threshold

          if (isSessionStale) {
            status = 'stale_session';
            statusDetails = `Last seen ${Math.floor(sessionAge / (60 * 1000))} min ago`;
          } else {
            status = 'working';
            statusDetails = currentWorkOrder ? `Working on ${currentWorkOrder.workOrderNumber}` : 'Working';
          }
        } else {
          // No active session - determine status based on other factors
          const isOnline = isUserOnline(person.user);
          const withinWorkHours = isWithinWorkHours(person.availability);

          // Debug logging for troubleshooting
          if (process.env.NODE_ENV === 'development') {
            console.log(`Status Debug for ${person.user?.name || person._id}:`, {
              lastLoginAt: person.user?.lastLoginAt,
              isOnlineField: person.user?.isOnline,
              lastSeenAt: person.user?.lastSeenAt,
              isOnline,
              withinWorkHours,
              availability: person.availability,
            });
          }

          if (!withinWorkHours) {
            status = 'unavailable';
            statusDetails = 'Outside work hours';
          } else if (isOnline) {
            status = 'available';
            statusDetails = 'Ready for work';
          } else {
            status = 'offline';

            // Use lastSeenAt (logout time) if available, otherwise lastLoginAt
            const lastSeenDate = person.user?.lastSeenAt ? new Date(person.user.lastSeenAt) : null;
            const lastLoginDate = person.user?.lastLoginAt ? new Date(person.user.lastLoginAt) : null;
            const lastActivityDate = lastSeenDate || lastLoginDate;

            if (lastActivityDate && !isNaN(lastActivityDate.getTime())) {
              const timeSinceActivity = Math.floor((Date.now() - lastActivityDate.getTime()) / (60 * 1000));
              if (timeSinceActivity < 60) {
                statusDetails = `Last seen ${timeSinceActivity}m ago`;
              } else if (timeSinceActivity < 1440) { // Less than 24 hours
                const hours = Math.floor(timeSinceActivity / 60);
                statusDetails = `Last seen ${hours}h ago`;
              } else {
                const days = Math.floor(timeSinceActivity / 1440);
                statusDetails = `Last seen ${days}d ago`;
              }
            } else {
              statusDetails = 'Never logged in';
            }
          }
        }

        // Determine if technician is field-capable vs office-only
        const isFieldCapable = person.environmentAccess === 'field' || person.environmentAccess === 'all';
        const isFieldOnly = person.environmentAccess === 'field';
        const isAllEnvironments = person.environmentAccess === 'all';

        // Check for location data
        const hasRecentLocation = person.location?.lastUpdated &&
          (Date.now() - new Date(person.location.lastUpdated).getTime()) < 60 * 60 * 1000; // 1 hour

        return {
          id: person._id,
          name:
            person.user?.name ||
            `${person.user?.firstName || ''} ${person.user?.lastName || ''}`.trim() ||
            t('unknown', { defaultValue: 'Unknown' }),
          avatar: person.user?.avatar || null,
          status,
          statusDetails,
          isFieldCapable,
          isFieldOnly,
          isAllEnvironments,
          hasRecentLocation,
          currentWorkOrder: currentWorkOrder ? currentWorkOrder.workOrderNumber : null,
          workOrderTitle: currentWorkOrder ? currentWorkOrder.title : null,
          location: currentWorkOrder?.location || person.location?.address || null,
          sessionStartTime: activeSession ? new Date(activeSession.checkInTime) : null,
          lastHeartbeat: activeSession?.lastHeartbeat ? new Date(activeSession.lastHeartbeat) : null,
          environmentAccess: person.environmentAccess,
          skills: person.skills || [],
          certifications: person.certifications || [],
        };
      });
  }, [personnelData, activeSessionsData, workOrdersData, t]);

  const isLoading = personnelLoading || sessionsLoading;

  // Calculate status summary for header
  const statusSummary = useMemo(() => {
    if (!technicians.length) return null;

    const counts = technicians.reduce((acc: Record<string, number>, tech: any) => {
      acc[tech.status] = (acc[tech.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const workingCount = counts.working || 0;
    const availableCount = counts.available || 0;
    const totalActive = workingCount + availableCount;

    return {
      working: workingCount,
      available: availableCount,
      totalActive,
      total: technicians.length,
    };
  }, [technicians]);

  return (
    <Card>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">
              {t('dashboard.technicianStatus', { defaultValue: 'Technician Status' })}
            </Typography>
            {statusSummary && !isLoading && (
              <Stack direction="row" spacing={0.5}>
                <Chip
                  icon={<Iconify icon="eva:play-circle-fill" width={14} />}
                  label={statusSummary.working}
                  color="success"
                  size="small"
                  variant="soft"
                />
                <Chip
                  icon={<Iconify icon="eva:checkmark-circle-fill" width={14} />}
                  label={statusSummary.available}
                  color="info"
                  size="small"
                  variant="soft"
                />
              </Stack>
            )}
          </Stack>
        }
        action={
          <Link
            href="/dashboard/personnel"
            color="primary"
            variant="body2"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {t('viewAll', { defaultValue: 'View All' })}
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
            <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
              <Iconify icon="eva:people-outline" width={48} color="text.disabled" />
              <Stack spacing={0.5} alignItems="center">
                <Typography variant="subtitle2" color="text.secondary">
                  {t('dashboard.noActiveTechniciansFound', { defaultValue: 'No active technicians found' })}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {t('dashboard.technicianStatusHint', {
                    defaultValue: 'Technicians will appear here when they log in and are available for work'
                  })}
                </Typography>
              </Stack>
            </Stack>
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
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography variant="subtitle2">{technician.name}</Typography>
                    <Chip
                      icon={<Iconify icon={getStatusIcon(technician.status)} width={12} />}
                      label={getStatusLabel(technician.status, t)}
                      color={getStatusColor(technician.status)}
                      size="small"
                      variant="soft"
                    />
                    {technician.isFieldOnly && (
                      <Chip
                        icon={<Iconify icon="eva:navigation-2-fill" width={10} />}
                        label={t('fieldOnly', { defaultValue: 'Field Only' })}
                        color="primary"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                    {technician.isAllEnvironments && (
                      <Chip
                        icon={<Iconify icon="eva:globe-2-fill" width={10} />}
                        label={t('mobile', { defaultValue: 'Mobile' })}
                        color="info"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                    {technician.hasRecentLocation && (
                      <Chip
                        icon={<Iconify icon="eva:pin-fill" width={10} />}
                        label={t('tracked', { defaultValue: 'Tracked' })}
                        color="success"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                  </Stack>

                  {technician.statusDetails && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      {technician.statusDetails}
                    </Typography>
                  )}

                  {technician.currentWorkOrder && (
                    <Typography variant="caption" color="text.secondary">
                      {t('workingOn', { defaultValue: 'Working on:' })} {technician.currentWorkOrder}
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

                  {technician.location && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Iconify icon="eva:pin-outline" width={12} />
                      {technician.location}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {technician.sessionStartTime && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Iconify icon="eva:clock-outline" width={12} />
                        {t('started', { defaultValue: 'Started:' })} {technician.sessionStartTime.toLocaleTimeString()}
                      </Typography>
                    )}

                    {technician.lastHeartbeat && technician.status === 'working' && (
                      <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Iconify icon="eva:activity-fill" width={12} />
                        {t('active', { defaultValue: 'Active' })} {Math.floor((Date.now() - new Date(technician.lastHeartbeat).getTime()) / 60000)}m ago
                      </Typography>
                    )}
                  </Stack>

                  {technician.skills && technician.skills.length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                      {technician.skills.slice(0, 3).map((skill: string, index: number) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          variant="outlined"
                          color="default"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      ))}
                      {technician.skills.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{technician.skills.length - 3} more
                        </Typography>
                      )}
                    </Stack>
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
