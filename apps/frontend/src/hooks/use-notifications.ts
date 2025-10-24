'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { realtimeClient } from 'src/lib/realtime';
import { getNotificationCounts } from 'src/actions/notifications';

// ----------------------------------------------------------------------

export interface NotificationCounts {
  total: number;
  unread: number;
  archived: number;
}

export interface UseNotificationsOptions {
  enablePolling?: boolean;
  pollingInterval?: number; // in milliseconds
}

export interface UseNotificationsReturn {
  counts: NotificationCounts;
  isConnected: boolean;
  refreshCounts: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

// ----------------------------------------------------------------------

/**
 * Hook to manage real-time notification counts with Socket.IO and fallback polling
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { enablePolling = true, pollingInterval = 30000 } = options; // Default: 30 seconds

  console.log('🎣 useNotifications hook initialized with options:', options);

  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, unread: 0, archived: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🎯 Notification counts state changed:', counts);
  }, [counts]);

  // Fetch notification counts from API
  const refreshCounts = useCallback(async () => {
    try {
      console.log('📡 Fetching notification counts from API...');
      const response = await getNotificationCounts();
      console.log('📡 Raw API response:', response);
      console.log('📡 isMountedRef.current:', isMountedRef.current);
      if (isMountedRef.current) {
        // The response structure is { success: true, data: { total, unread, archived } }
        // So we need response.data, not response
        const countsData = response.data;
        console.log('📡 Notification counts received:', countsData);
        setCounts(countsData);
      } else {
        console.log('⚠️  Component unmounted, skipping state update');
      }
    } catch (error) {
      console.error('❌ Failed to fetch notification counts:', error);
    }
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
      console.log('🔔 Notification created event received:', data);
      if (isMountedRef.current) {
        setCounts((prev) => {
          const newCounts = {
            ...prev,
            total: prev.total + 1,
            unread: data.unreadCount,
          };
          console.log('🔔 Updated counts (created):', newCounts);
          return newCounts;
        });
      }
    });

    const unsubscribeRead = realtimeClient.on('notification:read', (data) => {
      console.log('📖 Notification read event received:', data);
      if (isMountedRef.current) {
        setCounts((prev) => {
          const newCounts = {
            ...prev,
            unread: data.unreadCount,
          };
          console.log('📖 Updated counts (read):', newCounts);
          return newCounts;
        });
      }
    });

    const unsubscribeUnreadCount = realtimeClient.on('notification:unread_count', (data) => {
      console.log('📊 Unread count event received:', data);
      if (isMountedRef.current) {
        setCounts((prev) => {
          const newCounts = {
            ...prev,
            unread: data.unreadCount,
          };
          console.log('📊 Updated counts (unread_count):', newCounts);
          return newCounts;
        });
      }
    });

    // Monitor connection status
    const checkConnection = () => {
      const connected = realtimeClient.isConnected;
      console.log('🔌 Socket.IO connection status:', connected ? 'CONNECTED' : 'DISCONNECTED');
      setIsConnected(connected);
    };

    // Check connection status every 5 seconds
    const connectionCheckInterval = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check

    // Set up polling as fallback if enabled
    if (enablePolling) {
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if not connected via socket
        if (!realtimeClient.isConnected) {
          refreshCounts();
        }
      }, pollingInterval);
    }

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
  }, [refreshCounts, enablePolling, pollingInterval]);

  // Function to manually set unread count (for optimistic updates)
  const setUnreadCount = useCallback((count: number) => {
    console.log('📊 Manually setting unread count to:', count);
    setCounts((prev) => ({
      ...prev,
      unread: count,
    }));
  }, []);

  return {
    counts,
    isConnected,
    refreshCounts,
    setUnreadCount,
  };
}
