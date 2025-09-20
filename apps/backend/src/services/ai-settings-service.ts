import { AISettingsModel } from "../models/AISettings";
import type { AISettings, AISettingsFormData } from "../types/ai-settings";

export class AISettingsService {
  /**
   * Get AI settings for a user
   */
  static async getSettings(
    userId: string,
    tenantId: string,
  ): Promise<AISettings | null> {
    try {
      const settings = await AISettingsModel.findOne({
        userId,
        tenantId,
      }).lean();
      return settings;
    } catch (error) {
      console.error("[AISettingsService] Error getting settings:", error);
      throw new Error("Failed to get AI settings");
    }
  }

  /**
   * Create or update AI settings for a user
   */
  static async upsertSettings(
    userId: string,
    tenantId: string,
    data: AISettingsFormData,
  ): Promise<AISettings> {
    try {
      const settings = await AISettingsModel.findOneAndUpdate(
        { userId, tenantId },
        {
          userId,
          tenantId,
          openaiApiKey: data.openaiApiKey,
          preferredModel: data.preferredModel as any,
          maxTokens: data.maxTokens,
          temperature: data.temperature,
          useLocalNLP: data.useLocalNLP,
          language: data.language,
        },
        { upsert: true, new: true, runValidators: true },
      ).lean();

      return settings;
    } catch (error) {
      console.error("[AISettingsService] Error upserting settings:", error);
      throw new Error("Failed to save AI settings");
    }
  }

  /**
   * Test OpenAI API key
   */
  static async testApiKey(apiKey: string, model: string): Promise<boolean> {
    try {
      // Import OpenAI dynamically to avoid issues if not installed
      const { OpenAI } = await import("openai");

      const openai = new OpenAI({
        apiKey,
      });

      // Make a simple test request
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5,
      });

      return !!response.choices?.[0]?.message?.content;
    } catch (error) {
      console.error("[AISettingsService] API key test failed:", error);
      return false;
    }
  }

  /**
   * Delete AI settings for a user
   */
  static async deleteSettings(
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const result = await AISettingsModel.deleteOne({ userId, tenantId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("[AISettingsService] Error deleting settings:", error);
      throw new Error("Failed to delete AI settings");
    }
  }
}
