import type { Document } from "mongoose";
import type { ITenant } from "./Tenant";
import type { IUser } from "./User";
import type { IClient } from "./Client";
import type { ITask } from "./Task";
import type { IWorkOrder } from "./WorkOrder";
import type { IMaterial } from "./Material";

import mongoose, { Schema } from "mongoose";

// ----------------------------------------------------------------------

// Embedded data interfaces for historical preservation
export interface IEmbeddedUser {
  _id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  phone?: string;
}

export interface IEmbeddedClient {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contactPerson?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface IEmbeddedWorkOrder {
  _id: string;
  number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  location?: string;
  clientId: string;
  assignedTo?: string;
  createdBy: string;
}

export interface IEmbeddedTask {
  _id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: Date;
  dueDate?: Date;
  assignedTo?: string;
  workOrderId?: string;
  createdBy: string;
}

export interface IReportAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId | IUser;
  // Embedded user data for historical purposes
  uploadedByData?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface IReportTimeEntry {
  _id: string;
  description: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  taskId?: mongoose.Types.ObjectId | ITask;
  // Embedded task data for historical purposes
  taskData?: {
    _id: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
  };
  category: "labor" | "travel" | "waiting" | "equipment" | "other";
}

export interface IReportMaterialUsage {
  _id: string;
  materialId: mongoose.Types.ObjectId | IMaterial;
  // Enhanced material data for historical purposes
  material: {
    _id: string;
    name: string;
    sku: string;
    unit: string;
    description?: string;
    category?: string;
    supplier?: string;
    // Store the cost at the time of report creation
    unitCostAtTime: number;
  };
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface IReportSignature {
  _id: string;
  type: "technician" | "client" | "supervisor" | "inspector";
  signatureData: string; // Base64 encoded signature image
  signerName: string;
  signerTitle?: string;
  signerEmail?: string;
  signedAt: Date;
  ipAddress?: string;
}

export interface IReport extends Document {
  _id: string;
  tenantId: mongoose.Types.ObjectId | ITenant;

  // Basic Info
  type:
    | "daily"
    | "weekly"
    | "monthly"
    | "incident"
    | "maintenance"
    | "inspection"
    | "completion"
    | "safety";
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "published";
  priority: "low" | "medium" | "high" | "urgent";

  // Relations (keep references for active data)
  createdBy: mongoose.Types.ObjectId | IUser;
  assignedTo: mongoose.Types.ObjectId | IUser;
  clientId?: mongoose.Types.ObjectId | IClient;
  workOrderId?: mongoose.Types.ObjectId | IWorkOrder;
  taskIds: (mongoose.Types.ObjectId | ITask)[];

  // Embedded data for historical preservation (immutable once set)
  createdByData?: IEmbeddedUser;
  assignedToData?: IEmbeddedUser;
  clientData?: IEmbeddedClient;
  workOrderData?: IEmbeddedWorkOrder;
  tasksData?: IEmbeddedTask[];

  // Content
  location?: string;
  weather?: string;
  equipment?: string[];

  // Time Tracking
  reportDate: Date;
  startTime?: Date;
  endTime?: Date;
  totalHours?: number;
  timeEntries: IReportTimeEntry[];

