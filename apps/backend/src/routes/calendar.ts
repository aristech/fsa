import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";
import { Task, Project, WorkOrder, Personnel, User } from "../models";
import { AuthenticatedRequest } from "../types";
import { transformTaskToKanbanTask } from "../utils/kanban-transformers";

// Priority color mapping - matches frontend constants
const PRIORITY_COLORS = {
  low: "#4caf50", // success.main
  medium: "#ff9800", // warning.main
  high: "#f44336", // error.main
  urgent: "#d32f2f", // error.dark
};

const getPriorityColor = (priority: string): string => {
  return (
    PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] ||
    PRIORITY_COLORS.medium
  );
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

      // Use the same logic as kanban endpoint to get tasks
      // Get all projects and tasks for the tenant, sorted by order (for tasks) and created_at (latest first)
      const [projects, tasks] = await Promise.all([
        Project.find({ tenantId: tenant._id, isActive: true }).sort({
          createdAt: -1,
        }),
        Task.find({ tenantId: tenant._id }).sort({ order: 1, createdAt: -1 }),
      ]);

      // Build lookup maps for reporter (users) and assignees (personnel) - same as kanban
      const userIds = new Set<string>();
      const personnelIds = new Set<string>();

      tasks.forEach((task: any) => {
        if (task.createdBy) userIds.add(task.createdBy.toString());
        if (Array.isArray(task.assignees)) {
          task.assignees.forEach((id: string) => personnelIds.add(id));
        }
      });

      const [users, personnel] = await Promise.all([
        userIds.size > 0 ? User.find({ _id: { $in: Array.from(userIds) } }) : [],
        personnelIds.size > 0 ? Personnel.find({ _id: { $in: Array.from(personnelIds) } }) : [],
      ]);

      // Build lookup objects
      const userById = users.reduce((acc: any, user: any) => {
        acc[user._id.toString()] = {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        };
        return acc;
      }, {});

      const personnelById = personnel.reduce((acc: any, p: any) => {
        acc[p._id.toString()] = {
          name: p.name,
          email: p.email,
          avatar: p.avatar,
        };
        return acc;
      }, {});

      const lookups = {
        userById,
        personnelById,
      };

      // Filter by client if specified (same logic as kanban)
      let filteredTasks = tasks;

      if (clientId) {
        // Filter tasks by client OR tasks linked to a work order whose client matches
        const workOrdersForClient = await WorkOrder.find(
          { tenantId: tenant._id, clientId: clientId },
          { _id: 1 },
        ).lean();
        const workOrderIdsForClient = new Set(
          workOrdersForClient.map((wo: any) => wo._id.toString()),
        );

        filteredTasks = tasks.filter((task: any) => {
          const matchesByClient = task.clientId?.toString() === clientId;
          const matchesByWO =
            task.workOrderId &&
            workOrderIdsForClient.has(task.workOrderId.toString());
          return matchesByClient || matchesByWO;
        });
      }

      // Transform tasks with dates to calendar events (use filtered tasks)
      const tasksWithDates = filteredTasks.filter((t) => t.startDate || t.dueDate);
      
      const events = tasksWithDates.map((t) => {
        // Transform task using the same transformer as kanban
        const transformedTask = transformTaskToKanbanTask(t, [], lookups);
        
        const startDate = t.startDate || t.dueDate;
        const endDate = t.dueDate || t.startDate;
        
        // Check if the task has specific times or is all-day
        const hasSpecificTimes = startDate && endDate && (
          startDate.getHours() !== 0 || startDate.getMinutes() !== 0 || 
          endDate.getHours() !== 0 || endDate.getMinutes() !== 0 ||
          startDate.getTime() !== endDate.getTime()
        );
        
        return {
          id: t._id.toString(),
          title: t.title,
          start: startDate,
          end: endDate,
          allDay: !hasSpecificTimes, // All-day if no specific times set
          type: "task",
          status: t.status,
          priority: t.priority,
          color: getPriorityColor(t.priority || "medium"),
          extendedProps: {
            type: "task", 
            taskId: t._id.toString(),
            task: transformedTask, // Use transformed task instead of raw task
          },
        };
      });

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
