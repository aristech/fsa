import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export interface AuthenticatedSocket {
  id: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: any) => void;
  to: (room: string) => any;
  broadcast: any;
}

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
  
  // Generic events for future use
  'notification': (data: { type: string; message: string; data?: any }) => void;
}

class RealtimeService {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, { userId: string; tenantId: string; email: string }>();

  initialize(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupAuthentication();
    this.setupConnectionHandlers();
    
    console.log('🔌 Real-time service initialized');
  }

  private setupAuthentication() {
    if (!this.io) return;

    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        // Get user from database
        const user = await User.findById(decoded.userId);
        if (!user) {
          return next(new Error('User not found'));
        }

        // Attach user info to socket
        socket.userId = user._id.toString();
        socket.userEmail = user.email;
        socket.tenantId = user.tenantId;
        socket.userData = {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
        };

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupConnectionHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: any) => {
      const authenticatedSocket = socket as AuthenticatedSocket;
      
      console.log(`👤 User connected: ${socket.userEmail} (${socket.userId})`);
      
      // Store user connection
      this.connectedUsers.set(socket.id, {
        userId: socket.userId,
        tenantId: socket.tenantId,
        email: socket.userEmail,
      });

      // Join tenant room for tenant-wide events
      socket.join(`tenant:${socket.tenantId}`);
      
      // Notify others about user being online
      socket.broadcast.to(`tenant:${socket.tenantId}`).emit('user:online', {
        userId: socket.userId,
        userEmail: socket.userEmail,
      });

      // Handle task room joining
      socket.on('join:task', (taskId: string) => {
        socket.join(`task:${taskId}`);
        console.log(`📝 User ${socket.userEmail} joined task room: ${taskId}`);
      });

      socket.on('leave:task', (taskId: string) => {
        socket.leave(`task:${taskId}`);
        console.log(`📝 User ${socket.userEmail} left task room: ${taskId}`);
      });

      // Handle typing indicators
      socket.on('typing:start', (data: { taskId: string }) => {
        socket.broadcast.to(`task:${data.taskId}`).emit('user:typing', {
          taskId: data.taskId,
          userId: socket.userId,
          userEmail: socket.userEmail,
        });
      });

      socket.on('typing:stop', (data: { taskId: string }) => {
        socket.broadcast.to(`task:${data.taskId}`).emit('user:stop_typing', {
          taskId: data.taskId,
          userId: socket.userId,
          userEmail: socket.userEmail,
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        console.log(`👤 User disconnected: ${socket.userEmail} (${reason})`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.id);
        
        // Notify others about user being offline
        socket.broadcast.to(`tenant:${socket.tenantId}`).emit('user:offline', {
          userId: socket.userId,
          userEmail: socket.userEmail,
        });
      });

      // Handle connection errors
      socket.on('error', (error: any) => {
        console.error(`Socket error for user ${socket.userEmail}:`, error);
      });
    });
  }

  // Emit to specific task room
  emitToTask<K extends keyof RealtimeEvents>(taskId: string, event: K, data: Parameters<RealtimeEvents[K]>[0]) {
    if (!this.io) return;
    this.io.to(`task:${taskId}`).emit(event, data);
  }

  // Emit to specific tenant
  emitToTenant<K extends keyof RealtimeEvents>(tenantId: string, event: K, data: Parameters<RealtimeEvents[K]>[0]) {
    if (!this.io) return;
    this.io.to(`tenant:${tenantId}`).emit(event, data);
  }

  // Emit to specific user (all their connections)
  emitToUser<K extends keyof RealtimeEvents>(userId: string, event: K, data: Parameters<RealtimeEvents[K]>[0]) {
    if (!this.io) return;
    
    // Find all connections for this user
    for (const [socketId, userData] of this.connectedUsers.entries() as any) {
      if (userData.userId === userId) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  // Get online users for a tenant
  getOnlineUsers(tenantId: string): Array<{ userId: string; email: string }> {
    const onlineUsers = new Map<string, string>();
    
    for (const userData of this.connectedUsers.values()) {
      if (userData.tenantId === tenantId) {
        onlineUsers.set(userData.userId, userData.email);
      }
    }
    
    return Array.from(onlineUsers.entries()).map(([userId, email]) => ({ userId, email }));
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.connectedUsers.size,
      uniqueUsers: new Set(Array.from(this.connectedUsers.values()).map(u => u.userId)).size,
      tenants: new Set(Array.from(this.connectedUsers.values()).map(u => u.tenantId)).size,
    };
  }

  // Graceful shutdown
  shutdown() {
    if (this.io) {
      console.log('🔌 Shutting down real-time service...');
      this.io.close();
      this.io = null;
      this.connectedUsers.clear();
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
