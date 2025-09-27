import axios from 'axios';
import { yubotoLogger, logYubotoApiCall, logYubotoApiResponse } from '../utils/logger';

export interface YubotoConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface SendMessageRequest {
  phoneNumbers: string[];
  message: string;
  sender?: string;
  priority?: 'sms' | 'viber';
  fallbackToSms?: boolean;
}

export interface YubotoResponse {
  success: boolean;
  results: Array<{
    id: string;
    channel: 'sms' | 'viber';
    phonenumber: string;
    status: string;
  }>;
  error?: string;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: YubotoMessageStatus;
  statusCode: number;
  channel: 'sms' | 'viber';
  phoneNumber: string;
  timestamp: Date;
  isFinal: boolean;
  description: string;
}

export type YubotoMessageStatus =
  // Non-final statuses
  | 'sent' | 'pending' | 'submitted' | 'scheduled' | 'fallbacksms'
  // Final statuses
  | 'delivered' | 'not_delivered' | 'unknown' | 'error' | 'expired'
  | 'failed' | 'rejected' | 'canceled' | 'seen' | 'clicked'
  | 'blacklisted' | 'unsubscribed' | 'blocked';

export interface YubotoStatusInfo {
  isFinal: boolean;
  description: string;
  category: 'success' | 'pending' | 'failed';
}

export const YUBOTO_STATUS_MAP: Record<YubotoMessageStatus, YubotoStatusInfo> = {
  // Non-final statuses
  'sent': { isFinal: false, description: 'The message has been sent to the final network to be delivered', category: 'pending' },
  'pending': { isFinal: false, description: 'The state of the message is not yet known', category: 'pending' },
  'submitted': { isFinal: false, description: 'The message has been routed for sending', category: 'pending' },
  'scheduled': { isFinal: false, description: 'The message has been scheduled for sending in a future time', category: 'pending' },
  'fallbacksms': { isFinal: false, description: 'The message wasn\'t delivered via Viber and it has been forwarded for sending via SMS', category: 'pending' },

  // Final statuses - Success
  'delivered': { isFinal: true, description: 'The message was successfully delivered', category: 'success' },
  'seen': { isFinal: true, description: 'The recipient has seen the message', category: 'success' },
  'clicked': { isFinal: true, description: 'The recipient has clicked a link in the message', category: 'success' },

  // Final statuses - Failed
  'not_delivered': { isFinal: true, description: 'The message was not delivered', category: 'failed' },
  'unknown': { isFinal: true, description: 'The message took another status from the ones we have available', category: 'failed' },
  'error': { isFinal: true, description: 'Error during the sending process', category: 'failed' },
  'expired': { isFinal: true, description: 'The message wasn\'t delivered within the time frame we\'ve set', category: 'failed' },
  'failed': { isFinal: true, description: 'Sending failed due to insufficient balance in your account', category: 'failed' },
  'rejected': { isFinal: true, description: 'A message is rejected when the system rejects it\'s sending due to routing reasons. Wrong number or not supported termination to a specific network are common reasons', category: 'failed' },
  'canceled': { isFinal: true, description: 'The sending of the message has been canceled', category: 'failed' },
  'blacklisted': { isFinal: true, description: 'The recipient\'s number is blacklisted', category: 'failed' },
  'unsubscribed': { isFinal: true, description: 'The recipient clicked on the unsubscribed option', category: 'failed' },
  'blocked': { isFinal: true, description: 'The Viber Sender Id that sent the message has been blocked', category: 'failed' }
};

/**
 * Yuboto SMS/Viber API Integration Service
 * Handles communication with Yuboto OMNI API for sending SMS and Viber messages
 */
export class YubotoService {
  private config: YubotoConfig;
  private baseUrl: string;

  constructor(config: YubotoConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://services.yuboto.com/omni/v1';
  }

