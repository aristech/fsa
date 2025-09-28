import { smsLogger } from '../utils/logger';

// Import Apifon SDK components (local)
const Mookee = require('../lib/apifon-sdk/Mookee');
const SMSResource = require('../lib/apifon-sdk/Resource/SMSResource');
const SmsRequest = require('../lib/apifon-sdk/Model/SmsRequest');
const MessageContent = require('../lib/apifon-sdk/Model/MessageContent');
const SubscriberInformation = require('../lib/apifon-sdk/Model/SubscriberInformation');
const ApifonRestException = require('../lib/apifon-sdk/Exception/ApifonRestException');
const OAuthConfigurationBuilder = require('../lib/apifon-sdk/Model/Request/OAuthConfigurationBuilder');

export interface ApifonSdkConfig {
  token: string;      // OAuth Client ID
  secretKey: string;  // OAuth Client Secret
  sender?: string;
}

export interface ApifonSmsRequest {
  phoneNumbers: string[];
  message: string;
  sender?: string;
}

export interface ApifonResponse {
  success: boolean;
  messageId?: string;
  results?: Array<{
    id: string;
    status: string;
    phoneNumber: string;
  }>;
  error?: string;
  rawResponse?: any;
}

export interface ApifonMessageStatus {
  messageId: string;
  status: string;
  phoneNumber: string;
  timestamp: Date;
  description?: string;
}

/**
 * Apifon SMS API Integration Service using Official SDK
 * Handles communication with Apifon using the official Node.js SDK
 */
export class ApifonSdkService {
  private config: ApifonSdkConfig;
  private smsResource: any;
  private isInitialized: boolean = false;
  private readonly oauthIdentifier = 'apifon_sms';

  constructor(config: ApifonSdkConfig) {
    this.config = config;
    this.smsResource = new SMSResource();
  }

  /**
   * Initialize the Apifon SDK with OAuth credentials
   */
  private initializeSDK(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Mookee (the main SDK class)
      Mookee.getInstance();

      // Create OAuth configuration for client credentials grant
      const oauthConfig = new OAuthConfigurationBuilder()
        .getClientCredentialsBuilder(this.config.token, this.config.secretKey)
        .build();

      // Add OAuth resource
      Mookee.addOAuthResource(this.oauthIdentifier, oauthConfig);

      // Retrieve OAuth token
      Mookee.retrieveClientCredentialsToken(this.oauthIdentifier);

      // Set Mookee to OAuth mode
      Mookee.setMookeeToOAuthMode(this.oauthIdentifier, true);

      this.isInitialized = true;

      smsLogger.info('Apifon SDK initialized successfully with OAuth', {
        hasClientId: !!this.config.token,
        hasClientSecret: !!this.config.secretKey,
        sender: this.config.sender,
        oauthIdentifier: this.oauthIdentifier
      });
    } catch (error) {
      smsLogger.error('Failed to initialize Apifon SDK with OAuth', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to initialize Apifon SDK with OAuth');
    }
  }

