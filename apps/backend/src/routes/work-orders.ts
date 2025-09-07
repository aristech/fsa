import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import { WorkOrder, Personnel } from "../models";
import { AuthenticatedRequest } from "../types";
import mongoose from "mongoose";
import { WorkOrderProgressService } from "../services/work-order-progress-service";

export async function workOrderRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/v1/work-orders - Get work orders list
  fastify.get(
    "/",
    { preHandler: requirePermission("workOrders.view") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const {
          page = 1,
          limit = 10,
          status,
          priority,
          personnelId,
          clientId,
        } = request.query as {
          page?: number;
          limit?: number;
          status?: string;
          priority?: string;
          personnelId?: string;
          clientId?: string;
        };

        // Build filter
        const filter: any = { tenantId: tenant._id };
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (personnelId) filter.personnelIds = personnelId;
        if (clientId) filter.clientId = clientId;

        // Get work orders with pagination, sorted by created_at (latest first)
        const skip = (page - 1) * limit;
        const workOrders = await WorkOrder.find(filter)
          .populate("clientId", "name email phone company")
          .populate("personnelIds", "employeeId user role")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const total = await WorkOrder.countDocuments(filter);

        return reply.send({
          success: true,
          data: {
            workOrders,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          },
        });
      } catch (error) {
        console.error("Error fetching work orders:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // GET /api/v1/work-orders/:id - Get work order by ID
  fastify.get(
    "/:id",
    { preHandler: requirePermission("workOrders.view") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const workOrder = await WorkOrder.findOne({
          _id: id,
          tenantId: tenant._id,
        })
          .populate("clientId", "name email phone company")
          .populate("personnelIds", "employeeId user role");

        if (!workOrder) {
          return reply.code(404).send({
            success: false,
            error: "Work order not found",
          });
        }

        return reply.send({
          success: true,
          data: workOrder,
        });
      } catch (error) {
        console.error("Error fetching work order:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // GET /api/v1/work-orders/:id/summary - Aggregated progress and counters
  fastify.get(
    "/:id/summary",
    { preHandler: requirePermission("workOrders.view") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const workOrder = await WorkOrder.findOne({
          _id: id,
          tenantId: tenant._id,
        }).lean();
        if (!workOrder) {
          return reply
            .code(404)
            .send({ success: false, error: "Work order not found" });
        }

        return reply.send({
          success: true,
          data: {
            progressMode: workOrder.progressMode,
            progress: workOrder.progress ?? 0,
            tasksTotal: workOrder.tasksTotal ?? 0,
            tasksCompleted: workOrder.tasksCompleted ?? 0,
            tasksInProgress: workOrder.tasksInProgress ?? 0,
            tasksBlocked: workOrder.tasksBlocked ?? 0,
            startedAt: workOrder.startedAt ?? null,
            completedAt: workOrder.completedAt ?? null,
            status: workOrder.status,
          },
        });
      } catch (error) {
        console.error("Error getting work order summary:", error);
        return reply
          .code(500)
          .send({ success: false, error: "Internal server error" });
      }
    }
  );

  // POST /api/v1/work-orders - Create work order
  fastify.post(
    "/",
    { preHandler: requirePermission("workOrders.create") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant, user } = req.context!;
        const body = request.body as any;

        // Validate personnelIds if provided
        if (body.personnelIds && Array.isArray(body.personnelIds)) {
          // Validate that all personnelIds are valid ObjectIds
          for (const personnelId of body.personnelIds) {
            if (!mongoose.Types.ObjectId.isValid(personnelId)) {
              return reply.code(400).send({
                success: false,
                error: "Invalid personnel ID format",
              });
            }
          }

          // Validate that all personnel exist and belong to the tenant
          const personnelCount = await Personnel.countDocuments({
            _id: { $in: body.personnelIds },
            tenantId: tenant._id,
          });

          if (personnelCount !== body.personnelIds.length) {
            return reply.code(400).send({
              success: false,
              error:
                "One or more personnel not found or don't belong to this tenant",
            });
          }
        }

        // Generate work order number
        const count = await WorkOrder.countDocuments({ tenantId: tenant._id });
        const workOrderNumber = `WO-${String(count + 1).padStart(6, "0")}`;

        const workOrder = new WorkOrder({
          ...body,
          tenantId: tenant._id,
          workOrderNumber,
          createdBy: user.id,
          history: [
            {
              status: "created",
              timestamp: new Date(),
              userId: user.id,
              notes: "Work order created",
            },
          ],
        });

        await workOrder.save();

        // Recompute aggregates after creation
        await WorkOrderProgressService.recomputeForWorkOrder(
          tenant._id.toString(),
          workOrder._id.toString()
        );

        return reply.code(201).send({
          success: true,
          message: "Work order created successfully",
          data: workOrder,
        });
      } catch (error) {
        console.error("Error creating work order:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // PUT /api/v1/work-orders/:id - Update work order
  fastify.put(
    "/:id",
    { preHandler: requirePermission("workOrders.edit") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant, user } = req.context!;
        const { id } = request.params as { id: string };
        const body = request.body as any;

        // Validate personnelIds if provided
        if (body.personnelIds && Array.isArray(body.personnelIds)) {
          // Validate that all personnelIds are valid ObjectIds
          for (const personnelId of body.personnelIds) {
            if (!mongoose.Types.ObjectId.isValid(personnelId)) {
              return reply.code(400).send({
                success: false,
                error: "Invalid personnel ID format",
              });
            }
          }

          // Validate that all personnel exist and belong to the tenant
          const personnelCount = await Personnel.countDocuments({
            _id: { $in: body.personnelIds },
            tenantId: tenant._id,
          });

          if (personnelCount !== body.personnelIds.length) {
            return reply.code(400).send({
              success: false,
              error:
                "One or more personnel not found or don't belong to this tenant",
            });
          }
        }

        const workOrder = await WorkOrder.findOneAndUpdate(
          {
            _id: id,
            tenantId: tenant._id,
          },
          {
            ...body,
            updatedAt: new Date(),
          },
          { new: true }
        );

        if (!workOrder) {
          return reply.code(404).send({
            success: false,
            error: "Work order not found",
          });
        }

        // Recompute aggregates after update
        await WorkOrderProgressService.recomputeForWorkOrder(
          tenant._id.toString(),
          workOrder._id.toString()
        );

        return reply.send({
          success: true,
          message: "Work order updated successfully",
          data: workOrder,
        });
      } catch (error) {
        console.error("Error updating work order:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // DELETE /api/v1/work-orders/:id - Delete work order
  fastify.delete(
    "/:id",
    { preHandler: requirePermission("workOrders.delete") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const workOrder = await WorkOrder.findOneAndDelete({
          _id: id,
          tenantId: tenant._id,
        });

        if (!workOrder) {
          return reply.code(404).send({
            success: false,
            error: "Work order not found",
          });
        }

        return reply.send({
          success: true,
          message: "Work order deleted successfully",
          data: workOrder,
        });
      } catch (error) {
        console.error("Error deleting work order:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );
}
