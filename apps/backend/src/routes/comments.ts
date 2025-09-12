import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { Comment, Task, User } from "../models";
import { AuthenticatedRequest } from "../types";
import { realtimeService } from "../services/realtime-service";
import { NotificationService } from "../services/notification-service";

export async function commentsRoutes(fastify: FastifyInstance) {
  // Get comments for a task
  fastify.get('/:taskId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      const comments = await Comment.find({ taskId, tenantId: user.tenantId })
        .populate('createdBy', 'firstName lastName email avatar')
        .sort({ createdAt: 1 });

      // Transform comments to match frontend interface
      const transformedComments = comments.map(comment => {
        const createdByUser = comment.createdBy as any;
        const userName = createdByUser 
          ? `${createdByUser.firstName || ''} ${createdByUser.lastName || ''}`.trim() 
          : 'Unknown User';
        
        return {
          id: comment._id.toString(),
          name: userName || 'Unknown User',
          message: comment.message,
          messageType: comment.messageType,
          attachments: comment.attachments || [],
          avatarUrl: null, // We'll use initials instead
          initials: createdByUser 
            ? `${createdByUser.firstName?.charAt(0) || ''}${createdByUser.lastName?.charAt(0) || ''}`.toUpperCase() 
            : 'U',
          createdAt: comment.createdAt.toISOString(),
        };
      });

      return reply.send({ success: true, data: transformedComments });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch comments');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Create comment
  fastify.post('/:taskId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const { message, messageType = 'text', attachments = [] } = request.body as {
        message: string;
        messageType?: 'text' | 'image';
        attachments?: string[];
      };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Validate message
      if (!message || message.trim().length === 0) {
        return reply.code(400).send({ success: false, message: 'Message is required' });
      }

      const comment = new Comment({
        taskId,
        message: message.trim(),
        messageType,
        attachments,
        createdBy: user.id,
        tenantId: user.tenantId,
      });

      await comment.save();
      await comment.populate('createdBy', 'firstName lastName email avatar');

      // Transform comment to match frontend interface
      const transformedComment = {
        id: comment._id.toString(),
        name: (() => {
          const user = comment.createdBy as any;
          return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User';
        })(),
        message: comment.message,
        messageType: comment.messageType,
        attachments: comment.attachments || [],
        avatarUrl: null, // We'll use initials instead
        initials: (() => {
          const user = comment.createdBy as any;
          return user 
            ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() 
            : 'U';
        })(),
        createdAt: comment.createdAt.toISOString(),
      };

      // Emit real-time event to task room
      realtimeService.emitToTask(taskId, 'comment:created', {
        taskId,
        comment: transformedComment,
      });

      // Send notifications to task assignees and reporter
      await NotificationService.notifyCommentCreated(
        taskId,
        comment.message,
        user.id,
        user.tenantId
      );

      return reply.code(201).send({ success: true, data: transformedComment });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create comment');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Update comment
  fastify.put('/:taskId/:commentId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, commentId } = request.params as { taskId: string; commentId: string };
      const { message, attachments } = request.body as {
        message?: string;
        attachments?: string[];
      };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find comment and verify ownership
      const comment = await Comment.findOne({
        _id: commentId,
        taskId,
        tenantId: user.tenantId,
        createdBy: user.id, // Only allow editing own comments
      });

      if (!comment) {
        return reply.code(404).send({ success: false, message: 'Comment not found or not authorized' });
      }

      // Update fields
      if (message !== undefined) {
        if (!message || message.trim().length === 0) {
          return reply.code(400).send({ success: false, message: 'Message cannot be empty' });
        }
        comment.message = message.trim();
      }
      if (attachments !== undefined) comment.attachments = attachments;

      await comment.save();
      await comment.populate('createdBy', 'firstName lastName email avatar');

      // Transform comment to match frontend interface
      const transformedComment = {
        id: comment._id.toString(),
        name: (() => {
          const user = comment.createdBy as any;
          return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User';
        })(),
        message: comment.message,
        messageType: comment.messageType,
        attachments: comment.attachments || [],
        avatarUrl: null, // We'll use initials instead
        initials: (() => {
          const user = comment.createdBy as any;
          return user 
            ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() 
            : 'U';
        })(),
        createdAt: comment.createdAt.toISOString(),
      };

      // Emit real-time event to task room
      realtimeService.emitToTask(taskId, 'comment:updated', {
        taskId,
        commentId,
        comment: transformedComment,
      });

      return reply.send({ success: true, data: transformedComment });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update comment');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Delete comment
  fastify.delete('/:taskId/:commentId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, commentId } = request.params as { taskId: string; commentId: string };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find and delete comment (only allow deleting own comments)
      const comment = await Comment.findOneAndDelete({
        _id: commentId,
        taskId,
        tenantId: user.tenantId,
        createdBy: user.id, // Only allow deleting own comments
      });

      if (!comment) {
        return reply.code(404).send({ success: false, message: 'Comment not found or not authorized' });
      }

      // Emit real-time event to task room
      realtimeService.emitToTask(taskId, 'comment:deleted', {
        taskId,
        commentId,
      });

      return reply.send({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to delete comment');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
