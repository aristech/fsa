import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import { Client } from "../models";
import { AuthenticatedRequest } from "../types";
import { EntityCleanupService } from "../services/entity-cleanup-service";
import EnhancedSubscriptionMiddleware from "../middleware/enhanced-subscription-middleware";

export async function clientRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/v1/clients - Get all clients
  fastify.get(
    "/",
    {
      preHandler: requirePermission("clients.view"),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { limit = 50, offset = 0 } = request.query as {
          limit?: string;
          offset?: string;
        };

        const clients = await Client.find({
          tenantId: tenant._id,
          isActive: true,
        })
          .select("_id name company email phone vatNumber address billingAddress contactPerson notes createdAt")
          .sort({ createdAt: -1 }) // Sort by created_at descending (latest first)
          .limit(parseInt(String(limit), 10))
          .skip(parseInt(String(offset), 10));

        return reply.send({
          success: true,
          data: {
            clients,
            total: await Client.countDocuments({
              tenantId: tenant._id,
              isActive: true,
            }),
            limit: parseInt(String(limit), 10),
            offset: parseInt(String(offset), 10),
          },
        });
      } catch (error) {
        console.error("Error fetching customers:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // GET /api/v1/clients/:id - Get client by ID
  fastify.get(
    "/:id",
    {
      preHandler: requirePermission("clients.view"),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const client = await Client.findOne({
          _id: id,
          tenantId: tenant._id,
          isActive: true,
        }).select("_id name company email phone vatNumber address billingAddress contactPerson notes createdAt");

        if (!client) {
          return reply.code(404).send({
            success: false,
            error: "Client not found",
          });
        }

        return reply.send({
          success: true,
          data: client,
        });
      } catch (error) {
        console.error("Error fetching client:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // POST /api/v1/clients - Create new client
  fastify.post(
    "/",
    {
      preHandler: [requirePermission("clients.create"), EnhancedSubscriptionMiddleware.checkClientLimit()],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const clientData = request.body as any;

        const newClient = new Client({
          tenantId: tenant._id,
          ...clientData,
        });

        await newClient.save();

        // Track client creation in usage statistics
        await EnhancedSubscriptionMiddleware.trackCreation(
          tenant._id.toString(),
          'client',
          1,
          {
            entityId: newClient._id.toString(),
            name: clientData.name,
            company: clientData.company,
            email: clientData.email
          },
          (request as any).id
        );

        return reply.code(201).send({
          success: true,
          message: "Client created successfully",
          data: newClient,
        });
      } catch (error) {
        console.error("Error creating client:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // PUT /api/v1/clients/:id - Update client
  fastify.put(
    "/:id",
    {
      preHandler: requirePermission("clients.edit"),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };
        const updateData = request.body as any;

        const updatedClient = await Client.findOneAndUpdate(
          {
            _id: id,
            tenantId: tenant._id,
          },
          updateData,
          { new: true }
        );

        if (!updatedClient) {
          return reply.code(404).send({
            success: false,
            error: "Client not found",
          });
        }

        return reply.send({
          success: true,
          message: "Client updated successfully",
          data: updatedClient,
        });
      } catch (error) {
        console.error("Error updating client:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // GET /api/v1/clients/:id/delete-info - Get deletion impact info
  fastify.get(
    "/:id/delete-info",
    { preHandler: requirePermission("clients.delete") },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        // Import models dynamically
        const { WorkOrder, Task, Comment, Assignment, Subtask } = await import("../models");

        // Check if client exists
        const client = await Client.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!client) {
          return reply.code(404).send({
            success: false,
            error: "Client not found",
          });
        }

        // Count work orders for this client
        const workOrdersCount = await WorkOrder.countDocuments({
          clientId: id,
          tenantId: tenant._id
        });

        // Get all work order IDs for this client
        const workOrders = await WorkOrder.find(
          { clientId: id, tenantId: tenant._id },
          { _id: 1 }
        );
        const workOrderIds = workOrders.map(wo => wo._id.toString());

        // Count tasks related to this client (either directly or through work orders)
        const [directTasksCount, workOrderTasksCount] = await Promise.all([
          Task.countDocuments({ clientId: id, tenantId: tenant._id }),
          workOrderIds.length > 0
            ? Task.countDocuments({
                workOrderId: { $in: workOrderIds },
                tenantId: tenant._id
              })
            : 0,
        ]);

        const tasksCount = directTasksCount + workOrderTasksCount;

        // Get all task IDs (direct + work order tasks)
        const [directTasks, workOrderTasks] = await Promise.all([
          Task.find({ clientId: id, tenantId: tenant._id }, { _id: 1 }),
          workOrderIds.length > 0
            ? Task.find({
                workOrderId: { $in: workOrderIds },
                tenantId: tenant._id
              }, { _id: 1 })
            : [],
        ]);

        const allTaskIds = [
          ...directTasks.map(t => t._id.toString()),
          ...workOrderTasks.map(t => t._id.toString()),
        ];

        // Count related data
        const [commentsCount, assignmentsCount, subtasksCount] = await Promise.all([
          Comment.countDocuments({ clientId: id, tenantId: tenant._id }),
          Assignment.countDocuments({ clientId: id, tenantId: tenant._id }),
          allTaskIds.length > 0
            ? Subtask.countDocuments({
                taskId: { $in: allTaskIds },
                tenantId: tenant._id
              })
            : 0,
        ]);

        // Count files (estimate based on upload directory structure)
        let filesCount = 0;
        try {
          const fs = await import('fs/promises');
          const path = await import('path');

          // Client files
          const clientFilesPath = path.join(
            process.cwd(),
            'uploads',
            tenant._id.toString(),
            'clients',
            id
          );

          try {
            const clientFiles = await fs.readdir(clientFilesPath);
            filesCount += clientFiles.length;
          } catch {
            // Directory doesn't exist
          }

          // Work order files
          for (const workOrderId of workOrderIds) {
            const workOrderFilesPath = path.join(
              process.cwd(),
              'uploads',
              tenant._id.toString(),
              'work_orders',
              workOrderId
            );
            try {
              const woFiles = await fs.readdir(workOrderFilesPath);
              filesCount += woFiles.length;
            } catch {
              // Directory doesn't exist
            }
          }

          // Task files
          for (const taskId of allTaskIds) {
            const taskFilesPath = path.join(
              process.cwd(),
              'uploads',
              tenant._id.toString(),
              'tasks',
              taskId
            );
            try {
              const taskFiles = await fs.readdir(taskFilesPath);
              filesCount += taskFiles.length;
            } catch {
              // Directory doesn't exist
            }
          }
        } catch (error) {
          console.warn('Could not count files:', error);
        }

        return reply.send({
          success: true,
          data: {
            workOrdersCount,
            tasksCount,
            filesCount,
            commentsCount,
            assignmentsCount,
            subtasksCount,
          },
        });
      } catch (error) {
        console.error('Error fetching client delete info:', error);
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch deletion information",
        });
      }
    }
  );

  // DELETE /api/v1/clients/:id - Delete client with cascade options
  fastify.delete(
    "/:id",
    {
      preHandler: requirePermission("clients.delete"),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant, user } = req.context!;
        const { id } = request.params as { id: string };
        const { cascade } = request.query as { cascade?: string };

        // Parse cascade deletion option
        const cascadeDelete = cascade === 'true';

        // Check if client exists and get details for usage tracking
        const client = await Client.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!client) {
          return reply.code(404).send({
            success: false,
            error: "Client not found",
          });
        }

        const clientDetails = {
          entityId: client._id.toString(),
          name: client.name,
          company: client.company,
          email: client.email
        };

        fastify.log.info({
          clientId: id,
          clientName: client.name,
          userId: user.id,
          cascadeDelete,
          tenantId: tenant._id.toString(),
        }, "Client deletion initiated");

        // Perform comprehensive cleanup with cascade option
        const cleanupResult = await EntityCleanupService.cleanupClient(
          id,
          tenant._id.toString(),
          {
            deleteFiles: true,
            deleteComments: true,
            deleteAssignments: true,
            cascadeDelete, // Use user's choice for cascade deletion
          }
        );

        if (!cleanupResult.success) {
          fastify.log.error(
            `Client cleanup failed: ${cleanupResult.message}`,
          );
          return reply.code(500).send({
            success: false,
            error: `Failed to cleanup client: ${cleanupResult.message}`,
          });
        }

        // Log cleanup summary
        fastify.log.info({
          clientId: id,
          cleanupSummary: {
            filesDeleted: cleanupResult.details.filesDeleted,
            commentsDeleted: cleanupResult.details.commentsDeleted,
            assignmentsDeleted: cleanupResult.details.assignmentsDeleted,
            dependentEntitiesDeleted: cleanupResult.details.dependentEntitiesDeleted,
          },
        }, "Client cleanup completed successfully");

        // Track client deletion to decrease usage count
        await EnhancedSubscriptionMiddleware.trackDeletion(
          tenant._id.toString(),
          'client',
          1,
          clientDetails,
          (request as any).id
        );

        return reply.send({
          success: true,
          message: cascadeDelete
            ? `Client and all related data deleted successfully. ${cleanupResult.details.dependentEntitiesDeleted} work orders and their tasks were also deleted.`
            : `Client deleted successfully. ${cleanupResult.details.dependentEntitiesDeleted} work orders were unlinked but preserved.`,
          data: cleanupResult.details,
        });
      } catch (error) {
        console.error("Error deleting client:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );

  // DELETE /api/v1/clients/:id/hard-delete - Permanently delete client with full cleanup
  fastify.delete(
    "/:id/hard-delete",
    {
      preHandler: requirePermission("clients.delete"),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };
        const { cascadeDelete = false } = request.query as { cascadeDelete?: boolean };

        // Check if client exists and get details for usage tracking
        const client = await Client.findOne({
          _id: id,
          tenantId: tenant._id,
        });

        if (!client) {
          return reply.code(404).send({
            success: false,
            error: "Client not found",
          });
        }

        const clientDetails = {
          entityId: client._id.toString(),
          name: client.name,
          company: client.company,
          email: client.email
        };

        // Perform comprehensive cleanup
        const cleanupResult = await EntityCleanupService.cleanupClient(
          id,
          tenant._id.toString(),
          {
            deleteFiles: true,
            deleteComments: true,
            deleteAssignments: true,
            cascadeDelete: cascadeDelete, // Optionally delete related work orders
          }
        );

        if (!cleanupResult.success) {
          fastify.log.error(`Client cleanup failed: ${cleanupResult.message}`);
          return reply.code(500).send({
            success: false,
            error: `Failed to cleanup client: ${cleanupResult.message}`,
          });
        }

        // Log cleanup details
        fastify.log.info(cleanupResult.details, `🧹 Client cleanup completed`);

        // Track client deletion to decrease usage count
        await EnhancedSubscriptionMiddleware.trackDeletion(
          tenant._id.toString(),
          'client',
          1,
          clientDetails,
          (request as any).id
        );

        return reply.send({
          success: true,
          message: cleanupResult.message,
          data: {
            client: {
              _id: client._id,
              name: client.name,
              company: client.company,
            },
            cleanupDetails: cleanupResult.details,
          },
        });
      } catch (error) {
        console.error("Error permanently deleting client:", error);
        return reply.code(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    }
  );
}
