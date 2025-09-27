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
   * Get all tasks that need new recurring instances created
   */
  static async getTasksNeedingRecurrence(): Promise<ITask[]> {
    const now = new Date();

    // First query: tasks with calculated nextOccurrence
    const tasksWithOccurrence = await Task.find({
      "repeat.enabled": true,
      "repeat.nextOccurrence": { $lte: now },
      $or: [
        { "repeat.lastCreated": { $exists: false } },
        { "repeat.lastCreated": null },
        { $expr: { $lt: ["$repeat.lastCreated", "$repeat.nextOccurrence"] } },
      ],
    });

    // Second query: tasks with enabled repeat but no nextOccurrence calculated
    const tasksWithoutOccurrence = await Task.find({
      "repeat.enabled": true,
      "repeat.nextOccurrence": { $exists: false },
      dueDate: { $exists: true },
      $or: [
        { "repeat.lastCreated": { $exists: false } },
        { "repeat.lastCreated": null },
      ],
    });

    // For tasks without nextOccurrence, calculate it and check if recurrence is due
    const additionalTasks = [];
    for (const task of tasksWithoutOccurrence) {
      if (task.dueDate && task.repeat) {
        const nextOccurrence = this.calculateNextOccurrence(
          task.dueDate,
          task.repeat,
        );
        if (nextOccurrence <= now) {
          // Update the task with calculated nextOccurrence for future queries
          await Task.findByIdAndUpdate(task._id, {
            "repeat.nextOccurrence": nextOccurrence,
          });
          additionalTasks.push(task);
        }
      }
    }

    return [...tasksWithOccurrence, ...additionalTasks];
  }

  /**
   * Create a new instance of a recurring task
   */
  static async createRecurringInstance(
    originalTask: ITask,
  ): Promise<ITask | null> {
    if (!originalTask.repeat?.enabled || !originalTask.dueDate) {
      return null;
    }

    // Calculate new dates for the recurring instance
    const originalDueDate = dayjs(originalTask.dueDate);
    const originalStartDate = originalTask.startDate
      ? dayjs(originalTask.startDate)
      : null;

    const newDueDate = dayjs(
      this.calculateNextOccurrence(originalTask.dueDate, originalTask.repeat),
    );
    const newStartDate = originalStartDate
      ? originalStartDate.add(newDueDate.diff(originalDueDate))
      : null;

    // Create the new task data
    const newTaskData = {
      title: originalTask.title,
      description: originalTask.description,
      priority: originalTask.priority,
      tags: originalTask.tags || [],
      assignees: originalTask.assignees || [],
      dueDate: newDueDate.toDate(),
      startDate: newStartDate?.toDate(),
      tenantId: originalTask.tenantId,
      projectId: originalTask.projectId,
      columnId: originalTask.columnId,
      status: "Todo", // Reset status for new instance
      completeStatus: false, // Reset completion status
      workOrderId: originalTask.workOrderId,
      workOrderNumber: originalTask.workOrderNumber,
      workOrderTitle: originalTask.workOrderTitle,
      clientId: originalTask.clientId,
      clientName: originalTask.clientName,
      clientCompany: originalTask.clientCompany,
      createdBy: originalTask.createdBy,
      // Copy repeat settings to new instance
      repeat: originalTask.repeat,
      // Copy reminder settings if enabled
      reminder: originalTask.reminder?.enabled
        ? originalTask.reminder
        : undefined,
      // Reference to original recurring task
      originalRecurringTaskId: originalTask._id,
    };

    // Create the new task
    const newTask = new Task(newTaskData);
    await newTask.save();

    // Update reminder for the new task if enabled
    if (newTask.reminder?.enabled && newTask.dueDate) {
      const { ReminderService } = await import("./reminder-service");
      await ReminderService.updateTaskReminder(newTask._id.toString());
    }

    // Update the next occurrence for the new task
    await this.updateTaskRecurrence(newTask._id.toString());

    return newTask;
  }

  /**
   * Mark recurring task as processed
   */
  static async markRecurrenceProcessed(taskId: string): Promise<void> {
    await Task.findByIdAndUpdate(taskId, {
      "repeat.lastCreated": new Date(),
    });
  }

  /**
   * Process all pending recurring tasks
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

        const newTask = await this.createRecurringInstance(task);

        if (newTask) {
          await this.markRecurrenceProcessed(task._id);
          processed++;
          console.log(
            `✅ Created recurring instance of "${task.title}" with ID: ${newTask._id}`,
          );
        } else {
          console.log(
            `⚠️ Could not create recurring instance for task "${task.title}"`,
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
}
