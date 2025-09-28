/**
 * Unified SMS Provider Interface
 * Provides a common interface for all SMS service providers (Yuboto, Apifon, etc.)
 */

export interface SmsProviderConfig {
  provider: 'yuboto' | 'apifon';
  apiKey: string;
  secretId?: string; // Used by Apifon
  baseUrl?: string;
  sender?: string;
}

export interface SendSmsRequest {
  phoneNumbers: string[];
  message: string;
  sender?: string;
  priority?: 'sms' | 'viber'; // For providers that support multiple channels
  fallbackToSms?: boolean; // For providers with fallback support
}

export interface SmsResult {
  id: string;
  channel?: 'sms' | 'viber'; // Channel used (if supported by provider)
  phoneNumber: string;
  status: string;
}

export interface SmsResponse {
  success: boolean;
  results: SmsResult[];
  error?: string;
  messageId?: string; // Primary message ID (for single messages)
}

export interface DeliveryStatus {
  messageId: string;
  status: string;
  statusCode?: number;
  channel?: 'sms' | 'viber';
  phoneNumber: string;
  timestamp: Date;
  isFinal?: boolean;
  description?: string;
}

export interface ProviderBalance {
  balance?: number;
  credits?: number;
  currency?: string;
}

export interface ServiceValidation {
  valid: boolean;
  error?: string;
}

/**
 * Common interface that all SMS providers must implement
 */
export interface ISmsProvider {
  /**
   * Send SMS message to one or more recipients
   */
  sendSMS(phoneNumbers: string[], message: string, sender?: string): Promise<SmsResponse>;

  /**
   * Send message with automatic channel selection (if supported)
   * Falls back to sendSMS for providers that don't support multiple channels
   */
  sendMessage(request: SendSmsRequest): Promise<SmsResponse>;

  /**
   * Get delivery status for a specific message
   */
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus | null>;

  /**
   * Validate service availability and API credentials
   */
  validateService(): Promise<ServiceValidation>;

  /**
   * Get account balance/credits (if supported)
   */
  getBalance?(): Promise<ProviderBalance | null>;

  /**
   * Get provider name for logging and identification
   */
  getProviderName(): string;

  /**
   * Format phone number according to provider requirements
   */
  formatPhoneNumber(phoneNumber: string): string | null;

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean;
}

/**
 * SMS Provider Factory - creates appropriate provider instance
 */
export class SmsProviderFactory {
  static create(config: SmsProviderConfig): ISmsProvider {
    switch (config.provider) {
      case 'yuboto':
        const { YubotoService } = require('./yuboto-service');
        return new YubotoSmsProviderAdapter(new YubotoService({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl
        }), config.sender);

      case 'apifon':
        const { ApifonSdkService } = require('./apifon-service-sdk');
        return new ApifonSmsProviderAdapter(new ApifonSdkService({
          token: config.secretId!, // Using secretId as token
          secretKey: config.apiKey, // Using apiKey as secretKey
          sender: config.sender
        }));

      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`);
    }
  }
}

/**
 * Adapter for Yuboto service to implement ISmsProvider interface
 */
class YubotoSmsProviderAdapter implements ISmsProvider {
  constructor(
    private yubotoService: any,
    private defaultSender?: string
  ) {}

  async sendSMS(phoneNumbers: string[], message: string, sender?: string): Promise<SmsResponse> {
    const result = await this.yubotoService.sendSMS(phoneNumbers, message, sender || this.defaultSender);
    return {
      success: result.success,
      results: result.results || [],
      error: result.error
    };
  }

  async sendMessage(request: SendSmsRequest): Promise<SmsResponse> {
    const result = await this.yubotoService.sendMessage({
      phoneNumbers: request.phoneNumbers,
      message: request.message,
      sender: request.sender || this.defaultSender,
      priority: request.priority,
      fallbackToSms: request.fallbackToSms
    });
    return {
      success: result.success,
      results: result.results || [],
      error: result.error
    };
  }

  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus | null> {
    const status = await this.yubotoService.getDeliveryStatus(messageId);
    if (!status) return null;

    return {
      messageId: status.messageId,
      status: status.status,
      statusCode: status.statusCode,
      channel: status.channel,
      phoneNumber: status.phoneNumber,
      timestamp: status.timestamp,
      isFinal: status.isFinal,
      description: status.description
    };
  }

  async validateService(): Promise<ServiceValidation> {
    return await this.yubotoService.validateService();
  }

  async getBalance(): Promise<ProviderBalance | null> {
    const balance = await this.yubotoService.getBalance();
    return balance ? {
      balance: balance.balance,
      currency: balance.currency
    } : null;
  }

  getProviderName(): string {
    return 'Yuboto';
  }

  formatPhoneNumber(phoneNumber: string): string | null {
    const YubotoService = require('./yuboto-service').YubotoService;
    return YubotoService.formatPhoneNumber(phoneNumber);
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const YubotoService = require('./yuboto-service').YubotoService;
    return YubotoService.validatePhoneNumber(phoneNumber);
  }
}

/**
 * Adapter for Apifon service to implement ISmsProvider interface
 */
class ApifonSmsProviderAdapter implements ISmsProvider {
  constructor(private apifonService: any) {}

  async sendSMS(phoneNumbers: string[], message: string, sender?: string): Promise<SmsResponse> {
    const result = await this.apifonService.sendSMS({
      phoneNumbers,
      message,
      sender
    });
    return {
      success: result.success,
      results: result.results || [],
      error: result.error,
      messageId: result.messageId
    };
  }

  async sendMessage(request: SendSmsRequest): Promise<SmsResponse> {
    // Apifon primarily supports SMS, so we use sendSMS for all message types
    return await this.sendSMS(request.phoneNumbers, request.message, request.sender);
  }

  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus | null> {
    const status = await this.apifonService.getDeliveryStatus(messageId);
    if (!status) return null;

    return {
      messageId: status.messageId,
      status: status.status,
      phoneNumber: status.phoneNumber,
      timestamp: status.timestamp,
      description: status.description
    };
  }

  async validateService(): Promise<ServiceValidation> {
    return await this.apifonService.validateService();
  }

  async getBalance(): Promise<ProviderBalance | null> {
    const accountInfo = await this.apifonService.getAccountInfo();
    return accountInfo ? {
      balance: accountInfo.balance,
      credits: accountInfo.credits
    } : null;
  }

  getProviderName(): string {
    return 'Apifon';
  }

  formatPhoneNumber(phoneNumber: string): string | null {
    // Use the validation method and basic formatting
    const { ApifonSdkService } = require('./apifon-service-sdk');
    return ApifonSdkService.validatePhoneNumber(phoneNumber) ? phoneNumber : null;
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const { ApifonSdkService } = require('./apifon-service-sdk');
    return ApifonSdkService.validatePhoneNumber(phoneNumber);
  }
}