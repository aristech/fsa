import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { Subtask, Task, User } from "../models";
import { AuthenticatedRequest } from "../types";
import { WorkOrderTimelineService } from "../services/work-order-timeline-service";
import * as path from "path";
import * as fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

export async function subtasksRoutes(fastify: FastifyInstance) {
  // Get subtasks for a task
  fastify.get('/:taskId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      const subtasks = await Subtask.find({ taskId, tenantId: user.tenantId })
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('attachments.uploadedBy', 'name email')
        .sort({ order: 1, createdAt: 1 });

      return reply.send({ success: true, data: subtasks });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch subtasks');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Create subtask
  fastify.post('/:taskId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const { title, description, assignedTo } = request.body as {
        title: string;
        description?: string;
        assignedTo?: string;
      };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Validate assigned user if provided
      if (assignedTo) {
        const assignedUser = await User.findOne({ _id: assignedTo, tenantId: user.tenantId });
        if (!assignedUser) {
          return reply.code(400).send({ success: false, message: 'Assigned user not found' });
        }
      }

      // Get the next order number for this task
      const lastSubtask = await Subtask.findOne({ taskId, tenantId: user.tenantId })
        .sort({ order: -1 })
        .select('order');
      const nextOrder = lastSubtask ? lastSubtask.order + 1 : 0;

      const subtask = new Subtask({
        taskId,
        title,
        description,
        order: nextOrder,
        assignedTo: assignedTo || undefined,
        createdBy: user.id,
        tenantId: user.tenantId,
      });

      await subtask.save();
      await subtask.populate('createdBy', 'name email');
      await subtask.populate('assignedTo', 'name email');

      // Log timeline entry if task is linked to a work order
      if (task.workOrderId) {
        try {
          await WorkOrderTimelineService.addTimelineEntry({
            workOrderId: task.workOrderId,
            entityType: 'task',
            entityId: taskId,
            eventType: 'updated',
            title: `Subtask "${title}" was added to task "${task.title}"`,
            metadata: {
              taskTitle: task.title,
              taskId: taskId,
              subtaskTitle: title,
              subtaskId: subtask._id.toString()
            },
            userId: user.id,
            tenantId: user.tenantId,
          });
        } catch (error) {
          console.error('Error adding timeline entry for subtask creation:', error);
        }
      }

      return reply.code(201).send({ success: true, data: subtask });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create subtask');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Update subtask
  fastify.put('/:taskId/:subtaskId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, subtaskId } = request.params as { taskId: string; subtaskId: string };
      const { title, description, completed, assignedTo } = request.body as {
        title?: string;
        description?: string;
        completed?: boolean;
        assignedTo?: string;
      };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find subtask
      const subtask = await Subtask.findOne({
        _id: subtaskId,
        taskId,
        tenantId: user.tenantId,
      });

      if (!subtask) {
        return reply.code(404).send({ success: false, message: 'Subtask not found' });
      }

      // Validate assigned user if provided
      if (assignedTo) {
        const assignedUser = await User.findOne({ _id: assignedTo, tenantId: user.tenantId });
        if (!assignedUser) {
          return reply.code(400).send({ success: false, message: 'Assigned user not found' });
        }
      }

      // Track changes for timeline
      const changes: string[] = [];
      const originalTitle = subtask.title;
      const originalCompleted = subtask.completed;

      // Update fields
      if (title !== undefined && title !== subtask.title) {
        subtask.title = title;
        changes.push('title');
      }
      if (description !== undefined) subtask.description = description;
      if (completed !== undefined && completed !== subtask.completed) {
        subtask.completed = completed;
        changes.push('completed');
      }
      if (assignedTo !== undefined) subtask.assignedTo = assignedTo || undefined as any;

      await subtask.save();
      await subtask.populate('createdBy', 'name email');
      await subtask.populate('assignedTo', 'name email');

      // Log timeline entry if task is linked to a work order and there are changes
      if (task.workOrderId && changes.length > 0) {
        try {
          let timelineTitle = '';
          if (changes.includes('completed')) {
            timelineTitle = completed
              ? `Subtask "${subtask.title}" was completed in task "${task.title}"`
              : `Subtask "${subtask.title}" was marked as incomplete in task "${task.title}"`;
          } else if (changes.includes('title')) {
            timelineTitle = `Subtask renamed from "${originalTitle}" to "${subtask.title}" in task "${task.title}"`;
          } else {
            timelineTitle = `Subtask "${subtask.title}" was updated in task "${task.title}"`;
          }

          await WorkOrderTimelineService.addTimelineEntry({
            workOrderId: task.workOrderId,
            entityType: 'task',
            entityId: taskId,
            eventType: changes.includes('completed') && completed ? 'completed' : 'updated',
            title: timelineTitle,
            metadata: {
              taskTitle: task.title,
              taskId: taskId,
              subtaskTitle: subtask.title,
              subtaskId: subtask._id.toString(),
              changes: changes
            },
            userId: user.id,
            tenantId: user.tenantId,
          });
        } catch (error) {
          console.error('Error adding timeline entry for subtask update:', error);
        }
      }

      return reply.send({ success: true, data: subtask });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update subtask');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Delete subtask
  fastify.delete('/:taskId/:subtaskId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, subtaskId } = request.params as { taskId: string; subtaskId: string };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find and delete subtask
      const subtask = await Subtask.findOneAndDelete({
        _id: subtaskId,
        taskId,
        tenantId: user.tenantId,
      });

      if (!subtask) {
        return reply.code(404).send({ success: false, message: 'Subtask not found' });
      }

      // Log timeline entry if task is linked to a work order
      if (task.workOrderId) {
        try {
          await WorkOrderTimelineService.addTimelineEntry({
            workOrderId: task.workOrderId,
            entityType: 'task',
            entityId: taskId,
            eventType: 'updated',
            title: `Subtask "${subtask.title}" was removed from task "${task.title}"`,
            metadata: {
              taskTitle: task.title,
              taskId: taskId,
              subtaskTitle: subtask.title,
              subtaskId: subtask._id.toString()
            },
            userId: user.id,
            tenantId: user.tenantId,
          });
        } catch (error) {
          console.error('Error adding timeline entry for subtask deletion:', error);
        }
      }

      return reply.send({ success: true, message: 'Subtask deleted successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to delete subtask');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Reorder subtasks
  fastify.put('/:taskId/reorder', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const { subtaskIds } = request.body as { subtaskIds: string[] };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Update the order of each subtask
      const updatePromises = subtaskIds.map((subtaskId, index) =>
        Subtask.updateOne(
          { _id: subtaskId, taskId, tenantId: user.tenantId },
          { order: index }
        )
      );

      await Promise.all(updatePromises);

      // Fetch updated subtasks
      const subtasks = await Subtask.find({ taskId, tenantId: user.tenantId })
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('attachments.uploadedBy', 'name email')
        .sort({ order: 1, createdAt: 1 });

      // Log timeline entry if task is linked to a work order
      if (task.workOrderId) {
        try {
          await WorkOrderTimelineService.addTimelineEntry({
            workOrderId: task.workOrderId,
            entityType: 'task',
            entityId: taskId,
            eventType: 'updated',
            title: `Subtasks were reordered in task "${task.title}"`,
            metadata: {
              taskTitle: task.title,
              taskId: taskId,
              subtaskCount: subtaskIds.length
            },
            userId: user.id,
            tenantId: user.tenantId,
          });
        } catch (error) {
          console.error('Error adding timeline entry for subtask reordering:', error);
        }
      }

      return reply.send({ success: true, data: subtasks });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to reorder subtasks');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Add attachment to subtask
  fastify.post('/:taskId/:subtaskId/attachments', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, subtaskId } = request.params as { taskId: string; subtaskId: string };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find subtask
      const subtask = await Subtask.findOne({
        _id: subtaskId,
        taskId,
        tenantId: user.tenantId,
      });

      if (!subtask) {
        return reply.code(404).send({ success: false, message: 'Subtask not found' });
      }

      // Handle file upload
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ success: false, message: 'No file uploaded' });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'subtask-attachments');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const fileExtension = path.extname(data.filename);
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Save file to disk
      await pipeline(data.file, createWriteStream(filePath));

      // Add attachment to subtask
      const attachment = {
        filename: uniqueFilename,
        originalName: data.filename,
        size: (await fs.stat(filePath)).size,
        mimetype: data.mimetype,
        uploadedAt: new Date(),
        uploadedBy: user.id,
      };

      if (!subtask.attachments) {
        subtask.attachments = [];
      }
      subtask.attachments.push(attachment);

      await subtask.save();
      await subtask.populate('attachments.uploadedBy', 'name email');

      return reply.send({ success: true, data: subtask });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to add attachment to subtask');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Remove attachment from subtask
  fastify.delete('/:taskId/:subtaskId/attachments/:attachmentId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, subtaskId, attachmentId } = request.params as {
        taskId: string;
        subtaskId: string;
        attachmentId: string;
      };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find subtask to get attachment filename before deletion
      const subtask = await Subtask.findOne({
        _id: subtaskId,
        taskId,
        tenantId: user.tenantId,
      });

      if (!subtask) {
        return reply.code(404).send({ success: false, message: 'Subtask not found' });
      }

      // Find the attachment to get filename
      const attachment = subtask.attachments?.find(att => att._id?.toString() === attachmentId);
      if (attachment) {
        // Delete file from disk
        const filePath = path.join(process.cwd(), 'uploads', 'subtask-attachments', attachment.filename);
        try {
          await fs.unlink(filePath);
        } catch (fileError) {
          fastify.log.warn({ error: fileError }, 'Failed to delete file from disk');
        }
      }

      // Remove attachment from database
      const updatedSubtask = await Subtask.findOneAndUpdate(
        { _id: subtaskId, taskId, tenantId: user.tenantId },
        { $pull: { attachments: { _id: attachmentId } } },
        { new: true }
      ).populate('attachments.uploadedBy', 'name email');

      return reply.send({ success: true, data: updatedSubtask });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to remove attachment from subtask');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

}
