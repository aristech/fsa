import { IClient } from '../models/Client';
import { IWorkOrder } from '../models/WorkOrder';
import { ITask } from '../models/Task';

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'sms' | 'viber' | 'both';
  subject?: string; // For future use
  content: string;
  variables: string[]; // Available template variables
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageContext {
  client?: IClient;
  workOrder?: IWorkOrder;
  task?: ITask;
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
  service?: {
    type: string;
    description: string;
    nextDue?: Date;
  };
  company?: {
    name: string;
    phone: string;
    email: string;
  };
}

/**
 * Message Template Service for SMS/Viber personalization
 * Handles template management and variable substitution
 */
export class MessageTemplateService {
  /**
   * Default service reminder templates
   */
  static readonly DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Monthly Service Reminder',
      type: 'both',
      content: 'Hello {{contactPerson.name}}, this is a reminder that your {{service.type}} service for {{client.company}} is due on {{service.nextDue}}. Please schedule an appointment. Contact us: {{company.phone}}',
      variables: ['contactPerson.name', 'service.type', 'client.company', 'service.nextDue', 'company.phone'],
      isActive: true
    },
    {
      name: 'Yearly Service Reminder',
      type: 'both',
      content: 'Dear {{contactPerson.name}}, your annual {{service.type}} service is due for {{client.company}}. Schedule now to ensure compliance. Call: {{company.phone}}',
      variables: ['contactPerson.name', 'service.type', 'client.company', 'company.phone'],
      isActive: true
    },
    {
      name: 'Custom Service Reminder',
      type: 'both',
      content: 'Hi {{contactPerson.name}}, time for your {{service.type}} service at {{client.company}}. {{service.description}} Contact: {{company.phone}}',
      variables: ['contactPerson.name', 'service.type', 'client.company', 'service.description', 'company.phone'],
      isActive: true
    },
    {
      name: 'Urgent Service Reminder',
      type: 'sms',
      content: 'URGENT: {{contactPerson.name}}, {{service.type}} service overdue for {{client.company}}. Please schedule immediately: {{company.phone}}',
      variables: ['contactPerson.name', 'service.type', 'client.company', 'company.phone'],
      isActive: true
    }
  ];

  /**
   * Process template content with context variables
   */
  static processTemplate(template: string, context: MessageContext): string {
    let processedContent = template;

    // Helper function to safely get nested property value
    const getNestedValue = (obj: any, path: string): string => {
      const keys = path.split('.');
      let current = obj;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return `{{${path}}}` // Return original placeholder if value not found
        }
      }

      // Format dates
      if (current instanceof Date) {
        return current.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      return current ? String(current) : `{{${path}}}`;
    };

    // Replace all template variables
    processedContent = processedContent.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();

      // Handle different context objects
      if (trimmedPath.startsWith('client.')) {
        const clientPath = trimmedPath.substring(7); // Remove 'client.'
        return context.client ? getNestedValue(context.client, clientPath) : match;
      }

      if (trimmedPath.startsWith('workOrder.')) {
        const workOrderPath = trimmedPath.substring(10); // Remove 'workOrder.'
        return context.workOrder ? getNestedValue(context.workOrder, workOrderPath) : match;
      }

      if (trimmedPath.startsWith('task.')) {
        const taskPath = trimmedPath.substring(5); // Remove 'task.'
        return context.task ? getNestedValue(context.task, taskPath) : match;
      }

      if (trimmedPath.startsWith('contactPerson.')) {
        const contactPath = trimmedPath.substring(14); // Remove 'contactPerson.'
        return context.contactPerson ? getNestedValue(context.contactPerson, contactPath) : match;
      }

      if (trimmedPath.startsWith('service.')) {
        const servicePath = trimmedPath.substring(8); // Remove 'service.'
        return context.service ? getNestedValue(context.service, servicePath) : match;
      }

      if (trimmedPath.startsWith('company.')) {
        const companyPath = trimmedPath.substring(8); // Remove 'company.'
        return context.company ? getNestedValue(context.company, companyPath) : match;
      }

      return match; // Return original if no context found
    });

    return processedContent;
  }

  /**
   * Extract all template variables from a template string
   */
  static extractVariables(template: string): string[] {
    const variables: string[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Validate template syntax
   */
  static validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed brackets
    const openBrackets = (template.match(/\{\{/g) || []).length;
    const closeBrackets = (template.match(/\}\}/g) || []).length;

    if (openBrackets !== closeBrackets) {
      errors.push('Mismatched template brackets {{}}');
    }

    // Check for nested brackets
    if (template.includes('{{{') || template.includes('}}}')) {
      errors.push('Nested brackets are not allowed');
    }

    // Check for empty variables
    if (template.includes('{{}}')) {
      errors.push('Empty template variables are not allowed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get appropriate phone number for messaging
   * Priority: contactPerson.phone -> client.phone
   */
  static getMessagePhoneNumber(context: MessageContext): string | null {
    // First try contact person phone
    if (context.contactPerson?.phone) {
      return context.contactPerson.phone;
    }

    // Fallback to client phone
    if (context.client?.phone) {
      return context.client.phone;
    }

    return null;
  }

  /**
   * Get recipient name for messaging
   * Priority: contactPerson.name -> client.name
   */
  static getRecipientName(context: MessageContext): string {
    if (context.contactPerson?.name) {
      return context.contactPerson.name;
    }

    if (context.client?.name) {
      return context.client.name;
    }

    return 'Valued Customer';
  }

  /**
   * Create message context from work order and related data
   */
  static createMessageContext(
    client: IClient,
    workOrder?: IWorkOrder,
    task?: ITask,
    serviceInfo?: {
      type: string;
      description: string;
      nextDue?: Date;
    },
    companyInfo?: {
      name: string;
      phone: string;
      email: string;
    }
  ): MessageContext {
    return {
      client,
      workOrder,
      task,
      contactPerson: client.contactPerson ? {
        name: client.contactPerson.name,
        phone: client.contactPerson.phone,
        email: client.contactPerson.email
      } : undefined,
      service: serviceInfo,
      company: companyInfo || {
        name: 'Field Service Automation',
        phone: '+1-800-FSA-HELP',
        email: 'support@fsa.com'
      }
    };
  }

  /**
   * Preview message with context
   */
  static previewMessage(template: string, context: MessageContext): {
    processedMessage: string;
    missingVariables: string[];
    recipientPhone: string | null;
    recipientName: string;
  } {
    const processedMessage = this.processTemplate(template, context);
    const allVariables = this.extractVariables(template);
    const processedVariables = this.extractVariables(processedMessage);

    // Variables that still have placeholders after processing are missing
    const missingVariables = processedVariables.filter(v =>
      processedMessage.includes(`{{${v}}}`)
    );

    return {
      processedMessage,
      missingVariables,
      recipientPhone: this.getMessagePhoneNumber(context),
      recipientName: this.getRecipientName(context)
    };
  }
}