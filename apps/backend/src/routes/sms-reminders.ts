import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SmsReminderService, SmsReminderConfig } from "../services/sms-reminder-service";
import { MessageTemplateService } from "../services/message-template-service";
import { YubotoService, YUBOTO_STATUS_MAP, YubotoMessageStatus } from "../services/yuboto-service";
import { Task } from "../models/Task";
import { Client } from "../models/Client";
import { WorkOrder } from "../models/WorkOrder";
import { apiLogger, smsLogger } from "../utils/logger";

// Default configuration - should be moved to environment variables
const defaultConfig: SmsReminderConfig = {
  enabled: process.env.SMS_REMINDERS_ENABLED === 'true',
  yuboto: {
    apiKey: process.env.YUBOTO_API_KEY || '',
    sender: process.env.YUBOTO_SENDER || 'FSA',
    priority: (process.env.YUBOTO_PRIORITY as 'sms' | 'viber') || 'viber',
    fallbackToSms: process.env.YUBOTO_FALLBACK_SMS !== 'false'
  },
  company: {
    name: process.env.COMPANY_NAME || 'Field Service Automation',
    phone: process.env.COMPANY_PHONE || '+1-800-FSA-HELP',
    email: process.env.COMPANY_EMAIL || 'support@fsa.com'
  },
  templates: {
    monthly: process.env.SMS_TEMPLATE_MONTHLY || 'Hello {{contactPerson.name}}, this is a reminder that your {{service.type}} service for {{client.company}} is due on {{service.nextDue}}. Please schedule an appointment. Contact us: {{company.phone}}',
    yearly: process.env.SMS_TEMPLATE_YEARLY || 'Dear {{contactPerson.name}}, your annual {{service.type}} service is due for {{client.company}}. Schedule now to ensure compliance. Call: {{company.phone}}',
    custom: process.env.SMS_TEMPLATE_CUSTOM || 'Hi {{contactPerson.name}}, time for your {{service.type}} service at {{client.company}}. {{service.description}} Contact: {{company.phone}}',
    urgent: process.env.SMS_TEMPLATE_URGENT || 'URGENT: {{contactPerson.name}}, {{service.type}} service overdue for {{client.company}}. Please schedule immediately: {{company.phone}}'
  }
};

