import dayjs from "dayjs";
import { Task, ITask } from "../models/Task";

export class RecurringTaskService {
  /**
   * Calculate the next occurrence date based on repeat settings
   */
  static calculateNextOccurrence(baseDate: Date, repeatSettings: any): Date {
    const base = dayjs(baseDate);

    switch (repeatSettings.type) {
      case "daily":
        return base.add(1, "day").toDate();
      case "weekly":
        return base.add(1, "week").toDate();
      case "monthly":
        return base.add(1, "month").toDate();
      case "yearly":
        return base.add(1, "year").toDate();
      case "custom":
        const frequency = repeatSettings.frequency || 1;
        const unit = repeatSettings.customType || "weeks";
        return base.add(frequency, unit as any).toDate();
      default:
        return base.add(1, "day").toDate();
    }
  }

  /**
   * Update recurring task next occurrence when task is created or updated
   */
  static async updateTaskRecurrence(taskId: string): Promise<void> {
    const task = await Task.findById(taskId);

    if (!task || !task.repeat?.enabled || !task.dueDate) {
      return;
    }

    const nextOccurrence = this.calculateNextOccurrence(
      task.dueDate,
      task.repeat,
    );

    await Task.findByIdAndUpdate(taskId, {
      "repeat.nextOccurrence": nextOccurrence,
      "repeat.lastCreated": null,
    });
  }

  /**
   * Get all tasks that need their dates shifted for recurrence
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

    return tasksNeedingShift;
  }

  /**
   * Shift task dates to next occurrence for recurring tasks
   */
  static async shiftRecurringTask(task: ITask): Promise<ITask | null> {
    if (!task.repeat?.enabled || !task.dueDate) {
      return null;
    }

    // Calculate new dates
    const newDueDate = this.calculateNextOccurrence(task.dueDate, task.repeat);
    const newStartDate = task.startDate
      ? this.calculateNextOccurrence(task.startDate, task.repeat)
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

    // Update reminder for the shifted task if enabled
    if (task.reminder?.enabled) {
      const { ReminderService } = await import("./reminder-service");
      await ReminderService.updateTaskReminder(task._id.toString());
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
    const tasks = await this.getTasksNeedingRecurrence();
    const errors: string[] = [];
    let processed = 0;

    for (const task of tasks) {
      try {
        console.log(`Processing recurring task "${task.title}" (${task._id})`);

        const updatedTask = await this.shiftRecurringTask(task);

        if (updatedTask) {
          processed++;
          console.log(
            `✅ Shifted recurring task "${task.title}" to new due date: ${updatedTask.dueDate}`,
          );

          // Send recurring task notification email
          await this.sendRecurringTaskNotification(updatedTask);
        } else {
          console.log(
            `⚠️ Could not shift recurring task "${task.title}"`,
          );
        }
      } catch (error) {
        console.error(`❌ Error processing recurring task ${task._id}:`, error);
        errors.push(
          `Task ${task._id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return { processed, errors };
  }

  /**
   * Send notification email for recurring task
   */
  static async sendRecurringTaskNotification(task: ITask): Promise<void> {
    try {
      const { EmailService } = await import("./email-service");
      const { config } = await import("../config");

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
      const dueDate = new Date(task.dueDate!).toLocaleDateString();

      const subject = `Recurring Task Scheduled: ${task.title}`;
      const message = `
        <h2>Recurring Task Scheduled</h2>
        <p>A recurring task has been scheduled and is ready for your attention.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>${task.title}</h3>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
          <p><strong>Priority:</strong> ${task.priority}</p>
        </div>

        <p><a href="${taskLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>

        <p>This is an automated notification for a recurring task.</p>
      `;

      await EmailService.sendBulkEmail(
        assigneeEmails,
        subject,
        message
      );

      console.log(`✅ Sent recurring task notification for "${task.title}" to ${assigneeEmails.length} assignees`);
    } catch (error) {
      console.error(`❌ Failed to send recurring task notification for ${task._id}:`, error);
    }
  }
}