  // Materials & Costs
  materialsUsed: IReportMaterialUsage[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalCost: number;

  // Documentation
  attachments: IReportAttachment[];
  signatures: IReportSignature[];
  photos: IReportAttachment[];

  // Quality & Safety
  qualityChecks: {
    item: string;
    status: "pass" | "fail" | "n/a";
    notes?: string;
  }[];

  safetyIncidents: {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
    actionTaken: string;
    reportedAt: Date;
  }[];

  // Client Interaction
  clientFeedback?: {
    rating: number; // 1-5
    comments?: string;
    submittedAt?: Date;
    submittedBy?: string;
  };

  clientApproval?: {
    approved: boolean;
    approvedAt?: Date;
    approvedBy?: string;
    comments?: string;
  };

  // System Fields
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId | IUser;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId | IUser;
  rejectionReason?: string;

  // Workflow
  reviewers: (mongoose.Types.ObjectId | IUser)[];
  approvalRequired: boolean;
  clientVisible: boolean;

  // Template & Automation
  templateId?: string;
  autoGenerated: boolean;
  parentReportId?: mongoose.Types.ObjectId | IReport;

  // Metadata
  tags: string[];
  customFields: Map<string, any>;
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const ReportAttachmentSchema: Schema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // Embedded user data for historical purposes
  uploadedByData: {
    _id: { type: String },
    name: { type: String },
    email: { type: String },
  },
});

const ReportTimeEntrySchema: Schema = new Schema({
  description: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // calculated in minutes
  taskId: { type: Schema.Types.ObjectId, ref: "Task" },
  // Embedded task data for historical purposes
  taskData: {
    _id: { type: String },
    name: { type: String },
    description: { type: String },
    status: { type: String },
    priority: { type: String },
  },
  category: {
    type: String,
    enum: ["labor", "travel", "waiting", "equipment", "other"],
    default: "labor",
  },
});

const ReportMaterialUsageSchema: Schema = new Schema({
  materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true },
  // Enhanced material data for historical purposes
  material: {
    _id: { type: String },
    name: { type: String, required: true },
    sku: { type: String },
    unit: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    supplier: { type: String },
    // Store the cost at the time of report creation
    unitCostAtTime: { type: Number, required: true },
  },
  quantityUsed: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
  notes: { type: String },
});

const ReportSignatureSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ["technician", "client", "supervisor", "inspector"],
    required: true,
  },
  signatureData: { type: String, required: true }, // Base64 encoded
  signerName: { type: String, required: true },
  signerTitle: { type: String },
  signerEmail: { type: String },
  signedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

const QualityCheckSchema: Schema = new Schema(
  {
    item: { type: String, required: true },
    status: { type: String, enum: ["pass", "fail", "n/a"], required: true },
    notes: { type: String },
  },
  { _id: true },
);

const SafetyIncidentSchema: Schema = new Schema(
  {
    type: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
    actionTaken: { type: String, required: true },
    reportedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

// Embedded data schemas for historical preservation
const EmbeddedUserSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String },
    department: { type: String },
    phone: { type: String },
  },
  { _id: false },
);

const EmbeddedClientSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    company: { type: String },
    email: { type: String },
    phone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
    },
    contactPerson: { type: String },
    billingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
    },
  },
  { _id: false },
);

const EmbeddedWorkOrderSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    number: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, required: true },
    priority: { type: String, required: true },
    startDate: { type: Date },
    dueDate: { type: Date },
    estimatedHours: { type: Number },
    actualHours: { type: Number },
    location: { type: String },
    clientId: { type: String, required: true },
    assignedTo: { type: String },
    createdBy: { type: String, required: true },
  },
  { _id: false },
);

const EmbeddedTaskSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, required: true },
    priority: { type: String, required: true },
    estimatedHours: { type: Number },
    actualHours: { type: Number },
    startDate: { type: Date },
    dueDate: { type: Date },
    assignedTo: { type: String },
    workOrderId: { type: String },
    createdBy: { type: String, required: true },
  },
  { _id: false },
);

const ReportSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // Basic Info
    type: {
      type: String,
      enum: [
        "daily",
        "weekly",
        "monthly",
        "incident",
        "maintenance",
        "inspection",
        "completion",
        "safety",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "published",
      ],
      default: "draft",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },

    // Relations
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      index: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
      index: true,
    },
    taskIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    // Embedded data for historical preservation (immutable once set)
    createdByData: { type: EmbeddedUserSchema },
    assignedToData: { type: EmbeddedUserSchema },
    clientData: { type: EmbeddedClientSchema },
    workOrderData: { type: EmbeddedWorkOrderSchema },
    tasksData: [EmbeddedTaskSchema],

    // Content
    location: { type: String, trim: true },
    weather: { type: String, trim: true },
    equipment: [{ type: String, trim: true }],

    // Time Tracking
    reportDate: { type: Date, required: true, index: true },
    startTime: { type: Date },
    endTime: { type: Date },
    totalHours: { type: Number, min: 0 },
    timeEntries: [ReportTimeEntrySchema],

    // Materials & Costs
    materialsUsed: [ReportMaterialUsageSchema],
    totalMaterialCost: { type: Number, default: 0, min: 0 },
    totalLaborCost: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },

    // Documentation
    attachments: [ReportAttachmentSchema],
    signatures: [ReportSignatureSchema],
    photos: [ReportAttachmentSchema],

    // Quality & Safety
    qualityChecks: [QualityCheckSchema],
    safetyIncidents: [SafetyIncidentSchema],

    // Client Interaction
    clientFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: { type: String },
      submittedAt: { type: Date },
      submittedBy: { type: String },
    },

    clientApproval: {
      approved: { type: Boolean },
      approvedAt: { type: Date },
      approvedBy: { type: String },
      comments: { type: String },
    },

    // System Fields
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },

    // Workflow
    reviewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    approvalRequired: { type: Boolean, default: true },
    clientVisible: { type: Boolean, default: true },

    // Template & Automation
    templateId: { type: String },
    autoGenerated: { type: Boolean, default: false },
    parentReportId: { type: Schema.Types.ObjectId, ref: "Report" },

    // Metadata
    tags: [{ type: String, trim: true }],
    customFields: { type: Map, of: Schema.Types.Mixed, default: new Map() },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

