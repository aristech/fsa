import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import { Client } from "../models";
import { AuthenticatedRequest } from "../types";
import { EntityCleanupService } from "../services/entity-cleanup-service";

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
      preHandler: requirePermission("clients.create"),
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

  // DELETE /api/v1/clients/:id - Delete client (soft delete)
  fastify.delete(
    "/:id",
    {
      preHandler: requirePermission("clients.delete"),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const deletedClient = await Client.findOneAndUpdate(
          {
            _id: id,
            tenantId: tenant._id,
          },
          { isActive: false },
          { new: true }
        );

        if (!deletedClient) {
          return reply.code(404).send({
            success: false,
            error: "Client not found",
          });
        }

        return reply.send({
          success: true,
          message: "Client deleted successfully",
          data: deletedClient,
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
