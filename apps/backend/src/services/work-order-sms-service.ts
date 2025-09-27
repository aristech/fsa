import { Types } from 'mongoose';
import { WorkOrder, Client } from '../models';
import { SmsReminderService } from './sms-reminder-service';
import { MessageTemplateService } from './message-template-service';
import { smsLogger } from '../utils/logger';

interface SmsReminderConfig {
  enabled: boolean;
  reminderTypes: ('1hour' | '1day' | '1week' | '1month')[];
  templateType: 'monthly' | 'yearly' | 'custom';
  customMessage?: string;
}

interface MessageContext {
  client: any;
  workOrder: any;
  company: {
    name: string;
    phone: string;
    email: string;
  };
}

export class WorkOrderSmsService {
  /**
   * Process SMS reminders for a work order when it's created or updated
   */
  static async processSmsReminders(
    workOrderId: string,
    smsConfig: SmsReminderConfig,
    tenantId: string
  ): Promise<{ success: boolean; message?: string; errors?: string[] }> {
    try {
      if (!smsConfig.enabled) {
        return { success: true, message: 'SMS reminders disabled' };
      }

      // Get work order with client information
      const workOrder = await WorkOrder.findById(workOrderId)
        .populate('clientId', 'name company phone email contactPerson')
        .lean();

      if (!workOrder) {
        return { success: false, message: 'Work order not found' };
      }

      // Ensure workOrder is a single document, not an array
      const workOrderDoc = Array.isArray(workOrder) ? workOrder[0] : workOrder;

      if (!workOrderDoc?.scheduledDate) {
        return { success: false, message: 'Work order has no scheduled date' };
      }

      const client = workOrderDoc.clientId as any;
      if (!client) {
        return { success: false, message: 'Work order has no associated client' };
      }

      // Get recipient phone number
      const recipientPhone = client.contactPerson?.phone || client.phone;
      if (!recipientPhone) {
        return { success: false, message: 'Client has no phone number' };
      }

      // Get company info for message context
      const companyInfo = {
        name: process.env.COMPANY_NAME || 'FSA',
        phone: process.env.COMPANY_PHONE || '',
        email: process.env.COMPANY_EMAIL || ''
      };

      // Create message context
      const messageContext: MessageContext = {
        client,
        workOrder: workOrderDoc,
        company: companyInfo
      };

      // Generate message content
      const messageContent = this.generateMessage(smsConfig, messageContext);

      // Calculate reminder dates based on scheduled date
      const scheduledDate = new Date(workOrderDoc.scheduledDate);

      // Handle both old and new data structures
      let reminderTypes: ('1hour' | '1day' | '1week' | '1month')[] = ['1day']; // Default fallback

      if (smsConfig.reminderTypes && Array.isArray(smsConfig.reminderTypes)) {
        // Old structure
        reminderTypes = smsConfig.reminderTypes;
      } else if ((smsConfig as any).reminderType) {
        // New structure - convert single type to appropriate timing
        const reminderType = (smsConfig as any).reminderType;
        switch (reminderType) {
          case 'monthly':
            reminderTypes = ['1week', '1day']; // Remind 1 week and 1 day before
            break;
          case 'yearly':
            reminderTypes = ['1month', '1week']; // Remind 1 month and 1 week before
            break;
          case 'custom':
            reminderTypes = ['1day']; // Default to 1 day before for custom
            break;
          case 'test':
            reminderTypes = ['1hour']; // For testing, remind in 1 hour
            break;
          default:
            reminderTypes = ['1day'];
        }
      }

      // Additional safety check
      if (!Array.isArray(reminderTypes) || reminderTypes.length === 0) {
        smsLogger.warn('SMS reminder types invalid, using default', {
          smsConfig: smsConfig,
          reminderTypes: reminderTypes
        });
        reminderTypes = ['1day'];
      }

      const reminderDates = this.calculateReminderDates(scheduledDate, reminderTypes);

      const errors: string[] = [];
      let successCount = 0;

      // Schedule each reminder
      for (const reminderDate of reminderDates) {
        try {
          // Create a reminder task
          const reminderData = {
            tenantId: new Types.ObjectId(tenantId),
            workOrderId: new Types.ObjectId(workOrderId),
            clientId: client._id,
            recipientPhone,
            messageContent,
            reminderType: this.getReminderTypeFromDate(scheduledDate, reminderDate),
            scheduledFor: reminderDate,
            status: 'pending' as const,
            createdAt: new Date()
          };

          // Use the existing SMS reminder service to schedule
          await SmsReminderService.scheduleReminder(reminderData);
          successCount++;
        } catch (error) {
          const errorMsg = `Failed to schedule reminder for ${reminderDate.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }

      if (successCount === 0) {
        return {
          success: false,
          message: 'Failed to schedule any reminders',
          errors
        };
      }

      return {
        success: true,
        message: `Successfully scheduled ${successCount} SMS reminder(s)`,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Error processing SMS reminders for work order:', error);
      return {
        success: false,
        message: `Failed to process SMS reminders: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate message content based on template type and context
   */
  private static generateMessage(config: SmsReminderConfig, context: MessageContext): string {
    if (config.templateType === 'custom' && config.customMessage) {
      return MessageTemplateService.processTemplate(config.customMessage, context);
    }

    // Use predefined templates
    let template: string;
    if (config.templateType === 'yearly') {
      template = `Hello {{client.name}}, this is a reminder about your yearly service appointment with {{company.name}} scheduled for {{workOrder.scheduledDate}}. Please contact us at {{company.phone}} if you need to reschedule.`;
    } else {
      // Default to monthly
      template = `Hello {{client.name}}, this is a reminder about your monthly service appointment with {{company.name}} scheduled for {{workOrder.scheduledDate}}. Please contact us at {{company.phone}} if you need to reschedule.`;
    }

    return MessageTemplateService.processTemplate(template, context);
  }

  /**
   * Calculate reminder dates based on scheduled date and reminder types
   */
  private static calculateReminderDates(
    scheduledDate: Date,
    reminderTypes: ('1hour' | '1day' | '1week' | '1month')[]
  ): Date[] {
    const reminderDates: Date[] = [];
    const now = new Date();

    // Defensive check - ensure reminderTypes is iterable
    if (!Array.isArray(reminderTypes) || reminderTypes.length === 0) {
      smsLogger.warn('calculateReminderDates: reminderTypes is not a valid array, using default', { reminderTypes });
      reminderTypes = ['1day']; // fallback to default
    }

    for (const type of reminderTypes) {
      const reminderDate = new Date(scheduledDate);

      switch (type) {
        case '1hour':
          reminderDate.setHours(reminderDate.getHours() - 1);
          break;
        case '1day':
          reminderDate.setDate(reminderDate.getDate() - 1);
          break;
        case '1week':
          reminderDate.setDate(reminderDate.getDate() - 7);
          break;
        case '1month':
          reminderDate.setMonth(reminderDate.getMonth() - 1);
          break;
      }

      // Only schedule reminders for future dates
      if (reminderDate > now) {
        reminderDates.push(reminderDate);
      }
    }

    return reminderDates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Determine reminder type from the difference between scheduled and reminder dates
   */
  private static getReminderTypeFromDate(scheduledDate: Date, reminderDate: Date): string {
    const diffMs = scheduledDate.getTime() - reminderDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours <= 1.5) return '1hour';
    if (diffDays <= 1.5) return '1day';
    if (diffDays <= 8) return '1week';
    return '1month';
  }

  /**
   * Cancel existing SMS reminders for a work order
   */
  static async cancelSmsReminders(workOrderId: string, tenantId: string): Promise<void> {
    try {
      await SmsReminderService.cancelRemindersForWorkOrder(workOrderId, tenantId);
    } catch (error) {
      console.error('Error canceling SMS reminders for work order:', error);
      throw error;
    }
  }

  /**
   * Update SMS reminders when work order is modified
   */
  static async updateSmsReminders(
    workOrderId: string,
    smsConfig: SmsReminderConfig,
    tenantId: string
  ): Promise<{ success: boolean; message?: string; errors?: string[] }> {
    try {
      // Cancel existing reminders first
      await this.cancelSmsReminders(workOrderId, tenantId);

      // Process new reminders if enabled
      if (smsConfig.enabled) {
        return await this.processSmsReminders(workOrderId, smsConfig, tenantId);
      }

      return { success: true, message: 'SMS reminders cancelled' };
    } catch (error) {
      console.error('Error updating SMS reminders for work order:', error);
      return {
        success: false,
        message: `Failed to update SMS reminders: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}