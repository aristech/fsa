import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import {
  requireWorkOrderView,
  requireWorkOrderEdit,
} from "../middleware/resource-permission-guard";
import { WorkOrder, Personnel } from "../models";
import { getNextSequence } from "../models/counter";
import { AuthenticatedRequest } from "../types";
import mongoose from "mongoose";
import { WorkOrderProgressService } from "../services/work-order-progress-service";
import { AssignmentPermissionService } from "../services/assignment-permission-service";
import { EntityCleanupService } from "../services/entity-cleanup-service";
import { WorkOrderAssignmentService } from "../services/work-order-assignment-service";

export async function workOrderRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/v1/work-orders - Get work orders list
  fastify.get(
    "/",
    { preHandler: requireWorkOrderView() },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant, user } = req.context!;
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

        // Check if user only has "own" permissions and filter accordingly
        const { PermissionService } = await import(
          "../services/permission-service"
        );
        const { Personnel } = await import("../models");

        const hasFullPermission = await PermissionService.hasPermission(
          user.id,
          "workOrders.view",
        );
        const hasOwnPermission = await PermissionService.hasPermission(
          user.id,
          "workOrders.viewOwn",
        );

        if (
          !hasFullPermission.hasPermission &&
          hasOwnPermission.hasPermission
        ) {
          // User only has "own" permission, filter to their assigned work orders
          const personnel = await Personnel.findOne({
            userId: user.id,
            tenantId: tenant._id,
          });
          if (personnel) {
            filter.personnelIds = personnel._id.toString();
          } else {
            // User has no personnel record, they can't see any work orders
            return reply.send({
              success: true,
              data: {
                workOrders: [],
                pagination: {
                  page: Number(page),
                  limit: Number(limit),
                  total: 0,
                  totalPages: 0,
                },
              },
            });
          }
        }

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
    },
  );

  // GET /api/v1/work-orders/:id - Get work order by ID
  fastify.get(
    "/:id",
    { preHandler: requireWorkOrderView() },
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
    },
  );

  // GET /api/v1/work-orders/:id/summary - Aggregated progress and counters
  fastify.get(
    "/:id/summary",
    { preHandler: requireWorkOrderView() },
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

        // Return minimal safe summary due to types with lean()
        const wo: any = workOrder as any;
        return reply.send({
          success: true,
          data: {
            progressMode: wo.progressMode,
            progress: wo.progress ?? 0,
            tasksTotal: wo.tasksTotal ?? 0,
            tasksCompleted: wo.tasksCompleted ?? 0,
            tasksInProgress: wo.tasksInProgress ?? 0,
            tasksBlocked: wo.tasksBlocked ?? 0,
            startedAt: wo.startedAt ?? null,
            completedAt: wo.completedAt ?? null,
            status: wo.status,
          },
        });
      } catch (error) {
        console.error("Error getting work order summary:", error);
        return reply
          .code(500)
          .send({ success: false, error: "Internal server error" });
      }
    },
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

          // Validate that all personnel exist, belong to tenant, and are eligible (active)
          const personnelDocs = await Personnel.find({
            _id: { $in: body.personnelIds },
            tenantId: tenant._id,
          }).select("_id isActive status");

          if (personnelDocs.length !== body.personnelIds.length) {
            return reply.code(400).send({
              success: false,
              error:
                "One or more personnel not found or don't belong to this tenant",
            });
          }

          const ineligible = personnelDocs
            .filter((p: any) => !p.isActive || p.status !== "active")
            .map((p: any) => p._id.toString());

          if (ineligible.length > 0) {
            return reply.code(400).send({
              success: false,
              error:
                "One or more personnel are not eligible for assignment (inactive or pending)",
              data: { ineligible },
            });
          }
        }

        // Generate per-tenant sequential work order number using atomic counter
        const seq = await getNextSequence(tenant._id.toString(), "workOrder");
        const workOrderNumber = `WO-${String(seq).padStart(6, "0")}`;

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
          workOrder._id.toString(),
        );

        // Propagate personnel assignments to existing tasks linked to this work order
        if (body.personnelIds && Array.isArray(body.personnelIds) && body.personnelIds.length > 0) {
          try {
            await WorkOrderAssignmentService.propagateWorkOrderAssignments(
              workOrder._id.toString(),
              body.personnelIds,
              [], // no previous personnel for new work order
              tenant._id.toString(),
              user.id
            );
          } catch (error) {
            console.error('Error propagating work order assignments:', error);
            // Don't fail work order creation if assignment propagation fails
          }
        }

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
    },
  );

  // PUT /api/v1/work-orders/:id - Update work order
  fastify.put(
    "/:id",
    { preHandler: requireWorkOrderEdit() },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant, user } = req.context!;
        const { id } = request.params as { id: string };
        const body = request.body as any;

        // Get current work order to track personnel changes
        const currentWorkOrder = await WorkOrder.findOne({
          _id: id,
          tenantId: tenant._id,
        }).select('personnelIds');

        if (!currentWorkOrder) {
          return reply.code(404).send({
            success: false,
            error: "Work order not found",
          });
        }

        const previousPersonnelIds = currentWorkOrder.personnelIds || [];

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
          { new: true },
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
          workOrder._id.toString(),
        );

        // Handle assignment permissions if personnelIds were updated
        if (body.personnelIds !== undefined) {
          await AssignmentPermissionService.handleWorkOrderAssignment(
            workOrder._id.toString(),
            workOrder.personnelIds || [],
            tenant._id.toString(),
          );

          // Propagate assignment changes to existing tasks
          const newPersonnelIds = workOrder.personnelIds || [];
          const previousPersonnelIdsStr = previousPersonnelIds.map((id: any) => id.toString());
          const newPersonnelIdsStr = newPersonnelIds.map((id: any) => id.toString());
          
          // Check if there are any changes in personnel assignments
          const hasChanges = 
            previousPersonnelIdsStr.length !== newPersonnelIdsStr.length ||
            !previousPersonnelIdsStr.every((id: string) => newPersonnelIdsStr.includes(id)) ||
            !newPersonnelIdsStr.every((id: string) => previousPersonnelIdsStr.includes(id));

          if (hasChanges) {
            try {
              // Propagate new assignments to tasks
              if (newPersonnelIdsStr.length > 0) {
                await WorkOrderAssignmentService.propagateWorkOrderAssignments(
                  workOrder._id.toString(),
                  newPersonnelIdsStr,
                  previousPersonnelIdsStr,
                  tenant._id.toString(),
                  user.id
                );
              }

              // Handle removed personnel (they remain on tasks but we log this)
              const removedPersonnelIds = previousPersonnelIdsStr.filter((id: string) => 
                !newPersonnelIdsStr.includes(id)
              );
              
              if (removedPersonnelIds.length > 0) {
                await WorkOrderAssignmentService.handleWorkOrderPersonnelRemoval(
                  workOrder._id.toString(),
                  removedPersonnelIds,
                  tenant._id.toString(),
                  user.id
                );
              }
            } catch (error) {
              console.error('Error propagating work order assignment changes:', error);
              // Don't fail the update if assignment propagation fails
            }
          }
        }

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
    },
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

        // Check if work order exists before cleanup
        const workOrder = await WorkOrder.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!workOrder) {
          return reply.code(404).send({
            success: false,
            error: "Work order not found",
          });
        }

        // Perform comprehensive cleanup
        const cleanupResult = await EntityCleanupService.cleanupWorkOrder(
          id,
          tenant._id.toString(),
          {
            deleteFiles: true,
            deleteComments: true,
            deleteAssignments: true,
            cascadeDelete: false, // Don't delete related tasks by default
          },
        );

        if (!cleanupResult.success) {
          fastify.log.error(
            `Work order cleanup failed: ${cleanupResult.message}`,
          );
          return reply.code(500).send({
            success: false,
            error: `Failed to cleanup work order: ${cleanupResult.message}`,
          });
        }

        // Log cleanup details
        fastify.log.info(
          `🧹 Work order cleanup completed: ${JSON.stringify(cleanupResult.details)}`,
        );

        return reply.send({
          success: true,
          message: cleanupResult.message,
          data: {
            workOrder: {
              _id: workOrder._id,
              title: workOrder.title,
              clientName: workOrder.clientName,
            },
            cleanupDetails: cleanupResult.details,
          },
        });
      } catch (error) {
        console.error("Error deleting work order:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );
}
