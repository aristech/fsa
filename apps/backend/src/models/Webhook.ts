import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface IWebhook {
  _id: string;
  tenantId: string;
  userId: string;
  name: string;
  deliveryUrl: string;
  status: boolean;
  topics: string[];
  apiVersion: string;
  secretKey: string;
  lastTriggeredAt?: Date;
  failureCount: number;
  maxRetries: number;
  timeoutMs: number;
  headers?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const WebhookSchema = new Schema<IWebhook>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      index: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Webhook name is required"],
      trim: true,
      maxlength: 100,
    },
    deliveryUrl: {
      type: String,
      required: [true, "Delivery URL is required"],
      trim: true,
      validate: {
        validator: function(v: string) {
          try {
            const url = new URL(v);
            return url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Delivery URL must be a valid HTTPS URL'
      }
    },
    status: {
      type: Boolean,
      default: true,
    },
    topics: {
      type: [String],
      required: [true, "At least one topic is required"],
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: 'At least one topic must be specified'
      }
    },
    apiVersion: {
      type: String,
      required: [true, "API version is required"],
      default: "2024-01-01",
    },
    secretKey: {
      type: String,
      required: [true, "Secret key is required"],
    },
    lastTriggeredAt: {
      type: Date,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    timeoutMs: {
      type: Number,
      default: 10000,
      min: 1000,
      max: 30000,
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance
WebhookSchema.index({ tenantId: 1, status: 1 });
WebhookSchema.index({ tenantId: 1, userId: 1 });
WebhookSchema.index({ topics: 1 });

// ----------------------------------------------------------------------

export const Webhook = models.Webhook || model<IWebhook>("Webhook", WebhookSchema);