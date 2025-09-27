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
import { WorkOrderTimelineService } from "../services/work-order-timeline-service";
import { WebhookService } from "../services/webhook-service";
import { WorkOrderSmsService } from "../services/work-order-sms-service";

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
          search,
        } = request.query as {
          page?: number;
          limit?: number;
          status?: string;
          priority?: string;
          personnelId?: string;
          clientId?: string;
          search?: string;
        };

        // Build filter
        const filter: any = { tenantId: tenant._id };
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (personnelId) filter.personnelIds = personnelId;
        if (clientId) filter.clientId = clientId;

        // Add search functionality using aggregation pipeline
        let aggregationPipeline: any[] = [];

        if (search && search.trim()) {
          // Normalize search term for better Greek character matching
          const normalizedSearch = search.trim().normalize('NFD');
          // Create regex with Unicode support and case-insensitive matching
          const searchRegex = {
            $regex: normalizedSearch,
            $options: "iu" // 'i' for case-insensitive, 'u' for Unicode support
          };

          aggregationPipeline = [
            // First, try MongoDB text search for direct work order fields
            {
              $match: {
                ...filter,
                $or: [
                  // Text search on indexed fields
                  { $text: { $search: normalizedSearch } },
                  // Fallback regex search for better Unicode support
                  { title: searchRegex },
                  { workOrderNumber: searchRegex },
                  { details: searchRegex },
                  { "location.address": searchRegex },
                ]
              }
            },
            {
              $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "client",
              },
            },
            {
              $lookup: {
                from: "personnel",
                localField: "personnelIds",
                foreignField: "_id",
                as: "personnel",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "personnel.user",
                foreignField: "_id",
                as: "personnelUsers",
              },
            },
            {
              $addFields: {
                personnelNames: {
                  $map: {
                    input: "$personnelUsers",
                    as: "user",
                    in: {
                      $concat: ["$$user.firstName", " ", "$$user.lastName"],
                    },
                  },
                },
                // Add text search score for sorting
                textScore: { $meta: "textScore" }
              },
            },
            // Additional filter for client and personnel search
            {
              $match: {
                $or: [
                  // Already matched by text search or regex above
                  { textScore: { $gt: 0 } },
                  { title: searchRegex },
                  { workOrderNumber: searchRegex },
                  { details: searchRegex },
                  { "location.address": searchRegex },
                  // Client and personnel searches
                  { "client.name": searchRegex },
                  { "client.company": searchRegex },
                  { "client.email": searchRegex },
                  { "client.phone": searchRegex },
                  { personnelNames: searchRegex },
                  // Material names
                  { "materials.name": searchRegex },
                ],
              },
            },
          ];
        }

        // Check if user only has "own" permissions and filter accordingly
        const { PermissionService } = await import(
          "../services/permission-service"
        );
        const { Personnel } = await import("../models");

        const hasFullPermission = await PermissionService.hasPermissionAsync(
          user.id,
          "workOrders.view",
          tenant._id.toString(),
        );
        const hasOwnPermission = await PermissionService.hasPermissionAsync(
          user.id,
          "workOrders.viewOwn",
          tenant._id.toString(),
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
        const skip = (Number(page) - 1) * Number(limit);

        let workOrders: any[];
        let total: number;

        if (aggregationPipeline.length > 0) {
          // Use aggregation pipeline for search
          const pipeline = [
            ...aggregationPipeline,
            // Sort by text search score when available, then by creation date
            {
              $sort: {
                textScore: { $meta: "textScore" },
                createdAt: -1
              }
            },
            { $skip: skip },
            { $limit: Number(limit) },
          ];

          try {
            workOrders = await WorkOrder.aggregate(pipeline);
            total =
              (
                await WorkOrder.aggregate([
                  ...aggregationPipeline,
                  { $count: "total" },
                ])
              )[0]?.total || 0;
          } catch (aggregationError) {
            console.error("Aggregation pipeline error:", aggregationError);
            // Fallback to regular query if aggregation fails
            workOrders = await WorkOrder.find(filter)
              .populate("clientId", "name email phone company")
              .populate("personnelIds", "employeeId user role")
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(Number(limit));

            total = await WorkOrder.countDocuments(filter);
          }
        } else {
          // Use regular query for non-search
          workOrders = await WorkOrder.find(filter)
            .populate("clientId", "name email phone company")
            .populate("personnelIds", "employeeId user role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

          total = await WorkOrder.countDocuments(filter);
        }

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

  // GET /api/v1/work-orders/:id/timeline - Get work order timeline
  fastify.get(
    "/:id/timeline",
    { preHandler: requireWorkOrderView() },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };
        const {
          limit = 50,
          offset = 0,
          entityType,
        } = request.query as {
          limit?: number;
          offset?: number;
          entityType?: "work_order" | "task";
        };

        // Verify work order exists and user has access
        const workOrder = await WorkOrder.findOne({
          _id: id,
          tenantId: tenant._id,
        }).lean();

        if (!workOrder) {
          return reply
            .code(404)
            .send({ success: false, error: "Work order not found" });
        }

        // Get timeline entries
        const timeline = await WorkOrderTimelineService.getWorkOrderTimeline(
          id,
          tenant._id.toString(),
          { limit: Number(limit), offset: Number(offset), entityType },
        );

        return reply.send({
          success: true,
          data: {
            timeline,
            pagination: {
              limit: Number(limit),
              offset: Number(offset),
              hasMore: timeline.length === Number(limit),
            },
          },
        });
      } catch (error) {
        console.error("Error fetching work order timeline:", error);
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

        // Handle attachments for creation
        let processedCreateBody = { ...body };
        if (body.attachments && Array.isArray(body.attachments)) {
          processedCreateBody.attachments = body.attachments.map((att: any) => {
            if (typeof att === "string") {
              // Convert string URL to attachment object format
              return {
                name: att.split("/").pop() || "Unknown",
                url: att,
                type: "application/octet-stream",
                size: 0,
              };
            }
            // Ensure all required fields are present
            return {
              name: att.name || "Unknown",
              url: att.url || "",
              type: att.type || "application/octet-stream",
              size: att.size || 0,
            };
          });
        }

        // Generate per-tenant sequential work order number using atomic counter
        const seq = await getNextSequence(tenant._id.toString(), "workOrder");
        const workOrderNumber = `WO-${String(seq).padStart(6, "0")}`;

        const workOrder = new WorkOrder({
          ...processedCreateBody,
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

        // Add timeline entry for work order creation
        try {
          await WorkOrderTimelineService.logWorkOrderCreated(
            workOrder._id.toString(),
            workOrder.title,
            user.id,
            tenant._id.toString(),
          );
        } catch (error) {
          console.error(
            "Error adding timeline entry for work order creation:",
            error,
          );
        }

        // Recompute aggregates after creation
        await WorkOrderProgressService.recomputeForWorkOrder(
          tenant._id.toString(),
          workOrder._id.toString(),
        );

        // Propagate personnel assignments to existing tasks linked to this work order
        if (
          body.personnelIds &&
          Array.isArray(body.personnelIds) &&
          body.personnelIds.length > 0
        ) {
          try {
            await WorkOrderAssignmentService.propagateWorkOrderAssignments(
              workOrder._id.toString(),
              body.personnelIds,
              [], // no previous personnel for new work order
              tenant._id.toString(),
              user.id,
            );

            // Log assignment in timeline
            const assignedPersonnel = await Personnel.find({
              _id: { $in: body.personnelIds },
              tenantId: tenant._id,
            }).populate("user", "firstName lastName");

            const assigneeNames = assignedPersonnel.map((p) =>
              p.user
                ? `${p.user.firstName} ${p.user.lastName}`.trim()
                : p.employeeId,
            );

            await WorkOrderTimelineService.logWorkOrderAssigned(
              workOrder._id.toString(),
              assigneeNames,
              user.id,
              tenant._id.toString(),
            );
          } catch (error) {
            console.error("Error propagating work order assignments:", error);
            // Don't fail work order creation if assignment propagation fails
          }
        }

        // Process SMS reminders if configured
        if (body.smsReminders && body.smsReminders.enabled) {
          try {
            const smsResult = await WorkOrderSmsService.processSmsReminders(
              workOrder._id.toString(),
              body.smsReminders,
              tenant._id.toString()
            );

            if (!smsResult.success) {
              console.warn('SMS reminders failed for work order:', smsResult.message);
              // Don't fail work order creation if SMS reminders fail
            } else {
              console.log('SMS reminders processed successfully:', smsResult.message);
            }
          } catch (error) {
            console.error('Error processing SMS reminders for work order:', error);
            // Don't fail work order creation if SMS reminder processing fails
          }
        }

        // Trigger webhook for work order creation
        try {
          await WebhookService.triggerWebhooks(
            tenant._id.toString(),
            "work_order.created",
            {
              workOrder: {
                _id: workOrder._id,
                workOrderNumber: workOrder.workOrderNumber,
                title: workOrder.title,
                description: workOrder.description,
                status: workOrder.status,
                priority: workOrder.priority,
                clientId: workOrder.clientId,
                personnelIds: workOrder.personnelIds,
                createdAt: workOrder.createdAt,
                createdBy: workOrder.createdBy,
              },
            },
            workOrder._id.toString(),
          );
        } catch (error) {
          console.error(
            "Error triggering work order creation webhooks:",
            error,
          );
          // Don't fail work order creation if webhook fails
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
        const currentWorkOrderLite = await WorkOrder.findOne({
          _id: id,
          tenantId: tenant._id,
        }).select("personnelIds");

        if (!currentWorkOrderLite) {
          return reply.code(404).send({
            success: false,
            error: "Work order not found",
          });
        }

        const previousPersonnelIds = currentWorkOrderLite.personnelIds || [];

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

        // Handle attachments conversion if provided
        let processedBody = { ...body };
        if (body.attachments && Array.isArray(body.attachments)) {
          processedBody.attachments = body.attachments.map((att: any) => {
            if (typeof att === "string") {
              // Convert string URL to attachment object format
              return {
                name: att.split("/").pop() || "Unknown",
                url: att,
                type: "application/octet-stream",
                size: 0,
              };
            }
            // Ensure all required fields are present
            return {
              name: att.name || "Unknown",
              url: att.url || "",
              type: att.type || "application/octet-stream",
              size: att.size || 0,
            };
          });
        }

        // Get the current work order before updating for timeline comparison
        const currentWorkOrder = await WorkOrder.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!currentWorkOrder) {
          return reply.code(404).send({
            success: false,
            error: "Work order not found",
          });
        }

        const workOrder = await WorkOrder.findOneAndUpdate(
          {
            _id: id,
            tenantId: tenant._id,
          },
          {
            ...processedBody,
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

        // Log changes to timeline
        try {
          // Track status changes
          if (body.status && currentWorkOrder.status !== body.status) {
            await WorkOrderTimelineService.logWorkOrderStatusChanged(
              workOrder._id.toString(),
              currentWorkOrder.status,
              body.status,
              user.id,
              tenant._id.toString(),
            );
          }

          // Track priority changes
          if (body.priority && currentWorkOrder.priority !== body.priority) {
            await WorkOrderTimelineService.logWorkOrderPriorityChanged(
              workOrder._id.toString(),
              currentWorkOrder.priority,
              body.priority,
              user.id,
              tenant._id.toString(),
            );
          }

          // Track progress changes
          if (
            body.progress !== undefined &&
            currentWorkOrder.progress !== body.progress
          ) {
            await WorkOrderTimelineService.logWorkOrderProgressUpdated(
              workOrder._id.toString(),
              currentWorkOrder.progress || 0,
              body.progress,
              user.id,
              tenant._id.toString(),
            );
          }
        } catch (error) {
          console.error("Error logging work order changes to timeline:", error);
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
          const previousPersonnelIdsStr = previousPersonnelIds.map((id: any) =>
            id.toString(),
          );
          const newPersonnelIdsStr = newPersonnelIds.map((id: any) =>
            id.toString(),
          );

          // Check if there are any changes in personnel assignments
          const hasChanges =
            previousPersonnelIdsStr.length !== newPersonnelIdsStr.length ||
            !previousPersonnelIdsStr.every((id: string) =>
              newPersonnelIdsStr.includes(id),
            ) ||
            !newPersonnelIdsStr.every((id: string) =>
              previousPersonnelIdsStr.includes(id),
            );

          if (hasChanges) {
            try {
              // Propagate new assignments to tasks
              if (newPersonnelIdsStr.length > 0) {
                await WorkOrderAssignmentService.propagateWorkOrderAssignments(
                  workOrder._id.toString(),
                  newPersonnelIdsStr,
                  previousPersonnelIdsStr,
                  tenant._id.toString(),
                  user.id,
                );
              }

              // Handle removed personnel (they remain on tasks but we log this)
              const removedPersonnelIds = previousPersonnelIdsStr.filter(
                (id: string) => !newPersonnelIdsStr.includes(id),
              );

              if (removedPersonnelIds.length > 0) {
                await WorkOrderAssignmentService.handleWorkOrderPersonnelRemoval(
                  workOrder._id.toString(),
                  removedPersonnelIds,
                  tenant._id.toString(),
                  user.id,
                );
              }
            } catch (error) {
              console.error(
                "Error propagating work order assignment changes:",
                error,
              );
              // Don't fail the update if assignment propagation fails
            }
          }
        }

        // Process SMS reminders if they were updated
        if (body.smsReminders !== undefined) {
          try {
            const smsResult = await WorkOrderSmsService.updateSmsReminders(
              workOrder._id.toString(),
              body.smsReminders,
              tenant._id.toString()
            );

            if (!smsResult.success) {
              console.warn('SMS reminders update failed for work order:', smsResult.message);
              // Don't fail work order update if SMS reminders fail
            } else {
              console.log('SMS reminders updated successfully:', smsResult.message);
            }
          } catch (error) {
            console.error('Error updating SMS reminders for work order:', error);
            // Don't fail work order update if SMS reminder processing fails
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

  // GET /api/v1/work-orders/:id/delete-info - Get deletion impact info
  fastify.get(
    "/:id/delete-info",
    { preHandler: requirePermission("workOrders.delete") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        // Import models dynamically
        const { Task, Comment, Assignment, Subtask } = await import(
          "../models"
        );

        // Check if work order exists
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

        // Count related data
        const [tasksCount, commentsCount, assignmentsCount] = await Promise.all(
          [
            Task.countDocuments({ workOrderId: id, tenantId: tenant._id }),
            Comment.countDocuments({ workOrderId: id, tenantId: tenant._id }),
            Assignment.countDocuments({
              workOrderId: id,
              tenantId: tenant._id,
            }),
          ],
        );

        // Count subtasks from related tasks
        const tasks = await Task.find(
          { workOrderId: id, tenantId: tenant._id },
          { _id: 1 },
        );
        const taskIds = tasks.map((t) => t._id.toString());

        const subtasksCount =
          taskIds.length > 0
            ? await Subtask.countDocuments({
                taskId: { $in: taskIds },
                tenantId: tenant._id,
              })
            : 0;

        // Count files (estimate based on upload directory structure)
        let filesCount = 0;
        try {
          const fs = await import("fs/promises");
          const path = await import("path");

          const workOrderFilesPath = path.join(
            process.cwd(),
            "uploads",
            tenant._id.toString(),
            "work_orders",
            id,
          );

          try {
            const files = await fs.readdir(workOrderFilesPath);
            filesCount = files.length;
          } catch {
            // Directory doesn't exist, no files
            filesCount = 0;
          }

          // Also check for files in task directories
          for (const taskId of taskIds) {
            const taskFilesPath = path.join(
              process.cwd(),
              "uploads",
              tenant._id.toString(),
              "tasks",
              taskId,
            );
            try {
              const taskFiles = await fs.readdir(taskFilesPath);
              filesCount += taskFiles.length;
            } catch {
              // Directory doesn't exist
            }
          }
        } catch (error) {
          console.warn("Could not count files:", error);
        }

        return reply.send({
          success: true,
          data: {
            tasksCount,
            filesCount,
            commentsCount,
            assignmentsCount,
            subtasksCount,
          },
        });
      } catch (error) {
        console.error("Error fetching delete info:", error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch deletion information",
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
        const { tenant, user } = req.context!;
        const { id } = request.params as { id: string };
        const { cascade } = request.query as { cascade?: string };

        // Parse cascade deletion option
        const cascadeDelete = cascade === "true";

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

        fastify.log.info(
          {
            workOrderId: id,
            workOrderTitle: workOrder.title,
            userId: user.id,
            cascadeDelete,
            tenantId: tenant._id.toString(),
          },
          "Work order deletion initiated",
        );

        // Perform comprehensive cleanup
        const cleanupResult = await EntityCleanupService.cleanupWorkOrder(
          id,
          tenant._id.toString(),
          {
            deleteFiles: true,
            deleteComments: true,
            deleteAssignments: true,
            cascadeDelete, // Use user's choice for cascade deletion
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
