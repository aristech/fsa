import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface ICheckInSession extends Document {
  _id: string;
  tenantId: string;
  taskId: string;
  workOrderId?: string;
  personnelId: string;
  userId: string; // User who checked in
  checkInTime: Date;
  notes?: string;
  isActive: boolean;
  // Metadata for recovery
  clientSessionId?: string; // Browser session identifier
  lastHeartbeat?: Date; // For detecting stale sessions
  autoCheckoutAfter?: Date; // Auto-checkout time if configured
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface ICheckInSessionModel extends Model<ICheckInSession> {
  findActiveSession(
    tenantId: string,
    taskId: string,
    personnelId: string
  ): Promise<ICheckInSession | null>;

  findActiveSessionsForUser(
    tenantId: string,
    personnelId: string
  ): Promise<ICheckInSession[]>;

  cleanupStaleSessions(staleDurationMinutes?: number): Promise<number>;
}

const CheckInSessionSchema = new Schema<ICheckInSession>(
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
    userId: { type: String, required: true, index: true, ref: "User" },
    checkInTime: { type: Date, required: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    // Recovery metadata
    clientSessionId: { type: String }, // Browser fingerprint/session ID
    lastHeartbeat: { type: Date, default: Date.now },
    autoCheckoutAfter: { type: Date }, // Optional auto-checkout
  },
  {
    timestamps: true,
    // Ensure only one active session per user per task
    index: [
      { tenantId: 1, taskId: 1, personnelId: 1, isActive: 1 },
      { tenantId: 1, personnelId: 1, isActive: 1 }, // All active sessions for a user
      { tenantId: 1, taskId: 1, isActive: 1 }, // All active sessions for a task
      { lastHeartbeat: 1, isActive: 1 }, // For cleanup of stale sessions
    ]
  }
);

// Compound unique index: only one active session per user per task
CheckInSessionSchema.index(
  { tenantId: 1, taskId: 1, personnelId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

// Virtual for session duration
CheckInSessionSchema.virtual('duration').get(function() {
  if (!this.checkInTime) return 0;
  const now = new Date();
  return Math.max(0, now.getTime() - this.checkInTime.getTime());
});

// Virtual for hours worked
CheckInSessionSchema.virtual('hoursWorked').get(function() {
  return this.duration / (1000 * 60 * 60);
});

// Method to check if session is stale (no heartbeat for X minutes)
CheckInSessionSchema.methods.isStale = function(staleDurationMinutes = 30) {
  if (!this.lastHeartbeat) return true;
  const staleThreshold = new Date(Date.now() - staleDurationMinutes * 60 * 1000);
  return this.lastHeartbeat < staleThreshold;
};

// Method to update heartbeat
CheckInSessionSchema.methods.updateHeartbeat = function() {
  this.lastHeartbeat = new Date();
  return this.save();
};

// Static method to find active session for user/task
CheckInSessionSchema.statics.findActiveSession = function(
  tenantId: string,
  taskId: string,
  personnelId: string
) {
  return this.findOne({
    tenantId,
    taskId,
    personnelId,
    isActive: true,
  });
};

// Static method to find all active sessions for a user
CheckInSessionSchema.statics.findActiveSessionsForUser = function(
  tenantId: string,
  personnelId: string
) {
  return this.find({
    tenantId,
    personnelId,
    isActive: true,
  }).populate('taskId', 'title name');
};

// Static method to cleanup stale sessions
CheckInSessionSchema.statics.cleanupStaleSessions = async function(
  staleDurationMinutes = 30
) {
  const staleThreshold = new Date(Date.now() - staleDurationMinutes * 60 * 1000);

  const staleSessions = await this.find({
    isActive: true,
    lastHeartbeat: { $lt: staleThreshold },
  });

  // Mark as inactive but don't delete (for audit trail)
  await this.updateMany(
    {
      isActive: true,
      lastHeartbeat: { $lt: staleThreshold },
    },
    {
      $set: {
        isActive: false,
        notes: 'Auto-closed due to inactivity',
      },
    }
  );

  return staleSessions.length;
};

export const CheckInSession =
  (mongoose.models.CheckInSession as ICheckInSessionModel) ||
  mongoose.model<ICheckInSession, ICheckInSessionModel>("CheckInSession", CheckInSessionSchema);