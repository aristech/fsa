import type { RealtimeEvents } from 'src/lib/realtime';

import { useRef, useState, useEffect, useCallback } from 'react';

import { realtimeClient } from 'src/lib/realtime';

// Hook for general real-time connection status
export function useRealtimeConnection() {
  const [connectionState, setConnectionState] = useState(realtimeClient.connectionState);
  const [isConnected, setIsConnected] = useState(realtimeClient.isConnected);

  useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(realtimeClient.connectionState);
      setIsConnected(realtimeClient.isConnected);
    };

    // Update immediately
    updateConnectionState();

    // Set up listeners for connection events
    const unsubscribeConnect = realtimeClient.on('user:online', updateConnectionState);
    const unsubscribeDisconnect = realtimeClient.on('user:offline', updateConnectionState);

    // Poll for connection state changes (fallback)
    const interval = setInterval(updateConnectionState, 1000);

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      clearInterval(interval);
    };
  }, []);

  const connect = useCallback(async (token?: string) => {
    try {
      await realtimeClient.connect(token);
    } catch (error) {
      console.error('Failed to connect to real-time server:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    realtimeClient.disconnect();
  }, []);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    stats: realtimeClient.getStats(),
  };
}

// Hook for real-time events with automatic cleanup
export function useRealtimeEvent<K extends keyof RealtimeEvents>(
  event: K,
  callback: RealtimeEvents[K],
  deps: React.DependencyList = []
) {
  const callbackRef = useRef<RealtimeEvents[K]>(callback);

  // Update the ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(
    () => {
      const wrappedCallback = ((...args: Parameters<RealtimeEvents[K]>) => {
        // @ts-expect-error Generic callback variance
        callbackRef.current(...args);
      }) as RealtimeEvents[K];

      const unsubscribe = realtimeClient.on(event, wrappedCallback);

      return () => {
        unsubscribe();
      };
       
    },
    [event].concat(deps as any[])
  );
}

// Hook for task-specific real-time features
export function useTaskRealtime(taskId: string) {
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userEmail: string }>>([]);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Join/leave task room when taskId changes
  useEffect(() => {
    if (!taskId) return undefined;

    realtimeClient.joinTaskRoom(taskId);

    return () => {
      realtimeClient.leaveTaskRoom(taskId);
    };
  }, [taskId]);

  // Handle typing indicators
  useRealtimeEvent(
    'user:typing',
    useCallback(
      (data) => {
        if (data.taskId !== taskId) return;

        setTypingUsers((prev) => {
          const existing = prev.find((u) => u.userId === data.userId);
          if (existing) return prev;
          return [...prev, { userId: data.userId, userEmail: data.userEmail }];
        });

        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutRef.current.get(data.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove user from typing list
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
          typingTimeoutRef.current.delete(data.userId);
        }, 3000); // Remove after 3 seconds of inactivity

        typingTimeoutRef.current.set(data.userId, timeout);
      },
      [taskId]
    ),
    [taskId]
  );

  useRealtimeEvent(
    'user:stop_typing',
    useCallback(
      (data) => {
        if (data.taskId !== taskId) return;

        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));

        // Clear timeout for this user
        const timeout = typingTimeoutRef.current.get(data.userId);
        if (timeout) {
          clearTimeout(timeout);
          typingTimeoutRef.current.delete(data.userId);
        }
      },
      [taskId]
    ),
    [taskId]
  );

  // Typing indicator functions
  const startTyping = useCallback(() => {
    realtimeClient.startTyping(taskId);
  }, [taskId]);

  const stopTyping = useCallback(() => {
    realtimeClient.stopTyping(taskId);
  }, [taskId]);

  // Cleanup typing timeouts on unmount
  useEffect(
    () => () => {
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    },
    []
  );

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

// Hook for real-time comments
export function useRealtimeComments(
  taskId: string,
  onCommentEvent?: {
    onCreated?: (comment: any) => void;
    onUpdated?: (commentId: string, comment: any) => void;
    onDeleted?: (commentId: string) => void;
  }
) {
  // Handle comment events
  useRealtimeEvent(
    'comment:created',
    useCallback(
      (data) => {
        if (data.taskId === taskId) {
          onCommentEvent?.onCreated?.(data.comment);
        }
      },
      [taskId, onCommentEvent]
    ),
    [taskId]
  );

  useRealtimeEvent(
    'comment:updated',
    useCallback(
      (data) => {
        if (data.taskId === taskId) {
          onCommentEvent?.onUpdated?.(data.commentId, data.comment);
        }
      },
      [taskId, onCommentEvent]
    ),
    [taskId]
  );

  useRealtimeEvent(
    'comment:deleted',
    useCallback(
      (data) => {
        if (data.taskId === taskId) {
          onCommentEvent?.onDeleted?.(data.commentId);
        }
      },
      [taskId, onCommentEvent]
    ),
    [taskId]
  );
}

// Hook for online users
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: string; userEmail: string }>>([]);

  useRealtimeEvent(
    'user:online',
    useCallback((data) => {
      setOnlineUsers((prev) => {
        const existing = prev.find((u) => u.userId === data.userId);
        if (existing) return prev;
        return [...prev, { userId: data.userId, userEmail: data.userEmail }];
      });
    }, []),
    []
  );

  useRealtimeEvent(
    'user:offline',
    useCallback((data) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    }, []),
    []
  );

  return onlineUsers;
}
