'use client';

import type { ReactNode } from 'react';

import { useRef, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { realtimeClient } from 'src/lib/realtime';
import { getNotificationCounts } from 'src/actions/notifications';

// ----------------------------------------------------------------------

export interface NotificationCounts {
  total: number;
  unread: number;
  archived: number;
}

interface NotificationsContextValue {
  counts: NotificationCounts;
  isConnected: boolean;
  refreshCounts: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

// ----------------------------------------------------------------------

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// ----------------------------------------------------------------------

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, unread: 0, archived: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch notification counts from API
  const refreshCounts = useCallback(async () => {
    try {
      const response = await getNotificationCounts();
      if (isMountedRef.current) {
        const countsData = response.data;
        setCounts(countsData);
      }
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
    }
  }, []);

  // Function to manually set unread count (for optimistic updates)
  const setUnreadCount = useCallback((count: number) => {
    setCounts((prev) => ({
      ...prev,
      unread: count,
    }));
  }, []);

  // Set mounted ref
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle real-time notification events
  useEffect(() => {
    // Initial load
    refreshCounts();

    // Set up Socket.IO event listeners
    const unsubscribeCreated = realtimeClient.on('notification:created', (data) => {
      if (isMountedRef.current) {
        setCounts((prev) => ({
          ...prev,
          total: prev.total + 1,
          unread: data.unreadCount,
        }));
      }
    });

    const unsubscribeRead = realtimeClient.on('notification:read', (data) => {
      if (isMountedRef.current) {
        setCounts((prev) => ({
          ...prev,
          unread: data.unreadCount,
        }));
      }
    });

    const unsubscribeUnreadCount = realtimeClient.on('notification:unread_count', (data) => {
      if (isMountedRef.current) {
        setCounts((prev) => ({
          ...prev,
          unread: data.unreadCount,
        }));
      }
    });

    // Monitor connection status
    const checkConnection = () => {
      const connected = realtimeClient.isConnected;
      setIsConnected(connected);
    };

    // Check connection status every 5 seconds
    const connectionCheckInterval = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check

    // Set up polling as fallback
    pollingIntervalRef.current = setInterval(() => {
      // Only poll if not connected via socket
      if (!realtimeClient.isConnected) {
        refreshCounts();
      }
    }, 30000); // 30 seconds

    // Cleanup
    return () => {
      unsubscribeCreated();
      unsubscribeRead();
      unsubscribeUnreadCount();
      clearInterval(connectionCheckInterval);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [refreshCounts]);

  const value: NotificationsContextValue = {
    counts,
    isConnected,
    refreshCounts,
    setUnreadCount,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// ----------------------------------------------------------------------

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}
