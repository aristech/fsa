import { WorkOrderTimeline, User, Personnel } from '../models';
import type { IWorkOrderTimelineEntry } from '../models/WorkOrderTimeline';

export interface TimelineEventData {
  workOrderId: string;
  entityType: 'work_order' | 'task';
  entityId?: string;
  eventType: IWorkOrderTimelineEntry['eventType'];
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  userId: string;
  tenantId: string;
  timestamp?: Date;
}

export class WorkOrderTimelineService {
  /**
   * Add a new timeline entry
   */
  static async addTimelineEntry(data: TimelineEventData): Promise<IWorkOrderTimelineEntry | null> {
    try {
      // Get user information for display
      const user = await User.findById(data.userId).select('firstName lastName avatar');
      const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown User';
      const userAvatar = user?.avatar;

      const timelineEntry = new WorkOrderTimeline({
        tenantId: data.tenantId,
        workOrderId: data.workOrderId,
        entityType: data.entityType,
        entityId: data.entityId,
        eventType: data.eventType,
        title: data.title,
        description: data.description,
        metadata: data.metadata || {},
        userId: data.userId,
        userName,
        userAvatar,
        timestamp: data.timestamp || new Date(),
      });

      await timelineEntry.save();
      return timelineEntry;
    } catch (error) {
      console.error('Error adding timeline entry:', error);
      return null;
    }
  }

  /**
   * Get timeline entries for a work order
   */
  static async getWorkOrderTimeline(
    workOrderId: string,
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      entityType?: 'work_order' | 'task';
    } = {}
  ): Promise<IWorkOrderTimelineEntry[]> {
    try {
      const { limit = 50, offset = 0, entityType } = options;

      const filter: any = {
        workOrderId,
        tenantId,
      };

      if (entityType) {
        filter.entityType = entityType;
      }

      const timeline = await WorkOrderTimeline.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return timeline;
    } catch (error) {
      console.error('Error fetching work order timeline:', error);
      return [];
    }
  }

  /**
   * Helper methods for common timeline events
   */

  static async logWorkOrderCreated(workOrderId: string, title: string, userId: string, tenantId: string) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'work_order',
      eventType: 'created',
      title: `Work order "${title}" was created`,
      userId,
      tenantId,
    });
  }

  static async logWorkOrderStatusChanged(
    workOrderId: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
    tenantId: string
  ) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'work_order',
      eventType: 'status_changed',
      title: `Status changed from "${oldStatus}" to "${newStatus}"`,
      metadata: { oldValue: oldStatus, newValue: newStatus, fieldName: 'status' },
      userId,
      tenantId,
    });
  }

  static async logWorkOrderAssigned(
    workOrderId: string,
    assigneeNames: string[],
    userId: string,
    tenantId: string
  ) {
    const names = assigneeNames.join(', ');
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'work_order',
      eventType: 'assigned',
      title: `Assigned to ${names}`,
      metadata: { assigneeNames },
      userId,
      tenantId,
    });
  }

  static async logWorkOrderPriorityChanged(
    workOrderId: string,
    oldPriority: string,
    newPriority: string,
    userId: string,
    tenantId: string
  ) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'work_order',
      eventType: 'priority_changed',
      title: `Priority changed from "${oldPriority}" to "${newPriority}"`,
      metadata: { oldValue: oldPriority, newValue: newPriority, fieldName: 'priority' },
      userId,
      tenantId,
    });
  }

  static async logWorkOrderProgressUpdated(
    workOrderId: string,
    oldProgress: number,
    newProgress: number,
    userId: string,
    tenantId: string
  ) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'work_order',
      eventType: 'progress_updated',
      title: `Progress updated from ${oldProgress}% to ${newProgress}%`,
      metadata: { oldValue: oldProgress, newValue: newProgress, fieldName: 'progress' },
      userId,
      tenantId,
    });
  }

  static async logTaskCreated(
    workOrderId: string,
    taskId: string,
    taskTitle: string,
    userId: string,
    tenantId: string
  ) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'task',
      entityId: taskId,
      eventType: 'created',
      title: `Task "${taskTitle}" was created`,
      metadata: { taskTitle, taskId },
      userId,
      tenantId,
    });
  }

  static async logTaskStatusChanged(
    workOrderId: string,
    taskId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
    tenantId: string
  ) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'task',
      entityId: taskId,
      eventType: 'status_changed',
      title: `Task "${taskTitle}" status changed from "${oldStatus}" to "${newStatus}"`,
      metadata: { taskTitle, taskId, oldValue: oldStatus, newValue: newStatus, fieldName: 'status' },
      userId,
      tenantId,
    });
  }

  static async logTaskAssigned(
    workOrderId: string,
    taskId: string,
    taskTitle: string,
    assigneeNames: string[],
    userId: string,
    tenantId: string
  ) {
    const names = assigneeNames.join(', ');
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'task',
      entityId: taskId,
      eventType: 'assigned',
      title: `Task "${taskTitle}" assigned to ${names}`,
      metadata: { taskTitle, taskId, assigneeNames },
      userId,
      tenantId,
    });
  }

  static async logTaskCompleted(
    workOrderId: string,
    taskId: string,
    taskTitle: string,
    userId: string,
    tenantId: string
  ) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'task',
      entityId: taskId,
      eventType: 'completed',
      title: `Task "${taskTitle}" was completed`,
      metadata: { taskTitle, taskId },
      userId,
      tenantId,
    });
  }

  static async logTaskPriorityChanged(
    workOrderId: string,
    taskId: string,
    taskTitle: string,
    oldPriority: string,
    newPriority: string,
    userId: string,
    tenantId: string
  ) {
    return this.addTimelineEntry({
      workOrderId,
      entityType: 'task',
      entityId: taskId,
      eventType: 'priority_changed',
      title: `Task "${taskTitle}" priority changed from "${oldPriority}" to "${newPriority}"`,
      metadata: { taskTitle, taskId, oldValue: oldPriority, newValue: newPriority, fieldName: 'priority' },
      userId,
      tenantId,
    });
  }

  /**
   * Clean up timeline entries when entities are deleted
   */
  static async cleanupTimelineEntries(workOrderId: string, tenantId: string): Promise<void> {
    try {
      await WorkOrderTimeline.deleteMany({ workOrderId, tenantId });
    } catch (error) {
      console.error('Error cleaning up timeline entries:', error);
    }
  }

  static async cleanupTaskTimelineEntries(taskId: string, tenantId: string): Promise<void> {
    try {
      await WorkOrderTimeline.deleteMany({ entityId: taskId, entityType: 'task', tenantId });
    } catch (error) {
      console.error('Error cleaning up task timeline entries:', error);
    }
  }
}