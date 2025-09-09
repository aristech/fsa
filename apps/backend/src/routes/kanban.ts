import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { getKanbanData, handleKanbanPost, getKanbanMeta } from "../controllers/kanban";

export async function kanbanRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook("preHandler", authenticate);

  // GET /api/kanban - Get kanban board data
  fastify.get("/", getKanbanData);

  // GET /api/kanban/meta - Get statuses, priorities
  fastify.get("/meta", getKanbanMeta);

  // POST /api/kanban - Handle kanban operations (create, update, delete tasks)
  fastify.post("/", handleKanbanPost);
}
