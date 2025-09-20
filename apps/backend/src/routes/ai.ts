import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { streamChat } from "../services/ai/orchestrator";
import { toolRegistry } from "../services/ai/tools";
import { aiRateLimiter } from "../services/ai/rate-limiter";
import type { ChatMessage, StreamEvent, ChatContext } from "../types/ai";
import { AuthenticatedRequest } from "../types";

// ----------------------------------------------------------------------

const StateSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant", "tool"]),
      content: z.string(),
      name: z.string().optional(),
      toolCallId: z.string().optional(),
    }),
  ),
});

// ----------------------------------------------------------------------

// Custom auth middleware for SSE that handles token in query params
async function authenticateSSE(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Ensure CORS headers are present even on auth failures
    const origin = (request.headers.origin as string) || "*";
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
    reply.header("Access-Control-Allow-Credentials", "true");

    console.log(
      "SSE Auth - Headers:",
      JSON.stringify(request.headers, null, 2),
    );
    console.log("SSE Auth - Query:", JSON.stringify(request.query, null, 2));

    let token = null;

    // Check for token in query params (for SSE)
    const queryToken = (request.query as any).token;
    if (queryToken) {
      token = queryToken;
      console.log("SSE Auth - Token found in query params");
    } else {
      // Fallback to Authorization header
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
        console.log("SSE Auth - Token found in Authorization header");
      }
    }

    if (!token) {
      console.log("SSE Auth - No token provided");
      reply.status(401).send({
        success: false,
        message: "No token provided",
      });
      return;
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const userId = decoded.id || decoded.userId || decoded._id;
    const tenantId = decoded.tenantId || decoded.tenant_id || decoded.tenant;
    console.log(
      "SSE Auth - Token decoded successfully for user:",
      decoded.email,
      "userId:",
      userId,
      "tenantId:",
      tenantId,
      "role:",
      decoded.role,
      "permissions:",
      decoded.permissions,
    );

    // Attach user info to request
    (request as any).user = {
      id: userId,
      tenantId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    // Attach token to request
    (request as any).token = token;

    // Get tenant info - simplified for SSE
    (request as any).context = {
      user: {
        id: userId,
        email: decoded.email,
        permissions: decoded.permissions || [],
        role: decoded.role,
      },
      tenant: {
        _id: tenantId,
        name: decoded.tenantName || "Default Tenant",
      },
    };
    console.log("SSE Auth - Authentication successful");
  } catch (error) {
    console.error(
      "SSE Auth - JWT verification failed:",
      (error as Error).message,
    );
    const origin = (request.headers.origin as string) || "*";
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.status(401).send({
      success: false,
      message: "Invalid token",
    });
    return;
  }
}

