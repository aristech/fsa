import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permission-guard";
import { Webhook } from "../models/Webhook";
import { WebhookLog } from "../models/WebhookLog";
import { WebhookService, WEBHOOK_TOPICS } from "../services/webhook-service";
import { AuthenticatedRequest } from "../types";

// ----------------------------------------------------------------------

export async function webhookRoutes(fastify: FastifyInstance) {
  // Get all webhooks for the current tenant
  fastify.get(
    "/",
    {
      preHandler: [authenticate, requirePermission("webhooks.read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;

        const webhooks = await Webhook.find({ tenantId: tenant._id })
          .select("-secretKey") // Don't expose secret keys
          .sort({ createdAt: -1 });

        reply.send({
          success: true,
          data: webhooks,
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Get a specific webhook
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate, requirePermission("webhooks.read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const webhook = await Webhook.findOne({
          _id: id,
          tenantId: tenant._id,
        }).select("-secretKey");

        if (!webhook) {
          reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
          return;
        }

        reply.send({
          success: true,
          data: webhook,
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Create a new webhook
  fastify.post(
    "/",
    {
      preHandler: [authenticate, requirePermission("webhooks.write")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant, user } = req.context!;
        const webhookData = request.body as {
          name: string;
          deliveryUrl: string;
          topics: string[];
          status?: boolean;
          maxRetries?: number;
          timeoutMs?: number;
          headers?: Record<string, string>;
        };

        // Validate topics
        const invalidTopics = webhookData.topics.filter(
          (topic) => !WEBHOOK_TOPICS.includes(topic as any),
        );

        if (invalidTopics.length > 0) {
          reply.status(400).send({
            success: false,
            error: `Invalid topics: ${invalidTopics.join(", ")}`,
            validTopics: WEBHOOK_TOPICS,
          });
          return;
        }

        // Generate a secret key for webhook security
        const secretKey = crypto.randomBytes(32).toString("hex");

        const webhook = new Webhook({
          tenantId: tenant._id,
          userId: user.id,
          name: webhookData.name,
          deliveryUrl: webhookData.deliveryUrl,
          topics: webhookData.topics,
          status: webhookData.status ?? true,
          secretKey,
          maxRetries: webhookData.maxRetries ?? 3,
          timeoutMs: webhookData.timeoutMs ?? 10000,
          headers: webhookData.headers || {},
          failureCount: 0,
        });

        await webhook.save();

        // Return webhook without secret key, but include it once for the client
        const responseData = webhook.toObject();
        delete responseData.secretKey;

        reply.status(201).send({
          success: true,
          data: responseData,
          secretKey, // Only returned once during creation
          message:
            "Webhook created successfully. Store the secret key securely - it won't be shown again.",
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Update a webhook
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate, requirePermission("webhooks.write")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };
        const updateData = request.body as {
          name?: string;
          deliveryUrl?: string;
          topics?: string[];
          status?: boolean;
          maxRetries?: number;
          timeoutMs?: number;
          headers?: Record<string, string>;
        };

        // Validate topics if provided
        if (updateData.topics) {
          const invalidTopics = updateData.topics.filter(
            (topic) => !WEBHOOK_TOPICS.includes(topic as any),
          );

          if (invalidTopics.length > 0) {
            reply.status(400).send({
              success: false,
              error: `Invalid topics: ${invalidTopics.join(", ")}`,
              validTopics: WEBHOOK_TOPICS,
            });
            return;
          }
        }

        const webhook = await Webhook.findOneAndUpdate(
          { _id: id, tenantId: tenant._id },
          { $set: updateData },
          { new: true },
        ).select("-secretKey");

        if (!webhook) {
          reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
          return;
        }

        reply.send({
          success: true,
          data: webhook,
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Delete a webhook
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate, requirePermission("webhooks.delete")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const webhook = await Webhook.findOneAndDelete({
          _id: id,
          tenantId: tenant._id,
        });

        if (!webhook) {
          reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
          return;
        }

        reply.send({
          success: true,
          message: "Webhook deleted successfully",
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Test a webhook
  fastify.post(
    "/:id/test",
    {
      preHandler: [authenticate, requirePermission("webhooks.write")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        // Verify webhook exists and belongs to tenant
        const webhook = await Webhook.findOne({
          _id: id,
          tenantId: tenant._id,
        });
        if (!webhook) {
          reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
          return;
        }

        // Test the webhook
        const result = await WebhookService.testWebhook(id);

        reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Get webhook delivery logs
  fastify.get(
    "/:id/logs",
    {
      preHandler: [authenticate, requirePermission("webhooks.read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };
        const { page = 1, limit = 50 } = request.query as {
          page?: number;
          limit?: number;
        };

        // Verify webhook exists and belongs to tenant
        const webhook = await Webhook.findOne({
          _id: id,
          tenantId: tenant._id,
        });
        if (!webhook) {
          reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
          return;
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
          WebhookLog.find({ webhookId: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          WebhookLog.countDocuments({ webhookId: id }),
        ]);

        reply.send({
          success: true,
          data: {
            logs,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          },
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Get available webhook topics
  fastify.get(
    "/topics",
    {
      preHandler: [authenticate, requirePermission("webhooks.read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.send({
        success: true,
        data: WEBHOOK_TOPICS,
      });
    },
  );

  // Regenerate webhook secret
  fastify.post(
    "/:id/regenerate-secret",
    {
      preHandler: [authenticate, requirePermission("webhooks.write")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const req = request as AuthenticatedRequest;
        const { tenant } = req.context!;
        const { id } = request.params as { id: string };

        const newSecretKey = crypto.randomBytes(32).toString("hex");

        const webhook = await Webhook.findOneAndUpdate(
          { _id: id, tenantId: tenant._id },
          { secretKey: newSecretKey },
          { new: true },
        ).select("-secretKey");

        if (!webhook) {
          reply.status(404).send({
            success: false,
            error: "Webhook not found",
          });
          return;
        }

        reply.send({
          success: true,
          data: webhook,
          secretKey: newSecretKey, // Only returned once
          message:
            "Secret key regenerated successfully. Update your webhook endpoint to use the new secret.",
        });
      } catch (error: any) {
        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );
}