  /**
   * Send SMS message to one or more recipients
   */
  async sendSMS(phoneNumbers: string[], message: string, sender: string = 'FSA'): Promise<YubotoResponse> {
    const requestId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const payload = {
        phonenumbers: phoneNumbers,
        sms: {
          sender,
          text: message,
          typesms: 'sms',
          longsms: 'true',
          priority: 0,
          validity: 180 // 3 hours
        }
      };

      yubotoLogger.info('SMS API Request', {
        requestId,
        url: `${this.baseUrl}/Send`,
        method: 'POST',
        recipients: phoneNumbers.map(p => p.replace(/\d(?=\d{4})/g, '*')), // Mask phone numbers
        messageLength: message.length,
        sender,
        payload
      });

      const response = await axios.post(`${this.baseUrl}/Send`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      logYubotoApiResponse(requestId, response.status, response.data);

      // Check if Yuboto API returned an error despite HTTP 200
      if (response.data.ErrorCode && response.data.ErrorCode !== 0) {
        yubotoLogger.error('Yuboto API Error (HTTP 200 with ErrorCode)', {
          requestId,
          errorCode: response.data.ErrorCode,
          errorMessage: response.data.ErrorMessage,
          message: response.data.Message,
          responseData: response.data
        });

        return {
          success: false,
          results: [],
          error: `Yuboto API Error ${response.data.ErrorCode}: ${response.data.ErrorMessage || 'Unknown error'}`
        };
      }

      // Log individual message results
      if (response.data.results && Array.isArray(response.data.results)) {
        response.data.results.forEach((result: any, index: number) => {
          yubotoLogger.info('SMS Message Result', {
            requestId,
            resultIndex: index + 1,
            messageId: result.id,
            channel: result.channel,
            phoneNumber: result.phonenumber?.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
            status: result.status
          });
        });
      }

      return {
        success: true,
        results: response.data.results || []
      };
    } catch (error: any) {
      yubotoLogger.error('SMS API Error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        results: [],
        error: error?.response?.data?.error || error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send Viber message to one or more recipients with SMS fallback
   */
  async sendViber(phoneNumbers: string[], message: string, sender: string = 'FSA', fallbackToSms: boolean = true): Promise<YubotoResponse> {
    const requestId = `viber_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const payload = {
        phonenumbers: phoneNumbers,
        viber: {
          sender,
          text: message,
          validity: 180,
          expiryText: 'This service reminder has expired',
          priority: 0,
          ...(fallbackToSms && {
            fallbackOnFailed: {
              notDelivered: 'true',
              userBlocked: 'true',
              expired: 'true'
            }
          })
        },
        ...(fallbackToSms && {
          sms: {
            sender,
            text: message,
            typesms: 'sms',
            longsms: 'true',
            priority: 1,
            validity: 180
          }
        })
      };

      yubotoLogger.info('Viber API Request', {
        requestId,
        url: `${this.baseUrl}/Send`,
        method: 'POST',
        recipients: phoneNumbers.map(p => p.replace(/\d(?=\d{4})/g, '*')), // Mask phone numbers
        messageLength: message.length,
        sender,
        fallbackEnabled: fallbackToSms,
        payload
      });

      const response = await axios.post(`${this.baseUrl}/Send`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      logYubotoApiResponse(requestId, response.status, response.data);

      // Check if Yuboto API returned an error despite HTTP 200
      if (response.data.ErrorCode && response.data.ErrorCode !== 0) {
        yubotoLogger.error('Yuboto API Error (HTTP 200 with ErrorCode)', {
          requestId,
          errorCode: response.data.ErrorCode,
          errorMessage: response.data.ErrorMessage,
          message: response.data.Message,
          responseData: response.data
        });

        return {
          success: false,
          results: [],
          error: `Yuboto API Error ${response.data.ErrorCode}: ${response.data.ErrorMessage || 'Unknown error'}`
        };
      }

      // Log individual message results
      if (response.data.results && Array.isArray(response.data.results)) {
        response.data.results.forEach((result: any, index: number) => {
          yubotoLogger.info('Viber Message Result', {
            requestId,
            resultIndex: index + 1,
            messageId: result.id,
            channel: result.channel,
            phoneNumber: result.phonenumber?.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
            status: result.status,
            willFallback: fallbackToSms && result.channel === 'viber'
          });
        });
      }

      return {
        success: true,
        results: response.data.results || []
      };
    } catch (error: any) {
      yubotoLogger.error('Viber API Error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
        fallbackEnabled: fallbackToSms,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        results: [],
        error: error?.response?.data?.error || error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send message with automatic channel selection (Viber first, SMS fallback)
   */
  async sendMessage(request: SendMessageRequest): Promise<YubotoResponse> {
    const { phoneNumbers, message, sender = 'FSA', priority = 'viber', fallbackToSms = true } = request;
    const requestId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    yubotoLogger.info('Send Message Request', {
      requestId,
      recipients: phoneNumbers.map(p => p.replace(/\d(?=\d{4})/g, '*')), // Mask phone numbers
      messageLength: message.length,
      sender,
      priority,
      fallbackToSms,
      method: priority === 'viber' ? 'sendViber' : 'sendSMS'
    });

    let result: YubotoResponse;

    if (priority === 'viber') {
      result = await this.sendViber(phoneNumbers, message, sender, fallbackToSms);
    } else {
      result = await this.sendSMS(phoneNumbers, message, sender);
    }

    yubotoLogger.info('Send Message Complete', {
      requestId,
      success: result.success,
      resultCount: result.results.length,
      error: result.error,
      messageIds: result.results.map(r => r.id),
      channels: result.results.map(r => r.channel),
      statuses: result.results.map(r => r.status)
    });

    return result;
  }

  /**
   * Get delivery status for a specific message
   */
  async getDeliveryStatus(messageId: string): Promise<MessageDeliveryStatus | null> {
    const requestId = `dlr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      yubotoLogger.info('Delivery Status Request', {
        requestId,
        url: `${this.baseUrl}/Dlr`,
        method: 'GET',
        messageId
      });

      const response = await axios.get(`${this.baseUrl}/Dlr`, {
        params: {
          smsId: messageId
        },
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      yubotoLogger.info('Delivery Status Response', {
        requestId,
        status: response.status,
        statusText: response.statusText,
        dataLength: response.data ? response.data.length : 0,
        data: response.data
      });

      if (response.data && response.data.length > 0) {
        const status = response.data[0];
        const statusString = status.status?.toLowerCase()?.replace(/\s+/g, '_') as YubotoMessageStatus;
        const statusInfo = YUBOTO_STATUS_MAP[statusString] || YUBOTO_STATUS_MAP['unknown'];

        const deliveryStatus: MessageDeliveryStatus = {
          messageId,
          status: statusString || 'unknown',
          statusCode: status.statusCode || status.status || 0,
          channel: (status.channel?.toLowerCase() || 'sms') as 'sms' | 'viber',
          phoneNumber: status.phonenumber,
          timestamp: new Date(status.dlrDate),
          isFinal: statusInfo.isFinal,
          description: statusInfo.description
        };

        yubotoLogger.info('Parsed Delivery Status', {
          requestId,
          messageId: deliveryStatus.messageId,
          status: deliveryStatus.status,
          statusCode: deliveryStatus.statusCode,
          channel: deliveryStatus.channel,
          phoneNumber: deliveryStatus.phoneNumber?.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
          timestamp: deliveryStatus.timestamp.toISOString(),
          isFinal: deliveryStatus.isFinal,
          description: deliveryStatus.description,
          category: statusInfo.category
        });

        return deliveryStatus;
      }

      yubotoLogger.info('No delivery status found', {
        requestId,
        messageId
      });
      return null;
    } catch (error: any) {
      yubotoLogger.error('Delivery Status Error', {
        requestId,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/Balance`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      return {
        balance: response.data.balance || 0,
        currency: response.data.currency || 'EUR'
      };
    } catch (error: any) {
      yubotoLogger.error('Error getting account balance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber) return false;

    // Remove all non-numeric characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Check if it starts with + and has 10-15 digits after country code
    const phoneRegex = /^\+\d{10,15}$/;

    return phoneRegex.test(cleaned);
  }

  /**
   * Format phone number for Yuboto API (international format)
   */
  static formatPhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) return null;

    // Remove all non-numeric characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // If no country code, assume Greek number (+30)
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('30')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('6') || cleaned.startsWith('2')) {
        // Greek mobile or landline
        cleaned = '+30' + cleaned;
      } else {
        // Unknown format, can't determine country
        return null;
      }
    }

    return YubotoService.validatePhoneNumber(cleaned) ? cleaned : null;
  }

  /**
   * Check service availability and validate API key
   */
  async validateService(): Promise<{ valid: boolean; error?: string }> {
    try {
      const balance = await this.getBalance();
      return { valid: balance !== null };
    } catch (error: any) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Service validation failed'
      };
    }
  }
}