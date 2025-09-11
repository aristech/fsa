import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface INotification extends Document {
  _id: string;
  tenantId: string;
  userId: string; // The user who should receive this notification
  type: 'task_created' | 'task_updated' | 'task_assigned' | 'task_completed' | 'task_deleted' | 'time_logged' | 'time_updated';
  title: string;
  message?: string;
  category: 'task' | 'system' | 'reminder';
  relatedEntity: {
    entityType: 'task' | 'workorder' | 'project';
    entityId: string;
    entityTitle?: string;
  };
  metadata?: {
    taskId?: string;
    workOrderId?: string;
    projectId?: string;
    changes?: string[]; // Array of changed fields for update notifications
    assignerId?: string; // User who made the assignment
    reporterId?: string; // Task reporter
  };
  isRead: boolean;
  isArchived: boolean;
  createdBy: string; // User who triggered this notification
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const NotificationSchema = new Schema<INotification>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: ['task_created', 'task_updated', 'task_assigned', 'task_completed', 'task_deleted', 'time_logged', 'time_updated'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['task', 'system', 'reminder'],
      default: 'task',
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['task', 'workorder', 'project'],
        required: true,
      },
      entityId: {
        type: String,
        required: true,
      },
      entityTitle: {
        type: String,
        trim: true,
      },
    },
    metadata: {
      taskId: String,
      workOrderId: String,
      projectId: String,
      changes: [String],
      assignerId: String,
      reporterId: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
NotificationSchema.index({ tenantId: 1, userId: 1, isRead: 1 });
NotificationSchema.index({ tenantId: 1, userId: 1, isArchived: 1 });
NotificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
NotificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

export const Notification = 
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);