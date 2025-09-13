import type { Document } from 'mongoose';
import type { ITenant } from './Tenant';
import type { ITask } from './Task';
import type { IMaterial } from './Material';
import type { IUser } from './User';

import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface ITaskMaterial extends Document {
  _id: string;
  tenantId: mongoose.Types.ObjectId | ITenant;
  taskId: mongoose.Types.ObjectId | ITask;
  materialId: mongoose.Types.ObjectId | IMaterial;
  quantity: number;
  unitCost: number;
  totalCost: number;
  addedBy: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const TaskMaterialSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: [0, 'Unit cost must be non-negative'],
      default: 0,
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost must be non-negative'],
      default: 0,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------

// Compound indexes for better performance
TaskMaterialSchema.index({ tenantId: 1, taskId: 1 });
TaskMaterialSchema.index({ tenantId: 1, materialId: 1 });
TaskMaterialSchema.index({ taskId: 1, materialId: 1 }, { unique: true });

// Pre-save middleware to calculate total cost
TaskMaterialSchema.pre('save', function (this: ITaskMaterial) {
  this.totalCost = this.quantity * this.unitCost;
});

// Pre-update middleware to recalculate total cost when quantity or unitCost changes
TaskMaterialSchema.pre(['updateOne', 'findOneAndUpdate'], function () {
  const update = this.getUpdate() as any;
  if (update.$set) {
    const { quantity, unitCost } = update.$set;
    if (quantity !== undefined || unitCost !== undefined) {
      // Get the current document to calculate new total
      const currentQuantity = quantity !== undefined ? quantity : (this as any).quantity;
      const currentUnitCost = unitCost !== undefined ? unitCost : (this as any).unitCost;
      update.$set.totalCost = currentQuantity * currentUnitCost;
    }
  }
});

export const TaskMaterial =
  mongoose.models.TaskMaterial || mongoose.model<ITaskMaterial>('TaskMaterial', TaskMaterialSchema);