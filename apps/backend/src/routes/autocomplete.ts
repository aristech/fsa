import { FastifyInstance } from "fastify";
import { generateAutocompleteTool } from "../services/ai/validation-tools";

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

      // Allow empty queries for showing available entries
      // if (!searchQuery) {
      //   reply.code(400).send({ error: "Query required" });
      //   return;
      // }

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

      // Create autocomplete tool
      const autocompleteTool = generateAutocompleteTool();

      // Execute the tool
      const result = await autocompleteTool.handler(
        { symbol, query: searchQuery, limit: parseInt(limit) },
        {
          userId: user.id,
          tenantId: user.tenantId,
        },
      );

      const response = JSON.parse(result.content);

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

      // Allow empty queries for showing available entries
      // if (!searchQuery) {
      //   reply.code(400).send({ error: "Query required" });
      //   return;
      // }

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

      // Create autocomplete tool
      const autocompleteTool = generateAutocompleteTool();

      // Execute the tool
      const result = await autocompleteTool.handler(
        { symbol, query: searchQuery, limit: parseInt(limit) },
        {
          userId: user.id,
          tenantId: user.tenantId,
        },
      );

      const response = JSON.parse(result.content);

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
