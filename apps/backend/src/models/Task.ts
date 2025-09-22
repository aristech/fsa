import type { Document } from "mongoose";

import mongoose, { Schema } from "mongoose";
import { PRIORITY_VALUES } from "../constants/priorities";

// ----------------------------------------------------------------------

export interface ITask extends Document {
  _id: string;
  tenantId: string;
  title: string;
  description?: string;
  columnId: string; // Reference to Status (column) _id
  status?: "todo" | "in-progress" | "review" | "done" | "cancel"; // Legacy field, keep for migration
  priority: (typeof PRIORITY_VALUES)[number];
  projectId?: string;
  workOrderId?: string;
  workOrderNumber?: string; // Human-readable work order reference
  workOrderTitle?: string; // Cached work order title for display
  assignees?: string[]; // Technician IDs
  createdBy: string; // User ID
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: string[];
  notes?: string;
  order?: number; // Order within the column for drag-and-drop
  completeStatus?: boolean;
  // Client information (optional)
  clientId?: string; // Reference to Client
  clientName?: string; // Cached client name for display
  clientCompany?: string; // Cached client company for display
  // Repeat settings
  repeat?: {
    enabled: boolean;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    customType?: 'weeks' | 'months';
    frequency?: number;
  };
  // Reminder settings
  reminder?: {
    enabled: boolean;
    type: '1hour' | '1day' | '1week' | '1month';
    lastSent?: Date;
    nextReminder?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const TaskSchema = new Schema<ITask>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    columnId: {
      type: String,
      required: true,
      ref: "Status",
      index: true,
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done", "cancel"],
      // Remove default - this becomes a legacy field
    },
    priority: {
      type: String,
      enum: PRIORITY_VALUES,
      default: "medium",
    },
    projectId: {
      type: String,
      ref: "Project",
    },
    workOrderId: {
      type: String,
      ref: "WorkOrder",
    },
    workOrderNumber: {
      type: String,
      trim: true,
    },
    workOrderTitle: {
      type: String,
      trim: true,
    },
    assignees: [
      {
        type: String,
        ref: "Technician",
      },
    ],
    createdBy: {
      type: String,
      required: true,
      ref: "User",
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        type: String,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    completeStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Client information (optional)
    clientId: {
      type: String,
      ref: "Client",
    },
    clientName: {
      type: String,
      trim: true,
    },
    clientCompany: {
      type: String,
      trim: true,
    },
    // Repeat settings
    repeat: {
      enabled: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      },
      customType: {
        type: String,
        enum: ['weeks', 'months'],
      },
      frequency: {
        type: Number,
        min: 1,
        max: 26,
      },
    },
    // Reminder settings
    reminder: {
      enabled: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: ['1hour', '1day', '1week', '1month'],
      },
      lastSent: {
        type: Date,
      },
      nextReminder: {
        type: Date,
        index: true, // Index for efficient querying of pending reminders
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
TaskSchema.index({ tenantId: 1, projectId: 1 });
TaskSchema.index({ tenantId: 1, workOrderId: 1 });
TaskSchema.index({ tenantId: 1, assignees: 1 });
TaskSchema.index({ tenantId: 1, columnId: 1 }); // Primary index for column-based queries
TaskSchema.index({ tenantId: 1, status: 1 }); // Keep for migration compatibility
TaskSchema.index({ tenantId: 1, priority: 1 });
TaskSchema.index({ tenantId: 1, clientId: 1 });

export const Task =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
