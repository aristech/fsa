import { Schema, model, Document, Model } from "mongoose";

import type { AISettings } from "../types/ai-settings";

// ----------------------------------------------------------------------

export interface IAISettings extends AISettings, Document {}

export interface IAISettingsModel extends Model<IAISettings> {}

// ----------------------------------------------------------------------

const AISettingsSchema = new Schema<IAISettings>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      index: true,
    },
    openaiApiKey: {
      type: String,
      trim: true,
    },
    preferredModel: {
      type: String,
      enum: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4o", "gpt-4o-mini"],
      default: "gpt-4o-mini",
    },
    maxTokens: {
      type: Number,
      default: 1000,
      min: 1,
      max: 4000,
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2,
    },
    useLocalNLP: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      default: "en",
    },
  },
  {
    timestamps: true,
  },
);

// ----------------------------------------------------------------------

// Indexes for better performance
AISettingsSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

// ----------------------------------------------------------------------

export const AISettingsModel = model<IAISettings, IAISettingsModel>(
  "AISettings",
  AISettingsSchema,
);