  /**
   * Send SMS message to one or more recipients using Apifon SDK
   */
  async sendSMS(request: ApifonSmsRequest): Promise<ApifonResponse> {
    const requestId = `apifon_sdk_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { phoneNumbers, message, sender = this.config.sender || 'FSA' } = request;

      // Initialize SDK if not already done
      this.initializeSDK();

      // Validate phone numbers
      const validPhoneNumbers = phoneNumbers
        .map(phone => this.formatPhoneNumber(phone))
        .filter(phone => phone !== null) as string[];

      if (validPhoneNumbers.length === 0) {
        return {
          success: false,
          error: 'No valid phone numbers provided'
        };
      }

      smsLogger.info('Apifon SDK SMS Request', {
        requestId,
        recipients: validPhoneNumbers.map(p => p.replace(/\d(?=\d{4})/g, '*')), // Mask phone numbers
        messageLength: message.length,
        sender,
        recipientCount: validPhoneNumbers.length
      });

      // Create SMS request using SDK
      const smsRequest = new SmsRequest();

      // Create message content
      const msgContent = new MessageContent();
      msgContent.text = message;
      msgContent.sender_id = sender;

      smsRequest.message = msgContent;

      // Add subscribers (phone numbers) - use addStrSubscribers for simple phone number strings
      smsRequest.addStrSubscribers(validPhoneNumbers);

      // Send SMS using SDK
      const response = this.smsResource.send(smsRequest);

      smsLogger.info('Apifon SDK SMS Response', {
        requestId,
        response: response ? 'received' : 'null',
        responseType: typeof response
      });

      // Parse and format response
      if (response) {
        const results = this.parseApifonResponse(response, validPhoneNumbers);

        return {
          success: true,
          results,
          rawResponse: response
        };
      } else {
        return {
          success: false,
          error: 'No response received from Apifon API'
        };
      }

    } catch (error: any) {
      smsLogger.error('Apifon SDK SMS Error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        isApifonException: error instanceof ApifonRestException,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof ApifonRestException) {
        return {
          success: false,
          error: `Apifon API Error: ${error.toString()}`
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse Apifon SDK response into our standard format
   */
  private parseApifonResponse(response: any, phoneNumbers: string[]): Array<{
    id: string;
    status: string;
    phoneNumber: string;
  }> {
    const results: Array<{
      id: string;
      status: string;
      phoneNumber: string;
    }> = [];

    try {
      // The SDK response structure may vary, so we'll handle different formats
      if (response.request_id) {
        // If we have a request_id, create results for each phone number
        phoneNumbers.forEach((phoneNumber, index) => {
          results.push({
            id: `${response.request_id}_${index}`,
            status: 'sent',
            phoneNumber: phoneNumber
          });
        });
      } else if (Array.isArray(response)) {
        // If response is an array of results
        response.forEach((item, index) => {
          results.push({
            id: item.id || item.message_id || `apifon_${Date.now()}_${index}`,
            status: item.status || 'sent',
            phoneNumber: phoneNumbers[index] || phoneNumbers[0]
          });
        });
      } else {
        // Fallback: create a generic result
        results.push({
          id: response.id || response.request_id || `apifon_${Date.now()}`,
          status: response.status || 'sent',
          phoneNumber: phoneNumbers[0]
        });
      }
    } catch (parseError) {
      smsLogger.warn('Error parsing Apifon response, using fallback', {
        parseError: parseError instanceof Error ? parseError.message : 'Unknown error',
        response: response
      });

      // Fallback: create basic results
      phoneNumbers.forEach((phoneNumber, index) => {
        results.push({
          id: `apifon_fallback_${Date.now()}_${index}`,
          status: 'sent',
          phoneNumber: phoneNumber
        });
      });
    }

    return results;
  }

  /**
   * Get delivery status for a specific message (if supported by SDK)
   */
  async getDeliveryStatus(messageId: string): Promise<ApifonMessageStatus | null> {
    const requestId = `apifon_sdk_dlr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.initializeSDK();

      smsLogger.info('Apifon SDK Delivery Status Request', {
        requestId,
        messageId
      });

      // Note: The SDK might not have direct delivery status checking
      // This would depend on the SDK's capabilities

      return null; // Placeholder - implement based on SDK documentation
    } catch (error: any) {
      smsLogger.error('Apifon SDK Delivery Status Error', {
        requestId,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Format phone number for Apifon API (international format)
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
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
        // Unknown format, try to add Greek country code
        cleaned = '+30' + cleaned;
      }
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(cleaned) ? cleaned : null;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber) return false;
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(cleaned);
  }

  /**
   * Check service availability and validate OAuth credentials
   */
  async validateService(): Promise<{ valid: boolean; error?: string }> {
    try {
      this.initializeSDK();

      // OAuth initialization and token retrieval validates the credentials
      // If we reach this point without errors, OAuth credentials are valid
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'OAuth validation failed'
      };
    }
  }

  /**
   * Get account information using SDK (if available)
   */
  async getAccountInfo(): Promise<{ balance?: number; credits?: number; error?: string } | null> {
    try {
      this.initializeSDK();

      // Note: Check if SDK has balance/account info methods
      // This would depend on the SDK's capabilities

      return null; // Placeholder - implement based on SDK documentation
    } catch (error: any) {
      smsLogger.error('Error getting Apifon account info via SDK', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }
}