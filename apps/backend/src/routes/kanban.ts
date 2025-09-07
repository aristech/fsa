import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { getKanbanData, handleKanbanPost } from "../controllers/kanban";

export async function kanbanRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/kanban - Get kanban board data
  fastify.get("/", getKanbanData);

  // POST /api/kanban - Handle kanban operations (create, update, delete tasks)
  fastify.post("/", handleKanbanPost);
}
