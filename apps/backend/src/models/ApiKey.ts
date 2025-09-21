import { model, Schema, models, Model } from "mongoose";
import crypto from "crypto";

// ----------------------------------------------------------------------

export interface IApiKey {
  _id: string;
  tenantId: string;
  userId?: string; // Make optional for backward compatibility
  personnelId?: string; // New field for personnel-based API keys
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt?: Date;
  usageCount: number;
  rateLimitPerHour: number;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
}

// Interface for static methods
export interface IApiKeyModel extends Model<IApiKey> {
  generateApiKey(): { key: string; hash: string; prefix: string };
  hashKey(key: string): string;
}

// ----------------------------------------------------------------------

const ApiKeySchema = new Schema<IApiKey>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      index: true,
    },
    userId: {
      type: String,
      required: false, // Made optional for backward compatibility
      index: true,
    },
    personnelId: {
      type: String,
      required: false, // Will be required for new API keys
      index: true,
    },
    name: {
      type: String,
      required: [true, "API key name is required"],
      trim: true,
      maxlength: 100,
    },
    keyHash: {
      type: String,
      required: [true, "Key hash is required"],
      unique: true,
    },
    keyPrefix: {
      type: String,
      required: [true, "Key prefix is required"],
      index: true,
    },
    permissions: {
      type: [String],
      required: [true, "At least one permission is required"],
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: 'At least one permission must be specified'
      }
    },
    lastUsedAt: {
      type: Date,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rateLimitPerHour: {
      type: Number,
      default: 1000,
      min: 1,
      max: 10000,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance
ApiKeySchema.index({ tenantId: 1, isActive: 1 });
ApiKeySchema.index({ tenantId: 1, userId: 1 });
ApiKeySchema.index({ tenantId: 1, personnelId: 1 });
ApiKeySchema.index({ keyPrefix: 1 });
ApiKeySchema.index({ expiresAt: 1 });

// ----------------------------------------------------------------------

// Static methods for API key generation and validation
ApiKeySchema.statics.generateApiKey = function(): { key: string; hash: string; prefix: string } {
  const key = `fsa_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 7); // "fsa_xxx"

  return { key, hash, prefix };
};

ApiKeySchema.statics.hashKey = function(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
};

ApiKeySchema.methods.isExpired = function(): boolean {
  return this.expiresAt ? new Date() > this.expiresAt : false;
};

// ----------------------------------------------------------------------

export const ApiKey = (models.ApiKey as unknown as IApiKeyModel) || (model<IApiKey, IApiKeyModel>("ApiKey", ApiKeySchema));