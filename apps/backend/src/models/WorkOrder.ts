import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface IWorkOrder {
  _id: string;
  tenantId: string;
  workOrderNumber: string;
  clientId: string;
  technicianId?: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status:
    | "created"
    | "assigned"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "on-hold";
  category: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  scheduledDate?: Date;
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
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
  notes: string;
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
      unique: true,
      trim: true,
    },
    clientId: {
      type: String,
      required: [true, "Client ID is required"],
      ref: "Client",
    },
    technicianId: {
      type: String,
      ref: "Technician",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
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
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    location: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      zipCode: { type: String, required: true, trim: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    scheduledDate: {
      type: Date,
    },
    estimatedDuration: {
      type: Number,
      required: [true, "Estimated duration is required"],
      min: 0,
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
    notes: {
      type: String,
      trim: true,
    },
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
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance
WorkOrderSchema.index({ tenantId: 1, workOrderNumber: 1 });
WorkOrderSchema.index({ tenantId: 1, clientId: 1 });
WorkOrderSchema.index({ tenantId: 1, technicianId: 1 });
WorkOrderSchema.index({ tenantId: 1, status: 1 });
WorkOrderSchema.index({ tenantId: 1, priority: 1 });
WorkOrderSchema.index({ tenantId: 1, scheduledDate: 1 });

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
