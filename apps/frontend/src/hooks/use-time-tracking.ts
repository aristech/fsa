import useSWR from 'swr';
import { useState, useEffect, useCallback } from 'react';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { useRealtimeEvent } from './use-realtime';

// ----------------------------------------------------------------------

export interface ActiveTimeSession {
  _id: string;
  taskId: string;
  workOrderId?: string;
  personnelId: string;
  userId: string;
  checkInTime: string;
  notes?: string;
  isActive: boolean;
  // Populated personnel info
  personnel?: {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    initials?: string;
  };
  // Duration info
  duration?: number; // milliseconds
  hoursWorked?: number;
}

// ----------------------------------------------------------------------

/**
 * Hook to get all active time tracking sessions across the system
 */
export function useActiveTimeSessions() {
  const { data, error, mutate } = useSWR<{
    success: boolean;
    data: ActiveTimeSession[];
  }>(
    '/api/v1/time-entries/sessions/all-active',
    async () => {
      const response = await axiosInstance.get('/api/v1/time-entries/sessions/all-active');
      return response.data;
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  const sessions = data?.data || [];

  // Listen for real-time updates
  useRealtimeEvent(
    'notification',
    useCallback((eventData: any) => {
      if (eventData.type === 'checkin' || eventData.type === 'checkout' || eventData.type === 'emergency_checkout') {
        // Refresh sessions when check-in/out events occur
        mutate();
      }
    }, [mutate]),
    []
  );

  return {
    sessions,
    isLoading: !error && !data,
    error,
    mutate,
  };
}

/**
 * Hook to get active session for a specific task
 */
export function useTaskTimeSession(taskId: string) {
  const { sessions, isLoading, error, mutate } = useActiveTimeSessions();

  const taskSession = sessions.find(session => session.taskId === taskId);

  return {
    session: taskSession || null,
    isActive: !!taskSession,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to get all active sessions for current user
 */
export function useMyActiveSessions() {
  const { data, error, mutate } = useSWR<{
    success: boolean;
    data: ActiveTimeSession[];
  }>(
    endpoints.fsa.timeEntries.activeSessions,
    async (url) => {
      const response = await axiosInstance.get(url);
      return response.data;
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  const sessions = data?.data || [];

  // Listen for real-time updates for user's own sessions
  useRealtimeEvent(
    'notification',
    useCallback((eventData: any) => {
      if (eventData.type === 'checkin' || eventData.type === 'checkout' || eventData.type === 'emergency_checkout') {
        // Refresh user's sessions when check-in/out events occur
        mutate();
      }
    }, [mutate]),
    []
  );

  return {
    sessions,
    isLoading: !error && !data,
    error,
    mutate,
  };
}

/**
 * Hook to calculate real-time duration for a session
 */
export function useSessionDuration(session: ActiveTimeSession | null) {
  const [duration, setDuration] = useState(0);
  const [hoursWorked, setHoursWorked] = useState(0);

  useEffect(() => {
    if (!session?.checkInTime) {
      setDuration(0);
      setHoursWorked(0);
      return undefined;
    }

    const updateDuration = () => {
      const checkInTime = new Date(session.checkInTime);
      const now = new Date();
      const durationMs = now.getTime() - checkInTime.getTime();
      const hours = durationMs / (1000 * 60 * 60);

      setDuration(durationMs);
      setHoursWorked(hours);
    };

    // Update immediately
    updateDuration();

    // Update every second
    const interval = setInterval(updateDuration, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [session?.checkInTime]);

  return {
    duration,
    hoursWorked,
    formattedDuration: formatDuration(duration),
  };
}

/**
 * Format duration in milliseconds to HH:MM:SS
 */
function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return '00:00:00';

  const seconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDurationHuman(durationMs: number): string {
  if (durationMs <= 0) return '0m';

  const minutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

/**
 * Get tracking status for multiple tasks
 */
export function useTasksTrackingStatus(taskIds: string[]) {
  const { sessions, isLoading, error } = useActiveTimeSessions();

  const trackingStatus = taskIds.reduce((acc, taskId) => {
    const session = sessions.find(s => s.taskId === taskId);
    acc[taskId] = {
      isActive: !!session,
      session: session || null,
    };
    return acc;
  }, {} as Record<string, { isActive: boolean; session: ActiveTimeSession | null }>);

  return {
    trackingStatus,
    isLoading,
    error,
  };
}