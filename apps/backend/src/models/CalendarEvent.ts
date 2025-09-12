import type { Document } from "mongoose";

import mongoose, { Schema } from "mongoose";
import { PRIORITY_VALUES } from "../constants/priorities";

// ----------------------------------------------------------------------

export interface ICalendarEvent extends Document {
  _id: string;
  tenantId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color?: string;
  priority?: (typeof PRIORITY_VALUES)[number];
  type: "event" | "meeting" | "deadline" | "reminder";
  location?: string;
  attendees?: string[]; // User IDs
  createdBy: string; // User ID
  clientId?: string; // Optional client reference
  projectId?: string; // Optional project reference
  workOrderId?: string; // Optional work order reference
  taskId?: string; // Optional task reference
  recurrence?: {
    frequency: "none" | "daily" | "weekly" | "monthly" | "yearly";
    interval?: number; // Every N days/weeks/months/years
    endDate?: Date;
    daysOfWeek?: number[]; // For weekly recurrence: 0=Sunday, 1=Monday, etc.
  };
  reminders?: {
    minutes: number; // Minutes before event
    method: "email" | "notification" | "popup";
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
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
    start: {
      type: Date,
      required: true,
      index: true,
    },
    end: {
      type: Date,
      required: true,
      index: true,
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: PRIORITY_VALUES,
      default: "medium",
    },
    type: {
      type: String,
      enum: ["event", "meeting", "deadline", "reminder"],
      default: "event",
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    attendees: [{
      type: String, // User IDs
    }],
    createdBy: {
      type: String,
      required: true,
    },
    clientId: {
      type: String,
      index: true,
    },
    projectId: {
      type: String,
      index: true,
    },
    workOrderId: {
      type: String,
      index: true,
    },
    taskId: {
      type: String,
      index: true,
    },
    recurrence: {
      frequency: {
        type: String,
        enum: ["none", "daily", "weekly", "monthly", "yearly"],
        default: "none",
      },
      interval: {
        type: Number,
        min: 1,
        default: 1,
      },
      endDate: Date,
      daysOfWeek: [{
        type: Number,
        min: 0,
        max: 6,
      }],
    },
    reminders: [{
      minutes: {
        type: Number,
        required: true,
        min: 0,
      },
      method: {
        type: String,
        enum: ["email", "notification", "popup"],
        required: true,
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
CalendarEventSchema.index({ tenantId: 1, start: 1, end: 1 });
CalendarEventSchema.index({ tenantId: 1, isActive: 1 });
CalendarEventSchema.index({ tenantId: 1, clientId: 1, isActive: 1 });
CalendarEventSchema.index({ tenantId: 1, createdBy: 1 });

export const CalendarEvent = mongoose.model<ICalendarEvent>(
  "CalendarEvent",
  CalendarEventSchema
);