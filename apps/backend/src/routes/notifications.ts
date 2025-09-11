import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AuthenticatedRequest } from '../types';
import { NotificationService } from '../services/notification-service';
import { authenticate } from '../middleware/auth';

export async function notificationRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes
  fastify.addHook("preHandler", authenticate);

  // ----------------------------------------------------------------------

  /**
   * GET /api/notifications
   * Get notifications for the current user
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const tenantId = tenant._id;
      const { isRead, isArchived, limit = '50', skip = '0' } = request.query as any;

      console.log('📨 Notification API called with:', {
        userId: user.id,
        userName: `${user.email}`,
        tenantId,
        queryParams: { isRead, isArchived, limit, skip }
      });

      const options = {
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
        isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
        limit: parseInt(limit as string, 10),
        skip: parseInt(skip as string, 10),
      };

      console.log('🔍 Query options:', options);

      const notifications = await NotificationService.getUserNotifications(
        tenantId,
        user.id,
        options
      );

      console.log(`📨 Query result: ${notifications.length} notifications found for user ${user.id}`);
      if (notifications.length > 0) {
        console.log('📋 Sample notifications:', notifications.slice(0, 2).map(n => ({
          id: n._id,
          type: n.type,
          title: n.title,
          userId: n.userId,
          isRead: n.isRead,
          isArchived: n.isArchived,
          createdAt: n.createdAt
        })));
      }

      return {
        success: true,
        data: notifications,
        pagination: {
          limit: options.limit,
          skip: options.skip,
          hasMore: notifications.length === options.limit,
        },
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch notifications',
      });
    }
  });

  /**
   * GET /api/notifications/counts
   * Get notification counts for the current user
   */
  fastify.get('/counts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const tenantId = tenant._id;

      const counts = await NotificationService.getNotificationCounts(tenantId, user.id);

      return {
        success: true,
        data: counts,
      };
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch notification counts',
      });
    }
  });

  /**
   * PUT /api/notifications/mark-read
   * Mark notifications as read
   */
  fastify.put('/mark-read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const tenantId = tenant._id;
      const { notificationIds } = request.body as any;

      await NotificationService.markAsRead(tenantId, user.id, notificationIds);

      return {
        success: true,
        message: notificationIds && notificationIds.length > 0 
          ? `${notificationIds.length} notification(s) marked as read`
          : 'All notifications marked as read',
      };
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to mark notifications as read',
      });
    }
  });

  /**
   * PUT /api/notifications/archive
   * Archive notifications
   */
  fastify.put('/archive', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const tenantId = tenant._id;
      const { notificationIds } = request.body as any;

      if (!notificationIds || notificationIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'notificationIds is required for archiving',
        });
      }

      await NotificationService.archiveNotifications(tenantId, user.id, notificationIds);

      return {
        success: true,
        message: `${notificationIds.length} notification(s) archived`,
      };
    } catch (error) {
      console.error('Error archiving notifications:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to archive notifications',
      });
    }
  });

  /**
   * GET /api/notifications/:id
   * Get a specific notification
   */
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const tenantId = tenant._id;
      const { id } = request.params as any;

      const notifications = await NotificationService.getUserNotifications(
        tenantId,
        user.id,
        { limit: 1000 } // Get many to find the specific one
      );

      const specificNotification = notifications.find(n => n._id.toString() === id);

      if (!specificNotification) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found',
        });
      }

      return {
        success: true,
        data: specificNotification,
      };
    } catch (error) {
      console.error('Error fetching notification:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch notification',
      });
    }
  });
}