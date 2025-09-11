import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { WorkOrder, Assignment, Project, Task } from "../models";
import { AuthenticatedRequest } from "../types";

// Priority color mapping - matches frontend constants
const PRIORITY_COLORS = {
  low: '#4caf50',    // success.main
  medium: '#ff9800',  // warning.main
  high: '#f44336',   // error.main
  urgent: '#d32f2f', // error.dark
};

const getPriorityColor = (priority: string): string => {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;
};

export async function calendarRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/calendar - Get calendar events
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant } = req.context!;
      const { clientId, startDate, endDate } = request.query as {
        clientId?: string;
        startDate?: string;
        endDate?: string;
      };

      // Build base filter
      const baseFilter: any = {
        tenantId: tenant._id,
        isActive: true,
      };

      // Add client filter if specified
      if (clientId) {
        baseFilter.clientId = clientId;
      }

      // Add date filter if specified
      if (startDate && endDate) {
        baseFilter.startDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Fetch all event types, sorted by created_at (latest first)
      const [workOrders, assignments, projects, tasks] = await Promise.all([
        WorkOrder.find(baseFilter).sort({ createdAt: -1 }),
        Assignment.find(baseFilter).sort({ createdAt: -1 }),
        Project.find(baseFilter).sort({ createdAt: -1 }),
        Task.find(baseFilter).sort({ createdAt: -1 }),
      ]);

      // Transform to calendar events
      const events = [
        ...workOrders.map((wo) => ({
          id: wo._id.toString(),
          title: wo.title,
          start: wo.startDate,
          end: wo.endDate,
          type: "work-order",
          status: wo.status,
          priority: wo.priority,
        })),
        ...assignments.map((a) => ({
          id: a._id.toString(),
          title: a.title,
          start: a.startDate,
          end: a.endDate,
          type: "assignment",
          status: a.status,
          priority: a.priority,
        })),
        ...projects.map((p) => ({
          id: p._id.toString(),
          title: p.name,
          start: p.startDate,
          end: p.endDate,
          type: "project",
          status: p.status,
          priority: p.priority,
        })),
        ...tasks
          .filter(t => t.startDate || t.dueDate) // Only include tasks with dates
          .map((t) => ({
            id: t._id.toString(),
            title: t.title,
            start: t.startDate || t.dueDate,
            end: t.dueDate || t.startDate,
            allDay: false,
            type: "task",
            status: t.status,
            priority: t.priority,
            color: getPriorityColor(t.priority || 'medium'),
            extendedProps: {
              taskId: t._id.toString(),
              task: t,
            },
          })),
      ];

      return reply.send({
        events,
      });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return reply.code(500).send({
        success: false,
        error: "Internal server error",
      });
    }
  });
}
