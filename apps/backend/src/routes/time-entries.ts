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

type IdParam = { id: string };

interface CreateTimeEntryBody {
  taskId: string;
  workOrderId?: string;
  personnelId: string;
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
      }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const tenantId = user?.tenantId as string;
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
      if (
        !(await TenantValidation.validatePersonnelAccess(
          body.personnelId,
          tenantId,
        ))
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
        _id: body.personnelId,
        tenantId,
      }).lean()) as Pick<IPersonnel, "hourlyRate"> | null;
      const hourlyRate = personnel?.hourlyRate ?? 0;
      const cost = computeLaborCost(hours, hourlyRate);

      const doc = await TimeEntry.create({
        tenantId,
        taskId: body.taskId,
        workOrderId: body.workOrderId,
        personnelId: body.personnelId,
        date: new Date(body.date),
        hours,
        days,
        notes: body.notes,
        cost,
        createdBy: user.id,
      });

      await recalcAggregates(tenantId, body.taskId, body.workOrderId);

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
