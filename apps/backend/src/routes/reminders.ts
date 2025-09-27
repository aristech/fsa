import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ReminderService } from "../services/reminder-service";
import { RecurringTaskService } from "../services/recurring-task-service";
import { Task } from "../models/Task";

// Reminder routes
export async function reminderRoutes(fastify: FastifyInstance) {
  // POST /api/v1/reminders/process - Process pending reminders (for cron job)
  fastify.post(
    "/process",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await ReminderService.processPendingReminders();

        return reply.send({
          success: true,
          processed: result.processed,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // GET /api/v1/reminders/pending - Get tasks that need reminders (for debugging)
  fastify.get(
    "/pending",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tasks = await ReminderService.getTasksNeedingReminders();

        return reply.send({
          success: true,
          tasks: tasks.map((task) => ({
            id: task._id,
            title: task.title,
            startDate: task.startDate,
            reminderType: task.reminder?.type,
            nextReminder: task.reminder?.nextReminder,
            lastSent: task.reminder?.lastSent,
          })),
          count: tasks.length,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // POST /api/v1/reminders/update-task/:taskId - Update reminder settings for a task
  fastify.post(
    "/update-task/:taskId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
          required: ["taskId"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { taskId: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { taskId } = request.params;

        await ReminderService.updateTaskReminder(taskId);

        return reply.send({
          success: true,
          message: "Task reminder updated successfully",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // POST /api/v1/reminders/process-recurring - Process pending recurring tasks (for cron job)
  fastify.post(
    "/process-recurring",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result =
          await RecurringTaskService.processPendingRecurringTasks();

        return reply.send({
          success: true,
          processed: result.processed,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // GET /api/v1/reminders/pending-recurring - Get tasks that need recurring instances (for debugging)
  fastify.get(
    "/pending-recurring",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tasks = await RecurringTaskService.getTasksNeedingRecurrence();

        return reply.send({
          success: true,
          tasks: tasks.map((task) => ({
            id: task._id,
            name: task.title,
            dueDate: task.dueDate,
            repeatType: task.repeat?.type,
            nextOccurrence: task.repeat?.nextOccurrence,
            lastCreated: task.repeat?.lastCreated,
          })),
          count: tasks.length,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // POST /api/v1/reminders/update-recurring/:taskId - Update recurrence settings for a task
  fastify.post(
    "/update-recurring/:taskId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
          required: ["taskId"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { taskId: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { taskId } = request.params;

        await RecurringTaskService.updateTaskRecurrence(taskId);

        return reply.send({
          success: true,
          message: "Task recurrence updated successfully",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // GET /api/v1/reminders/debug-task/:taskId - Debug specific task recurring status
  fastify.get(
    "/debug-task/:taskId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
          required: ["taskId"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { taskId: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { taskId } = request.params;
        const task = await Task.findById(taskId);

        if (!task) {
          return reply.status(404).send({
            success: false,
            error: "Task not found",
          });
        }

        const now = new Date();
        const dueDatePassed = task.dueDate && task.dueDate <= now;
        const notShiftedYet = !task.repeat?.lastShifted ||
          (task.dueDate && task.repeat.lastShifted < task.dueDate);

        const qualifiesForShift = task.repeat?.enabled === true &&
          dueDatePassed &&
          notShiftedYet;

        return reply.send({
          success: true,
          task: {
            id: task._id,
            title: task.title,
            dueDate: task.dueDate,
            repeat: task.repeat,
            currentTime: now,
            dueDatePassed,
            notShiftedYet,
            qualifiesForRecurrence: qualifiesForShift,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // GET /api/v1/reminders/debug-reminder/:taskId - Debug specific task reminder status
  fastify.get(
    "/debug-reminder/:taskId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
          required: ["taskId"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { taskId: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { taskId } = request.params;
        const task = await Task.findById(taskId);

        if (!task) {
          return reply.status(404).send({
            success: false,
            error: "Task not found",
          });
        }

        const now = new Date();
        const reminderEnabled = task.reminder?.enabled === true;
        const hasReminderTime = task.reminder?.nextReminder != null;
        const reminderTimePassed = hasReminderTime && task.reminder!.nextReminder! <= now;
        const notSentYet = !task.reminder?.lastSent ||
          (hasReminderTime && task.reminder.lastSent < task.reminder.nextReminder!);

        const qualifiesForReminder = reminderEnabled &&
          hasReminderTime &&
          reminderTimePassed &&
          notSentYet;

        return reply.send({
          success: true,
          task: {
            id: task._id,
            title: task.title,
            dueDate: task.dueDate,
            reminder: task.reminder,
            currentTime: now,
            reminderEnabled,
            hasReminderTime,
            reminderTimePassed,
            notSentYet,
            qualifiesForReminder,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // GET /api/v1/reminders/debug-emails/:taskId - Debug email recipients for a task
  fastify.get(
    "/debug-emails/:taskId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
          required: ["taskId"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { taskId: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { taskId } = request.params;
        const task = await Task.findById(taskId);

        if (!task) {
          return reply.status(404).send({
            success: false,
            error: "Task not found",
          });
        }

        const emails = await ReminderService.getTaskNotificationEmails(task);

        // Debug: Get detailed assignee info
        const { Personnel } = await import("../models/Personnel");
        const { User } = await import("../models/User");

        const assigneeDetails = task.assignees ? await Personnel.find({
          _id: { $in: task.assignees },
          tenantId: task.tenantId
        }).populate('userId', 'email firstName lastName') : [];

        const creatorDetails = task.createdBy ? await User.findById(task.createdBy).select('email firstName lastName') : null;

        return reply.send({
          success: true,
          task: {
            id: task._id,
            title: task.title,
            assignees: task.assignees,
            createdBy: task.createdBy,
            tenantId: task.tenantId,
          },
          emailRecipients: emails,
          emailCount: emails.length,
          debug: {
            assigneeDetails: assigneeDetails.map(a => {
              const user = (a as any).userId;
              return {
                personnelId: a._id,
                userId: user?._id || null,
                email: user?.email || null,
                name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'No User'
              };
            }),
            creatorDetails: creatorDetails ? { id: creatorDetails._id, email: creatorDetails.email, name: `${creatorDetails.firstName || ''} ${creatorDetails.lastName || ''}` } : null,
          }
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}
