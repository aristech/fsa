import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { WorkOrder } from "../models";
import { AuthenticatedRequest } from "../types";

export async function workOrderRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/v1/work-orders - Get work orders list
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const {
        page = 1,
        limit = 10,
        status,
        priority,
        technicianId,
        clientId,
      } = request.query as {
        page?: number;
        limit?: number;
        status?: string;
        priority?: string;
        technicianId?: string;
        clientId?: string;
      };

      // Build filter
      const filter: any = { tenantId: tenant._id };
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (technicianId) filter.technicianId = technicianId;
      if (clientId) filter.clientId = clientId;

      // Get work orders with pagination, sorted by created_at (latest first)
      const skip = (page - 1) * limit;
      const workOrders = await WorkOrder.find(filter)
        .populate("clientId", "name email phone company")
        .populate("technicianId", "employeeId userId")
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
  });

  // GET /api/v1/work-orders/:id - Get work order by ID
  fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const { id } = request.params as { id: string };

      const workOrder = await WorkOrder.findOne({
        _id: id,
        tenantId: tenant._id,
      })
        .populate("clientId", "name email phone company")
        .populate("technicianId", "employeeId userId");

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
  });

  // POST /api/v1/work-orders - Create work order
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const body = request.body as any;

      // Generate work order number
      const count = await WorkOrder.countDocuments({ tenantId: tenant._id });
      const workOrderNumber = `WO-${String(count + 1).padStart(6, "0")}`;

      const workOrder = new WorkOrder({
        ...body,
        tenantId: tenant._id,
        workOrderNumber,
        createdBy: user._id,
        history: [
          {
            status: "created",
            timestamp: new Date(),
            userId: user._id,
            notes: "Work order created",
          },
        ],
      });

      await workOrder.save();

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
  });

  // PUT /api/v1/work-orders/:id - Update work order
  fastify.put("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;
      const { id } = request.params as { id: string };
      const body = request.body as any;

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
  });

  // DELETE /api/v1/work-orders/:id - Delete work order
  fastify.delete(
    "/:id",
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
