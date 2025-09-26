import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { kanbanRoutes } from "./kanban";
import { clientRoutes } from "./clients";
import { calendarRoutes } from "./calendar";
import { authRoutes } from "./auth";
import { emailRoutes } from "./email";
import { personnelRoutes } from "./personnel";
import { rolesRoutes } from "./roles";
import { workOrderRoutes } from "./work-orders";
import { tenantRoutes } from "./tenants";
import { permissionRoutes } from "./permissions";
import { uploadsRoutes } from "./uploads";
import { subtasksRoutes } from "./subtasks";
import { commentsRoutes } from "./comments";
import { timeEntryRoutes } from "./time-entries";
import { notificationRoutes } from "./notifications";
import { materialsRoutes } from "./materials";
import { taskMaterialsRoutes } from "./task-materials";
import { reportsRoutes } from "./reports";
import { userRoutes } from "./users";
import { webhookRoutes } from "./webhooks";
import { apiKeyRoutes } from "./api-keys";
import { publicApiRoutes } from "./public-api";
import { webhookTestRoutes } from "./webhook-test";
import { autocompleteRoutes } from "./autocomplete";
import { reminderRoutes } from "./reminders";

export async function registerRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get("/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // API routes
  await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
  await fastify.register(emailRoutes, { prefix: "/api/v1/email" });
  await fastify.register(tenantRoutes, { prefix: "/api/v1/tenants" });
  await fastify.register(personnelRoutes, { prefix: "/api/v1/personnel" });
  await fastify.register(rolesRoutes, { prefix: "/api/v1/roles" });
  await fastify.register(permissionRoutes, { prefix: "/api/v1/permissions" });
  await fastify.register(kanbanRoutes, { prefix: "/api/v1/kanban" });
  await fastify.register(clientRoutes, { prefix: "/api/v1/clients" });
  await fastify.register(calendarRoutes, { prefix: "/api/v1/calendar" });
  await fastify.register(workOrderRoutes, { prefix: "/api/v1/work-orders" });
  await fastify.register(uploadsRoutes, { prefix: "/api/v1/uploads" });
  await fastify.register(subtasksRoutes, { prefix: "/api/v1/subtasks" });
  await fastify.register(commentsRoutes, { prefix: "/api/v1/comments" });
  await fastify.register(timeEntryRoutes, { prefix: "/api/v1/time-entries" });
  await fastify.register(notificationRoutes, {
    prefix: "/api/v1/notifications",
  });
  await fastify.register(materialsRoutes, { prefix: "/api/v1/materials" });
  await fastify.register(taskMaterialsRoutes, { prefix: "/api/v1/tasks" });
  await fastify.register(reportsRoutes, { prefix: "/api/v1/reports" });
  await fastify.register(userRoutes, { prefix: "/api/v1/users" });
  await fastify.register(webhookRoutes, { prefix: "/api/v1/webhooks" });
  await fastify.register(apiKeyRoutes, { prefix: "/api/v1/api-keys" });
  await fastify.register(publicApiRoutes, { prefix: "/api/v1/public" });
  await fastify.register(webhookTestRoutes, { prefix: "/api/v1/test" });
  await fastify.register(autocompleteRoutes, { prefix: "/api/v1" });
  await fastify.register(reminderRoutes, { prefix: "/api/v1/reminders" });
}
