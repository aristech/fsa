import { FastifyInstance } from "fastify";
import { authenticateApiKey, requireApiKeyPermission, ApiKeyRequest } from "../middleware/api-key-auth";
import { WorkOrder } from "../models/WorkOrder";
import { Task } from "../models/Task";
import { Client } from "../models/Client";
import { User } from "../models/User";

// ----------------------------------------------------------------------

export async function publicApiRoutes(fastify: FastifyInstance) {

  // Get work orders (with API key authentication)
  fastify.get("/work-orders", {
    preHandler: [authenticateApiKey, requireApiKeyPermission("work_orders.read")]
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { tenantId } = request.apiKey!;
      const { page = 1, limit = 50, status, clientId } = request.query as {
        page?: number;
        limit?: number;
        status?: string;
        clientId?: string;
      };

      const query: any = { tenantId };

      if (status) {
        query.status = status;
      }

      if (clientId) {
        query.clientId = clientId;
      }

      const skip = (page - 1) * limit;

      const [workOrders, total] = await Promise.all([
        WorkOrder.find(query)
          .populate('clientId', 'name email phone')
          .populate('assignedTo', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        WorkOrder.countDocuments(query)
      ]);

      reply.send({
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
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get a specific work order
  fastify.get("/work-orders/:id", {
    preHandler: [authenticateApiKey, requireApiKeyPermission("work_orders.read")]
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { tenantId } = request.apiKey!;
      const { id } = request.params as { id: string };

      const workOrder = await WorkOrder.findOne({ _id: id, tenantId })
        .populate('clientId', 'name email phone')
        .populate('assignedTo', 'firstName lastName email')
        .lean();

      if (!workOrder) {
        reply.status(404).send({
          success: false,
          error: "Work order not found",
        });
        return;
      }

      reply.send({
        success: true,
        data: workOrder,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Create a work order
  fastify.post("/work-orders", {
    preHandler: [authenticateApiKey, requireApiKeyPermission("work_orders.write")]
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { tenantId, userId } = request.apiKey!;
      const workOrderData = request.body as any;

      const workOrder = new WorkOrder({
        ...workOrderData,
        tenantId,
        createdBy: userId,
      });

      await workOrder.save();
      await workOrder.populate('clientId', 'name email phone');
      await workOrder.populate('assignedTo', 'firstName lastName email');

      reply.status(201).send({
        success: true,
        data: workOrder,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Update a work order
  fastify.put("/work-orders/:id", {
    preHandler: [authenticateApiKey, requireApiKeyPermission("work_orders.write")]
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { tenantId } = request.apiKey!;
      const { id } = request.params as { id: string };
      const updateData = request.body as any;

      const workOrder = await WorkOrder.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: updateData },
        { new: true }
      ).populate('clientId', 'name email phone')
       .populate('assignedTo', 'firstName lastName email');

      if (!workOrder) {
        reply.status(404).send({
          success: false,
          error: "Work order not found",
        });
        return;
      }

      reply.send({
        success: true,
        data: workOrder,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get tasks
  fastify.get("/tasks", {
    preHandler: [authenticateApiKey, requireApiKeyPermission("tasks.read")]
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { tenantId } = request.apiKey!;
      const { page = 1, limit = 50, workOrderId, status } = request.query as {
        page?: number;
        limit?: number;
        workOrderId?: string;
        status?: string;
      };

      const query: any = { tenantId };

      if (workOrderId) {
        query.workOrderId = workOrderId;
      }

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        Task.find(query)
          .populate('assignedTo', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Task.countDocuments(query)
      ]);

      reply.send({
        success: true,
        data: {
          tasks,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get clients
  fastify.get("/clients", {
    preHandler: [authenticateApiKey, requireApiKeyPermission("clients.read")]
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { tenantId } = request.apiKey!;
      const { page = 1, limit = 50 } = request.query as {
        page?: number;
        limit?: number;
      };

      const skip = (page - 1) * limit;

      const [clients, total] = await Promise.all([
        Client.find({ tenantId })
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Client.countDocuments({ tenantId })
      ]);

      reply.send({
        success: true,
        data: {
          clients,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get users (basic info only for API access)
  fastify.get("/users", {
    preHandler: [authenticateApiKey, requireApiKeyPermission("users.read")]
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { tenantId } = request.apiKey!;
      const { page = 1, limit = 50 } = request.query as {
        page?: number;
        limit?: number;
      };

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find({ tenantId, isActive: true })
          .select('firstName lastName email role isOnline lastSeenAt')
          .sort({ firstName: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments({ tenantId, isActive: true })
      ]);

      reply.send({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // API documentation endpoint
  fastify.get("/docs", async (request, reply) => {
    const docs = {
      title: "FSA Public API",
      version: "1.0.0",
      description: "Public API for Field Service Application with API key authentication",
      baseUrl: `${request.protocol}://${request.hostname}/api/v1/public`,
      authentication: {
        type: "Bearer Token",
        header: "Authorization: Bearer <your_api_key>",
        example: "Authorization: Bearer fsa_1234567890abcdef..."
      },
      endpoints: {
        "GET /work-orders": {
          description: "Get paginated list of work orders",
          permissions: ["work_orders.read"],
          parameters: {
            page: "Page number (default: 1)",
            limit: "Items per page (default: 50, max: 100)",
            status: "Filter by status",
            clientId: "Filter by client ID"
          }
        },
        "GET /work-orders/:id": {
          description: "Get a specific work order by ID",
          permissions: ["work_orders.read"]
        },
        "POST /work-orders": {
          description: "Create a new work order",
          permissions: ["work_orders.write"]
        },
        "PUT /work-orders/:id": {
          description: "Update a work order",
          permissions: ["work_orders.write"]
        },
        "GET /tasks": {
          description: "Get paginated list of tasks",
          permissions: ["tasks.read"],
          parameters: {
            page: "Page number (default: 1)",
            limit: "Items per page (default: 50, max: 100)",
            workOrderId: "Filter by work order ID",
            status: "Filter by status"
          }
        },
        "GET /clients": {
          description: "Get paginated list of clients",
          permissions: ["clients.read"]
        },
        "GET /users": {
          description: "Get paginated list of users (basic info)",
          permissions: ["users.read"]
        }
      },
      webhooks: {
        description: "Configure webhooks to receive real-time notifications",
        configureAt: "/dashboard/settings/webhooks",
        topics: [
          "work_order.created",
          "work_order.updated",
          "work_order.deleted",
          "task.created",
          "task.updated",
          "task.deleted"
        ]
      }
    };

    reply.type('application/json').send(docs);
  });
}