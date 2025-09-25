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

    return await Task.find({
      'reminder.enabled': true,
      'reminder.nextReminder': { $lte: now },
      $or: [
        { 'reminder.lastSent': { $exists: false } },
        { 'reminder.lastSent': null },
        { 'reminder.lastSent': { $lt: '$reminder.nextReminder' } }
      ]
    });
  }

  /**
   * Get email addresses for task assignees and reporter
   */
  static async getTaskNotificationEmails(task: ITask): Promise<string[]> {
    const emails: string[] = [];

    // Get assignee emails
    if (task.assignees && task.assignees.length > 0) {
      const personnel = await Personnel.find({
        _id: { $in: task.assignees },
        tenantId: task.tenantId
      }).select('email');

      emails.push(...personnel.map(p => p.email).filter(Boolean));
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
        const emails = await this.getTaskNotificationEmails(task);

        if (emails.length > 0) {
          await this.sendReminderEmail(task, emails);
          await this.markReminderSent(task._id);
          processed++;
          console.log(`Reminder sent for task "${task.title}" to: ${emails.join(', ')}`);
        }
      } catch (error) {
        console.error(`Error processing reminder for task ${task._id}:`, error);
        errors.push(`Task ${task._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { processed, errors };
  }
}