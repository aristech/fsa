import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtask extends Document {
  _id: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  completed: boolean;
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  tenantId: mongoose.Types.ObjectId;
}

const SubtaskSchema = new Schema<ISubtask>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
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
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
SubtaskSchema.index({ taskId: 1, tenantId: 1 });
SubtaskSchema.index({ taskId: 1, completed: 1 });

export const Subtask = mongoose.model<ISubtask>('Subtask', SubtaskSchema);
