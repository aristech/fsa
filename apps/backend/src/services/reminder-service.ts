import dayjs from 'dayjs';
import { Task, ITask } from '../models/Task';
import { Personnel } from '../models/Personnel';
import { User } from '../models/User';
import { createEmailTransporter } from '../routes/email';

export class ReminderService {
  /**
   * Calculate the next reminder time based on reminder type and task due date
   */
  static calculateNextReminder(taskDueDate: Date, reminderType: string): Date {
    const dueDate = dayjs(taskDueDate);

    switch (reminderType) {
      case '1hour':
        return dueDate.subtract(1, 'hour').toDate();
      case '1day':
        return dueDate.subtract(1, 'day').toDate();
      case '1week':
        return dueDate.subtract(1, 'week').toDate();
      case '1month':
        return dueDate.subtract(1, 'month').toDate();
      default:
        return dueDate.subtract(1, 'hour').toDate();
    }
  }

  /**
   * Update reminder next send time when task is created or updated
   */
  static async updateTaskReminder(taskId: string): Promise<void> {
    const task = await Task.findById(taskId);

    if (!task || !task.reminder?.enabled || !task.dueDate) {
      return;
    }

    const nextReminder = this.calculateNextReminder(task.dueDate, task.reminder.type);

    await Task.findByIdAndUpdate(taskId, {
      'reminder.nextReminder': nextReminder,
      'reminder.lastSent': null,
    });
  }

  /**
   * Get all tasks that need reminder notifications
   */
  static async getTasksNeedingReminders(): Promise<ITask[]> {
    const now = new Date();

    // First query: tasks with calculated nextReminder
    const tasksWithReminder = await Task.find({
      'reminder.enabled': true,
      'reminder.nextReminder': { $lte: now },
      $or: [
        { 'reminder.lastSent': { $exists: false } },
        { 'reminder.lastSent': null },
        { $expr: { $lt: ['$reminder.lastSent', '$reminder.nextReminder'] } }
      ]
    });

    // Second query: tasks with enabled reminders but no nextReminder calculated
    const tasksWithoutReminder = await Task.find({
      'reminder.enabled': true,
      'reminder.nextReminder': { $exists: false },
      dueDate: { $exists: true },
      $or: [
        { 'reminder.lastSent': { $exists: false } },
        { 'reminder.lastSent': null }
      ]
    });

    // For tasks without nextReminder, calculate it and check if reminder is due
    const additionalTasks = [];
    for (const task of tasksWithoutReminder) {
      if (task.dueDate && task.reminder) {
        const nextReminder = this.calculateNextReminder(task.dueDate, task.reminder.type);
        if (nextReminder <= now) {
          // Update the task with calculated nextReminder for future queries
          await Task.findByIdAndUpdate(task._id, {
            'reminder.nextReminder': nextReminder,
          });
          additionalTasks.push(task);
        }
      }
    }

    return [...tasksWithReminder, ...additionalTasks];
  }

  /**
   * Get email addresses for task assignees and reporter
   */
  static async getTaskNotificationEmails(task: ITask): Promise<string[]> {
    const emails: string[] = [];

    // Handle assignees - check both assignees array and assignee (populated objects)
    const assigneeData = (task as any).assignees || (task as any).assignee || [];

    if (assigneeData && assigneeData.length > 0) {
      // Check if assignees are populated objects with email or just IDs
      const firstAssignee = assigneeData[0];
      if (typeof firstAssignee === 'object' && firstAssignee.email) {
        // Assignees are populated objects with email
        emails.push(...assigneeData.map((a: any) => a.email).filter(Boolean));
      } else {
        // Assignees are just IDs, need to fetch from Personnel
        const assigneeIds = assigneeData.map((a: any) => typeof a === 'object' ? a.id || a._id : a);
        const personnel = await Personnel.find({
          _id: { $in: assigneeIds },
          tenantId: task.tenantId
        }).select('email');

        emails.push(...personnel.map(p => p.email).filter(Boolean));
      }
    }

    // Get reporter email
    if (task.createdBy) {
      const reporter = await User.findById(task.createdBy).select('email');
      if (reporter?.email) {
        emails.push(reporter.email);
      }
    }

    // Remove duplicates
    return [...new Set(emails)];
  }

  /**
   * Mark reminder as sent
   */
  static async markReminderSent(taskId: string): Promise<void> {
    await Task.findByIdAndUpdate(taskId, {
      'reminder.lastSent': new Date(),
    });
  }

  /**
   * Send reminder email for a task
   */
  static async sendReminderEmail(task: ITask, emails: string[]): Promise<void> {
    const transporter = await createEmailTransporter();

    const reminderTypeText = {
      '1hour': '1 hour',
      '1day': '1 day',
      '1week': '1 week',
      '1month': '1 month'
    }[task.reminder?.type || '1hour'];

    const startDate = task.startDate ? dayjs(task.startDate).format('MMM DD, YYYY [at] h:mm A') : 'Not set';
    const dueDate = task.dueDate ? dayjs(task.dueDate).format('MMM DD, YYYY [at] h:mm A') : 'Not set';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder - ${task.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .task-details { background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .priority { padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
          .priority-high { background: #ffebee; color: #c62828; }
          .priority-medium { background: #fff3e0; color: #ef6c00; }
          .priority-low { background: #e8f5e8; color: #2e7d32; }
          .priority-urgent { background: #fce4ec; color: #ad1457; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Task Reminder</h1>
            <p>Your task is due in ${reminderTypeText}</p>
          </div>
          <div class="content">
            <div class="task-details">
              <h2>${task.title}</h2>
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
              <p><strong>Priority:</strong> <span class="priority priority-${task.priority}">${task.priority.toUpperCase()}</span></p>
              <p><strong>Start Date:</strong> ${startDate}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              ${task.workOrderNumber ? `<p><strong>Work Order:</strong> ${task.workOrderNumber}</p>` : ''}
              ${task.clientName ? `<p><strong>Client:</strong> ${task.clientName}</p>` : ''}
            </div>

            <p>This is a friendly reminder that your task is due soon. Please make sure you complete it on time and have all necessary resources ready.</p>

            <p>If you have any questions or need to reschedule, please contact your supervisor.</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from Field Service Automation System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: emails.join(', '),
      subject: `Task Reminder: ${task.title}`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Process all pending reminders
   */
  static async processPendingReminders(): Promise<{ processed: number; errors: string[] }> {
    const tasks = await this.getTasksNeedingReminders();
    const errors: string[] = [];
    let processed = 0;

    for (const task of tasks) {
      try {
        console.log(`Processing reminder for task "${task.title}" (${task._id})`);
        const emails = await this.getTaskNotificationEmails(task);
        console.log(`Found ${emails.length} email recipients:`, emails);

        if (emails.length > 0) {
          console.log(`Sending reminder email for task "${task.title}" to: ${emails.join(', ')}`);
          await this.sendReminderEmail(task, emails);
          await this.markReminderSent(task._id);
          processed++;
          console.log(`✅ Reminder sent successfully for task "${task.title}"`);
        } else {
          console.log(`⚠️ No email recipients found for task "${task.title}"`);
        }
      } catch (error) {
        console.error(`❌ Error processing reminder for task ${task._id}:`, error);
        errors.push(`Task ${task._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { processed, errors };
  }
}