// SMS Reminder routes
export async function smsReminderRoutes(fastify: FastifyInstance) {
  // POST /api/v1/sms-reminders/process - Process pending SMS reminders (for cron job)
  fastify.post(
    "/process",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!defaultConfig.enabled || !defaultConfig.yuboto.apiKey) {
          return reply.send({
            success: false,
            error: "SMS reminders not configured or disabled",
            processed: 0,
          });
        }

        const smsService = new SmsReminderService(defaultConfig);
        const result = await smsService.processPendingSmsReminders();

        return reply.send({
          success: true,
          processed: result.processed,
          total: result.results.length,
          errors: result.errors,
          summary: {
            sent: result.results.filter(r => r.success).length,
            skipped: result.results.filter(r => r.skipped).length,
            failed: result.results.filter(r => !r.success && !r.skipped).length
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        fastify.log.error(`SMS reminder processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // GET /api/v1/sms-reminders/pending - Get tasks eligible for SMS reminders
  fastify.get(
    "/pending",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!defaultConfig.enabled || !defaultConfig.yuboto.apiKey) {
          return reply.send({
            success: false,
            error: "SMS reminders not configured",
            tasks: [],
            count: 0,
          });
        }

        const smsService = new SmsReminderService(defaultConfig);
        const tasks = await smsService.getTasksForSmsReminders();

        // Get additional task details for display
        const tasksWithDetails = await Promise.all(
          tasks.map(async (task) => {
            const client = task.clientId ? await Client.findById(task.clientId) : null;
            const phoneNumber = client ? MessageTemplateService.getMessagePhoneNumber({ client }) : null;

            return {
              id: task._id,
              title: task.title,
              clientName: task.clientName || client?.name || 'Unknown',
              clientCompany: task.clientCompany || client?.company || '',
              dueDate: task.dueDate,
              phoneNumber,
              formattedPhone: phoneNumber ? YubotoService.formatPhoneNumber(phoneNumber) : null,
              reminderType: task.reminder?.type,
              nextReminder: task.reminder?.nextReminder,
              lastSent: task.reminder?.lastSent,
            };
          })
        );

        return reply.send({
          success: true,
          tasks: tasksWithDetails,
          count: tasksWithDetails.length,
        });
      } catch (error) {
        fastify.log.error(`Get pending SMS reminders error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // POST /api/v1/sms-reminders/send/:taskId - Send SMS reminder for specific task
  fastify.post(
    "/send/:taskId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            taskId: { type: "string" },
          },
          required: ["taskId"],
        },
        body: {
          type: "object",
          properties: {
            templateType: {
              type: "string",
              enum: ["monthly", "yearly", "custom", "urgent"],
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { taskId: string };
        Body: { templateType?: 'monthly' | 'yearly' | 'custom' | 'urgent' };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        if (!defaultConfig.enabled || !defaultConfig.yuboto.apiKey) {
          return reply.status(400).send({
            success: false,
            error: "SMS reminders not configured or disabled",
          });
        }

        const { taskId } = request.params;
        const { templateType = 'monthly' } = request.body || {};

        const task = await Task.findById(taskId);
        if (!task) {
          return reply.status(404).send({
            success: false,
            error: "Task not found",
          });
        }

        const smsService = new SmsReminderService(defaultConfig);
        const result = await smsService.sendTaskReminder(task, templateType);

        if (result.success) {
          // Mark reminder as sent in the database
          const { ReminderService } = await import("../services/reminder-service");
          await ReminderService.markReminderSent(taskId);
        }

        return reply.send({
          success: result.success,
          result,
        });
      } catch (error) {
        fastify.log.error(`Send SMS reminder error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // POST /api/v1/sms-reminders/test - Test SMS service configuration
  fastify.post(
    "/test",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            phoneNumber: { type: "string" },
            message: { type: "string" },
          },
          required: ["phoneNumber"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { phoneNumber: string; message?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        if (!defaultConfig.enabled || !defaultConfig.yuboto.apiKey) {
          return reply.status(400).send({
            success: false,
            error: "SMS reminders not configured or disabled",
          });
        }

        const { phoneNumber, message } = request.body;
        const requestId = `sms_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        smsLogger.info('SMS Test Debug', {
          requestId,
          phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          messageLength: message?.length || 0,
          configStatus: {
            hasApiKey: !!defaultConfig.yuboto.apiKey,
            sender: defaultConfig.yuboto.sender,
            priority: defaultConfig.yuboto.priority
          }
        });

        const smsService = new SmsReminderService(defaultConfig);
        const result = await smsService.sendTestMessage(phoneNumber, message);

        smsLogger.info('SMS Test Result', {
          requestId,
          success: result.success,
          messageId: result.messageId || null,
          error: result.error,
          provider: 'yuboto'
        });

        return reply.send({
          success: result.success,
          result,
        });
      } catch (error) {
        fastify.log.error(`SMS test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // GET /api/v1/sms-reminders/status - Get SMS service status and configuration
  fastify.get(
    "/status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const status = {
          enabled: defaultConfig.enabled,
          configured: !!defaultConfig.yuboto.apiKey,
          sender: defaultConfig.yuboto.sender,
          priority: defaultConfig.yuboto.priority,
          fallbackToSms: defaultConfig.yuboto.fallbackToSms,
          company: defaultConfig.company,
        };

        // Test service if configured
        let serviceStatus = null;
        if (defaultConfig.enabled && defaultConfig.yuboto.apiKey) {
          const smsService = new SmsReminderService(defaultConfig);
          serviceStatus = await smsService.testService();
        }

        return reply.send({
          success: true,
          status,
          service: serviceStatus,
        });
      } catch (error) {
        fastify.log.error(`SMS status check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // GET /api/v1/sms-reminders/templates - Get available message templates
  fastify.get(
    "/templates",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const templates = Object.entries(defaultConfig.templates).map(([type, content]) => ({
          type,
          content,
          variables: MessageTemplateService.extractVariables(content),
          validation: MessageTemplateService.validateTemplate(content),
        }));

        return reply.send({
          success: true,
          templates,
          defaultTemplates: MessageTemplateService.DEFAULT_TEMPLATES,
        });
      } catch (error) {
        fastify.log.error(`Get templates error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // POST /api/v1/sms-reminders/preview - Preview message with template and context
  fastify.post(
    "/preview",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            template: { type: "string" },
            taskId: { type: "string" },
          },
          required: ["template", "taskId"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { template: string; taskId: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { template, taskId } = request.body;

        const task = await Task.findById(taskId);
        if (!task) {
          return reply.status(404).send({
            success: false,
            error: "Task not found",
          });
        }

        const client = task.clientId ? await Client.findById(task.clientId) : null;
        if (!client) {
          return reply.status(404).send({
            success: false,
            error: "Client not found",
          });
        }

        const workOrder = task.workOrderId ? await WorkOrder.findById(task.workOrderId) : null;

        // Create message context
        const messageContext = MessageTemplateService.createMessageContext(
          client,
          workOrder,
          task,
          {
            type: 'Service Appointment',
            description: task.description || 'Service reminder',
            nextDue: task.dueDate
          },
          defaultConfig.company
        );

        const preview = MessageTemplateService.previewMessage(template, messageContext);

        return reply.send({
          success: true,
          preview,
          context: {
            client: {
              name: client.name,
              company: client.company,
              phone: client.phone,
              contactPerson: client.contactPerson
            },
            task: {
              title: task.title,
              description: task.description,
              dueDate: task.dueDate
            },
            workOrder: workOrder ? {
              title: workOrder.title,
              workOrderNumber: workOrder.workOrderNumber
            } : null
          }
        });
      } catch (error) {
        fastify.log.error(`Preview message error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // GET /api/v1/sms-reminders/delivery-status/:messageId - Get delivery status for a message
  fastify.get(
    "/delivery-status/:messageId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            messageId: { type: "string" },
          },
          required: ["messageId"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        if (!defaultConfig.enabled || !defaultConfig.yuboto.apiKey) {
          return reply.status(400).send({
            success: false,
            error: "SMS service not configured",
          });
        }

        const { messageId } = request.params;

        const smsService = new SmsReminderService(defaultConfig);
        const status = await smsService.getMessageStatus(messageId);

        return reply.send({
          success: true,
          status,
        });
      } catch (error) {
        fastify.log.error(`Get delivery status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({
          success: false,
          error: "Internal server error",
        });
      }
    },
  );

  // POST /api/v1/sms-reminders/activate - Activate SMS reminder service for work order
  fastify.post(
    "/activate",
    {
      schema: {
        body: {
          type: "object",
          required: ["workOrderId", "config"],
          properties: {
            workOrderId: { type: "string" },
            config: {
              type: "object",
              required: ["reminderType", "selectedPhoneNumber", "messageType"],
              properties: {
                reminderType: { type: "string", enum: ["monthly", "yearly", "custom", "test"] },
                customReminderDate: { type: "string" },
                customReminderInterval: { type: "string", enum: ["monthly", "yearly"] },
                selectedPhoneNumber: { type: "string" },
                selectedRecipientName: { type: "string" },
                messageType: { type: "string", enum: ["preset", "custom"] },
                customMessage: { type: "string" },
                presetMessageId: { type: "string" }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Body: {
        workOrderId: string;
        config: {
          reminderType: "monthly" | "yearly" | "custom" | "test";
          customReminderDate?: string;
          customReminderInterval?: "monthly" | "yearly";
          selectedPhoneNumber: string;
          selectedRecipientName?: string;
          messageType: "preset" | "custom";
          customMessage?: string;
          presetMessageId?: string;
        };
      };
    }>, reply: FastifyReply) => {
      try {
        const { workOrderId, config } = request.body;

        // Get work order
        const workOrder = await WorkOrder.findById(workOrderId).populate('clientId');
        if (!workOrder) {
          return reply.status(404).send({
            success: false,
            error: "Work order not found"
          });
        }

        // Calculate next scheduled date based on reminder type
        let nextScheduled: Date | null = null;
        if (config.reminderType === 'monthly') {
          nextScheduled = new Date();
          nextScheduled.setMonth(nextScheduled.getMonth() + 1);
        } else if (config.reminderType === 'yearly') {
          nextScheduled = new Date();
          nextScheduled.setFullYear(nextScheduled.getFullYear() + 1);
        } else if (config.reminderType === 'custom' && config.customReminderDate) {
          nextScheduled = new Date(config.customReminderDate);
        } else if (config.reminderType === 'test') {
          // For testing, schedule in 1 minute
          nextScheduled = new Date();
          nextScheduled.setMinutes(nextScheduled.getMinutes() + 1);
        }

        // Update work order with SMS reminder configuration
        const smsReminderConfig = {
          enabled: true,
          serviceActive: true,
          reminderType: config.reminderType,
          customReminderDate: config.customReminderDate,
          customReminderInterval: config.customReminderInterval,
          selectedPhoneNumber: config.selectedPhoneNumber,
          selectedRecipientName: config.selectedRecipientName,
          messageType: config.messageType,
          customMessage: config.customMessage,
          presetMessageId: config.presetMessageId || 'monthly-service',
          nextScheduled,
          lastSent: null
        };

        await WorkOrder.findByIdAndUpdate(workOrderId, {
          smsReminders: smsReminderConfig
        });

        return reply.send({
          success: true,
          config: smsReminderConfig,
          nextScheduled
        });

      } catch (error) {
        smsLogger.error('SMS reminder activation error', {
          workOrderId: request.body.workOrderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // POST /api/v1/sms-reminders/deactivate - Deactivate SMS reminder service for work order
  fastify.post(
    "/deactivate",
    {
      schema: {
        body: {
          type: "object",
          required: ["workOrderId"],
          properties: {
            workOrderId: { type: "string" }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Body: { workOrderId: string };
    }>, reply: FastifyReply) => {
      try {
        const { workOrderId } = request.body;

        // Update work order to deactivate SMS reminders
        await WorkOrder.findByIdAndUpdate(workOrderId, {
          'smsReminders.serviceActive': false,
          'smsReminders.nextScheduled': null
        });

        return reply.send({
          success: true,
          message: "SMS reminder service deactivated"
        });

      } catch (error) {
        smsLogger.error('SMS reminder deactivation error', {
          workOrderId: request.body.workOrderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // GET /api/v1/sms-reminders/presets - Get preset message templates
  fastify.get(
    "/presets",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            language: { type: "string", enum: ["en", "el"], default: "en" }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Querystring: { language?: "en" | "el" };
    }>, reply: FastifyReply) => {
      try {
        const language = request.query?.language || "en";

        // Language-specific presets
        const presetTemplates = {
          en: [
            {
              id: 'monthly-service',
              title: 'Monthly Service Reminder',
              content: 'Hello {{recipientName}}, this is a reminder that your monthly service for {{workOrderTitle}} is scheduled for {{scheduledDate}}. Please contact us to confirm your appointment. Thank you!',
              variables: ['recipientName', 'workOrderTitle', 'scheduledDate']
            },
            {
              id: 'yearly-service',
              title: 'Yearly Service Reminder',
              content: 'Hello {{recipientName}}, this is a reminder that your yearly service for {{workOrderTitle}} is scheduled for {{scheduledDate}}. Please contact us to confirm your appointment. Thank you!',
              variables: ['recipientName', 'workOrderTitle', 'scheduledDate']
            },
            {
              id: 'custom-service',
              title: 'Custom Service Reminder',
              content: 'Hello {{recipientName}}, this is a reminder about your upcoming service for {{workOrderTitle}} scheduled for {{scheduledDate}}. Please contact us to confirm your appointment. Thank you!',
              variables: ['recipientName', 'workOrderTitle', 'scheduledDate']
            }
          ],
          el: [
            {
              id: 'monthly-service',
              title: 'Υπενθύμιση Μηνιαίας Συντήρησης',
              content: 'Γεια σας {{recipientName}}, σας υπενθυμίζουμε ότι η μηνιαία συντήρηση για {{workOrderTitle}} είναι προγραμματισμένη για {{scheduledDate}}. Παρακαλώ επικοινωνήστε μαζί μας για επιβεβαίωση του ραντεβού. Ευχαριστούμε!',
              variables: ['recipientName', 'workOrderTitle', 'scheduledDate']
            },
            {
              id: 'yearly-service',
              title: 'Υπενθύμιση Ετήσιας Συντήρησης',
              content: 'Γεια σας {{recipientName}}, σας υπενθυμίζουμε ότι η ετήσια συντήρηση για {{workOrderTitle}} είναι προγραμματισμένη για {{scheduledDate}}. Παρακαλώ επικοινωνήστε μαζί μας για επιβεβαίωση του ραντεβού. Ευχαριστούμε!',
              variables: ['recipientName', 'workOrderTitle', 'scheduledDate']
            },
            {
              id: 'custom-service',
              title: 'Προσαρμοσμένη Υπενθύμιση Συντήρησης',
              content: 'Γεια σας {{recipientName}}, σας υπενθυμίζουμε την επερχόμενη συντήρηση για {{workOrderTitle}} που είναι προγραμματισμένη για {{scheduledDate}}. Παρακαλώ επικοινωνήστε μαζί μας για επιβεβαίωση του ραντεβού. Ευχαριστούμε!',
              variables: ['recipientName', 'workOrderTitle', 'scheduledDate']
            }
          ]
        };

        const presets = presetTemplates[language] || presetTemplates.en;

        smsLogger.info('Presets requested', {
          language,
          presetCount: presets.length,
          presetIds: presets.map(p => p.id)
        });

        return reply.send({
          success: true,
          language,
          presets
        });

      } catch (error) {
        smsLogger.error('Get presets error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // POST /api/v1/sms-reminders/send-test - Send test message immediately
  fastify.post(
    "/send-test",
    {
      schema: {
        body: {
          type: "object",
          required: ["phoneNumber", "message"],
          properties: {
            phoneNumber: { type: "string" },
            message: { type: "string" },
            recipientName: { type: "string" }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Body: {
        phoneNumber: string;
        message: string;
        recipientName?: string;
      };
    }>, reply: FastifyReply) => {
      const requestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        smsLogger.info('Test SMS Request', {
          requestId,
          phoneNumber: request.body.phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          messageLength: request.body.message.length,
          recipientName: request.body.recipientName,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
          configStatus: {
            enabled: defaultConfig.enabled,
            hasApiKey: !!defaultConfig.yuboto.apiKey,
            sender: defaultConfig.yuboto.sender,
            priority: defaultConfig.yuboto.priority,
            fallbackToSms: defaultConfig.yuboto.fallbackToSms
          }
        });

        if (!defaultConfig.enabled || !defaultConfig.yuboto.apiKey) {
          smsLogger.warn('SMS service not configured', {
            requestId,
            enabled: defaultConfig.enabled,
            hasApiKey: !!defaultConfig.yuboto.apiKey
          });
          return reply.status(400).send({
            success: false,
            error: "SMS service not configured or disabled"
          });
        }

        const { phoneNumber, message, recipientName } = request.body;

        // Validate phone number
        const formattedPhone = YubotoService.formatPhoneNumber(phoneNumber);
        if (!formattedPhone) {
          smsLogger.warn('Invalid phone number format', {
            requestId,
            original: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
            formatted: formattedPhone
          });
          return reply.status(400).send({
            success: false,
            error: "Invalid phone number format"
          });
        }

        smsLogger.info('Phone number validation', {
          requestId,
          original: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          formatted: formattedPhone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          isValid: YubotoService.validatePhoneNumber(formattedPhone)
        });

        const yubotoService = new YubotoService({
          apiKey: defaultConfig.yuboto.apiKey
        });

        smsLogger.info('Sending test message via Yuboto', {
          requestId,
          to: formattedPhone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          messageLength: message.length,
          sender: defaultConfig.yuboto.sender,
          priority: defaultConfig.yuboto.priority,
          fallbackToSms: defaultConfig.yuboto.fallbackToSms
        });

        const result = await yubotoService.sendMessage({
          phoneNumbers: [formattedPhone],
          message: message,
          sender: defaultConfig.yuboto.sender,
          priority: defaultConfig.yuboto.priority,
          fallbackToSms: defaultConfig.yuboto.fallbackToSms
        });

        smsLogger.info('Yuboto API Response', {
          requestId,
          success: result.success,
          resultCount: result.results.length,
          error: result.error,
          results: result.results.map(r => ({
            messageId: r.id,
            channel: r.channel,
            phoneNumber: r.phonenumber?.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
            status: r.status
          }))
        });

        if (result.success && result.results.length > 0) {
          const messageResult = result.results[0];
          smsLogger.info('Message sent successfully', {
            requestId,
            messageId: messageResult.id,
            channel: messageResult.channel,
            status: messageResult.status,
            phoneNumber: messageResult.phonenumber?.replace(/\d(?=\d{4})/g, '*') // Mask phone number
          });

          return reply.send({
            success: true,
            result: {
              messageId: messageResult.id,
              channel: messageResult.channel,
              status: messageResult.status,
              phoneNumber: messageResult.phonenumber
            },
            message: "Test message sent successfully"
          });
        } else {
          smsLogger.error('Message sending failed', {
            requestId,
            error: result.error,
            results: result.results
          });

          return reply.status(500).send({
            success: false,
            error: result.error || "Failed to send message"
          });
        }

      } catch (error) {
        smsLogger.error('Send test message error', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          requestBody: {
            phoneNumber: request.body.phoneNumber?.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
            messageLength: request.body.message?.length,
            recipientName: request.body.recipientName
          }
        });

        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // POST /api/v1/sms-reminders/webhook - Yuboto delivery status webhook
  fastify.post(
    "/webhook",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            sender: { type: "string" },
            receiver: { type: "string" },
            smsid: { type: "string" },
            status: { type: "number" },
            statusDescription: { type: "string" },
            dlrDate: { type: "string" },
            channel: { type: "string" },
            option1: { type: "string" },
            option2: { type: "string" }
          },
          required: ["smsid", "status", "statusDescription"]
        }
      }
    },
    async (request: FastifyRequest<{
      Body: {
        sender: string;
        receiver: string;
        smsid: string;
        status: number;
        statusDescription: string;
        dlrDate: string;
        channel: string;
        option1?: string;
        option2?: string;
      };
    }>, reply: FastifyReply) => {
      const requestId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        const { smsid, status, statusDescription, dlrDate, channel, receiver, sender, option1, option2 } = request.body;

        // Parse status
        const statusString = statusDescription?.toLowerCase()?.replace(/\s+/g, '_') as YubotoMessageStatus;
        const statusInfo = YUBOTO_STATUS_MAP[statusString] || YUBOTO_STATUS_MAP['unknown'];

        smsLogger.info('Yuboto webhook received', {
          requestId,
          messageId: smsid,
          statusCode: status,
          statusDescription,
          statusMapped: statusString,
          channel: channel?.toLowerCase(),
          receiver: receiver?.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          sender,
          dlrDate,
          isFinal: statusInfo.isFinal,
          category: statusInfo.category,
          option1,
          option2
        });

        // TODO: Update message status in database
        // This could update Task, WorkOrder, or SmsReminder records
        // based on the messageId or custom options

        // For now, just acknowledge receipt
        return reply.send({
          success: true,
          received: true,
          messageId: smsid,
          status: statusString,
          isFinal: statusInfo.isFinal
        });

      } catch (error) {
        smsLogger.error('Yuboto webhook processing error', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          body: request.body
        });

        return reply.status(500).send({
          success: false,
          error: "Webhook processing failed"
        });
      }
    }
  );
}