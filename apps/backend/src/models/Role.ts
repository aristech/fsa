import type { Document } from "mongoose";
import type { ITenant } from "./Tenant";

import mongoose, { Schema } from "mongoose";

// ----------------------------------------------------------------------

export interface IRole extends Document {
  _id: string;
  tenantId: mongoose.Types.ObjectId | ITenant;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const RoleSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Role slug is required"],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    
    permissions: [
      {
        type: String,
        enum: [
          // Work Orders
          "workOrders.view",
          "workOrders.create",
          "workOrders.edit",
          "workOrders.delete",
          "workOrders.assign",
          "workOrders.viewOwn",
          "workOrders.editOwn",

          // Projects
          "projects.view",
          "projects.create",
          "projects.edit",
          "projects.delete",

          // Tasks
          "tasks.view",
          "tasks.create",
          "tasks.edit",
          "tasks.delete",
          "tasks.viewOwn",
          "tasks.editOwn",

          // Clients
          "clients.view",
          "clients.create",
          "clients.edit",
          "clients.delete",

          // Personnel
          "personnel.view",
          "personnel.create",
          "personnel.edit",
          "personnel.delete",

          // Calendar
          "calendar.view",
          "calendar.edit",
          "calendar.viewOwn",
          "calendar.editOwn",

          // Reports
          "reports.view",
          "reports.create",
          "reports.edit",
          "reports.delete",
          "reports.export",

          // Analytics
          "analytics.view",
          "analytics.export",
          "analytics.dashboard",

          // System Management
          "roles.manage",
          "statuses.manage",
          "settings.manage",
          "tenant.manage",

          // Admin
          "admin.access",
        ],
      },
    ],
    isDefault: {
      type: Boolean,
      default: false,
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

// Ensure unique role names per tenant
RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });
// Ensure unique slugs per tenant (tenant-specific slugs: supervisor_68bebb8ca7618fa2fe1c7b12)
RoleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

// Note: Slug generation is now handled in the API routes for better control

export const Role =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
