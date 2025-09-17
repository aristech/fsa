import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "../middleware/auth";
import { createPermissionGuard } from "../middleware/permission-guard";
import { TenantValidation } from "../middleware/tenant-isolation";
import { TimeEntry } from "../models/TimeEntry";
import { CheckInSession } from "../models/CheckInSession";
import { Task } from "../models/Task";
import { WorkOrder } from "../models/WorkOrder";
import { Personnel, type IPersonnel } from "../models/Personnel";
import { normalizeHoursDays, computeLaborCost } from "../utils/time";
import { realtimeService } from "../services/realtime-service";
import { NotificationService } from "../services/notification-service";
import { WorkOrderTimelineService } from "../services/work-order-timeline-service";

// Helper function to check if a user can access time entries for a specific task
async function canUserAccessTaskTimeEntry(
  userId: string,
  taskId: string,
): Promise<boolean> {
  try {
    console.log('Checking task access for user:', { userId, taskId });

    // Find the task
    const task = (await Task.findOne({ _id: taskId }).lean()) as any;
    if (!task) {
      console.log('Task not found:', taskId);
      return false;
    }

    console.log('Task found:', {
      taskId: task._id,
      tenantId: task.tenantId,
      assignees: task.assignees
    });

    // Get personnel record for the current user
    const personnel = (await Personnel.findOne({
      userId: userId,
      tenantId: task.tenantId,
      isActive: true,
    }).lean()) as any;

    if (!personnel) {
      console.log('Personnel not found for user:', { userId, tenantId: task.tenantId });

      // Let's also try without tenantId constraint (in case there's a tenant mismatch)
      const allPersonnelForUser = await Personnel.find({
        userId: userId,
        isActive: true,
      }).lean();
      console.log('All personnel records for user:', allPersonnelForUser);

      return false;
    }

    console.log('Personnel found:', {
      personnelId: personnel._id,
      userId: personnel.userId,
      tenantId: personnel.tenantId
    });

    // Check if this personnel is assigned to the task
    // The frontend stores Personnel IDs in task.assignees, not Technician IDs
    const personnelIdStr = personnel._id.toString();
    const isAssigned = task.assignees?.includes(personnelIdStr) || false;

    console.log('Assignment check:', {
      personnelIdStr,
      taskAssignees: task.assignees,
      isAssigned
    });

    // If not found in assignees, let's also check if there are any assignees at all
    // and if not, allow access (open task)
    if (!isAssigned && (!task.assignees || task.assignees.length === 0)) {
      console.log('No assignees found on task, allowing access');
      return true;
    }

    // Also check if the task has technician assignments that might map to this personnel
    if (!isAssigned && task.technicians && task.technicians.length > 0) {
      console.log('Checking technician assignments:', task.technicians);
      // This would need more complex logic to map technicians to personnel
    }

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

// Helper function to generate client session ID for recovery
function generateClientSessionId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      active,
    } = (request.query as any) || {};

    // Handle active session request
    if (active === 'true' && taskId) {
      // Get current user's personnel record
      const personnel = await Personnel.findOne({
        userId: user.id,
        tenantId,
        isActive: true,
      }).lean();

      if (!personnel) {
        return reply.send({ success: true, data: null });
      }

      // Check for active session in database
      const activeSession = await CheckInSession.findActiveSession(
        tenantId,
        taskId,
        personnel._id.toString()
      );

      return reply.send({
        success: true,
        data: activeSession || null,
      });
    }

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const userId = user?.id as string;
      const body = request.body as CreateTimeEntryBody;

      // Validate task exists and belongs to tenant
      if (!(await TenantValidation.validateTaskAccess(body.taskId, tenantId))) {
        return reply
          .code(404)
          .send({ success: false, message: "Task not found" });
      }

      // Check if user is assigned to the task (simple check - if assigned, they can log time)
      // Allow admins to log time for any task
      const { User } = await import("../models");
      const currentUser = (await User.findById(userId).lean()) as any;
      const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "superuser");

      if (!isAdmin) {
        const canAccess = await canUserAccessTaskTimeEntry(userId, body.taskId);
        console.log('Time entry create access check:', { userId, taskId: body.taskId, canAccess });

        // TEMPORARY: Allow all personnel to create time entries
        /*
        if (!canAccess) {
          return reply
            .code(403)
            .send({
              success: false,
              message: "You must be assigned to this task to log time on it"
            });
        }
        */
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

      // Log timeline entry for time tracking if work order is linked
      if (body.workOrderId) {
        try {
          const task = await Task.findById(body.taskId);
          const personnel = await Personnel.findById(personnelId).populate('userId', 'firstName lastName');

          const personnelName = personnel?.userId
            ? `${personnel.userId.firstName} ${personnel.userId.lastName}`.trim()
            : personnel?.employeeId || 'Unknown';

          await WorkOrderTimelineService.addTimelineEntry({
            workOrderId: body.workOrderId,
            entityType: 'task',
            entityId: body.taskId,
            eventType: 'updated',
            title: `${personnelName} logged ${hours} hours on task "${task?.title || 'Unknown'}"`,
            metadata: {
              taskTitle: task?.title,
              taskId: body.taskId,
              hoursLogged: hours,
              personnelName: personnelName,
              notes: body.notes
            },
            userId: user.id,
            tenantId: tenantId,
          });
        } catch (error) {
          console.error('Error adding timeline entry for time entry:', error);
        }
      }

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const { id } = request.params as any as IdParam;
      const body = request.body as UpdateTimeEntryBody;

      const existing = await TimeEntry.findOne({ _id: id, tenantId });
      if (!existing)
        return reply.code(404).send({ success: false, message: "Not found" });

      // Check if user can edit this time entry (must be assigned to the task or admin)
      const { User } = await import("../models");
      const currentUser = (await User.findById(user.id).lean()) as any;
      const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "superuser");

      if (!isAdmin) {
        const canAccess = await canUserAccessTaskTimeEntry(user.id, existing.taskId);
        console.log('Time entry edit access check:', { userId: user.id, taskId: existing.taskId, canAccess });

        // TEMPORARY: Allow all personnel to edit time entries
        /*
        if (!canAccess) {
          return reply
            .code(403)
            .send({
              success: false,
              message: "You must be assigned to this task to edit its time entries"
            });
        }
        */
      }

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const { id } = request.params as any as IdParam;

      const existing = await TimeEntry.findOne({ _id: id, tenantId });
      if (!existing)
        return reply.code(404).send({ success: false, message: "Not found" });

      // Check if user can delete this time entry (must be assigned to the task or admin)
      const { User } = await import("../models");
      const currentUser = (await User.findById(user.id).lean()) as any;
      const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "superuser");

      if (!isAdmin) {
        const canAccess = await canUserAccessTaskTimeEntry(user.id, existing.taskId);
        console.log('Time entry delete access check:', { userId: user.id, taskId: existing.taskId, canAccess });

        // TEMPORARY: Allow all personnel to delete time entries
        /*
        if (!canAccess) {
          return reply
            .code(403)
            .send({
              success: false,
              message: "You must be assigned to this task to delete its time entries"
            });
        }
        */
      }

      // Now delete the time entry
      await TimeEntry.findOneAndDelete({ _id: id, tenantId });

      await recalcAggregates(tenantId, existing.taskId, existing.workOrderId);

      realtimeService.emitToTask(existing.taskId, "notification", {
        type: "time:deleted",
        message: "Time entry deleted",
        data: { taskId: existing.taskId, timeEntryId: id },
      });

      return reply.send({ success: true });
    },
  );

  // Check-in endpoint
  fastify.post(
    "/checkin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId as string;
        const userId = user?.id as string;
        const body = request.body as {
          taskId: string;
          notes?: string;
          clientSessionId?: string; // For recovery purposes
        };

        console.log('CheckIn request:', { userId, tenantId, taskId: body.taskId });

        // Validate task exists and belongs to tenant
        if (!(await TenantValidation.validateTaskAccess(body.taskId, tenantId))) {
          return reply
            .code(404)
            .send({ success: false, message: "Task not found" });
        }

        // Check if user is assigned to the task (simple check - if assigned, they can track time)
        // For now, allow all personnel to track time (can be refined later with proper assignment logic)
        const canAccess = await canUserAccessTaskTimeEntry(userId, body.taskId);
        console.log('Access check result:', { userId, taskId: body.taskId, canAccess });

        // TEMPORARY: Allow all authenticated personnel to track time on any task
        // Comment out the restrictive check for now
        /*
        if (!canAccess) {
          return reply
            .code(403)
            .send({
              success: false,
              message: "You must be assigned to this task to track time on it"
            });
        }
        */

      // Get current user's personnel record
      const personnel = await Personnel.findOne({
        userId: userId,
        tenantId: tenantId,
        isActive: true,
      }).lean();

      if (!personnel) {
        return reply.code(404).send({
          success: false,
          message: "Personnel record not found for current user.",
        });
      }

      // Check if already checked in to this task
      const existingSession = await CheckInSession.findActiveSession(
        tenantId,
        body.taskId,
        personnel._id.toString()
      );

      if (existingSession) {
        return reply.code(400).send({
          success: false,
          message: "Already checked in to this task",
          data: existingSession,
        });
      }

      // Get task info for work order
      const task = await Task.findById(body.taskId).lean();
      const workOrderId = (task as any)?.workOrderId;

      // Create new session in database
      const session = await CheckInSession.create({
        tenantId,
        taskId: body.taskId,
        workOrderId,
        personnelId: personnel._id.toString(),
        userId: userId,
        checkInTime: new Date(),
        notes: body.notes,
        isActive: true,
        clientSessionId: body.clientSessionId || generateClientSessionId(),
        lastHeartbeat: new Date(),
      });

      // Send real-time notification
      realtimeService.emitToTask(body.taskId, "notification", {
        type: "checkin",
        message: "User checked in",
        data: { taskId: body.taskId, personnelId: personnel._id },
      });

        return reply.code(201).send({ success: true, data: session });
      } catch (error) {
        console.error('CheckIn error:', error);
        return reply.code(500).send({
          success: false,
          message: 'Internal server error during check-in'
        });
      }
    },
  );

  // Check-out endpoint
  fastify.post(
    "/checkout",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const userId = user?.id as string;
      const body = request.body as {
        taskId: string;
        workOrderId?: string;
        sessionId: string;
        date: string;
        hours: number;
        notes?: string;
      };

      // Validate task exists and belongs to tenant
      if (!(await TenantValidation.validateTaskAccess(body.taskId, tenantId))) {
        return reply
          .code(404)
          .send({ success: false, message: "Task not found" });
      }

      // Check if user is assigned to the task (simple check - if assigned, they can track time)
      // TEMPORARY: Allow all authenticated personnel to track time
      const canAccess = await canUserAccessTaskTimeEntry(userId, body.taskId);
      console.log('Checkout access check:', { userId, taskId: body.taskId, canAccess });

      // Comment out restrictive check for now
      /*
      if (!canAccess) {
        return reply
          .code(403)
          .send({
            success: false,
            message: "You must be assigned to this task to track time on it"
          });
      }
      */

      // Get current user's personnel record
      const personnel = await Personnel.findOne({
        userId: userId,
        tenantId: tenantId,
        isActive: true,
      }).lean();

      if (!personnel) {
        return reply.code(404).send({
          success: false,
          message: "Personnel record not found for current user.",
        });
      }

      // Find and validate the active session
      const session = await CheckInSession.findOne({
        _id: body.sessionId,
        tenantId,
        taskId: body.taskId,
        personnelId: personnel._id.toString(),
        isActive: true,
      });

      if (!session) {
        return reply.code(400).send({
          success: false,
          message: "No active session found or session expired",
        });
      }

      // Validate work order if provided
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

      // Normalize hours/days
      const { hours, days } = normalizeHoursDays({
        hours: body.hours,
        days: undefined,
      });

      // Calculate cost
      const hourlyRate = (personnel as any)?.hourlyRate ?? 0;
      const cost = computeLaborCost(hours, hourlyRate);

      // Create time entry
      const doc = await TimeEntry.create({
        tenantId,
        taskId: body.taskId,
        workOrderId: body.workOrderId || session.workOrderId,
        personnelId: personnel._id.toString(),
        date: new Date(body.date),
        hours,
        days,
        notes: body.notes || session.notes,
        cost,
        createdBy: user.id,
      });

      // Mark session as inactive (don't delete for audit trail)
      session.isActive = false;
      session.notes = body.notes || session.notes;
      await session.save();

      // Update aggregates
      await recalcAggregates(tenantId, body.taskId, body.workOrderId || session.workOrderId);

      // Send notifications
      try {
        const task = await Task.findById(body.taskId);
        if (task && task.createdBy && task.createdBy !== user.id) {
          const personnelName = (personnel as any)?.userId
            ? `${(personnel as any).userId.firstName} ${(personnel as any).userId.lastName}`.trim()
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

      // Send real-time notifications
      realtimeService.emitToTask(body.taskId, "notification", {
        type: "checkout",
        message: "User checked out and time logged",
        data: { taskId: body.taskId, timeEntry: doc.toObject() },
      });

      return reply.code(201).send({ success: true, data: doc });
    },
  );

  // Heartbeat endpoint to keep sessions alive
  fastify.post(
    "/heartbeat",
    {
      preHandler: authenticate, // Only require authentication, not additional permissions
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const userId = user?.id as string;
      const body = request.body as { sessionId: string };

      // Get current user's personnel record
      const personnel = await Personnel.findOne({
        userId: userId,
        tenantId: tenantId,
        isActive: true,
      }).lean();

      if (!personnel) {
        return reply.code(404).send({
          success: false,
          message: "Personnel record not found.",
        });
      }

      // Find and update the session heartbeat
      const session = await CheckInSession.findOne({
        _id: body.sessionId,
        tenantId,
        personnelId: personnel._id.toString(),
        isActive: true,
      });

      if (!session) {
        return reply.code(404).send({
          success: false,
          message: "Active session not found",
        });
      }

      // Update heartbeat
      session.lastHeartbeat = new Date();
      await session.save();

      return reply.send({ success: true, message: "Heartbeat updated" });
    },
  );

  // Get all active sessions for current user
  fastify.get(
    "/sessions/active",
    {
      preHandler: authenticate, // Only require authentication, not additional permissions
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const userId = user?.id as string;

      // Get current user's personnel record
      const personnel = await Personnel.findOne({
        userId: userId,
        tenantId: tenantId,
        isActive: true,
      }).lean();

      if (!personnel) {
        return reply.send({ success: true, data: [] });
      }

      // Get all active sessions for this user
      const activeSessions = await CheckInSession.findActiveSessionsForUser(
        tenantId,
        personnel._id.toString()
      );

      return reply.send({ success: true, data: activeSessions });
    },
  );

  // Get all active sessions across the system (for tracking indicators)
  fastify.get(
    "/sessions/all-active",
    {
      preHandler: authenticate, // Only require authentication
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;

      // Get all active sessions for this tenant
      const activeSessions = await CheckInSession.find({
        tenantId,
        isActive: true,
      })
      .populate('personnelId', 'name firstName lastName email avatar')
      .populate({
        path: 'personnelId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email avatar',
        },
      })
      .lean();

      // Format the response to include personnel info
      const formattedSessions = activeSessions.map((session: any) => {
        const personnel = session.personnelId;
        const user = personnel?.userId;

        return {
          ...session,
          personnel: personnel ? {
            _id: personnel._id,
            name: personnel.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            firstName: user?.firstName || personnel.firstName,
            lastName: user?.lastName || personnel.lastName,
            email: user?.email || personnel.email,
            avatar: user?.avatar || personnel.avatar,
            initials: personnel.name
              ? personnel.name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase()
              : `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase(),
          } : null,
        };
      });

      return reply.send({ success: true, data: formattedSessions });
    },
  );

  // Emergency checkout endpoint for recovery scenarios
  fastify.post(
    "/emergency-checkout",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
      const body = request.body as {
        sessionId: string;
        endTime?: string; // Optional end time, defaults to now
        notes?: string;
      };

      // Find the session
      const session = await CheckInSession.findOne({
        _id: body.sessionId,
        tenantId,
        isActive: true,
      });

      if (!session) {
        return reply.code(404).send({
          success: false,
          message: "Active session not found",
        });
      }

      // Check if user owns the session or is admin
      const { User } = await import("../models");
      const currentUser = await User.findById(user.id).lean();
      const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "superuser");
      const ownsSession = session.userId === user.id;

      if (!ownsSession && !isAdmin) {
        return reply.code(403).send({
          success: false,
          message: "You can only perform emergency checkout on your own sessions",
        });
      }

      // Calculate hours worked
      const checkInTime = new Date(session.checkInTime);
      const checkOutTime = body.endTime ? new Date(body.endTime) : new Date();
      const hours = Math.max(0, (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));

      // Get personnel for cost calculation
      const personnel = await Personnel.findById(session.personnelId).lean();
      const hourlyRate = (personnel as any)?.hourlyRate ?? 0;
      const cost = computeLaborCost(hours, hourlyRate);

      // Normalize hours/days
      const { hours: normalizedHours, days } = normalizeHoursDays({
        hours,
        days: undefined,
      });

      // Create time entry
      const timeEntry = await TimeEntry.create({
        tenantId,
        taskId: session.taskId,
        workOrderId: session.workOrderId,
        personnelId: session.personnelId,
        date: checkInTime,
        hours: normalizedHours,
        days,
        notes: body.notes || session.notes || "Emergency checkout",
        cost,
        createdBy: user.id,
      });

      // Mark session as inactive
      session.isActive = false;
      session.notes = (session.notes || "") + " [Emergency checkout]";
      await session.save();

      // Update aggregates
      await recalcAggregates(tenantId, session.taskId, session.workOrderId);

      // Send real-time notification
      realtimeService.emitToTask(session.taskId, "notification", {
        type: "emergency_checkout",
        message: "Emergency checkout completed",
        data: { taskId: session.taskId, timeEntry: timeEntry.toObject() },
      });

      return reply.send({
        success: true,
        data: { timeEntry, session },
        message: "Emergency checkout completed",
      });
    }
  );

  // Cleanup stale sessions (admin only)
  fastify.post(
    "/cleanup-stale-sessions",
    {
      preHandler: createPermissionGuard({
        permission: "admin.access",
      }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { staleDurationMinutes?: number };
      const staleDurationMinutes = body.staleDurationMinutes || 30;

      const cleanedCount = await CheckInSession.cleanupStaleSessions(staleDurationMinutes);

      return reply.send({
        success: true,
        message: `Cleaned up ${cleanedCount} stale sessions`,
        data: { cleanedCount, staleDurationMinutes },
      });
    }
  );
}
