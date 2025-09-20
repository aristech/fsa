import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface IWebhookLog {
  _id: string;
  webhookId: string;
  tenantId: string;
  topic: string;
  payload: any;
  deliveryUrl: string;
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  attempt: number;
  success: boolean;
  processingTimeMs: number;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const WebhookLogSchema = new Schema<IWebhookLog>(
  {
    webhookId: {
      type: String,
      required: [true, "Webhook ID is required"],
      index: true,
    },
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      index: true,
    },
    topic: {
      type: String,
      required: [true, "Topic is required"],
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: [true, "Payload is required"],
    },
    deliveryUrl: {
      type: String,
      required: [true, "Delivery URL is required"],
    },
    httpStatus: {
      type: Number,
    },
    responseBody: {
      type: String,
      maxlength: 10000, // Limit response body size
    },
    errorMessage: {
      type: String,
      maxlength: 1000,
    },
    attempt: {
      type: Number,
      required: [true, "Attempt number is required"],
      min: 1,
    },
    success: {
      type: Boolean,
      required: [true, "Success status is required"],
    },
    processingTimeMs: {
      type: Number,
      required: [true, "Processing time is required"],
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance and log retention
WebhookLogSchema.index({ webhookId: 1, createdAt: -1 });
WebhookLogSchema.index({ tenantId: 1, createdAt: -1 });
WebhookLogSchema.index({ topic: 1, createdAt: -1 });
WebhookLogSchema.index({ success: 1, createdAt: -1 });

// TTL index to automatically delete logs after 30 days
WebhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ----------------------------------------------------------------------

export const WebhookLog = models.WebhookLog || model<IWebhookLog>("WebhookLog", WebhookLogSchema);