// ----------------------------------------------------------------------

// Compound indexes for better performance
ReportSchema.index({ tenantId: 1, createdBy: 1 });
ReportSchema.index({ tenantId: 1, clientId: 1 });
ReportSchema.index({ tenantId: 1, workOrderId: 1 });
ReportSchema.index({ tenantId: 1, status: 1 });
ReportSchema.index({ tenantId: 1, type: 1 });
ReportSchema.index({ tenantId: 1, reportDate: 1 });
ReportSchema.index({ createdAt: 1 });
ReportSchema.index({ reportDate: 1, createdAt: 1 });

// Text index for search functionality
ReportSchema.index({
  location: "text",
  tags: "text",
});

// Pre-save middleware to calculate costs
ReportSchema.pre("save", async function (this: IReport) {
  // Calculate total material cost
  this.totalMaterialCost = this.materialsUsed.reduce(
    (sum, material) => sum + material.totalCost,
    0,
  );

  // Calculate total hours from time entries
  this.totalHours = this.timeEntries.reduce(
    (sum, entry) => sum + entry.duration / 60,
    0,
  );

  // Calculate total labor cost from time entries
  // If totalLaborCost is not already set (e.g., from report creation), calculate it
  if (this.totalLaborCost === 0 && this.timeEntries.length > 0) {
    // Use a default hourly rate as fallback
    const defaultHourlyRate = 50; // Default rate per hour
    this.totalLaborCost = this.totalHours * defaultHourlyRate;
  }

  // Calculate total cost (materials + labor + other costs)
  this.totalCost = this.totalMaterialCost + this.totalLaborCost;

  // Update version on modification
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
});

// Virtual for formatted total cost
ReportSchema.virtual("formattedTotalCost").get(function (this: IReport) {
  return `$${this.totalCost.toFixed(2)}`;
});

// Virtual for report age
ReportSchema.virtual("ageInDays").get(function (this: IReport) {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
  );
});

