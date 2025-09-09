import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { Subtask, Task, User } from "../models";
import { AuthenticatedRequest } from "../types";

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

      // Update fields
      if (title !== undefined) subtask.title = title;
      if (description !== undefined) subtask.description = description;
      if (completed !== undefined) subtask.completed = completed;
      if (assignedTo !== undefined) subtask.assignedTo = assignedTo || undefined;

      await subtask.save();
      await subtask.populate('createdBy', 'name email');
      await subtask.populate('assignedTo', 'name email');

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

      return reply.send({ success: true, message: 'Subtask deleted successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to delete subtask');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}
