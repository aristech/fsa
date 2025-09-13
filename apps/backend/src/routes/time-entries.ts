import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "../middleware/auth";
import { createPermissionGuard } from "../middleware/permission-guard";
import { TenantValidation } from "../middleware/tenant-isolation";
import { TimeEntry } from "../models/TimeEntry";
import { Task } from "../models/Task";
import { WorkOrder } from "../models/WorkOrder";
import { Personnel, type IPersonnel } from "../models/Personnel";
import { normalizeHoursDays, computeLaborCost } from "../utils/time";
import { realtimeService } from "../services/realtime-service";
import { NotificationService } from "../services/notification-service";

// Helper function to check if a user can access time entries for a specific task
async function canUserAccessTaskTimeEntry(
  userId: string,
  taskId: string,
): Promise<boolean> {
  try {
    // Find the task
    const task = (await Task.findOne({ _id: taskId }).lean()) as any;
    if (!task) {
      return false;
    }

    // Get personnel record for the current user
    const personnel = (await Personnel.findOne({
      userId: userId,
      tenantId: task.tenantId,
      isActive: true,
    }).lean()) as any;

    if (!personnel) {
      return false;
    }

    // Check if this personnel is assigned to the task
    // The frontend stores Personnel IDs in task.assignees, not Technician IDs
    const isAssigned =
      task.assignees?.includes(personnel._id.toString()) || false;

    return isAssigned;
  } catch (error) {
    console.error("Error checking task assignment:", error);
    return false;
  }
}

type IdParam = { id: string };

interface CreateTimeEntryBody {
  taskId: string;
  workOrderId?: string;
  personnelId?: string; // Optional - will be auto-determined from authenticated user
  date: string; // ISO date
  hours?: number;
  days?: number;
  notes?: string;
}

interface UpdateTimeEntryBody {
  hours?: number;
  days?: number;
  notes?: string;
}

async function recalcAggregates(
  tenantId: string,
  taskId: string,
  workOrderId?: string | null,
) {
  // Task.actualHours = sum(hours) for task
  const [{ totalHours = 0 } = {} as any] = await TimeEntry.aggregate([
    { $match: { tenantId, taskId } },
    { $group: { _id: null, totalHours: { $sum: "$hours" } } },
  ]);

  await Task.updateOne(
    { _id: taskId, tenantId },
    { $set: { actualHours: totalHours } },
  );

  if (workOrderId) {
    // WorkOrder.actualDuration in minutes, and cost.labor from sum(cost)
    const result = await TimeEntry.aggregate([
      { $match: { tenantId, workOrderId } },
      {
        $group: {
          _id: null,
          totalHours: { $sum: "$hours" },
          laborCost: { $sum: { $ifNull: ["$cost", 0] } },
        },
      },
    ]);
    const totalHoursWO = result[0]?.totalHours ?? 0;
    const laborCost = result[0]?.laborCost ?? 0;
    const actualDuration = Math.round(totalHoursWO * 60);

    await WorkOrder.updateOne(
      { _id: workOrderId, tenantId },
      {
        $set: {
          actualDuration,
          "cost.labor": laborCost,
        },
      },
    );
  }
}

