import { model, Schema, models } from "mongoose";

// ----------------------------------------------------------------------

export interface IWorkOrderTimelineEntry {
  _id: string;
  tenantId: string;
  workOrderId: string;
  entityType: 'work_order' | 'task';
  entityId?: string; // Task ID if entityType is 'task'
  eventType:
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'assigned'
    | 'unassigned'
    | 'priority_changed'
    | 'due_date_changed'
    | 'progress_updated'
    | 'completed'
    | 'cancelled'
    | 'comment_added'
    | 'attachment_added'
    | 'attachment_removed';
  title: string; // Human-readable title for the timeline entry
  description?: string; // Optional detailed description
  metadata?: {
    oldValue?: any;
    newValue?: any;
    fieldName?: string;
    taskTitle?: string;
    taskId?: string;
    assigneeNames?: string[];
    priority?: string;
    status?: string;
    [key: string]: any;
  };
  userId: string; // User who triggered the event
  userName?: string; // Cached user name for display
  userAvatar?: string; // Cached user avatar for display
  timestamp: Date;
  createdAt: Date;
}

// ----------------------------------------------------------------------

const WorkOrderTimelineSchema = new Schema<IWorkOrderTimelineEntry>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      index: true,
    },
    workOrderId: {
      type: String,
      required: [true, "Work Order ID is required"],
      index: true,
      ref: "WorkOrder",
    },
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      enum: ['work_order', 'task'],
    },
    entityId: {
      type: String,
      index: true,
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      enum: [
        'created',
        'updated',
        'status_changed',
        'assigned',
        'unassigned',
        'priority_changed',
        'due_date_changed',
        'progress_updated',
        'completed',
        'cancelled',
        'comment_added',
        'attachment_added',
        'attachment_removed'
      ],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    userAvatar: {
      type: String,
    },
    timestamp: {
      type: Date,
      required: [true, "Timestamp is required"],
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Indexes for better performance
WorkOrderTimelineSchema.index({ workOrderId: 1, timestamp: -1 });
WorkOrderTimelineSchema.index({ tenantId: 1, workOrderId: 1, timestamp: -1 });
WorkOrderTimelineSchema.index({ entityType: 1, entityId: 1 });

// ----------------------------------------------------------------------

export const WorkOrderTimeline = models.WorkOrderTimeline || model<IWorkOrderTimelineEntry>("WorkOrderTimeline", WorkOrderTimelineSchema);