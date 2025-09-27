import { model, Schema, models } from "mongoose";
import { PRIORITY_VALUES } from "../constants/priorities";

// ----------------------------------------------------------------------

export interface IWorkOrder {
  _id: string;
  tenantId: string;
  workOrderNumber: string;
  clientId: string;
  personnelIds?: string[];
  title: string;
  details: string; // Rich text content from TipTap
  priority: (typeof PRIORITY_VALUES)[number];
  status:
    | "created"
    | "assigned"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "on-hold";
  // Progress tracking
  progressMode?: "computed" | "manual";
  progress?: number; // 0..100 authoritative display value
  progressManual?: number; // 0..100 when mode = manual
  tasksTotal?: number;
  tasksCompleted?: number;
  tasksInProgress?: number;
  tasksBlocked?: number;
  startedAt?: Date;
  completedAt?: Date;
  location: {
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  scheduledDate?: Date;
  estimatedDuration: {
    value: number;
    unit: "hours" | "days" | "weeks" | "months";
  };
  actualDuration?: number; // in minutes (for tracking actual time spent)
  cost: {
    labor: number;
    materials: number;
    total: number;
  };
  materials: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  history: Array<{
    status: string;
    timestamp: Date;
    userId: string;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const WorkOrderSchema = new Schema<IWorkOrder>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      index: true,
    },
    workOrderNumber: {
      type: String,
      trim: true,
    },
    clientId: {
      type: String,
      required: [true, "Client ID is required"],
      ref: "Client",
    },
    personnelIds: [
      {
        type: String,
        ref: "Personnel",
      },
    ],
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: PRIORITY_VALUES,
      default: "medium",
    },
    status: {
      type: String,
      enum: [
        "created",
        "assigned",
        "in-progress",
        "completed",
        "cancelled",
        "on-hold",
      ],
      default: "created",
    },
    // Progress tracking fields
    progressMode: {
      type: String,
      enum: ["computed", "manual"],
      default: "computed",
      index: true,
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    progressManual: { type: Number, min: 0, max: 100 },
    tasksTotal: { type: Number, default: 0, min: 0 },
    tasksCompleted: { type: Number, default: 0, min: 0 },
    tasksInProgress: { type: Number, default: 0, min: 0 },
    tasksBlocked: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    location: {
      address: { type: String, trim: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    scheduledDate: {
      type: Date,
    },
    estimatedDuration: {
      value: {
        type: Number,
        min: 1,
      },
      unit: {
        type: String,
        enum: ["hours", "days", "weeks", "months"],
      },
    },
    actualDuration: {
      type: Number,
      min: 0,
    },
    cost: {
      labor: { type: Number, default: 0, min: 0 },
      materials: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
    },
    materials: [
      {
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    attachments: [
      {
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        type: { type: String, required: true, trim: true },
        size: { type: Number, required: true, min: 0 },
      },
    ],
    history: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        userId: { type: String, required: true },
        notes: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// ----------------------------------------------------------------------

// Indexes for better performance
// Ensure workOrderNumber uniqueness per tenant (only when present)
WorkOrderSchema.index(
  { tenantId: 1, workOrderNumber: 1 },
  {
    name: "tenantId_1_workOrderNumber_1",
    unique: true,
    partialFilterExpression: {
      workOrderNumber: { $exists: true, $type: "string", $gt: "" },
    },
  },
);
WorkOrderSchema.index({ tenantId: 1, clientId: 1 });
WorkOrderSchema.index({ tenantId: 1, personnelIds: 1 });
WorkOrderSchema.index({ tenantId: 1, status: 1 });
WorkOrderSchema.index({ tenantId: 1, priority: 1 });
WorkOrderSchema.index({ tenantId: 1, scheduledDate: 1 });
WorkOrderSchema.index({ tenantId: 1, progressMode: 1 });

// Text indexes for better search performance with Unicode support
WorkOrderSchema.index(
  {
    title: "text",
    details: "text",
    workOrderNumber: "text",
    "location.address": "text",
    "materials.name": "text"
  },
  {
    name: "workorder_text_search",
    weights: {
      title: 10,
      workOrderNumber: 8,
      details: 5,
      "location.address": 3,
      "materials.name": 2
    },
    default_language: "none" // Disable stemming for better Greek support
  }
);

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

export const WorkOrder =
  models.WorkOrder || model<IWorkOrder>("WorkOrder", WorkOrderSchema);

// Pre-save middleware to generate work order number (temporarily disabled for debugging)
// WorkOrderSchema.pre('save', async function (next) {
//   if (this.isNew && !this.workOrderNumber) {
//     const count = await WorkOrder.countDocuments({ tenantId: this.tenantId });
//     this.workOrderNumber = `WO-${String(count + 1).padStart(6, '0')}`;
//   }
//   next();
// });
