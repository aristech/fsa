import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { Subtask, Task, User } from "../models";
import { AuthenticatedRequest } from "../types";
import { WorkOrderTimelineService } from "../services/work-order-timeline-service";

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
        .sort({ createdAt: 1 });

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

      const subtask = new Subtask({
        taskId,
        title,
        description,
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
}
