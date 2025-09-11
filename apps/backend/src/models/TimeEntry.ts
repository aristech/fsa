import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface ITimeEntry extends Document {
  _id: string;
  tenantId: string;
  taskId: string;
  workOrderId?: string;
  personnelId: string;
  date: Date; // work date
  hours: number; // fractional hours
  days?: number; // optional, derived from hours using workingDayHours
  notes?: string;
  cost?: number; // computed at entry time from hourlyRate if available
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    tenantId: { type: String, required: true, index: true },
    taskId: { type: String, required: true, index: true, ref: "Task" },
    workOrderId: { type: String, index: true, ref: "WorkOrder" },
    personnelId: {
      type: String,
      required: true,
      index: true,
      ref: "Personnel",
    },
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0 },
    days: { type: Number, min: 0 },
    notes: { type: String, trim: true },
    cost: { type: Number, min: 0 },
    createdBy: { type: String, required: true, ref: "User" },
  },
  { timestamps: true },
);

TimeEntrySchema.index({ tenantId: 1, taskId: 1, date: 1 });
TimeEntrySchema.index({ tenantId: 1, workOrderId: 1, date: 1 });
TimeEntrySchema.index({ tenantId: 1, personnelId: 1, date: 1 });

export const TimeEntry =
  mongoose.models.TimeEntry ||
  mongoose.model<ITimeEntry>("TimeEntry", TimeEntrySchema);
