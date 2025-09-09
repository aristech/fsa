import mongoose, { Document, Schema } from "mongoose";

export interface IMagicLink extends Document {
  _id: mongoose.Types.ObjectId;
  token: string; // Unique token hash
  email: string; // Email associated with the magic link
  tenantId: mongoose.Types.ObjectId; // Tenant this magic link belongs to
  userId?: mongoose.Types.ObjectId; // User ID if user already exists
  type: 'personnel_invitation' | 'tenant_activation' | 'password_reset'; // Type of magic link
  metadata?: {
    firstName?: string;
    lastName?: string;
    roleId?: string;
    phone?: string;
    companyName?: string;
    tenantSlug?: string;
    [key: string]: any;
  }; // Additional data for account setup
  isUsed: boolean; // Whether the link has been used
  expiresAt: Date; // Expiration timestamp
  createdAt: Date;
  updatedAt: Date;
}

const magicLinkSchema = new Schema<IMagicLink>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    type: {
      type: String,
      enum: ['personnel_invitation', 'tenant_activation', 'password_reset'],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
magicLinkSchema.index({ token: 1, isUsed: 1, expiresAt: 1 });
magicLinkSchema.index({ email: 1, tenantId: 1, type: 1 });

// Auto-delete expired tokens (optional cleanup)
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MagicLink = mongoose.model<IMagicLink>("MagicLink", magicLinkSchema);
