import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Task, ITask } from '../models/Task';
import { Tenant } from '../models/Tenant';
import { Personnel } from '../models/Personnel';
import { User } from '../models/User';
import { createEmailTransporter } from '../routes/email';

// Enable dayjs timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export class TimezoneAwareReminderService {
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
   * Calculate the next reminder time based on reminder type and task due date
   * NOW TIMEZONE-AWARE: Converts to tenant timezone before calculating
   */
  static async calculateNextReminder(
    taskDueDate: Date,
    reminderType: string,
    tenantId: string
  ): Promise<Date> {
    const tenantTimezone = await this.getTenantTimezone(tenantId);

    // Convert the due date to tenant's timezone for calculation
    const dueDateInTenantTz = dayjs(taskDueDate).tz(tenantTimezone);

    let reminderTimeInTenantTz: dayjs.Dayjs;

    switch (reminderType) {
      case '1hour':
        reminderTimeInTenantTz = dueDateInTenantTz.subtract(1, 'hour');
        break;
      case '1day':
        reminderTimeInTenantTz = dueDateInTenantTz.subtract(1, 'day');
        break;
      case '1week':
        reminderTimeInTenantTz = dueDateInTenantTz.subtract(1, 'week');
        break;
      case '1month':
        reminderTimeInTenantTz = dueDateInTenantTz.subtract(1, 'month');
        break;
      default:
        reminderTimeInTenantTz = dueDateInTenantTz.subtract(1, 'hour');
    }

    // Convert back to UTC for storage (so cron scheduling works consistently)
    const reminderTimeUtc = reminderTimeInTenantTz.utc().toDate();

    console.log(`📅 Timezone-aware reminder calculation:
      Tenant: ${tenantId} (${tenantTimezone})
      Due date UTC: ${dayjs(taskDueDate).utc().format()}
      Due date in tenant TZ: ${dueDateInTenantTz.format()}
      Reminder type: ${reminderType}
      Reminder time in tenant TZ: ${reminderTimeInTenantTz.format()}
      Reminder time UTC (stored): ${dayjs(reminderTimeUtc).utc().format()}`);

    return reminderTimeUtc;
  }

  /**
   * Update reminder next send time when task is created or updated
   */
  static async updateTaskReminder(taskId: string): Promise<void> {
    const task = await Task.findById(taskId);

    if (!task || !task.reminder?.enabled || !task.dueDate) {
      return;
    }

    const nextReminder = await this.calculateNextReminder(
      task.dueDate,
      task.reminder.type,
      task.tenantId
    );

    await Task.findByIdAndUpdate(taskId, {
      'reminder.nextReminder': nextReminder,
      'reminder.lastSent': null,
    });

    console.log(`✅ Updated reminder for task ${taskId}: next reminder at ${dayjs(nextReminder).utc().format()} UTC`);
  }

  /**
   * Get all tasks that need reminder notifications
   * Same logic as before but with better logging
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

    // For tasks without nextReminder, calculate it with timezone awareness
    const additionalTasks = [];
    for (const task of tasksWithoutReminder) {
      if (task.dueDate && task.reminder) {
        const nextReminder = await this.calculateNextReminder(
          task.dueDate,
          task.reminder.type,
          task.tenantId
        );

        if (nextReminder <= now) {
          // Update the task with calculated nextReminder for future queries
          await Task.findByIdAndUpdate(task._id, {
            'reminder.nextReminder': nextReminder,
          });
          additionalTasks.push(task);
        }
      }
    }

    const allTasks = [...tasksWithReminder, ...additionalTasks];

    if (allTasks.length > 0) {
      console.log(`📬 Found ${allTasks.length} tasks needing reminders:
        With reminder: ${tasksWithReminder.length}
        Without reminder (calculated): ${additionalTasks.length}
        Current time UTC: ${dayjs(now).utc().format()}`);

      // Log each task for debugging
      allTasks.forEach(task => {
        const tenantTimezone = 'unknown'; // We'll get this in the processing loop
        console.log(`  - Task "${task.title}" (${task._id})
          Due: ${dayjs(task.dueDate).utc().format()} UTC
          Next reminder: ${task.reminder?.nextReminder ? dayjs(task.reminder.nextReminder).utc().format() : 'not set'} UTC
          Tenant: ${task.tenantId}`);
      });
    }

    return allTasks;
  }

  /**
   * Get email addresses for task assignees and reporter
   * Same as before
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
        // Assignees are Personnel IDs, need to fetch Personnel -> User -> email
        const assigneeIds = assigneeData.map((a: any) => typeof a === 'object' ? a.id || a._id : a);
        const personnel = await Personnel.find({
          _id: { $in: assigneeIds },
          tenantId: task.tenantId
        }).populate('userId', 'email firstName lastName');

        const assigneeEmails: string[] = [];
        const assigneesWithoutEmail: any[] = [];

        personnel.forEach(p => {
          const user = (p as any).userId;
          if (user && user.email) {
            assigneeEmails.push(user.email);
          } else {
            assigneesWithoutEmail.push({
              personnelId: p._id,
              userId: user?._id || 'missing',
              userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown'
            });
          }
        });

        emails.push(...assigneeEmails);

        // Log assignees without emails for debugging
        if (assigneesWithoutEmail.length > 0) {
          console.log(`⚠️ Assignees without email addresses for task "${task.title}":`, assigneesWithoutEmail);
        }
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
   * NOW WITH TIMEZONE-AWARE DATE FORMATTING
   */
  static async sendReminderEmail(task: ITask, emails: string[]): Promise<void> {
    const transporter = await createEmailTransporter();
    const { config } = await import("../config");

    const tenantTimezone = await this.getTenantTimezone(task.tenantId);

    const reminderTypeText = {
      '1hour': '1 hour',
      '1day': '1 day',
      '1week': '1 week',
      '1month': '1 month'
    }[task.reminder?.type || '1hour'];

    // Format dates in tenant's timezone for email display
    const startDate = task.startDate
      ? dayjs(task.startDate).tz(tenantTimezone).format('MMM DD, YYYY [at] h:mm A z')
      : 'Not set';
    const dueDate = task.dueDate
      ? dayjs(task.dueDate).tz(tenantTimezone).format('MMM DD, YYYY [at] h:mm A z')
      : 'Not set';

    const taskLink = `${config.FRONTEND_URL}/dashboard/kanban/${task._id}`;

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
          .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .btn:hover { background: #5a6fd8; }
          .timezone-info { background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 12px; color: #1565c0; }
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

            <div class="timezone-info">
              📍 All times shown in your local timezone: ${tenantTimezone}
            </div>

            <p>This is a friendly reminder that your task is due soon. Please make sure you complete it on time and have all necessary resources ready.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${taskLink}" class="btn">View Task Details</a>
            </div>

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

    console.log(`📧 Sent timezone-aware reminder email for task "${task.title}" to ${emails.length} recipients
      Due date: ${dueDate}
      Tenant timezone: ${tenantTimezone}`);
  }

  /**
   * Process all pending reminders
   */
  static async processPendingReminders(): Promise<{ processed: number; errors: string[] }> {
    console.log(`🔄 Starting timezone-aware reminder processing at ${dayjs().utc().format()}`);

    const tasks = await this.getTasksNeedingReminders();
    const errors: string[] = [];
    let processed = 0;

    for (const task of tasks) {
      try {
        const tenantTimezone = await this.getTenantTimezone(task.tenantId);

        console.log(`Processing reminder for task "${task.title}" (${task._id})
          Tenant: ${task.tenantId} (${tenantTimezone})
          Due: ${task.dueDate ? dayjs(task.dueDate).tz(tenantTimezone).format() : 'not set'}`);

        const emails = await this.getTaskNotificationEmails(task);
        console.log(`Found ${emails.length} email recipients:`, emails);

        if (emails.length > 0) {
          console.log(`Sending timezone-aware reminder email for task "${task.title}" to: ${emails.join(', ')}`);
          await this.sendReminderEmail(task, emails);
          await this.markReminderSent(task._id);
          processed++;
          console.log(`✅ Timezone-aware reminder sent successfully for task "${task.title}"`);
        } else {
          console.log(`⚠️ No email recipients found for task "${task.title}"`);
        }
      } catch (error) {
        console.error(`❌ Error processing timezone-aware reminder for task ${task._id}:`, error);
        errors.push(`Task ${task._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Completed timezone-aware reminder processing: ${processed} processed, ${errors.length} errors`);
    return { processed, errors };
  }
}