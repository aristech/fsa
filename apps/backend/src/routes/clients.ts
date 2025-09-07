import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import { Client } from "../models";
import { AuthenticatedRequest } from "../types";

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
          .select("_id name company email phone vatNumber address createdAt")
          .sort({ createdAt: -1 }) // Sort by created_at descending (latest first)
          .limit(parseInt(limit, 10))
          .skip(parseInt(offset, 10));

        return reply.send({
          success: true,
          data: {
            clients,
            total: await Client.countDocuments({
              tenantId: tenant._id,
              isActive: true,
            }),
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
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
        }).select("_id name company email phone vatNumber address createdAt");

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
}
