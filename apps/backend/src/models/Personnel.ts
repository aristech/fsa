import type { Document } from "mongoose";
import type { IRole } from "./Role";
import type { ITenant } from "./Tenant";

import mongoose, { Schema } from "mongoose";

// ----------------------------------------------------------------------

export interface IPersonnel extends Document {
  _id: string;
  tenantId: mongoose.Types.ObjectId | ITenant;
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  roleId?: mongoose.Types.ObjectId | IRole;
  skills: string[];
  certifications: string[];
  hourlyRate: number;
  availability: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    lastUpdated: Date;
  };
  notes?: string;
  isActive: boolean;
  status: "active" | "pending" | "inactive" | "banned";
  environmentAccess: "dashboard" | "field" | "all";
  mobileOptimized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const PersonnelSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
      index: true, // Add index for faster searches
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: false, // Allow personnel without roles
    },
    skills: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    hourlyRate: {
      type: Number,
      required: [true, "Hourly rate is required"],
      min: 0,
    },
    availability: {
      monday: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        available: { type: Boolean, default: true },
      },
      tuesday: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        available: { type: Boolean, default: true },
      },
      wednesday: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        available: { type: Boolean, default: true },
      },
      thursday: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        available: { type: Boolean, default: true },
      },
      friday: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        available: { type: Boolean, default: true },
      },
      saturday: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        available: { type: Boolean, default: false },
      },
      sunday: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
        available: { type: Boolean, default: false },
      },
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      lastUpdated: { type: Date },
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "inactive", "banned"],
      default: "pending",
      index: true,
    },
    environmentAccess: {
      type: String,
      enum: ["dashboard", "field", "all"],
      default: "dashboard",
      index: true,
    },
    mobileOptimized: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ----------------------------------------------------------------------

// Pre-save hook to set mobileOptimized based on environmentAccess and populate employeeId with full name
PersonnelSchema.pre("save", async function (next) {
  if (this.environmentAccess === "field" || this.environmentAccess === "all") {
    this.mobileOptimized = true;
  }

  // Populate employeeId with user's full name if userId is present and employeeId is not set
  if (this.userId && !this.employeeId) {
    try {
      const User = mongoose.model("User");
      const user = await User.findById(this.userId).select(
        "firstName lastName",
      );
      if (user) {
        this.employeeId = `${user.firstName} ${user.lastName}`.trim();
      }
    } catch (error) {
      console.warn(
        "Failed to populate employeeId with full name for personnel:",
        error,
      );
    }
  }

  next();
});

// Indexes for better performance
PersonnelSchema.index({ tenantId: 1, userId: 1 });
PersonnelSchema.index({ tenantId: 1, employeeId: 1 });
PersonnelSchema.index({ tenantId: 1, roleId: 1 });
PersonnelSchema.index({ tenantId: 1, isActive: 1 });
PersonnelSchema.index({ tenantId: 1, environmentAccess: 1 });
PersonnelSchema.index({ "location.latitude": 1, "location.longitude": 1 });

export const Personnel =
  mongoose.models.Personnel ||
  mongoose.model<IPersonnel>("Personnel", PersonnelSchema);
