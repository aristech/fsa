import { ISmsProvider, SmsProviderFactory, SmsProviderConfig, SendSmsRequest, SmsResponse, DeliveryStatus } from './sms-provider-interface';
import { smsLogger } from '../utils/logger';

export interface UnifiedSmsConfig {
  enabled: boolean;
  primaryProvider: 'yuboto' | 'apifon';
  fallbackProvider?: 'yuboto' | 'apifon';
  providers: {
    yuboto?: {
      apiKey: string;
      sender: string;
      priority: 'sms' | 'viber';
      fallbackToSms: boolean;
    };
    apifon?: {
      secretId: string;
      apiKey: string;
      sender: string;
    };
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

export interface UnifiedSmsResult {
  success: boolean;
  provider: string;
  messageId?: string;
  results?: Array<{
    id: string;
    status: string;
    phoneNumber: string;
    channel?: 'sms' | 'viber';
  }>;
  error?: string;
  fallbackUsed?: boolean;
}

/**
 * Unified SMS Service
 * Provides a single interface for sending SMS through multiple providers
 * with automatic failover and provider selection
 */
export class UnifiedSmsService {
  private config: UnifiedSmsConfig;
  private primaryProvider: ISmsProvider;
  private fallbackProvider?: ISmsProvider;

  constructor(config: UnifiedSmsConfig) {
    this.config = config;
    this.primaryProvider = this.createProvider(config.primaryProvider);

    if (config.fallbackProvider && config.fallbackProvider !== config.primaryProvider) {
      this.fallbackProvider = this.createProvider(config.fallbackProvider);
    }
  }

  /**
   * Create SMS provider instance based on configuration
   */
  private createProvider(providerType: 'yuboto' | 'apifon'): ISmsProvider {
    const providerConfig: SmsProviderConfig = {
      provider: providerType,
      apiKey: '',
      baseUrl: undefined,
      sender: 'FSA'
    };

    switch (providerType) {
      case 'yuboto':
        if (!this.config.providers.yuboto) {
          throw new Error('Yuboto provider configuration is missing');
        }
        providerConfig.apiKey = this.config.providers.yuboto.apiKey;
        providerConfig.sender = this.config.providers.yuboto.sender;
        break;

      case 'apifon':
        if (!this.config.providers.apifon) {
          throw new Error('Apifon provider configuration is missing');
        }
        providerConfig.apiKey = this.config.providers.apifon.apiKey;
        providerConfig.secretId = this.config.providers.apifon.secretId;
        providerConfig.sender = this.config.providers.apifon.sender;
        break;

      default:
        throw new Error(`Unsupported SMS provider: ${providerType}`);
    }

    return SmsProviderFactory.create(providerConfig);
  }

  /**
   * Send SMS message with automatic provider failover
   */
  async sendSMS(phoneNumbers: string[], message: string, sender?: string): Promise<UnifiedSmsResult> {
    const requestId = `unified_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!this.config.enabled) {
      return {
        success: false,
        provider: 'none',
        error: 'SMS service is disabled'
      };
    }

    smsLogger.info('Unified SMS Request', {
      requestId,
      primaryProvider: this.config.primaryProvider,
      fallbackProvider: this.config.fallbackProvider,
      recipients: phoneNumbers.map(p => p.replace(/\d(?=\d{4})/g, '*')),
      messageLength: message.length,
      sender: sender || 'default'
    });

    // Try primary provider first
    try {
      const result = await this.primaryProvider.sendSMS(phoneNumbers, message, sender);

      if (result.success) {
        smsLogger.info('Primary provider success', {
          requestId,
          provider: this.primaryProvider.getProviderName(),
          messageId: result.messageId,
          resultCount: result.results.length
        });

        return {
          success: true,
          provider: this.primaryProvider.getProviderName(),
          messageId: result.messageId,
          results: result.results,
          fallbackUsed: false
        };
      } else {
        smsLogger.warn('Primary provider failed', {
          requestId,
          provider: this.primaryProvider.getProviderName(),
          error: result.error
        });

        // Try fallback provider if available
        if (this.fallbackProvider) {
          return await this.tryFallbackProvider(phoneNumbers, message, sender, requestId, result.error || 'Unknown error');
        }

        return {
          success: false,
          provider: this.primaryProvider.getProviderName(),
          error: result.error,
          fallbackUsed: false
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      smsLogger.error('Primary provider exception', {
        requestId,
        provider: this.primaryProvider.getProviderName(),
        error: errorMessage
      });

      // Try fallback provider if available
      if (this.fallbackProvider) {
        return await this.tryFallbackProvider(phoneNumbers, message, sender, requestId, errorMessage);
      }

      return {
        success: false,
        provider: this.primaryProvider.getProviderName(),
        error: errorMessage,
        fallbackUsed: false
      };
    }
  }

  /**
   * Try sending via fallback provider
   */
  private async tryFallbackProvider(
    phoneNumbers: string[],
    message: string,
    sender: string | undefined,
    requestId: string,
    primaryError: string
  ): Promise<UnifiedSmsResult> {
    try {
      smsLogger.info('Attempting fallback provider', {
        requestId,
        fallbackProvider: this.fallbackProvider!.getProviderName(),
        primaryError
      });

      const result = await this.fallbackProvider!.sendSMS(phoneNumbers, message, sender);

      if (result.success) {
        smsLogger.info('Fallback provider success', {
          requestId,
          provider: this.fallbackProvider!.getProviderName(),
          messageId: result.messageId,
          resultCount: result.results.length
        });

        return {
          success: true,
          provider: this.fallbackProvider!.getProviderName(),
          messageId: result.messageId,
          results: result.results,
          fallbackUsed: true
        };
      } else {
        smsLogger.error('Fallback provider also failed', {
          requestId,
          provider: this.fallbackProvider!.getProviderName(),
          error: result.error,
          primaryError
        });

        return {
          success: false,
          provider: this.fallbackProvider!.getProviderName(),
          error: `Primary: ${primaryError}, Fallback: ${result.error}`,
          fallbackUsed: true
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      smsLogger.error('Fallback provider exception', {
        requestId,
        provider: this.fallbackProvider!.getProviderName(),
        error: errorMessage,
        primaryError
      });

      return {
        success: false,
        provider: this.fallbackProvider!.getProviderName(),
        error: `Primary: ${primaryError}, Fallback: ${errorMessage}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Send message with automatic channel selection (for providers that support it)
   */
  async sendMessage(request: SendSmsRequest): Promise<UnifiedSmsResult> {
    const requestId = `unified_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!this.config.enabled) {
      return {
        success: false,
        provider: 'none',
        error: 'SMS service is disabled'
      };
    }

    smsLogger.info('Unified Message Request', {
      requestId,
      primaryProvider: this.config.primaryProvider,
      recipients: request.phoneNumbers.map(p => p.replace(/\d(?=\d{4})/g, '*')),
      messageLength: request.message.length,
      priority: request.priority,
      fallbackToSms: request.fallbackToSms
    });

    try {
      const result = await this.primaryProvider.sendMessage(request);

      if (result.success) {
        return {
          success: true,
          provider: this.primaryProvider.getProviderName(),
          messageId: result.messageId,
          results: result.results,
          fallbackUsed: false
        };
      } else if (this.fallbackProvider) {
        // Try fallback with basic SMS if primary fails
        const fallbackResult = await this.fallbackProvider.sendSMS(
          request.phoneNumbers,
          request.message,
          request.sender
        );

        return {
          success: fallbackResult.success,
          provider: this.fallbackProvider.getProviderName(),
          messageId: fallbackResult.messageId,
          results: fallbackResult.results,
          error: fallbackResult.success ? undefined : `Primary: ${result.error}, Fallback: ${fallbackResult.error}`,
          fallbackUsed: true
        };
      }

      return {
        success: false,
        provider: this.primaryProvider.getProviderName(),
        error: result.error,
        fallbackUsed: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (this.fallbackProvider) {
        try {
          const fallbackResult = await this.fallbackProvider.sendSMS(
            request.phoneNumbers,
            request.message,
            request.sender
          );

          return {
            success: fallbackResult.success,
            provider: this.fallbackProvider.getProviderName(),
            messageId: fallbackResult.messageId,
            results: fallbackResult.results,
            error: fallbackResult.success ? undefined : `Primary: ${errorMessage}, Fallback: ${fallbackResult.error}`,
            fallbackUsed: true
          };
        } catch (fallbackError) {
          const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
          return {
            success: false,
            provider: this.fallbackProvider.getProviderName(),
            error: `Primary: ${errorMessage}, Fallback: ${fallbackErrorMessage}`,
            fallbackUsed: true
          };
        }
      }

      return {
        success: false,
        provider: this.primaryProvider.getProviderName(),
        error: errorMessage,
        fallbackUsed: false
      };
    }
  }

  /**
   * Get delivery status from the appropriate provider
   */
  async getDeliveryStatus(messageId: string, provider?: string): Promise<DeliveryStatus | null> {
    // If provider is specified, use that provider
    if (provider) {
      const targetProvider = provider.toLowerCase() === this.primaryProvider.getProviderName().toLowerCase()
        ? this.primaryProvider
        : this.fallbackProvider;

      if (targetProvider) {
        return await targetProvider.getDeliveryStatus(messageId);
      }
    }

    // Try primary provider first
    try {
      const status = await this.primaryProvider.getDeliveryStatus(messageId);
      if (status) return status;
    } catch (error) {
      smsLogger.error('Error getting delivery status from primary provider', {
        provider: this.primaryProvider.getProviderName(),
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Try fallback provider if primary doesn't have the message
    if (this.fallbackProvider) {
      try {
        return await this.fallbackProvider.getDeliveryStatus(messageId);
      } catch (error) {
        smsLogger.error('Error getting delivery status from fallback provider', {
          provider: this.fallbackProvider.getProviderName(),
          messageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return null;
  }

  /**
   * Validate both providers
   */
  async validateServices(): Promise<{
    primary: { valid: boolean; error?: string };
    fallback?: { valid: boolean; error?: string };
  }> {
    const results: any = {
      primary: await this.primaryProvider.validateService()
    };

    if (this.fallbackProvider) {
      results.fallback = await this.fallbackProvider.validateService();
    }

    return results;
  }

  /**
   * Get balance from primary provider
   */
  async getBalance() {
    if (this.primaryProvider.getBalance) {
      return await this.primaryProvider.getBalance();
    }
    return null;
  }

  /**
   * Format phone number using primary provider's formatting
   */
  formatPhoneNumber(phoneNumber: string): string | null {
    return this.primaryProvider.formatPhoneNumber(phoneNumber);
  }

  /**
   * Validate phone number using primary provider's validation
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    return this.primaryProvider.validatePhoneNumber(phoneNumber);
  }

  /**
   * Get primary provider name
   */
  getPrimaryProviderName(): string {
    return this.primaryProvider.getProviderName();
  }

  /**
   * Get fallback provider name
   */
  getFallbackProviderName(): string | null {
    return this.fallbackProvider ? this.fallbackProvider.getProviderName() : null;
  }

  /**
   * Send test message using unified service
   */
  async sendTestMessage(phoneNumber: string, message: string = 'Test message from FSA'): Promise<UnifiedSmsResult> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    if (!formattedPhone) {
      return {
        success: false,
        provider: 'validation',
        error: 'Invalid phone number format'
      };
    }

    return await this.sendSMS([formattedPhone], message);
  }

  /**
   * Load unified SMS configuration from tenant settings
   */
  static loadConfigFromTenant(tenant: any): UnifiedSmsConfig {
    // Use tenant settings if available, otherwise fall back to environment
    const enabled = tenant?.settings?.sms?.enabled ?? (process.env.SMS_REMINDERS_ENABLED === 'true');
    const primaryProvider = tenant?.settings?.sms?.provider ?? (process.env.SMS_PRIMARY_PROVIDER as 'yuboto' | 'apifon') ?? 'apifon';
    const fallbackProvider = tenant?.settings?.sms?.fallbackProvider ?? (process.env.SMS_FALLBACK_PROVIDER as 'yuboto' | 'apifon' | undefined);

    return {
      enabled,
      primaryProvider,
      fallbackProvider,
      providers: {
        yuboto: process.env.YUBOTO_API_KEY ? {
          apiKey: process.env.YUBOTO_API_KEY,
          sender: process.env.YUBOTO_SENDER || 'FSA',
          priority: (process.env.YUBOTO_PRIORITY as 'sms' | 'viber') || 'viber',
          fallbackToSms: process.env.YUBOTO_FALLBACK_SMS !== 'false'
        } : undefined,
        apifon: process.env.APIFON_API_KEY && process.env.APIFON_SECRET_ID ? {
          secretId: process.env.APIFON_SECRET_ID,
          apiKey: process.env.APIFON_API_KEY,
          sender: process.env.APIFON_SENDER || 'FSA'
        } : undefined
      },
      company: {
        name: process.env.COMPANY_NAME || tenant?.name || 'FSA',
        phone: process.env.COMPANY_PHONE || tenant?.phone || '',
        email: process.env.COMPANY_EMAIL || tenant?.email || ''
      },
      templates: {
        monthly: 'Hello {{client.name}}, this is a reminder about your monthly service with {{company.name}}. Please contact us at {{company.phone}}.',
        yearly: 'Hello {{client.name}}, this is a reminder about your yearly service with {{company.name}}. Please contact us at {{company.phone}}.',
        custom: '{{customMessage}}',
        urgent: 'URGENT: {{client.name}}, please contact {{company.name}} at {{company.phone}} regarding your service.'
      }
    };
  }

  /**
   * Load unified SMS configuration from environment (legacy method)
   */
  static loadConfig(): UnifiedSmsConfig {
    const primaryProvider = (process.env.SMS_PRIMARY_PROVIDER as 'yuboto' | 'apifon') || 'yuboto';
    const fallbackProvider = process.env.SMS_FALLBACK_PROVIDER as 'yuboto' | 'apifon' | undefined;

    return {
      enabled: process.env.SMS_REMINDERS_ENABLED === 'true',
      primaryProvider,
      fallbackProvider,
      providers: {
        yuboto: process.env.YUBOTO_API_KEY ? {
          apiKey: process.env.YUBOTO_API_KEY,
          sender: process.env.YUBOTO_SENDER || 'FSA',
          priority: (process.env.YUBOTO_PRIORITY as 'sms' | 'viber') || 'viber',
          fallbackToSms: process.env.YUBOTO_FALLBACK_SMS !== 'false'
        } : undefined,
        apifon: process.env.APIFON_API_KEY && process.env.APIFON_SECRET_ID ? {
          secretId: process.env.APIFON_SECRET_ID,
          apiKey: process.env.APIFON_API_KEY,
          sender: process.env.APIFON_SENDER || 'FSA'
        } : undefined
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