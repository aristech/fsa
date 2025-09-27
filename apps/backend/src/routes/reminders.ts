import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ReminderService } from "../services/reminder-service";
import { RecurringTaskService } from "../services/recurring-task-service";

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
}
