import type { INotification, ITask, IUser } from '../models';
import { Notification, User, Task, Personnel } from '../models';

// ----------------------------------------------------------------------

export interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  type: INotification['type'];
  title: string;
  message?: string;
  category?: INotification['category'];
  relatedEntity: INotification['relatedEntity'];
  metadata?: INotification['metadata'];
  createdBy: string;
}

export interface TaskUpdateContext {
  task: ITask;
  previousTask?: Partial<ITask>;
  updatedBy: string;
  changes: string[];
}

// ----------------------------------------------------------------------

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(params: CreateNotificationParams): Promise<INotification> {
    try {

      const notification = new Notification({
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        category: params.category || 'task',
        relatedEntity: params.relatedEntity,
        metadata: params.metadata,
        createdBy: params.createdBy,
        isRead: false,
        isArchived: false,
      });

      const savedNotification = await notification.save();
      console.log(`✅ Created ${params.type} notification for user ${params.userId}: "${params.title}"`);
      return savedNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for task creation
   */
  static async notifyTaskCreated(task: ITask, createdBy: string): Promise<void> {
    const recipients = await this.getTaskNotificationRecipients(task, createdBy);

    const notificationPromises = recipients.map(userId =>
      this.createNotification({
        tenantId: task.tenantId,
        userId,
        type: 'task_created',
        title: `New task created: ${task.title}`,
        message: `A new task "${task.title}" has been created${task.workOrderTitle ? ` for work order: ${task.workOrderTitle}` : ''}.`,
        relatedEntity: {
          entityType: 'task',
          entityId: task._id,
          entityTitle: task.title,
        },
        metadata: {
          taskId: task._id,
          workOrderId: task.workOrderId,
          projectId: task.projectId,
          reporterId: task.createdBy,
        },
        createdBy,
      })
    );

    await Promise.all(notificationPromises);
  }

  /**
   * Create notifications for task updates
   */
  static async notifyTaskUpdated(context: TaskUpdateContext): Promise<void> {
    const { task, previousTask, updatedBy, changes } = context;
    const recipients = await this.getTaskNotificationRecipients(task, updatedBy);

    if (recipients.length === 0 || changes.length === 0) {
      return;
    }

    const changeDescription = this.generateChangeDescription(changes, task, previousTask);
    
    const notificationPromises = recipients.map(userId =>
      this.createNotification({
        tenantId: task.tenantId,
        userId,
        type: 'task_updated',
        title: `Task updated: ${task.title}`,
        message: `The task "${task.title}" has been updated. ${changeDescription}`,
        relatedEntity: {
          entityType: 'task',
          entityId: task._id,
          entityTitle: task.title,
        },
        metadata: {
          taskId: task._id,
          workOrderId: task.workOrderId,
          projectId: task.projectId,
          changes,
          reporterId: task.createdBy,
        },
        createdBy: updatedBy,
      })
    );

    await Promise.all(notificationPromises);
  }

  /**
   * Create notifications for task assignment changes
   */
  static async notifyTaskAssigned(
    task: ITask, 
    newAssignees: string[], 
    previousAssignees: string[] = [],
    assignedBy: string
  ): Promise<void> {
    console.log('🔔 notifyTaskAssigned called with:', {
      taskId: task._id,
      taskTitle: task.title,
      newAssignees,
      previousAssignees,
      assignedBy,
      tenantId: task.tenantId
    });
    const addedAssignees = newAssignees.filter(id => !previousAssignees.includes(id));
    const removedAssignees = previousAssignees.filter(id => !newAssignees.includes(id));

    // Convert Personnel IDs to User IDs for newly assigned personnel
    let addedUserIds: string[] = [];
    if (addedAssignees.length > 0) {
      console.log('🔍 Looking up personnel for IDs:', addedAssignees);
      try {
        const personnel = await Personnel.find({
          _id: { $in: addedAssignees },
          tenantId: task.tenantId,
          isActive: true,
        }).select('userId').lean();

        console.log('👥 Found personnel records:', personnel);
        addedUserIds = personnel.map((p: any) => p.userId.toString()).filter(Boolean);
        console.log('🎯 Converted to User IDs:', addedUserIds);
      } catch (error) {
        console.error('Error converting added Personnel IDs to User IDs:', error);
      }
    }

    // Get assigner name for better notification message
    let assignerName = 'Someone';
    try {
      const assigner = await User.findById(assignedBy).select('firstName lastName').lean() as any;
      if (assigner) {
        assignerName = `${assigner.firstName || ''} ${assigner.lastName || ''}`.trim() || 'Someone';
      }
    } catch (error) {
      console.error('Error fetching assigner name:', error);
    }

    // Notify newly assigned users
    const assignmentPromises = addedUserIds.map(userId =>
      this.createNotification({
        tenantId: task.tenantId,
        userId,
        type: 'task_assigned',
        title: `You've been assigned to: ${task.title}`,
        message: `${assignerName} has assigned you to the task "${task.title}"${task.workOrderTitle ? ` for work order: ${task.workOrderTitle}` : ''}.`,
        relatedEntity: {
          entityType: 'task',
          entityId: task._id,
          entityTitle: task.title,
        },
        metadata: {
          taskId: task._id,
          workOrderId: task.workOrderId,
          projectId: task.projectId,
          assignerId: assignedBy,
          reporterId: task.createdBy,
        },
        createdBy: assignedBy,
      })
    );

    // Notify task reporter about assignment changes
    if (task.createdBy !== assignedBy) {
      const reporterNotificationPromise = this.createNotification({
        tenantId: task.tenantId,
        userId: task.createdBy,
        type: 'task_updated',
        title: `Task assignment changed: ${task.title}`,
        message: `The assignment for task "${task.title}" has been updated. ${addedAssignees.length ? `${addedAssignees.length} new assignee(s) added.` : ''} ${removedAssignees.length ? `${removedAssignees.length} assignee(s) removed.` : ''}`,
        relatedEntity: {
          entityType: 'task',
          entityId: task._id,
          entityTitle: task.title,
        },
        metadata: {
          taskId: task._id,
          workOrderId: task.workOrderId,
          projectId: task.projectId,
          assignerId: assignedBy,
          changes: ['assignees'],
        },
        createdBy: assignedBy,
      });

      assignmentPromises.push(reporterNotificationPromise);
    }

    await Promise.all(assignmentPromises);
  }

  /**
   * Create notifications for task completion
   */
  static async notifyTaskCompleted(task: ITask, completedBy: string): Promise<void> {
    const recipients = await this.getTaskNotificationRecipients(task, completedBy);

    const notificationPromises = recipients.map(userId =>
      this.createNotification({
        tenantId: task.tenantId,
        userId,
        type: 'task_completed',
        title: `Task completed: ${task.title}`,
        message: `The task "${task.title}" has been marked as completed.`,
        relatedEntity: {
          entityType: 'task',
          entityId: task._id,
          entityTitle: task.title,
        },
        metadata: {
          taskId: task._id,
          workOrderId: task.workOrderId,
          projectId: task.projectId,
          reporterId: task.createdBy,
        },
        createdBy: completedBy,
      })
    );

    await Promise.all(notificationPromises);
  }

  /**
   * Get users who should receive notifications for a task
   */
  private static async getTaskNotificationRecipients(
    task: ITask, 
    excludeUserId?: string
  ): Promise<string[]> {
    const recipients = new Set<string>();

    // Add task reporter (creator) - this is already a User ID
    if (task.createdBy && task.createdBy !== excludeUserId) {
      recipients.add(task.createdBy);
    }

    // Add assignees - these are Personnel IDs, need to convert to User IDs
    if (task.assignees && task.assignees.length > 0) {
      try {
        const personnel = await Personnel.find({
          _id: { $in: task.assignees },
          tenantId: task.tenantId,
          isActive: true,
        }).select('userId').lean();

        personnel.forEach((p: any) => {
          if (p.userId && p.userId.toString() !== excludeUserId) {
            recipients.add(p.userId.toString());
          }
        });
      } catch (error) {
        console.error('Error converting Personnel IDs to User IDs:', error);
      }
    }

    return Array.from(recipients);
  }

  /**
   * Generate human-readable change description
   */
  private static generateChangeDescription(
    changes: string[], 
    task: ITask, 
    previousTask?: Partial<ITask>
  ): string {
    const descriptions: string[] = [];

    if (changes.includes('title') && previousTask?.title) {
      descriptions.push(`Title changed from "${previousTask.title}" to "${task.title}"`);
    }

    if (changes.includes('description')) {
      descriptions.push('Description updated');
    }

    if (changes.includes('priority') && previousTask?.priority) {
      descriptions.push(`Priority changed from "${previousTask.priority}" to "${task.priority}"`);
    }

    if (changes.includes('columnId')) {
      descriptions.push('Status changed');
    }

    if (changes.includes('dueDate')) {
      if (task.dueDate && previousTask?.dueDate) {
        descriptions.push(`Due date changed`);
      } else if (task.dueDate) {
        descriptions.push('Due date added');
      } else {
        descriptions.push('Due date removed');
      }
    }

    if (changes.includes('assignees')) {
      descriptions.push('Assignees updated');
    }

    return descriptions.length > 0 ? descriptions.join(', ') + '.' : 'Task details updated.';
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    tenantId: string,
    userId: string,
    options: {
      isRead?: boolean;
      isArchived?: boolean;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<INotification[]> {
    const query: any = { tenantId, userId };

    if (options.isRead !== undefined) {
      query.isRead = options.isRead;
    }

    if (options.isArchived !== undefined) {
      query.isArchived = options.isArchived;
    }

    console.log('🔍 NotificationService.getUserNotifications query:', {
      query,
      options: { limit: options.limit || 50, skip: options.skip || 0 }
    });

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .exec();

    console.log(`📊 Database query returned ${notifications.length} notifications`);
    
    // Let's also check if there are ANY notifications for this user at all
    const totalCount = await Notification.countDocuments({ tenantId, userId });
    console.log(`📊 Total notifications in DB for user ${userId}: ${totalCount}`);

    return notifications;
  }

  /**
   * Mark notification(s) as read
   */
  static async markAsRead(
    tenantId: string,
    userId: string,
    notificationIds?: string[]
  ): Promise<void> {
    const query: any = { tenantId, userId, isRead: false };
    
    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }

    await Notification.updateMany(query, { isRead: true, updatedAt: new Date() });
  }

  /**
   * Archive notification(s)
   */
  static async archiveNotifications(
    tenantId: string,
    userId: string,
    notificationIds?: string[]
  ): Promise<void> {
    const query: any = { tenantId, userId };
    
    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }

    await Notification.updateMany(query, { 
      isArchived: true, 
      isRead: true, 
      updatedAt: new Date() 
    });
  }

  /**
   * Get notification counts for a user
   */
  static async getNotificationCounts(
    tenantId: string,
    userId: string
  ): Promise<{ total: number; unread: number; archived: number }> {
    const [total, unread, archived] = await Promise.all([
      Notification.countDocuments({ tenantId, userId, isArchived: false }),
      Notification.countDocuments({ tenantId, userId, isRead: false, isArchived: false }),
      Notification.countDocuments({ tenantId, userId, isArchived: true }),
    ]);

    return { total, unread, archived };
  }
}