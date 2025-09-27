import { ITask } from '../models/Task';
import { Client } from '../models/Client';
import { WorkOrder } from '../models/WorkOrder';
import { YubotoService, SendMessageRequest, YubotoResponse } from './yuboto-service';
import { MessageTemplateService, MessageContext } from './message-template-service';

export interface SmsReminderConfig {
  enabled: boolean;
  yuboto: {
    apiKey: string;
    sender: string;
    priority: 'sms' | 'viber';
    fallbackToSms: boolean;
  };
  company: {
    name: string;
    phone: string;
    email: string;
  };
  templates: {
    monthly: string;
    yearly: string;
    custom: string;
    urgent: string;
  };
}

export interface SmsReminderResult {
  taskId: string;
  success: boolean;
  phoneNumber?: string;
  messageId?: string;
  channel?: 'sms' | 'viber';
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * SMS/Viber Reminder Service
 * Extends the existing reminder system to support SMS and Viber messaging
 */
export class SmsReminderService {
  private yubotoService: YubotoService;
  private config: SmsReminderConfig;

  constructor(config: SmsReminderConfig) {
    this.config = config;
    this.yubotoService = new YubotoService({
      apiKey: config.yuboto.apiKey
    });
  }

  /**
   * Send SMS/Viber reminder for a specific task
   */
  async sendTaskReminder(task: ITask, templateType: 'monthly' | 'yearly' | 'custom' | 'urgent' = 'monthly'): Promise<SmsReminderResult> {
    try {
      // Skip if SMS reminders are disabled
      if (!this.config.enabled) {
        return {
          taskId: task._id,
          success: false,
          skipped: true,
          skipReason: 'SMS reminders disabled'
        };
      }

      // Get client information
      const client = await Client.findById(task.clientId);
      if (!client) {
        return {
          taskId: task._id,
          success: false,
          skipped: true,
          skipReason: 'Client not found'
        };
      }

      // Get phone number (prioritize contact person)
      const phoneNumber = MessageTemplateService.getMessagePhoneNumber({ client });
      if (!phoneNumber) {
        return {
          taskId: task._id,
          success: false,
          skipped: true,
          skipReason: 'No phone number available'
        };
      }

      // Validate and format phone number
      const formattedPhone = YubotoService.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        return {
          taskId: task._id,
          success: false,
          skipped: true,
          skipReason: 'Invalid phone number format'
        };
      }

      // Get work order if available
      let workOrder;
      if (task.workOrderId) {
        workOrder = await WorkOrder.findById(task.workOrderId);
      }

      // Create message context
      const messageContext = MessageTemplateService.createMessageContext(
        client,
        workOrder,
        task,
        {
          type: this.inferServiceType(task, workOrder),
          description: task.description || 'Service reminder',
          nextDue: task.dueDate
        },
        this.config.company
      );

      // Get template and process message
      const template = this.config.templates[templateType];
      const { processedMessage, missingVariables } = MessageTemplateService.previewMessage(template, messageContext);

      // Log missing variables for debugging
      if (missingVariables.length > 0) {
        console.log(`⚠️ Missing template variables for task ${task._id}:`, missingVariables);
      }

      // Send message via Yuboto
      const sendRequest: SendMessageRequest = {
        phoneNumbers: [formattedPhone],
        message: processedMessage,
        sender: this.config.yuboto.sender,
        priority: this.config.yuboto.priority,
        fallbackToSms: this.config.yuboto.fallbackToSms
      };

      const response = await this.yubotoService.sendMessage(sendRequest);

      if (response.success && response.results.length > 0) {
        const result = response.results[0];
        return {
          taskId: task._id,
          success: true,
          phoneNumber: formattedPhone,
          messageId: result.id,
          channel: result.channel,
        };
      } else {
        return {
          taskId: task._id,
          success: false,
          phoneNumber: formattedPhone,
          error: response.error || 'Unknown error from Yuboto API'
        };
      }

    } catch (error) {
      console.error(`Error sending SMS reminder for task ${task._id}:`, error);
      return {
        taskId: task._id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send SMS/Viber reminders for multiple tasks
   */
  async sendBulkReminders(tasks: ITask[], templateType: 'monthly' | 'yearly' | 'custom' | 'urgent' = 'monthly'): Promise<{
    results: SmsReminderResult[];
    summary: {
      total: number;
      sent: number;
      skipped: number;
      failed: number;
    };
  }> {
    const results: SmsReminderResult[] = [];

    for (const task of tasks) {
      const result = await this.sendTaskReminder(task, templateType);
      results.push(result);

      // Add small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      total: results.length,
      sent: results.filter(r => r.success).length,
      skipped: results.filter(r => r.skipped).length,
      failed: results.filter(r => !r.success && !r.skipped).length
    };

    return { results, summary };
  }

  /**
   * Get tasks that need SMS reminders and have valid phone numbers
   */
  async getTasksForSmsReminders(): Promise<ITask[]> {
    // Import here to avoid circular dependency
    const { ReminderService } = await import('./reminder-service');

    // Get all tasks that need reminders
    const tasksNeedingReminders = await ReminderService.getTasksNeedingReminders();

    // Filter tasks that have clients with phone numbers
    const validTasks: ITask[] = [];

    for (const task of tasksNeedingReminders) {
      if (!task.clientId) continue;

      const client = await Client.findById(task.clientId);
      if (!client) continue;

      // Check if client or contact person has a valid phone number
      const phoneNumber = MessageTemplateService.getMessagePhoneNumber({ client });
      if (phoneNumber && YubotoService.validatePhoneNumber(phoneNumber)) {
        validTasks.push(task);
      }
    }

    return validTasks;
  }

  /**
   * Process pending SMS reminders (for cron job)
   */
  async processPendingSmsReminders(): Promise<{
    processed: number;
    results: SmsReminderResult[];
    errors: string[];
  }> {
    try {
      const tasks = await this.getTasksForSmsReminders();

      if (tasks.length === 0) {
        return {
          processed: 0,
          results: [],
          errors: []
        };
      }

      const { results, summary } = await this.sendBulkReminders(tasks);

      // Update reminder sent status for successful sends
      const { ReminderService } = await import('./reminder-service');
      for (const result of results) {
        if (result.success) {
          await ReminderService.markReminderSent(result.taskId);
        }
      }

      const errors = results
        .filter(r => r.error)
        .map(r => `Task ${r.taskId}: ${r.error}`);

      return {
        processed: summary.sent,
        results,
        errors
      };

    } catch (error) {
      return {
        processed: 0,
        results: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Test SMS/Viber service connectivity
   */
  async testService(): Promise<{ success: boolean; error?: string; balance?: { balance: number; currency: string } }> {
    try {
      const validation = await this.yubotoService.validateService();
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const balance = await this.yubotoService.getBalance();
      return { success: true, balance: balance || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Service test failed'
      };
    }
  }

  /**
   * Send test message to verify configuration
   */
  async sendTestMessage(phoneNumber: string, message: string = 'Test message from FSA'): Promise<SmsReminderResult> {
    console.log('📱 sendTestMessage called with:', { phoneNumber, message });

    const formattedPhone = YubotoService.formatPhoneNumber(phoneNumber);
    console.log('📱 Formatted phone:', formattedPhone);

    if (!formattedPhone) {
      console.log('❌ Invalid phone number format');
      return {
        taskId: 'test',
        success: false,
        error: 'Invalid phone number format'
      };
    }

    try {
      console.log('📱 Calling yubotoService.sendMessage...');
      const response = await this.yubotoService.sendMessage({
        phoneNumbers: [formattedPhone],
        message,
        sender: this.config.yuboto.sender,
        priority: this.config.yuboto.priority,
        fallbackToSms: this.config.yuboto.fallbackToSms
      });

      console.log('📱 Yuboto response:', response);

      if (response.success && response.results.length > 0) {
        const result = response.results[0];
        return {
          taskId: 'test',
          success: true,
          phoneNumber: formattedPhone,
          messageId: result.id,
          channel: result.channel
        };
      } else {
        console.log('❌ Yuboto response indicates failure:', response);
        return {
          taskId: 'test',
          success: false,
          error: response.error || 'Unknown error'
        };
      }
    } catch (error) {
      console.log('❌ Exception in sendTestMessage:', error);
      return {
        taskId: 'test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Infer service type from task and work order information
   */
  private inferServiceType(task: ITask, workOrder?: any): string {
    if (workOrder?.title) {
      return workOrder.title;
    }

    if (task.title.toLowerCase().includes('maintenance')) {
      return 'Maintenance Service';
    }

    if (task.title.toLowerCase().includes('inspection')) {
      return 'Inspection Service';
    }

    if (task.title.toLowerCase().includes('repair')) {
      return 'Repair Service';
    }

    if (task.repeat?.type === 'monthly') {
      return 'Monthly Service';
    }

    if (task.repeat?.type === 'yearly') {
      return 'Annual Service';
    }

    return 'Service Appointment';
  }

  /**
   * Get delivery status for a sent message
   */
  async getMessageStatus(messageId: string) {
    return this.yubotoService.getDeliveryStatus(messageId);
  }

  /**
   * Schedule a reminder for future sending
   */
  static async scheduleReminder(reminderData: any): Promise<void> {
    // For now, we'll store reminders in the database
    // In production, this would integrate with a job queue like Bull or Agenda
    try {
      const { Task } = await import('../models');

      // Create a special reminder task
      const reminderTask = new Task({
        ...reminderData,
        title: `SMS Reminder: ${reminderData.reminderType}`,
        description: `Automated SMS reminder for work order`,
        type: 'sms_reminder',
        status: 'pending',
        dueDate: reminderData.scheduledFor,
        workOrderId: reminderData.workOrderId,
        clientId: reminderData.clientId,
        metadata: {
          recipientPhone: reminderData.recipientPhone,
          messageContent: reminderData.messageContent,
          reminderType: reminderData.reminderType,
          isAutomatedReminder: true
        }
      });

      await reminderTask.save();
      console.log(`📅 Scheduled SMS reminder for ${reminderData.scheduledFor.toISOString()}`);
    } catch (error) {
      console.error('Error scheduling SMS reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel reminders for a specific work order
   */
  static async cancelRemindersForWorkOrder(workOrderId: string, tenantId: string): Promise<void> {
    try {
      const { Task } = await import('../models');

      // Find and cancel all SMS reminder tasks for this work order
      const result = await Task.updateMany(
        {
          workOrderId,
          tenantId,
          type: 'sms_reminder',
          status: 'pending'
        },
        {
          status: 'cancelled',
          updatedAt: new Date()
        }
      );

      console.log(`🚫 Cancelled ${result.modifiedCount} SMS reminders for work order ${workOrderId}`);
    } catch (error) {
      console.error('Error cancelling SMS reminders:', error);
      throw error;
    }
  }

  /**
   * Process scheduled SMS reminders (for cron job)
   */
  static async processScheduledReminders(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const { Task } = await import('../models');

      // Find SMS reminder tasks that are due
      const now = new Date();
      const dueReminders = await Task.find({
        type: 'sms_reminder',
        status: 'pending',
        dueDate: { $lte: now }
      }).populate('clientId');

      const results = {
        processed: dueReminders.length,
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };

      if (dueReminders.length === 0) {
        return results;
      }

      // Load SMS configuration
      const config = this.loadConfig();
      const smsService = new SmsReminderService(config);

      for (const reminder of dueReminders) {
        try {
          const { recipientPhone, messageContent } = reminder.metadata;

          const testResult = await smsService.sendTestMessage(recipientPhone, messageContent);

          if (testResult.success) {
            // Mark reminder as sent
            reminder.status = 'completed';
            reminder.metadata.sentAt = new Date();
            reminder.metadata.messageId = testResult.messageId;
            reminder.metadata.channel = testResult.channel;
            await reminder.save();
            results.sent++;
          } else {
            // Mark reminder as failed
            reminder.status = 'failed';
            reminder.metadata.error = testResult.error;
            await reminder.save();
            results.failed++;
            results.errors.push(`Reminder ${reminder._id}: ${testResult.error}`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = `Reminder ${reminder._id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing scheduled SMS reminders:', error);
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Load SMS configuration from environment
   */
  private static loadConfig(): SmsReminderConfig {
    return {
      enabled: process.env.SMS_REMINDERS_ENABLED === 'true',
      yuboto: {
        apiKey: process.env.YUBOTO_API_KEY || '',
        sender: process.env.YUBOTO_SENDER || 'FSA',
        priority: (process.env.YUBOTO_PRIORITY as 'sms' | 'viber') || 'viber',
        fallbackToSms: true
      },
      company: {
        name: process.env.COMPANY_NAME || 'FSA',
        phone: process.env.COMPANY_PHONE || '',
        email: process.env.COMPANY_EMAIL || ''
      },
      templates: {
        monthly: 'Hello {{client.name}}, this is a reminder about your monthly service with {{company.name}}. Please contact us at {{company.phone}}.',
        yearly: 'Hello {{client.name}}, this is a reminder about your yearly service with {{company.name}}. Please contact us at {{company.phone}}.',
        custom: '{{customMessage}}',
        urgent: 'URGENT: {{client.name}}, please contact {{company.name}} at {{company.phone}} regarding your service.'
      }
    };
  }
}