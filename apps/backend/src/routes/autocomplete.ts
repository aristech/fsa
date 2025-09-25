import { FastifyInstance } from "fastify";
import { Personnel } from "../models/Personnel";
import { Client } from "../models/Client";
import { Material } from "../models/Material";
import { Task } from "../models/Task";
import { WorkOrder } from "../models/WorkOrder";

export async function autocompleteRoutes(fastify: FastifyInstance) {
  // Handle CORS preflight requests
  fastify.options("/autocomplete", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    reply.code(200).send();
  });

  fastify.options("/autocomplete/", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    reply.code(200).send();
  });

  // Autocomplete endpoint - handle both with and without trailing slash
  fastify.get("/autocomplete", async (request, reply) => {
    try {
      // Parse and validate query parameters
      const query = request.query as any;
      const { symbol, query: searchQuery, limit = 5, token } = query;

      // Validate required parameters
      if (!token) {
        reply.code(401).send({ error: "Token required" });
        return;
      }

      if (!symbol || !["@", "#", "/", "+", "&"].includes(symbol)) {
        reply.code(400).send({ error: "Invalid symbol" });
        return;
      }

      // JWT validation
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key",
        );

        // Attach user info to request
        (request as any).user = {
          id: decoded.userId,
          tenantId: decoded.tenantId,
          email: decoded.email,
          role: decoded.role,
        };
      } catch (error) {
        reply.code(401).send({ error: "Invalid token" });
        return;
      }

      const user = (request as any).user;

      // Simple autocomplete based on symbol
      let results: any[] = [];

      switch (symbol) {
        case "@": // Personnel
          const personnel = await Personnel.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              $or: [
                { "userId.firstName": { $regex: searchQuery, $options: "i" } },
                { "userId.lastName": { $regex: searchQuery, $options: "i" } },
                { "userId.email": { $regex: searchQuery, $options: "i" } },
              ],
            }),
          })
            .populate("userId", "firstName lastName email")
            .limit(parseInt(limit));

          results = personnel.map((p) => ({
            id: p._id,
            name: `${p.userId.firstName} ${p.userId.lastName}`,
            email: p.userId.email,
            type: "personnel",
          }));
          break;

        case "#": // Tasks/Work Orders
          const tasks = await Task.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              title: { $regex: searchQuery, $options: "i" },
            }),
          }).limit(parseInt(limit));

          results = tasks.map((t) => ({
            id: t._id,
            name: t.title,
            type: "task",
          }));
          break;

        case "/": // Materials
          const materials = await Material.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              $or: [
                { name: { $regex: searchQuery, $options: "i" } },
                { sku: { $regex: searchQuery, $options: "i" } },
              ],
            }),
          }).limit(parseInt(limit));

          results = materials.map((m) => ({
            id: m._id,
            name: m.name,
            sku: m.sku,
            type: "material",
          }));
          break;

        case "+": // Clients
          const clients = await Client.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              $or: [
                { name: { $regex: searchQuery, $options: "i" } },
                { company: { $regex: searchQuery, $options: "i" } },
              ],
            }),
          }).limit(parseInt(limit));

          results = clients.map((c) => ({
            id: c._id,
            name: c.name,
            company: c.company,
            type: "client",
          }));
          break;

        case "&": // Work Orders
          const workOrders = await WorkOrder.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              title: { $regex: searchQuery, $options: "i" },
            }),
          }).limit(parseInt(limit));

          results = workOrders.map((w) => ({
            id: w._id,
            name: w.title,
            type: "workorder",
          }));
          break;
      }

      const response = {
        success: true,
        data: results,
      };

      // Add CORS headers
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      reply.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );

      reply.send(response);
    } catch (error: any) {
      console.error("[Autocomplete] Error:", error);
      reply.code(500).send({
        success: false,
        error: error.message || "Autocomplete failed",
      });
    }
  });

  // Also handle the trailing slash case
  fastify.get("/autocomplete/", async (request, reply) => {
    try {
      // Parse and validate query parameters
      const query = request.query as any;
      const { symbol, query: searchQuery, limit = 5, token } = query;

      // Validate required parameters
      if (!token) {
        reply.code(401).send({ error: "Token required" });
        return;
      }

      if (!symbol || !["@", "#", "/", "+", "&"].includes(symbol)) {
        reply.code(400).send({ error: "Invalid symbol" });
        return;
      }

      // JWT validation
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key",
        );

        // Attach user info to request
        (request as any).user = {
          id: decoded.userId,
          tenantId: decoded.tenantId,
          email: decoded.email,
          role: decoded.role,
        };
      } catch (error) {
        reply.code(401).send({ error: "Invalid token" });
        return;
      }

      const user = (request as any).user;

      // Simple autocomplete based on symbol
      let results: any[] = [];

      switch (symbol) {
        case "@": // Personnel
          const personnel = await Personnel.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              $or: [
                { "userId.firstName": { $regex: searchQuery, $options: "i" } },
                { "userId.lastName": { $regex: searchQuery, $options: "i" } },
                { "userId.email": { $regex: searchQuery, $options: "i" } },
              ],
            }),
          })
            .populate("userId", "firstName lastName email")
            .limit(parseInt(limit));

          results = personnel.map((p) => ({
            id: p._id,
            name: `${p.userId.firstName} ${p.userId.lastName}`,
            email: p.userId.email,
            type: "personnel",
          }));
          break;

        case "#": // Tasks/Work Orders
          const tasks = await Task.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              title: { $regex: searchQuery, $options: "i" },
            }),
          }).limit(parseInt(limit));

          results = tasks.map((t) => ({
            id: t._id,
            name: t.title,
            type: "task",
          }));
          break;

        case "/": // Materials
          const materials = await Material.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              $or: [
                { name: { $regex: searchQuery, $options: "i" } },
                { sku: { $regex: searchQuery, $options: "i" } },
              ],
            }),
          }).limit(parseInt(limit));

          results = materials.map((m) => ({
            id: m._id,
            name: m.name,
            sku: m.sku,
            type: "material",
          }));
          break;

        case "+": // Clients
          const clients = await Client.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              $or: [
                { name: { $regex: searchQuery, $options: "i" } },
                { company: { $regex: searchQuery, $options: "i" } },
              ],
            }),
          }).limit(parseInt(limit));

          results = clients.map((c) => ({
            id: c._id,
            name: c.name,
            company: c.company,
            type: "client",
          }));
          break;

        case "&": // Work Orders
          const workOrders = await WorkOrder.find({
            tenantId: user.tenantId,
            ...(searchQuery && {
              title: { $regex: searchQuery, $options: "i" },
            }),
          }).limit(parseInt(limit));

          results = workOrders.map((w) => ({
            id: w._id,
            name: w.title,
            type: "workorder",
          }));
          break;
      }

      const response = {
        success: true,
        data: results,
      };

      // Add CORS headers
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      reply.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );

      reply.send(response);
    } catch (error: any) {
      console.error("[Autocomplete] Error:", error);
      reply.code(500).send({
        success: false,
        error: error.message || "Autocomplete failed",
      });
    }
  });
}
