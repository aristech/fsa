import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Task, ITask } from "../models/Task";
import { Tenant } from "../models/Tenant";

// Enable dayjs timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export class TimezoneAwareRecurringTaskService {
  /**
   * Get tenant timezone from database
   */
  static async getTenantTimezone(tenantId: string): Promise<string> {
    try {
      const tenant = await Tenant.findById(tenantId).select('timezone');
      return tenant?.timezone || 'UTC';
    } catch (error) {
      console.warn(`Failed to get timezone for tenant ${tenantId}:`, error);
      return 'UTC';
    }
  }

  /**
   * Calculate the next occurrence date based on repeat settings
   * NOW TIMEZONE-AWARE: Calculates in tenant's timezone
   */
  static async calculateNextOccurrence(
    baseDate: Date,
    repeatSettings: any,
    tenantId: string
  ): Promise<Date> {
    const tenantTimezone = await this.getTenantTimezone(tenantId);

    // Convert base date to tenant's timezone for calculation
    const baseDateInTenantTz = dayjs(baseDate).tz(tenantTimezone);

    let nextOccurrenceInTenantTz: dayjs.Dayjs;

    switch (repeatSettings.type) {
      case "daily":
        nextOccurrenceInTenantTz = baseDateInTenantTz.add(1, "day");
        break;
      case "weekly":
        nextOccurrenceInTenantTz = baseDateInTenantTz.add(1, "week");
        break;
      case "monthly":
        nextOccurrenceInTenantTz = baseDateInTenantTz.add(1, "month");
        break;
      case "yearly":
        nextOccurrenceInTenantTz = baseDateInTenantTz.add(1, "year");
        break;
      case "custom":
        const frequency = repeatSettings.frequency || 1;
        const unit = repeatSettings.customType || "weeks";
        nextOccurrenceInTenantTz = baseDateInTenantTz.add(frequency, unit as any);
        break;
      default:
        nextOccurrenceInTenantTz = baseDateInTenantTz.add(1, "day");
    }

    // Convert back to UTC for storage
    const nextOccurrenceUtc = nextOccurrenceInTenantTz.utc().toDate();

    console.log(`📅 Timezone-aware recurring calculation:
      Tenant: ${tenantId} (${tenantTimezone})
      Base date UTC: ${dayjs(baseDate).utc().format()}
      Base date in tenant TZ: ${baseDateInTenantTz.format()}
      Repeat type: ${repeatSettings.type}
      Next occurrence in tenant TZ: ${nextOccurrenceInTenantTz.format()}
      Next occurrence UTC (stored): ${dayjs(nextOccurrenceUtc).utc().format()}`);

    return nextOccurrenceUtc;
  }

  /**
   * Update recurring task next occurrence when task is created or updated
   */
  static async updateTaskRecurrence(taskId: string): Promise<void> {
    const task = await Task.findById(taskId);

    if (!task || !task.repeat?.enabled || !task.dueDate) {
      return;
    }

    const nextOccurrence = await this.calculateNextOccurrence(
      task.dueDate,
      task.repeat,
      task.tenantId
    );

    await Task.findByIdAndUpdate(taskId, {
      "repeat.nextOccurrence": nextOccurrence,
      "repeat.lastCreated": null,
    });

    console.log(`✅ Updated recurring task ${taskId}: next occurrence at ${dayjs(nextOccurrence).utc().format()} UTC`);
  }

  /**
   * Get all tasks that need their dates shifted for recurrence
   * Enhanced with timezone-aware logging
   */
  static async getTasksNeedingRecurrence(): Promise<ITask[]> {
    const now = new Date();

    // Find tasks where due date has passed and need shifting
    const tasksNeedingShift = await Task.find({
      "repeat.enabled": true,
      dueDate: { $lte: now },
      $or: [
        { "repeat.lastShifted": { $exists: false } },
        { "repeat.lastShifted": null },
        { $expr: { $lt: ["$repeat.lastShifted", "$dueDate"] } },
      ],
    });

    if (tasksNeedingShift.length > 0) {
      console.log(`🔄 Found ${tasksNeedingShift.length} recurring tasks needing date shift:
        Current time UTC: ${dayjs(now).utc().format()}`);

      // Log each task for debugging with timezone info
      for (const task of tasksNeedingShift) {
        const tenantTimezone = await this.getTenantTimezone(task.tenantId);
        console.log(`  - Task "${task.title}" (${task._id})
          Due: ${dayjs(task.dueDate).utc().format()} UTC (${dayjs(task.dueDate).tz(tenantTimezone).format()} ${tenantTimezone})
          Last shifted: ${task.repeat?.lastShifted ? dayjs(task.repeat.lastShifted).utc().format() : 'never'}
          Repeat: ${task.repeat?.type}
          Tenant: ${task.tenantId} (${tenantTimezone})`);
      }
    }

    return tasksNeedingShift;
  }

  /**
   * Shift task dates to next occurrence for recurring tasks
   * NOW TIMEZONE-AWARE
   */
  static async shiftRecurringTask(task: ITask): Promise<ITask | null> {
    if (!task.repeat?.enabled || !task.dueDate) {
      return null;
    }

    const tenantTimezone = await this.getTenantTimezone(task.tenantId);

    // Calculate new dates with timezone awareness
    const newDueDate = await this.calculateNextOccurrence(
      task.dueDate,
      task.repeat,
      task.tenantId
    );

    const newStartDate = task.startDate
      ? await this.calculateNextOccurrence(
          task.startDate,
          task.repeat,
          task.tenantId
        )
      : null;

    // Update the task with new dates and reset completion status
    const updateData: any = {
      dueDate: newDueDate,
      completeStatus: false, // Reset completion status
      "repeat.lastShifted": new Date(), // Track when we last shifted
    };

    if (newStartDate) {
      updateData.startDate = newStartDate;
    }

    await Task.findByIdAndUpdate(task._id, updateData);

    console.log(`📅 Shifted recurring task "${task.title}":
      Old due date: ${dayjs(task.dueDate).tz(tenantTimezone).format()} ${tenantTimezone}
      New due date: ${dayjs(newDueDate).tz(tenantTimezone).format()} ${tenantTimezone}
      ${newStartDate ? `New start date: ${dayjs(newStartDate).tz(tenantTimezone).format()} ${tenantTimezone}` : ''}
      Tenant: ${task.tenantId} (${tenantTimezone})`);

    // Update reminder for the shifted task if enabled
    if (task.reminder?.enabled) {
      const { TimezoneAwareReminderService } = await import("./timezone-aware-reminder-service");
      await TimezoneAwareReminderService.updateTaskReminder(task._id.toString());
    }

    // Get the updated task to return
    const updatedTask = await Task.findById(task._id);
    return updatedTask;
  }

  /**
   * Mark recurring task as processed (for backward compatibility)
   */
  static async markRecurrenceProcessed(taskId: string): Promise<void> {
    // This is now handled in shiftRecurringTask method
    // Keeping for compatibility but no action needed
  }

  /**
   * Process all pending recurring tasks by shifting their dates
   */
  static async processPendingRecurringTasks(): Promise<{
    processed: number;
    errors: string[];
  }> {
    console.log(`🔄 Starting timezone-aware recurring task processing at ${dayjs().utc().format()}`);

    const tasks = await this.getTasksNeedingRecurrence();
    const errors: string[] = [];
    let processed = 0;

    for (const task of tasks) {
      try {
        const tenantTimezone = await this.getTenantTimezone(task.tenantId);

        console.log(`Processing recurring task "${task.title}" (${task._id})
          Tenant: ${task.tenantId} (${tenantTimezone})`);

        const updatedTask = await this.shiftRecurringTask(task);

        if (updatedTask) {
          processed++;
          console.log(
            `✅ Shifted recurring task "${task.title}" to new due date: ${dayjs(updatedTask.dueDate).tz(tenantTimezone).format()} ${tenantTimezone}`,
          );

          // Send recurring task notification email with timezone awareness
          await this.sendRecurringTaskNotification(updatedTask);
        } else {
          console.log(
            `⚠️ Could not shift recurring task "${task.title}"`,
          );
        }
      } catch (error) {
        console.error(`❌ Error processing timezone-aware recurring task ${task._id}:`, error);
        errors.push(
          `Task ${task._id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    console.log(`✅ Completed timezone-aware recurring task processing: ${processed} processed, ${errors.length} errors`);
    return { processed, errors };
  }

  /**
   * Send notification email for recurring task
   * NOW WITH TIMEZONE-AWARE DATE FORMATTING
   */
  static async sendRecurringTaskNotification(task: ITask): Promise<void> {
    try {
      const { EmailService } = await import("./email-service");
      const { config } = await import("../config");

      const tenantTimezone = await this.getTenantTimezone(task.tenantId);

      // Get assignees' email addresses
      const assigneeEmails: string[] = [];
      if (task.assignees && task.assignees.length > 0) {
        const { Personnel } = await import("../models/Personnel");
        const assignees = await Personnel.find({
          _id: { $in: task.assignees },
          email: { $exists: true, $ne: "" },
        });
        assigneeEmails.push(...assignees.map(p => p.email));
      }

      if (assigneeEmails.length === 0) {
        console.log(`No email addresses found for recurring task ${task._id} assignees`);
        return;
      }

      const taskLink = `${config.FRONTEND_URL}/dashboard/kanban/${task._id}`;

      // Format dates in tenant's timezone for email display
      const dueDate = dayjs(task.dueDate!).tz(tenantTimezone).format('MMM DD, YYYY [at] h:mm A z');
      const startDate = task.startDate
        ? dayjs(task.startDate).tz(tenantTimezone).format('MMM DD, YYYY [at] h:mm A z')
        : 'Not set';

      const subject = `Recurring Task Scheduled: ${task.title}`;
      const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2>🔄 Recurring Task Scheduled</h2>
            <p>A recurring task has been scheduled and is ready for your attention.</p>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4CAF50;">
              <h3>${task.title}</h3>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Start Date:</strong> ${startDate}</p>
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
              <p><strong>Priority:</strong> <span style="background: #fff3e0; color: #ef6c00; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">${task.priority.toUpperCase()}</span></p>
              <p><strong>Repeat Type:</strong> ${task.repeat?.type || 'Unknown'}</p>
            </div>

            <div style="background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 15px 0; font-size: 12px; color: #1565c0;">
              📍 All times shown in your local timezone: ${tenantTimezone}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${taskLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Task Details</a>
            </div>

            <p>This task has been automatically rescheduled based on its recurrence settings. Please complete it according to the new schedule.</p>
          </div>

          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
            <p>This is an automated notification for a recurring task.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      `;

      await EmailService.sendBulkEmail(
        assigneeEmails,
        subject,
        message
      );

      console.log(`✅ Sent timezone-aware recurring task notification for "${task.title}" to ${assigneeEmails.length} assignees
        Due date: ${dueDate}
        Tenant timezone: ${tenantTimezone}`);
    } catch (error) {
      console.error(`❌ Failed to send timezone-aware recurring task notification for ${task._id}:`, error);
    }
  }
}