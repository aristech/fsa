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

export async function registerRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get("/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // API routes
  await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
  await fastify.register(emailRoutes, { prefix: "/api/v1/email" });
  await fastify.register(personnelRoutes, { prefix: "/api/v1/personnel" });
  await fastify.register(rolesRoutes, { prefix: "/api/v1/roles" });
  await fastify.register(kanbanRoutes, { prefix: "/api/v1/kanban" });
  await fastify.register(clientRoutes, { prefix: "/api/v1/clients" });
  await fastify.register(calendarRoutes, { prefix: "/api/v1/calendar" });
  await fastify.register(workOrderRoutes, { prefix: "/api/v1/work-orders" });
}
