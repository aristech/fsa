import type { Socket } from 'socket.io-client';

import { io } from 'socket.io-client';

import axiosInstance from 'src/lib/axios';
import { CONFIG } from 'src/global-config';

export interface RealtimeEvents {
  // Task Comments
  'comment:created': (data: { taskId: string; comment: any }) => void;
  'comment:updated': (data: { taskId: string; commentId: string; comment: any }) => void;
  'comment:deleted': (data: { taskId: string; commentId: string }) => void;

  // Task Updates
  'task:updated': (data: { taskId: string; updates: any }) => void;
  'task:status_changed': (data: { taskId: string; oldStatus: string; newStatus: string }) => void;

  // User Presence
  'user:online': (data: { userId: string; userEmail: string }) => void;
  'user:offline': (data: { userId: string; userEmail: string }) => void;
  'user:typing': (data: { taskId: string; userId: string; userEmail: string }) => void;
  'user:stop_typing': (data: { taskId: string; userId: string; userEmail: string }) => void;

  // Notifications
  'notification:created': (data: { notification: any; unreadCount: number }) => void;
  'notification:updated': (data: { notification: any; unreadCount: number }) => void;
  'notification:read': (data: { notificationId: string; unreadCount: number }) => void;
  'notification:unread_count': (data: { unreadCount: number }) => void;

  // Generic events
  notification: (data: { type: string; message: string; data?: any }) => void;
}

class RealtimeClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventListeners = new Map<string, Set<(...args: any[]) => void>>();
  private currentTaskRooms = new Set<string>();

  // Connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get connectionState(): 'connected' | 'connecting' | 'disconnected' {
    if (this.socket?.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  // Connection management
  async connect(token?: string): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return Promise.resolve();
    }

    // Check if WebSocket server is available first
    try {
      await axiosInstance.get('/socket.io/', {
        timeout: 3000, // 3 second timeout
      });
    } catch (error: any) {
      // Suppress "Transport unknown" errors from the initial check
      if (
        error?.response?.data?.message === 'Transport unknown' ||
        (error?.response?.status === 400 && error?.message === 'Transport unknown')
      ) {
        console.debug('🔌 Socket.IO server responding (transport negotiation)');
        // Continue with connection attempt
      } else {
        console.warn('🔌 WebSocket server not available - skipping connection');
        return Promise.resolve();
      }
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;

      // Get token from sessionStorage if not provided
      const authToken =
        token ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('jwt_access_token') : null);

      if (!authToken) {
        this.isConnecting = false;
        reject(new Error('No authentication token available'));
        return;
      }

      this.socket = io(CONFIG.serverUrl, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      this.setupEventHandlers();

      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Rejoin any active task rooms
        this.currentTaskRooms.forEach((taskId) => {
          this.joinTaskRoom(taskId);
        });

        resolve();
      });

      this.socket.on('connect_error', (err) => {
        // Suppress "Transport unknown" errors as they're not critical
        if (err.message === 'Transport unknown' || err.message?.includes('Transport unknown')) {
          console.debug('🔌 Socket.IO transport negotiation in progress...');
          return;
        }

        console.warn('🔌 WebSocket connection failed:', err.message);
        console.warn('🔌 This is normal if the WebSocket server is not running');
        this.isConnecting = false;
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn(
            '🔌 WebSocket connection failed after maximum attempts - continuing without real-time features'
          );
          // Don't reject the promise, just log the warning and continue
          resolve();
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;

        if (reason === 'io server disconnect') {
          // Server-initiated disconnect, try to reconnect
          setTimeout(() => this.connect(authToken), this.reconnectDelay);
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentTaskRooms.clear();
    this.eventListeners.clear();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Room management
  joinTaskRoom(taskId: string): void {
    if (!this.socket?.connected) {
      console.warn('🔌 Cannot join task room: not connected');
      return;
    }

    this.socket.emit('join:task', taskId);
    this.currentTaskRooms.add(taskId);
  }

  leaveTaskRoom(taskId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leave:task', taskId);
    this.currentTaskRooms.delete(taskId);
  }

  // Typing indicators
  startTyping(taskId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:start', { taskId });
  }

  stopTyping(taskId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:stop', { taskId });
  }

  // Event listener management
  on<K extends keyof RealtimeEvents>(event: K, callback: RealtimeEvents[K]): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // If socket is connected, register the listener
    if (this.socket) {
      this.socket.on(event, callback as any);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off<K extends keyof RealtimeEvents>(event: K, callback: RealtimeEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  // Utility methods
  getCurrentTaskRooms(): string[] {
    return Array.from(this.currentTaskRooms);
  }

  getStats() {
    return {
      connected: this.isConnected,
      connectionState: this.connectionState,
      activeRooms: this.currentTaskRooms.size,
      eventListeners: this.eventListeners.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Re-register all existing event listeners
    for (const [event, listeners] of this.eventListeners.entries()) {
      for (const listener of listeners) {
        this.socket.on(event, listener as any);
      }
    }

    // Connection status events
    this.socket.on('reconnect', (attemptNumber) => {
      // Reconnected successfully
    });

    this.socket.on('reconnect_error', (err) => {
      console.error('🔌 Reconnection error:', err);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 Reconnection failed after maximum attempts');
    });
  }
}

// Create and export singleton instance
export const realtimeClient = new RealtimeClient();

// Auto-connect when auth token is available (browser only)
if (typeof window !== 'undefined') {
  // Try to connect when the module loads
  const token = sessionStorage.getItem('jwt_access_token');
  if (token) {
    realtimeClient.connect(token).catch((err) => {
      console.warn('🔌 Auto-connect failed:', err.message);
      console.warn('🔌 Real-time features will not be available');
    });
  }

  // Listen for storage events to handle login/logout
  window.addEventListener('storage', (event) => {
    if (event.key === 'jwt_access_token') {
      if (event.newValue) {
        // Token added - connect
        realtimeClient.connect(event.newValue).catch((err) => {
          console.warn('🔌 Auto-connect failed:', err.message);
        });
      } else {
        // Token removed - disconnect
        realtimeClient.disconnect();
      }
    }
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    realtimeClient.disconnect();
  });
}