// Middleware to populate embedded data before saving
ReportSchema.pre("save", async function (this: IReport) {
  // Only populate embedded data if it's not already set (immutable once set)
  if (this.isNew || this.isModified("createdBy")) {
    if (!this.createdByData && this.createdBy) {
      try {
        const User = mongoose.model("User");
        const user = await User.findById(this.createdBy).select(
          "firstName lastName email role phone",
        );
        if (user) {
          this.createdByData = {
            _id: user._id.toString(),
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            department: user.department || "",
            phone: user.phone,
          };
        }
      } catch (error) {
        console.error("Error populating createdByData:", error);
      }
    }
  }

  if (this.isNew || this.isModified("assignedTo")) {
    if (!this.assignedToData && this.assignedTo) {
      try {
        const User = mongoose.model("User");
        const user = await User.findById(this.assignedTo).select(
          "firstName lastName email role phone",
        );
        if (user) {
          this.assignedToData = {
            _id: user._id.toString(),
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            department: user.department || "",
            phone: user.phone,
          };
        }
      } catch (error) {
        console.error("Error populating assignedToData:", error);
      }
    }
  }

  if (this.isNew || this.isModified("clientId")) {
    if (!this.clientData && this.clientId) {
      try {
        const Client = mongoose.model("Client");
        const client = await Client.findById(this.clientId);
        if (client) {
          this.clientData = {
            _id: client._id.toString(),
            name: client.name,
            company: client.company,
            email: client.email,
            phone: client.phone,
            address: client.address,
            contactPerson: client.contactPerson,
            billingAddress: client.billingAddress,
          };
        }
      } catch (error) {
        console.error("Error populating clientData:", error);
      }
    }
  }

  if (this.isNew || this.isModified("workOrderId")) {
    if (!this.workOrderData && this.workOrderId) {
      try {
        const WorkOrder = mongoose.model("WorkOrder");
        const workOrder = await WorkOrder.findById(this.workOrderId);
        if (workOrder) {
          this.workOrderData = {
            _id: workOrder._id.toString(),
            number: workOrder.number,
            title: workOrder.title,
            description: workOrder.description,
            status: workOrder.status,
            priority: workOrder.priority,
            startDate: workOrder.startDate,
            dueDate: workOrder.dueDate,
            estimatedHours: workOrder.estimatedHours,
            actualHours: workOrder.actualHours,
            location: workOrder.location,
            clientId: workOrder.clientId.toString(),
            assignedTo: workOrder.assignedTo?.toString(),
            createdBy: workOrder.createdBy.toString(),
          };
        }
      } catch (error) {
        console.error("Error populating workOrderData:", error);
      }
    }
  }

  if (this.isNew || this.isModified("taskIds")) {
    if (!this.tasksData || this.tasksData.length === 0) {
      if (this.taskIds && this.taskIds.length > 0) {
        try {
          const Task = mongoose.model("Task");
          const tasks = await Task.find({ _id: { $in: this.taskIds } });
          this.tasksData = tasks.map((task) => ({
            _id: task._id.toString(),
            name: task.title, // Use title field from Task model
            description: task.description,
            status: task.status || task.columnId,
            priority: task.priority,
            estimatedHours: task.estimatedHours,
            actualHours: task.actualHours,
            startDate: task.startDate,
            dueDate: task.dueDate,
            assignedTo: task.assignees?.join(",") || "",
            workOrderId: task.workOrderId?.toString(),
            createdBy: task.createdBy.toString(),
          }));
        } catch (error) {
          console.error("Error populating tasksData:", error);
        }
      }
    }
  }

  // Populate embedded data for materials
  if (this.isNew || this.isModified("materialsUsed")) {
    for (const materialUsage of this.materialsUsed) {
      if (
        !materialUsage.material._id ||
        !materialUsage.material.unitCostAtTime
      ) {
        try {
          const Material = mongoose.model("Material");
          const material = await Material.findById(materialUsage.materialId);
          if (material) {
            materialUsage.material._id = material._id.toString();
            materialUsage.material.name = material.name;
            materialUsage.material.sku = material.sku;
            materialUsage.material.unit = material.unit;
            materialUsage.material.description = material.description;
            materialUsage.material.category = material.category;
            materialUsage.material.supplier = material.supplier;
            materialUsage.material.unitCostAtTime = material.unitCost || 0;
          }
        } catch (error) {
          console.error("Error populating material data:", error);
        }
      }
    }
  }

  // Populate embedded data for time entries
  if (this.isNew || this.isModified("timeEntries")) {
    for (const timeEntry of this.timeEntries) {
      if (timeEntry.taskId && !timeEntry.taskData) {
        try {
          const Task = mongoose.model("Task");
          const task = await Task.findById(timeEntry.taskId);
          if (task) {
            timeEntry.taskData = {
              _id: task._id.toString(),
              name: task.name,
              description: task.description,
              status: task.status,
              priority: task.priority,
            };
          }
        } catch (error) {
          console.error("Error populating task data for time entry:", error);
        }
      }
    }
  }

  // Populate embedded data for attachments
  if (this.isNew || this.isModified("attachments")) {
    for (const attachment of this.attachments) {
      if (attachment.uploadedBy && !attachment.uploadedByData) {
        try {
          const User = mongoose.model("User");
          const user = await User.findById(attachment.uploadedBy).select(
            "name email",
          );
          if (user) {
            attachment.uploadedByData = {
              _id: user._id.toString(),
              name: user.name,
              email: user.email,
            };
          }
        } catch (error) {
          console.error("Error populating uploadedByData:", error);
        }
      }
    }
  }
});

export const Report =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