export async function aiRoutes(fastify: FastifyInstance) {
  // Chat streaming endpoint
  fastify.get(
    "/chat/stream",
    {
      preHandler: [authenticateSSE],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Set SSE + CORS headers explicitly on raw res and flush immediately
      const origin = (request.headers.origin as string) || "*";
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Vary", "Origin");
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
      reply.raw.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma",
      );
      reply.raw.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      if (typeof (reply.raw as any).flushHeaders === "function") {
        (reply.raw as any).flushHeaders();
      }

      // Handle client disconnect
      reply.raw.on("close", () => {
        console.log("[AI] Client disconnected, stopping stream");
      });

      reply.raw.on("error", (error) => {
        console.log("[AI] Connection error:", error.message);
      });

      // Get language from query parameters with fallback
      const language = (request.query as any).lang || "en";
      console.log("[AI] Language detected in route handler:", language);

      // Ensure we have a valid language code
      const validLanguage =
        typeof language === "string" && language.length > 0 ? language : "en";

      console.log("[AI] SSE stream start");

      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;

      // Check rate limit per user
      const rateLimitKey = `${user.id}:${tenant._id}`;
      const isAllowed = await aiRateLimiter.checkLimit(rateLimitKey);

      if (!isAllowed) {
        const resetTime = aiRateLimiter.getResetTime(rateLimitKey);
        const waitMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60));

        const errorEvent: StreamEvent = {
          type: "error",
          error: `Too many AI requests. Please wait ${waitMinutes} minute(s) before trying again.`,
        };
        reply.raw.write(`data: ${JSON.stringify(errorEvent)}\\n\\n`);
        reply.raw.end();
        return;
      }

      try {
        console.log("[AI] Received state param");
        // Parse and validate the state parameter
        const rawState = String((request.query as any).state || "");
        if (!rawState) {
          const errorEvent: StreamEvent = {
            type: "error",
            error: "Missing state parameter",
          };
          reply.raw.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
          reply.raw.end();
          return;
        }

        let decodedState: string;
        try {
          decodedState = decodeURIComponent(rawState);
          console.log("[AI] Decoded state length:", decodedState.length);
        } catch (error) {
          const errorEvent: StreamEvent = {
            type: "error",
            error: "Invalid state parameter encoding",
          };
          reply.raw.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
          reply.raw.end();
          return;
        }

        let parsedState: any;
        try {
          parsedState = JSON.parse(decodedState);
          console.log("[AI] Parsed state ok");
        } catch (error) {
          const errorEvent: StreamEvent = {
            type: "error",
            error: "Invalid JSON in state parameter",
          };
          reply.raw.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
          reply.raw.end();
          return;
        }

        const { messages } = StateSchema.parse(parsedState);
        console.log("[AI] Messages count:", messages.length);

        // Create chat context with tenant isolation
        const ctx: ChatContext = {
          userId: user.id,
          tenantId: tenant._id.toString(),
          token: (request as any).token,
          emitEvent: (event: { type: string; data: any }) => {
            // Emit real-time events for task updates
            const eventData: StreamEvent = {
              type: "event",
              data: JSON.stringify(event),
            };
            reply.raw.write(`data: ${JSON.stringify(eventData)}\n\n`);
          },
        };

        // Create dynamic system message based on user permissions
        const userPermissions = user.permissions || [];
        const availableActions = [];

        if (
          userPermissions.includes("*") ||
          userPermissions.includes("workOrders.view") ||
          userPermissions.includes("workOrders.viewOwn")
        ) {
          availableActions.push("• View and filter work orders");
        }

        if (
          userPermissions.includes("*") ||
          userPermissions.includes("kanban.read") ||
          userPermissions.includes("projects.view") ||
          userPermissions.includes("tasks.view")
        ) {
          availableActions.push(
            "• Access kanban board and project information",
          );
        }

        if (
          userPermissions.includes("*") ||
          userPermissions.includes("workOrders.view") ||
          userPermissions.includes("workOrders.viewOwn")
        ) {
          availableActions.push("• Get detailed work order information");
        }

        // Filter available tools based on user permissions
        const availableTools = toolRegistry.filter((tool) => {
          // Admin users get access to all tools
          if (
            userPermissions.includes("*") ||
            userPermissions.role === "superuser"
          ) {
            return true;
          }

          // Check specific permissions for each tool type
          if (
            tool.name.startsWith("list_workOrders") ||
            tool.name.startsWith("get_workOrder")
          ) {
            return (
              userPermissions.includes("workOrders.view") ||
              userPermissions.includes("workOrders.viewOwn")
            );
          }
          if (
            tool.name.startsWith("list_tasks") ||
            tool.name.startsWith("get_task")
          ) {
            return userPermissions.includes("tasks.view");
          }
          if (
            tool.name.startsWith("list_projects") ||
            tool.name.startsWith("get_project")
          ) {
            return userPermissions.includes("projects.view");
          }
          if (
            tool.name.startsWith("list_personnel") ||
            tool.name.startsWith("get_personnel")
          ) {
            return userPermissions.includes("personnel.view");
          }
          if (
            tool.name.startsWith("list_clients") ||
            tool.name.startsWith("get_client")
          ) {
            return userPermissions.includes("clients.view");
          }
          if (
            tool.name.startsWith("list_reports") ||
            tool.name.startsWith("get_report")
          ) {
            return userPermissions.includes("reports.view");
          }
          if (
            tool.name.startsWith("list_timeEntries") ||
            tool.name.startsWith("get_timeEntry")
          ) {
            return userPermissions.includes("timeEntries.view");
          }
          if (
            tool.name.startsWith("list_materials") ||
            tool.name.startsWith("get_material")
          ) {
            return userPermissions.includes("materials.view");
          }
          if (tool.name === "get_kanban") {
            return (
              userPermissions.includes("kanban.read") ||
              userPermissions.includes("projects.view") ||
              userPermissions.includes("tasks.view")
            );
          }
          if (tool.name === "get_analytics") {
            return userPermissions.includes("reports.view");
          }

          // Default to allowing access for unknown tools
          return true;
        });

        // Minimal tool count for efficiency
        const toolCount = availableTools.length;

        // Map language codes to display names
        const getLanguageDisplay = (lang: string) => {
          switch (lang) {
            case "el":
              return "Greek (Ελληνικά)";
            case "de":
              return "German (Deutsch)";
            case "fr":
              return "French (Français)";
            case "es":
              return "Spanish (Español)";
            case "it":
              return "Italian (Italiano)";
            case "pt":
              return "Portuguese (Português)";
            case "ru":
              return "Russian (Русский)";
            case "zh":
              return "Chinese (中文)";
            case "ja":
              return "Japanese (日本語)";
            case "ko":
              return "Korean (한국어)";
            case "ar":
              return "Arabic (العربية)";
            default:
              return "English";
          }
        };

        console.log("[AI] Creating system message with language:", {
          original: language,
          valid: validLanguage,
          display: getLanguageDisplay(validLanguage),
        });

        const systemMessage: ChatMessage = {
          role: "system",
          content: `FSA AI Assistant. Language: ${getLanguageDisplay(validLanguage)}.

TOOL PRIORITY:
1. ALWAYS use create_task_local for task creation (FREE, fast)
2. Only use create_task if create_task_local fails

RULES:
- Create tasks IMMEDIATELY with available info
- NO validation delays
- NEVER mention personnel not provided by user

USER: ${userPermissions.includes("*") ? "Admin" : "Standard"}`,
        };

        const messagesWithSystem =
          messages[0]?.role === "system"
            ? messages
            : [systemMessage, ...messages];

        // Aggressive token optimization - keep only recent context
        const maxMessages = 8; // Reduced to 8 for efficiency
        if (messagesWithSystem.length > maxMessages) {
          // Keep only the last 4 messages + system message
          const recentMessages = messagesWithSystem.slice(-4);
          messagesWithSystem.splice(
            1,
            messagesWithSystem.length - 5,
            ...recentMessages.slice(1),
          );
        }

        // Check if connection is still alive before starting
        if (reply.raw.destroyed) {
          console.log("[AI] Connection closed before streaming started");
          return;
        }

        // Start streaming chat
        await streamChat({
          messages: messagesWithSystem,
          ctx,
          tools: availableTools,
          onToken: (token: string) => {
            // Check if connection is still alive before sending token
            if (reply.raw.destroyed) {
              console.log("[AI] Connection closed during streaming, stopping");
              return;
            }
            // small batching is handled by client; we just forward tokens
            const event: StreamEvent = {
              type: "token",
              data: token,
            };
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          },
          onToolCall: (toolCall: any) => {
            // Check if connection is still alive before sending tool call
            if (reply.raw.destroyed) {
              console.log("[AI] Connection closed during tool call, stopping");
              return;
            }
            const event: StreamEvent = {
              type: "tool_delta",
              data: JSON.stringify(toolCall),
            };
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          },
          onComplete: (result) => {
            // Check if connection is still alive before completing
            if (reply.raw.destroyed) {
              console.log("[AI] Connection closed before completion");
              return;
            }
            console.log("[AI] Stream complete", {
              serviceUsed: result.serviceUsed,
            });
            const doneEvent: StreamEvent = {
              type: "done",
            };
            reply.raw.write(`data: ${JSON.stringify(doneEvent)}\n\n`);
            reply.raw.end();
          },
          onError: (error) => {
            // Check if connection is still alive before sending error
            if (reply.raw.destroyed) {
              console.log("[AI] Connection closed before error handling");
              return;
            }
            console.error("[AI] Stream error:", error?.message || error);
            const errorEvent: StreamEvent = {
              type: "error",
              error: error.message,
            };
            reply.raw.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
            reply.raw.end();
          },
        });
      } catch (error: any) {
        console.error("AI chat stream error:", error);
        const errorEvent: StreamEvent = {
          type: "error",
          error: error.message || "Internal server error",
        };
        reply.raw.write(`data: ${JSON.stringify(errorEvent)}\\n\\n`);
        reply.raw.end();
      }

      // Handle client disconnect
      request.raw.on("close", () => {
        reply.raw.end();
      });
    },
  );

  // Get available tools endpoint
  fastify.get(
    "/tools",
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tools = toolRegistry.map((tool) => ({
        name: tool.name,
        description: tool.description,
        // Don't expose the actual schema or handler for security
      }));

      reply.send({
        success: true,
        data: tools,
      });
    },
  );

  // Health check for AI service
  fastify.get(
    "/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if OpenAI API key is available
        const hasApiKey = !!process.env.OPENAI_API_KEY;

        reply.send({
          success: true,
          data: {
            status: hasApiKey ? "ready" : "no_api_key",
            message: hasApiKey
              ? "AI service is ready"
              : "AI service requires OPENAI_API_KEY environment variable",
            toolsAvailable: toolRegistry.length,
          },
        });
      } catch (error: any) {
        reply.code(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );
}
