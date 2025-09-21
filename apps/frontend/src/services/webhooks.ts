import { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface WebhookTopic {
  value: string;
  label: string;
}

export interface Webhook {
  _id: string;
  name: string;
  status: boolean;
  topics: string[];
  deliveryUrl: string;
  lastTriggeredAt?: string;
  failureCount: number;
  maxRetries: number;
  timeoutMs: number;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookFormData {
  name: string;
  deliveryUrl: string;
  topics: string[];
  status?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface WebhookLog {
  _id: string;
  webhookId: string;
  topic: string;
  payload: any;
  deliveryUrl: string;
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  attempt: number;
  success: boolean;
  processingTimeMs: number;
  createdAt: string;
}

export interface WebhookTestResult {
  success: boolean;
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  processingTimeMs: number;
}

// ----------------------------------------------------------------------

export const webhooksApi = {
  // Get all webhooks
  getWebhooks: async (): Promise<{ success: boolean; data: Webhook[] }> => {
    const response = await endpoints.webhook.list();
    return response.data;
  },

  // Get a specific webhook
  getWebhook: async (id: string): Promise<{ success: boolean; data: Webhook }> => {
    const response = await endpoints.webhook.details(id);
    return response.data;
  },

  // Create a new webhook
  createWebhook: async (
    data: WebhookFormData
  ): Promise<{
    success: boolean;
    data: Webhook;
    secretKey: string;
    message: string;
  }> => {
    const response = await endpoints.webhook.create(data);
    return response.data;
  },

  // Update a webhook
  updateWebhook: async (
    id: string,
    data: Partial<WebhookFormData>
  ): Promise<{
    success: boolean;
    data: Webhook;
  }> => {
    const response = await endpoints.webhook.update(id, data);
    return response.data;
  },

  // Delete a webhook
  deleteWebhook: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await endpoints.webhook.delete(id);
    return response.data;
  },

  // Test a webhook
  testWebhook: async (id: string): Promise<{ success: boolean; data: WebhookTestResult }> => {
    const response = await endpoints.webhook.test(id);
    return response.data;
  },

  // Get webhook logs
  getWebhookLogs: async (
    id: string,
    page = 1,
    limit = 50
  ): Promise<{
    success: boolean;
    data: {
      logs: WebhookLog[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> => {
    const response = await endpoints.webhook.logs(id, { page, limit });
    return response.data;
  },

  // Get available topics
  getTopics: async (): Promise<{ success: boolean; data: string[] }> => {
    const response = await endpoints.webhook.topics();
    return response.data;
  },

  // Regenerate webhook secret
  regenerateSecret: async (
    id: string
  ): Promise<{
    success: boolean;
    data: Webhook;
    secretKey: string;
    message: string;
  }> => {
    const response = await endpoints.webhook.regenerateSecret(id);
    return response.data;
  },
};
