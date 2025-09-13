import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { TaskMaterial, Task, Material, User } from "../models";
import { AuthenticatedRequest } from "../types";

export async function taskMaterialsRoutes(fastify: FastifyInstance) {
  // Get materials for a task
  fastify.get('/:taskId/materials', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      const taskMaterials = await TaskMaterial.find({ taskId, tenantId: user.tenantId })
        .populate('materialId', 'name description category sku barcode unit unitCost quantity location supplier status')
        .populate('addedBy', 'name email')
        .sort({ createdAt: -1 });

      // Transform the data to match frontend interface
      const transformedData = taskMaterials.map(tm => ({
        _id: tm._id,
        materialId: tm.materialId,
        material: tm.materialId,
        quantity: tm.quantity,
        unitCost: tm.unitCost,
        totalCost: tm.totalCost,
        addedBy: tm.addedBy,
        addedAt: tm.createdAt,
      }));

      return reply.send({ success: true, data: transformedData });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch task materials');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Add material to task
  fastify.post('/:taskId/materials', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const { materialId, quantity } = request.body as {
        materialId: string;
        quantity: number;
      };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Verify material exists and user has access
      const material = await Material.findOne({ _id: materialId, tenantId: user.tenantId });
      if (!material) {
        return reply.code(404).send({ success: false, message: 'Material not found' });
      }

      // Check if material is already added to this task
      const existingTaskMaterial = await TaskMaterial.findOne({
        taskId,
        materialId,
        tenantId: user.tenantId,
      });

      if (existingTaskMaterial) {
        return reply.code(409).send({
          success: false,
          message: 'Material is already added to this task'
        });
      }

      const taskMaterial = new TaskMaterial({
        tenantId: user.tenantId,
        taskId,
        materialId,
        quantity,
        unitCost: material.unitCost,
        addedBy: user.id,
      });

      await taskMaterial.save();
      await taskMaterial.populate('materialId', 'name description category sku barcode unit unitCost quantity location supplier status');
      await taskMaterial.populate('addedBy', 'name email');

      // Transform the data to match frontend interface
      const transformedData = {
        _id: taskMaterial._id,
        materialId: taskMaterial.materialId,
        material: taskMaterial.materialId,
        quantity: taskMaterial.quantity,
        unitCost: taskMaterial.unitCost,
        totalCost: taskMaterial.totalCost,
        addedBy: taskMaterial.addedBy,
        addedAt: taskMaterial.createdAt,
      };

      return reply.code(201).send({ success: true, data: transformedData });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to add material to task');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Update task material (mainly quantity)
  fastify.put('/:taskId/materials/:taskMaterialId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, taskMaterialId } = request.params as {
        taskId: string;
        taskMaterialId: string;
      };
      const { quantity } = request.body as { quantity?: number };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find task material
      const taskMaterial = await TaskMaterial.findOne({
        _id: taskMaterialId,
        taskId,
        tenantId: user.tenantId,
      });

      if (!taskMaterial) {
        return reply.code(404).send({ success: false, message: 'Task material not found' });
      }

      // Update quantity if provided
      if (quantity !== undefined) {
        if (quantity < 1) {
          return reply.code(400).send({
            success: false,
            message: 'Quantity must be at least 1'
          });
        }
        taskMaterial.quantity = quantity;
      }

      await taskMaterial.save();
      await taskMaterial.populate('materialId', 'name description category sku barcode unit unitCost quantity location supplier status');
      await taskMaterial.populate('addedBy', 'name email');

      // Transform the data to match frontend interface
      const transformedData = {
        _id: taskMaterial._id,
        materialId: taskMaterial.materialId,
        material: taskMaterial.materialId,
        quantity: taskMaterial.quantity,
        unitCost: taskMaterial.unitCost,
        totalCost: taskMaterial.totalCost,
        addedBy: taskMaterial.addedBy,
        addedAt: taskMaterial.createdAt,
      };

      return reply.send({ success: true, data: transformedData });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update task material');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Remove material from task
  fastify.delete('/:taskId/materials/:taskMaterialId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId, taskMaterialId } = request.params as {
        taskId: string;
        taskMaterialId: string;
      };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      // Find and delete task material
      const taskMaterial = await TaskMaterial.findOneAndDelete({
        _id: taskMaterialId,
        taskId,
        tenantId: user.tenantId,
      });

      if (!taskMaterial) {
        return reply.code(404).send({ success: false, message: 'Task material not found' });
      }

      return reply.send({ success: true, message: 'Material removed from task successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to remove material from task');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // Get materials usage statistics for a task
  fastify.get('/:taskId/materials/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const user = (request as AuthenticatedRequest).user;

      // Verify task exists and user has access
      const task = await Task.findOne({ _id: taskId, tenantId: user.tenantId });
      if (!task) {
        return reply.code(404).send({ success: false, message: 'Task not found' });
      }

      const stats = await TaskMaterial.aggregate([
        {
          $match: {
            taskId: taskId,
            tenantId: user.tenantId,
          }
        },
        {
          $group: {
            _id: null,
            totalMaterials: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalCost: { $sum: '$totalCost' },
            avgCostPerMaterial: { $avg: '$totalCost' },
          }
        }
      ]);

      const result = stats.length > 0 ? stats[0] : {
        totalMaterials: 0,
        totalQuantity: 0,
        totalCost: 0,
        avgCostPerMaterial: 0,
      };

      return reply.send({ success: true, data: result });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch task materials stats');
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  });
}