export async function timeEntryRoutes(fastify: FastifyInstance) {
  // Auth for all routes under this plugin
  fastify.addHook("preHandler", authenticate);

  // List entries (by task, personnel, or work order)
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const tenantId = user?.tenantId as string;

    const {
      taskId,
      workOrderId,
      personnelId,
      from,
      to,
      limit = 100,
      skip = 0,
    } = (request.query as any) || {};

    const filter: any = { tenantId };
    if (taskId) filter.taskId = taskId;
    if (workOrderId) filter.workOrderId = workOrderId;
    if (personnelId) filter.personnelId = personnelId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const entries = await TimeEntry.find(filter)
      .sort({ date: -1 })
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 500));

    return reply.send({ success: true, data: entries });
  });

  // Create
  fastify.post(
    "/",
    {
      preHandler: createPermissionGuard({
        resource: "time-entry",
        action: "create",
        customCheck: async (userId: string, request: FastifyRequest) => {
          // First check if user has explicit time-entry.create permission
          const { PermissionService } = await import(
            "../services/permission-service"
          );
          const explicitPermission = await PermissionService.canAccessResource(
            userId,
            "time-entry",
            "create",
          );
          if (explicitPermission.hasPermission) {
            return true;
          }

          // Check if user is admin - admins can log time for any task
          const { User } = await import("../models");
          const user = (await User.findById(userId).lean()) as any;
          if (user && (user.role === "admin" || user.role === "superuser")) {
            return true;
          }

          // Check if user is assigned to the task they're trying to log time for
          const body = request.body as CreateTimeEntryBody;
          const taskId = body.taskId;

          if (!taskId) {
            return false;
          }

          return await canUserAccessTaskTimeEntry(userId, taskId);
        },
      }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const userId = user?.id as string;
      const body = request.body as CreateTimeEntryBody;

      // Basic validations and tenant checks
      if (!(await TenantValidation.validateTaskAccess(body.taskId, tenantId))) {
        return reply
          .code(404)
          .send({ success: false, message: "Task not found" });
      }
      if (body.workOrderId) {
        const ok = await TenantValidation.validateWorkOrderAccess(
          body.workOrderId,
          tenantId,
        );
        if (!ok)
          return reply
            .code(404)
            .send({ success: false, message: "Work order not found" });
      }

      // Auto-determine personnelId from authenticated user if not provided
      let personnelId = body.personnelId;
      if (!personnelId) {
        // First, try to find personnel record for the current user
        let personnel = (await Personnel.findOne({
          userId: userId,
          tenantId: tenantId,
          isActive: true,
        }).lean()) as any;

        if (!personnel) {
          // If user doesn't have a personnel record, check if they're admin
          const { User } = await import("../models");
          const user = (await User.findById(userId).lean()) as any;

          if (user && (user.role === "admin" || user.role === "superuser")) {
            // Admin users can log time for the first assigned personnel of the task
            const task = (await Task.findById(body.taskId).lean()) as any;
            if (task && task.assignees && task.assignees.length > 0) {
              // Use the first assigned personnel
              personnelId = task.assignees[0];
            } else {
              return reply.code(400).send({
                success: false,
                message:
                  "No personnel assigned to this task. Please assign personnel first or specify a personnelId.",
              });
            }
          } else {
            return reply.code(404).send({
              success: false,
              message:
                "Personnel record not found for current user. Only admins can log time for other personnel.",
            });
          }
        } else {
          personnelId = personnel._id.toString();
        }
      }

      // Validate the personnel record exists
      if (
        !(await TenantValidation.validatePersonnelAccess(personnelId, tenantId))
      ) {
        return reply
          .code(404)
          .send({ success: false, message: "Personnel not found" });
      }

      // Normalize hours/days
      const { hours, days } = normalizeHoursDays({
        hours: body.hours,
        days: body.days,
      });

      // Snapshot hourly rate for cost
      const personnel = (await Personnel.findOne({
        _id: personnelId,
        tenantId,
      }).lean()) as Pick<IPersonnel, "hourlyRate"> | null;
      const hourlyRate = personnel?.hourlyRate ?? 0;
      const cost = computeLaborCost(hours, hourlyRate);

      const doc = await TimeEntry.create({
        tenantId,
        taskId: body.taskId,
        workOrderId: body.workOrderId,
        personnelId: personnelId,
        date: new Date(body.date),
        hours,
        days,
        notes: body.notes,
        cost,
        createdBy: user.id,
      });

      await recalcAggregates(tenantId, body.taskId, body.workOrderId);

      // Send notification to task reporter about time entry
      try {
        const task = await Task.findById(body.taskId);
        if (task && task.createdBy && task.createdBy !== user.id) {
          // Get personnel info for the notification
          const personnel = await Personnel.findById(personnelId).populate(
            "userId",
            "firstName lastName email",
          );
          const personnelName = personnel?.userId
            ? `${(personnel.userId as any).firstName} ${(personnel.userId as any).lastName}`.trim()
            : "Someone";

          await NotificationService.createNotification({
            tenantId,
            userId: task.createdBy,
            type: "time_logged",
            title: `Time logged on: ${task.title}`,
            message: `${personnelName} logged ${hours} hours on "${task.title}".`,
            category: "task",
            relatedEntity: {
              entityType: "task",
              entityId: task._id.toString(),
              entityTitle: task.title,
            },
            metadata: {
              taskId: task._id.toString(),
              workOrderId: task.workOrderId,
              reporterId: task.createdBy,
              changes: ["actualHours"],
            },
            createdBy: user.id,
          });
        }
      } catch (error) {
        console.error("Error sending time entry notification:", error);
      }

      // Realtime notify task room
      realtimeService.emitToTask(body.taskId, "notification", {
        type: "time:created",
        message: "Time entry created",
        data: { taskId: body.taskId, timeEntry: doc.toObject() },
      });

      return reply.code(201).send({ success: true, data: doc });
    },
  );

  // Update
  fastify.put(
    "/:id",
    {
      preHandler: createPermissionGuard({
        resource: "time-entry",
        action: "edit",
        customCheck: async (userId: string, request: FastifyRequest) => {
          // First check if user has explicit time-entry.edit permission
          const { PermissionService } = await import(
            "../services/permission-service"
          );
          const explicitPermission = await PermissionService.canAccessResource(
            userId,
            "time-entry",
            "edit",
          );
          if (explicitPermission.hasPermission) {
            return true;
          }

          // Check if user is admin - admins can edit time entries for any task
          const { User } = await import("../models");
          const user = (await User.findById(userId).lean()) as any;
          if (user && (user.role === "admin" || user.role === "superuser")) {
            return true;
          }

          // Check if user is assigned to the task for this time entry
          const { id } = request.params as any;

          try {
            // Find the time entry and get the associated task
            const timeEntry = (await TimeEntry.findOne({
              _id: id,
            }).lean()) as any;
            if (!timeEntry) {
              return false;
            }

            return await canUserAccessTaskTimeEntry(userId, timeEntry.taskId);
          } catch (error) {
            console.error("Error checking task assignment for edit:", error);
            return false;
          }
        },
      }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const { id } = request.params as any as IdParam;
      const body = request.body as UpdateTimeEntryBody;

      const existing = await TimeEntry.findOne({ _id: id, tenantId });
      if (!existing)
        return reply.code(404).send({ success: false, message: "Not found" });

      const normalized = normalizeHoursDays({
        hours: body.hours ?? existing.hours,
        days: body.days ?? existing.days,
      });

      // Recompute cost based on personnel snapshot rate at update time
      const personnel = (await Personnel.findOne({
        _id: existing.personnelId,
        tenantId,
      }).lean()) as Pick<IPersonnel, "hourlyRate"> | null;
      const hourlyRate = personnel?.hourlyRate ?? 0;
      const cost = computeLaborCost(normalized.hours, hourlyRate);

      existing.hours = normalized.hours;
      existing.days = normalized.days;
      if (typeof body.notes === "string") existing.notes = body.notes;
      existing.cost = cost;
      await existing.save();

      await recalcAggregates(tenantId, existing.taskId, existing.workOrderId);

      // Send notification to task reporter about time entry update
      try {
        const task = await Task.findById(existing.taskId);
        if (task && task.createdBy && task.createdBy !== user.id) {
          // Get personnel info for the notification
          const personnel = await Personnel.findById(
            existing.personnelId,
          ).populate("userId", "firstName lastName email");
          const personnelName = personnel?.userId
            ? `${(personnel.userId as any).firstName} ${(personnel.userId as any).lastName}`.trim()
            : "Someone";

          await NotificationService.createNotification({
            tenantId,
            userId: task.createdBy,
            type: "time_updated",
            title: `Time updated on: ${task.title}`,
            message: `${personnelName} updated their time entry to ${normalized.hours} hours on "${task.title}".`,
            category: "task",
            relatedEntity: {
              entityType: "task",
              entityId: task._id.toString(),
              entityTitle: task.title,
            },
            metadata: {
              taskId: task._id.toString(),
              workOrderId: task.workOrderId,
              reporterId: task.createdBy,
              changes: ["actualHours"],
            },
            createdBy: user.id,
          });
        }
      } catch (error) {
        console.error("Error sending time entry update notification:", error);
      }

      realtimeService.emitToTask(existing.taskId, "notification", {
        type: "time:updated",
        message: "Time entry updated",
        data: { taskId: existing.taskId, timeEntry: existing.toObject() },
      });

      return reply.send({ success: true, data: existing });
    },
  );

  // Delete
  fastify.delete(
    "/:id",
    {
      preHandler: createPermissionGuard({
        resource: "time-entry",
        action: "delete",
        customCheck: async (userId: string, request: FastifyRequest) => {
          // First check if user has explicit time-entry.delete permission
          const { PermissionService } = await import(
            "../services/permission-service"
          );
          const explicitPermission = await PermissionService.canAccessResource(
            userId,
            "time-entry",
            "delete",
          );
          if (explicitPermission.hasPermission) {
            return true;
          }

          // Check if user is admin - admins can delete time entries for any task
          const { User } = await import("../models");
          const user = (await User.findById(userId).lean()) as any;
          if (user && (user.role === "admin" || user.role === "superuser")) {
            return true;
          }

          // Check if user is assigned to the task for this time entry
          const { id } = request.params as any;

          try {
            // Find the time entry and get the associated task
            const timeEntry = (await TimeEntry.findOne({
              _id: id,
            }).lean()) as any;
            if (!timeEntry) {
              return false;
            }

            return await canUserAccessTaskTimeEntry(userId, timeEntry.taskId);
          } catch (error) {
            console.error("Error checking task assignment for delete:", error);
            return false;
          }
        },
      }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const { id } = request.params as any as IdParam;

      const existing = await TimeEntry.findOneAndDelete({ _id: id, tenantId });
      if (!existing)
        return reply.code(404).send({ success: false, message: "Not found" });

      await recalcAggregates(tenantId, existing.taskId, existing.workOrderId);

      realtimeService.emitToTask(existing.taskId, "notification", {
        type: "time:deleted",
        message: "Time entry deleted",
        data: { taskId: existing.taskId, timeEntryId: id },
      });

      return reply.send({ success: true });
    },
  );
}
