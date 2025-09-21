import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

import { authenticate } from "../middleware/auth";
import { AISettingsService } from "../services/ai-settings-service";
import type { AISettingsFormData } from "../types/ai-settings";
import type { AuthenticatedRequest } from "../types";

// ----------------------------------------------------------------------

const aiSettingsSchema = z.object({
  openaiApiKey: z.string().min(1, "OpenAI API Key is required"),
  preferredModel: z.enum([
    "gpt-5",
    "gpt-4",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "gpt-4o",
    "gpt-4o-mini",
  ]),
  maxTokens: z.number().min(1).max(4000),
  temperature: z.number().min(0).max(2),
  useLocalNLP: z.boolean(),
  language: z.string().min(1, "Language is required"),
});

const testApiKeySchema = z.object({
  openaiApiKey: z.string().min(1, "OpenAI API Key is required"),
  preferredModel: z.enum([
    "gpt-5",
    "gpt-4",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "gpt-4o",
    "gpt-4o-mini",
  ]),
});

// ----------------------------------------------------------------------

export async function aiSettingsRoutes(fastify: FastifyInstance) {

  // Get AI settings
  fastify.get("/ai/settings", {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;

      const settings = await AISettingsService.getSettings(
        user.id,
        tenant._id,
      );

      return reply.send({
        success: true,
        data: settings,
        message: settings
          ? "Settings retrieved successfully"
          : "No settings found",
      });
    } catch (error: any) {
      console.error("[AI Settings] Get error:", error);
      return reply.code(500).send({
        success: false,
        message: error.message || "Failed to get AI settings",
      });
    }
  });

  // Update AI settings
  fastify.put("/ai/settings", {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;

      const body = request.body as any;
      const validatedData = aiSettingsSchema.parse(body);

      const settings = await AISettingsService.upsertSettings(
        user.id,
        tenant._id,
        validatedData as AISettingsFormData,
      );

      return reply.send({
        success: true,
        data: settings,
        message: "Settings saved successfully",
      });
    } catch (error: any) {
      console.error("[AI Settings] Update error:", error);

      if (error.name === "ZodError") {
        return reply.code(400).send({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        message: error.message || "Failed to save AI settings",
      });
    }
  });

  // Test OpenAI API key
  fastify.post("/ai/settings/test", {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;

      const body = request.body as any;
      const validatedData = testApiKeySchema.parse(body);

      const isValid = await AISettingsService.testApiKey(
        validatedData.openaiApiKey,
        validatedData.preferredModel,
      );

      return reply.send({
        success: isValid,
        message: isValid ? "API key is valid" : "API key test failed",
      });
    } catch (error: any) {
      console.error("[AI Settings] Test error:", error);

      if (error.name === "ZodError") {
        return reply.code(400).send({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        message: error.message || "Failed to test API key",
      });
    }
  });

  // Delete AI settings
  fastify.delete("/ai/settings", {
    preHandler: [authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const req = request as AuthenticatedRequest;
      const { tenant, user } = req.context!;

      const deleted = await AISettingsService.deleteSettings(
        user.id,
        tenant._id,
      );

      return reply.send({
        success: deleted,
        message: deleted
          ? "Settings deleted successfully"
          : "No settings found to delete",
      });
    } catch (error: any) {
      console.error("[AI Settings] Delete error:", error);
      return reply.code(500).send({
        success: false,
        message: error.message || "Failed to delete AI settings",
      });
    }
  });
}
