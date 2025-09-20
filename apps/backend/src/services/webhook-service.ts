import crypto from "crypto";
import { Webhook, IWebhook } from "../models/Webhook";
import { WebhookLog } from "../models/WebhookLog";

// ----------------------------------------------------------------------

export interface WebhookPayload {
  id: string;
  topic: string;
  data: any;
  timestamp: string;
  tenantId: string;
  apiVersion: string;
}

// ----------------------------------------------------------------------

export class WebhookService {
  /**
   * Trigger webhooks for a specific topic
   */
  static async triggerWebhooks(
    tenantId: string,
    topic: string,
    data: any,
    eventId?: string
  ): Promise<void> {
    try {
      // Find all active webhooks that listen to this topic
      const webhooks = await Webhook.find({
        tenantId,
        status: true,
        topics: topic,
      });

      if (webhooks.length === 0) {
        console.log(`No active webhooks found for topic: ${topic} in tenant: ${tenantId}`);
        return;
      }

      // Process webhooks in parallel
      const promises = webhooks.map((webhook) =>
        this.processWebhook(webhook, topic, data, eventId)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("Error triggering webhooks:", error);
    }
  }

  /**
   * Process a single webhook
   */
  private static async processWebhook(
    webhook: IWebhook,
    topic: string,
    data: any,
    eventId?: string
  ): Promise<void> {
    const payload: WebhookPayload = {
      id: eventId || crypto.randomUUID(),
      topic,
      data,
      timestamp: new Date().toISOString(),
      tenantId: webhook.tenantId,
      apiVersion: webhook.apiVersion,
    };

    let attempt = 1;
    const maxRetries = webhook.maxRetries + 1; // +1 for initial attempt

    while (attempt <= maxRetries) {
      const success = await this.deliverWebhook(webhook, payload, attempt);

      if (success) {
        // Update webhook last triggered time
        await Webhook.findByIdAndUpdate(webhook._id, {
          lastTriggeredAt: new Date(),
          failureCount: 0,
        });
        break;
      }

      attempt++;

      if (attempt <= maxRetries) {
        // Exponential backoff: 2^attempt seconds
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If all attempts failed, increment failure count
    if (attempt > maxRetries) {
      await Webhook.findByIdAndUpdate(webhook._id, {
        $inc: { failureCount: 1 },
      });

      // Disable webhook if too many failures
      if (webhook.failureCount >= 10) {
        await Webhook.findByIdAndUpdate(webhook._id, {
          status: false,
        });
        console.error(`Webhook ${webhook._id} disabled due to excessive failures`);
      }
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  private static async deliverWebhook(
    webhook: IWebhook,
    payload: WebhookPayload,
    attempt: number
  ): Promise<boolean> {
    const startTime = Date.now();
    let httpStatus: number | undefined;
    let responseBody: string | undefined;
    let errorMessage: string | undefined;
    let success = false;

    try {
      // Create signature for webhook security
      const signature = this.createSignature(
        JSON.stringify(payload),
        webhook.secretKey
      );

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'FSA-Webhook/1.0',
        'X-FSA-Signature': signature,
        'X-FSA-Topic': payload.topic,
        'X-FSA-Webhook-Id': webhook._id,
        'X-FSA-Delivery-Id': crypto.randomUUID(),
        'X-FSA-Attempt': attempt.toString(),
        ...webhook.headers,
      };

      // Make HTTP request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutMs);

      const response = await fetch(webhook.deliveryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      httpStatus = response.status;
      responseBody = await response.text().catch(() => 'Failed to read response');

      // Consider 2xx status codes as successful
      success = response.status >= 200 && response.status < 300;

      if (!success) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (error: any) {
      errorMessage = error.message || 'Unknown error occurred';

      if (error.name === 'AbortError') {
        errorMessage = `Request timeout after ${webhook.timeoutMs}ms`;
      }
    }

    const processingTime = Date.now() - startTime;

    // Log the delivery attempt
    await WebhookLog.create({
      webhookId: webhook._id,
      tenantId: webhook.tenantId,
      topic: payload.topic,
      payload,
      deliveryUrl: webhook.deliveryUrl,
      httpStatus,
      responseBody: responseBody?.substring(0, 10000), // Limit size
      errorMessage,
      attempt,
      success,
      processingTimeMs: processingTime,
    });

    return success;
  }

  /**
   * Create HMAC signature for webhook security
   */
  private static createSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.createSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Test webhook delivery
   */
  static async testWebhook(webhookId: string): Promise<{
    success: boolean;
    httpStatus?: number;
    responseBody?: string;
    errorMessage?: string;
    processingTimeMs: number;
  }> {
    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      topic: 'test.ping',
      data: {
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      tenantId: webhook.tenantId,
      apiVersion: webhook.apiVersion,
    };

    const startTime = Date.now();
    let httpStatus: number | undefined;
    let responseBody: string | undefined;
    let errorMessage: string | undefined;
    let success = false;

    try {
      const signature = this.createSignature(
        JSON.stringify(testPayload),
        webhook.secretKey
      );

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'FSA-Webhook/1.0',
        'X-FSA-Signature': signature,
        'X-FSA-Topic': 'test.ping',
        'X-FSA-Webhook-Id': webhook._id,
        'X-FSA-Delivery-Id': crypto.randomUUID(),
        'X-FSA-Attempt': '1',
        'X-FSA-Test': 'true',
        ...webhook.headers,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutMs);

      const response = await fetch(webhook.deliveryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      httpStatus = response.status;
      responseBody = await response.text().catch(() => 'Failed to read response');
      success = response.status >= 200 && response.status < 300;

      if (!success) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (error: any) {
      errorMessage = error.message || 'Unknown error occurred';

      if (error.name === 'AbortError') {
        errorMessage = `Request timeout after ${webhook.timeoutMs}ms`;
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Log the test delivery
    await WebhookLog.create({
      webhookId: webhook._id,
      tenantId: webhook.tenantId,
      topic: 'test.ping',
      payload: testPayload,
      deliveryUrl: webhook.deliveryUrl,
      httpStatus,
      responseBody: responseBody?.substring(0, 10000),
      errorMessage,
      attempt: 1,
      success,
      processingTimeMs,
    });

    return {
      success,
      httpStatus,
      responseBody,
      errorMessage,
      processingTimeMs,
    };
  }
}

// ----------------------------------------------------------------------

// Available webhook topics
export const WEBHOOK_TOPICS = [
  'work_order.created',
  'work_order.updated',
  'work_order.deleted',
  'work_order.status_changed',
  'task.created',
  'task.updated',
  'task.deleted',
  'task.status_changed',
  'user.created',
  'user.updated',
  'user.deleted',
  'client.created',
  'client.updated',
  'client.deleted',
] as const;

export type WebhookTopic = typeof WEBHOOK_TOPICS[number];