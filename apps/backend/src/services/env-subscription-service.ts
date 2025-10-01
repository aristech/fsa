import { Tenant } from '../models/Tenant';

// ----------------------------------------------------------------------

export interface SubscriptionPlan {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  limits: {
    maxUsers: number;
    maxClients: number;
    maxWorkOrdersPerMonth: number;
    maxSmsPerMonth: number;
    maxStorageGB: number;
    features: {
      smsReminders: boolean;
      advancedReporting: boolean;
      apiAccess: boolean;
      customBranding: boolean;
      multiLocation: boolean;
      integrations: boolean;
      prioritySupport: boolean;
    };
  };
  trialDays: number;
  description: string;
  highlights: string[];
}

// ----------------------------------------------------------------------

/**
 * Environment-based Subscription Service
 *
 * This service loads subscription plans from environment variables,
 * providing a single source of truth for subscription configuration.
 *
 * Environment variables follow the pattern:
 * {PLAN}_PLAN_{SETTING}={VALUE}
 *
 * Example: FREE_PLAN_MAX_USERS=2
 */
export class EnvSubscriptionService {
  private static plansCache: Record<string, SubscriptionPlan> | null = null;

  /**
   * Get subscription plans from environment variables
   */
  static getPlansFromEnv(): Record<string, SubscriptionPlan> {
    // Return cached plans if already loaded
    if (this.plansCache) {
      return this.plansCache;
    }

    const plans: Record<string, SubscriptionPlan> = {};
    const planNames = ['free', 'basic', 'premium', 'enterprise'];

    planNames.forEach(planName => {
      const plan = this.loadPlanFromEnv(planName);
      if (plan) {
        plans[planName] = plan;
      }
    });

    // Cache the plans
    this.plansCache = plans;

    console.log(`📋 Loaded ${Object.keys(plans).length} subscription plans from environment:`, Object.keys(plans));

    return plans;
  }

  /**
   * Load individual plan from environment variables
   */
  private static loadPlanFromEnv(planName: string): SubscriptionPlan | null {
    const prefix = `${planName.toUpperCase()}_PLAN_`;

    try {
      // Helper function to get env value with type conversion
      const getEnvValue = (key: string, defaultValue: any, type: 'string' | 'number' | 'boolean' = 'string') => {
        const envKey = `${prefix}${key}`;
        const value = process.env[envKey];

        if (value === undefined) {
          console.warn(`⚠️  Environment variable ${envKey} not found, using default: ${defaultValue}`);
          return defaultValue;
        }

        switch (type) {
          case 'number':
            const numValue = parseInt(value, 10);
            return isNaN(numValue) ? defaultValue : numValue;
          case 'boolean':
            return value.toLowerCase() === 'true';
          default:
            return value;
        }
      };

      const plan: SubscriptionPlan = {
        name: planName.charAt(0).toUpperCase() + planName.slice(1),
        price: {
          monthly: getEnvValue('MONTHLY_PRICE', 0, 'number'),
          yearly: getEnvValue('YEARLY_PRICE', 0, 'number'),
        },
        limits: {
          maxUsers: getEnvValue('MAX_USERS', 2, 'number'),
          maxClients: getEnvValue('MAX_CLIENTS', 10, 'number'),
          maxWorkOrdersPerMonth: getEnvValue('MAX_WORK_ORDERS_PER_MONTH', 50, 'number'),
          maxSmsPerMonth: getEnvValue('MAX_SMS_PER_MONTH', 0, 'number'),
          maxStorageGB: getEnvValue('MAX_STORAGE_GB', 1, 'number'),
          features: {
            smsReminders: getEnvValue('SMS_REMINDERS', false, 'boolean'),
            advancedReporting: getEnvValue('ADVANCED_REPORTING', false, 'boolean'),
            apiAccess: getEnvValue('API_ACCESS', false, 'boolean'),
            customBranding: getEnvValue('CUSTOM_BRANDING', false, 'boolean'),
            multiLocation: getEnvValue('MULTI_LOCATION', false, 'boolean'),
            integrations: getEnvValue('INTEGRATIONS', false, 'boolean'),
            prioritySupport: getEnvValue('PRIORITY_SUPPORT', false, 'boolean'),
          },
        },
        trialDays: getEnvValue('TRIAL_DAYS', 0, 'number'),
        description: this.getDefaultDescription(planName),
        highlights: this.getDefaultHighlights(planName),
      };

      console.log(`✅ Loaded ${planName} plan:`, {
        users: plan.limits.maxUsers,
        clients: plan.limits.maxClients,
        workOrders: plan.limits.maxWorkOrdersPerMonth,
        sms: plan.limits.maxSmsPerMonth,
        storage: plan.limits.maxStorageGB,
        price: `$${plan.price.monthly}/month`,
      });

      return plan;

    } catch (error) {
      console.error(`❌ Failed to load ${planName} plan from environment:`, error);
      return null;
    }
  }

  /**
   * Get default descriptions (can be overridden with env vars if needed)
   */
  private static getDefaultDescription(planName: string): string {
    const descriptions = {
      free: 'Perfect for getting started with basic field service management',
      basic: 'Essential features for small teams with SMS notifications',
      premium: 'Advanced features for growing businesses with multiple locations',
      enterprise: 'Full-featured solution for large organizations with dedicated support',
    };

    return descriptions[planName as keyof typeof descriptions] || `${planName} plan`;
  }

  /**
   * Get default highlights (dynamically generated from features)
   */
  private static getDefaultHighlights(planName: string): string[] {
    // This would be loaded from environment or generated dynamically
    // For now, using the original highlights but could be env-driven too
    const highlights = {
      free: [
        'Up to 2 users',
        'Up to 10 clients',
        '50 work orders per month',
        'Basic reporting',
        '1GB storage',
        'Community support'
      ],
      basic: [
        'Up to 5 users',
        'Up to 100 clients',
        '500 work orders per month',
        '100 SMS per month',
        'SMS reminders',
        '10GB storage',
        'Email support'
      ],
      premium: [
        'Up to 20 users',
        'Up to 1,000 clients',
        '2,000 work orders per month',
        '500 SMS per month',
        'Advanced reporting & analytics',
        'API access',
        'Custom branding',
        'Multi-location support',
        '50GB storage',
        'Priority email support'
      ],
      enterprise: [
        'Unlimited users',
        'Unlimited clients',
        'Unlimited work orders',
        '2,000 SMS per month',
        'All premium features',
        'Third-party integrations',
        'Dedicated account manager',
        'Phone & priority support',
        '200GB storage',
        'Custom onboarding'
      ],
    };

    return highlights[planName as keyof typeof highlights] || [];
  }

  /**
   * Get subscription plan details
   */
  static getPlan(planName: string): SubscriptionPlan | null {
    const plans = this.getPlansFromEnv();
    return plans[planName] || null;
  }

  /**
   * Get all available plans
   */
  static getAllPlans(): Record<string, SubscriptionPlan> {
    return this.getPlansFromEnv();
  }

  /**
   * Check if a tenant can perform an action based on their subscription limits
   */
  static canPerformAction(
    tenant: any,
    action: string,
    additionalCount: number = 1
  ): { allowed: boolean; reason?: string; currentUsage?: number; limit?: number } {
    const plan = this.getPlan(tenant.subscription.plan);
    if (!plan) {
      return { allowed: false, reason: "Invalid subscription plan" };
    }

    const usage = tenant.subscription.usage;
    const limits = tenant.subscription.limits;

    switch (action) {
      case 'create_user':
        if (limits.maxUsers === -1) return { allowed: true };
        const canCreateUser = usage.currentUsers + additionalCount <= limits.maxUsers;
        return {
          allowed: canCreateUser,
          reason: canCreateUser ? undefined : `User limit exceeded. Current: ${usage.currentUsers}, Limit: ${limits.maxUsers}`,
          currentUsage: usage.currentUsers,
          limit: limits.maxUsers,
        };

      case 'create_client':
        if (limits.maxClients === -1) return { allowed: true };
        const canCreateClient = usage.currentClients + additionalCount <= limits.maxClients;
        return {
          allowed: canCreateClient,
          reason: canCreateClient ? undefined : `Client limit exceeded. Current: ${usage.currentClients}, Limit: ${limits.maxClients}`,
          currentUsage: usage.currentClients,
          limit: limits.maxClients,
        };

      case 'create_work_order':
        if (limits.maxWorkOrdersPerMonth === -1) return { allowed: true };
        const canCreateWorkOrder = usage.workOrdersThisMonth + additionalCount <= limits.maxWorkOrdersPerMonth;
        return {
          allowed: canCreateWorkOrder,
          reason: canCreateWorkOrder ? undefined : `Monthly work order limit exceeded. Current: ${usage.workOrdersThisMonth}, Limit: ${limits.maxWorkOrdersPerMonth}`,
          currentUsage: usage.workOrdersThisMonth,
          limit: limits.maxWorkOrdersPerMonth,
        };

      case 'send_sms':
        if (limits.maxSmsPerMonth === -1) return { allowed: true };
        if (limits.maxSmsPerMonth === 0) return {
          allowed: false,
          reason: "SMS feature not available in current plan",
          currentUsage: usage.smsThisMonth,
          limit: limits.maxSmsPerMonth,
        };
        const canSendSms = usage.smsThisMonth + additionalCount <= limits.maxSmsPerMonth;
        return {
          allowed: canSendSms,
          reason: canSendSms ? undefined : `Monthly SMS limit exceeded. Current: ${usage.smsThisMonth}, Limit: ${limits.maxSmsPerMonth}`,
          currentUsage: usage.smsThisMonth,
          limit: limits.maxSmsPerMonth,
        };

      case 'upload_file':
        if (limits.maxStorageGB === -1) return { allowed: true };
        const fileSizeGB = additionalCount / (1024 * 1024 * 1024); // Convert bytes to GB
        const canUploadFile = usage.storageUsedGB + fileSizeGB <= limits.maxStorageGB;
        return {
          allowed: canUploadFile,
          reason: canUploadFile ? undefined : `Storage limit exceeded. Current: ${usage.storageUsedGB.toFixed(2)}GB, Limit: ${limits.maxStorageGB}GB`,
          currentUsage: usage.storageUsedGB,
          limit: limits.maxStorageGB,
        };

      // Feature checks
      case 'use_sms_reminders':
        return {
          allowed: limits.features.smsReminders,
          reason: limits.features.smsReminders ? undefined : "SMS reminders not available in current plan",
        };

      case 'use_advanced_reporting':
        return {
          allowed: limits.features.advancedReporting,
          reason: limits.features.advancedReporting ? undefined : "Advanced reporting not available in current plan",
        };

      case 'use_api':
        return {
          allowed: limits.features.apiAccess,
          reason: limits.features.apiAccess ? undefined : "API access not available in current plan",
        };

      case 'use_custom_branding':
        return {
          allowed: limits.features.customBranding,
          reason: limits.features.customBranding ? undefined : "Custom branding not available in current plan",
        };

      case 'use_multi_location':
        return {
          allowed: limits.features.multiLocation,
          reason: limits.features.multiLocation ? undefined : "Multi-location support not available in current plan",
        };

      case 'use_integrations':
        return {
          allowed: limits.features.integrations,
          reason: limits.features.integrations ? undefined : "Third-party integrations not available in current plan",
        };

      default:
        return { allowed: true };
    }
  }

  /**
   * Apply plan limits to tenant based on subscription plan
   */
  static applyPlanLimits(planName: string): any {
    const plan = this.getPlan(planName);
    if (!plan) {
      throw new Error(`Invalid subscription plan: ${planName}`);
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);

    return {
      plan: planName,
      status: plan.trialDays > 0 ? "trial" : "active",
      startDate: new Date(),
      trialEndDate: plan.trialDays > 0 ? trialEndDate : undefined,
      limits: { ...plan.limits },
      usage: {
        currentUsers: 0,
        currentClients: 0,
        workOrdersThisMonth: 0,
        smsThisMonth: 0,
        storageUsedGB: 0,
        lastResetDate: new Date(),
      },
    };
  }

  /**
   * Get pricing information for display with translation keys
   */
  static getPricingInfo(): any[] {
    const plans = this.getPlansFromEnv();

    return Object.entries(plans).map(([key, plan]) => ({
      planId: key,
      name: plan.name,
      nameKey: `subscription.plans.${key}.name`,
      price: plan.price,
      description: plan.description,
      descriptionKey: `subscription.plans.${key}.description`,
      highlights: plan.highlights,
      highlightKeys: plan.highlights.map((_, index) => `subscription.plans.${key}.highlights.${index}`),
      trialDays: plan.trialDays,
      popular: key === 'premium', // Mark premium as popular
      translationKeys: {
        name: `subscription.plans.${key}.name`,
        description: `subscription.plans.${key}.description`,
        highlights: plan.highlights.map((_, index) => `subscription.plans.${key}.highlights.${index}`),
        selectPlan: 'subscription.actions.selectPlan',
        currentPlan: 'subscription.status.currentPlan',
        mostPopular: 'subscription.labels.mostPopular',
        freeTrial: 'subscription.labels.freeTrial',
        trialDays: 'subscription.labels.trialDays',
        monthly: 'subscription.billing.monthly',
        yearly: 'subscription.billing.yearly',
        perMonth: 'subscription.billing.perMonth',
        perYear: 'subscription.billing.perYear',
        savings: 'subscription.billing.savings',
        features: 'subscription.labels.features',
        getStarted: 'subscription.actions.getStarted',
        upgrade: 'subscription.actions.upgrade',
        contactSales: 'subscription.actions.contactSales'
      }
    }));
  }

  /**
   * Validate environment configuration
   */
  static validateEnvironmentConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredPlans = ['free', 'basic', 'premium', 'enterprise'];

    requiredPlans.forEach(planName => {
      const prefix = `${planName.toUpperCase()}_PLAN_`;
      const requiredVars = [
        'MAX_USERS', 'MAX_CLIENTS', 'MAX_WORK_ORDERS_PER_MONTH',
        'MAX_SMS_PER_MONTH', 'MAX_STORAGE_GB', 'MONTHLY_PRICE'
      ];

      requiredVars.forEach(varName => {
        const envKey = `${prefix}${varName}`;
        if (process.env[envKey] === undefined) {
          errors.push(`Missing environment variable: ${envKey}`);
        }
      });
    });

    if (errors.length > 0) {
      console.error('❌ Subscription environment validation failed:', errors);
    } else {
      console.log('✅ Subscription environment configuration is valid');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear cache (useful for testing or configuration updates)
   */
  static clearCache(): void {
    this.plansCache = null;
    console.log('🗑️  Subscription plans cache cleared');
  }

  /**
   * Reset monthly usage counters (cron job function)
   */
  static async resetMonthlyUsage(): Promise<void> {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      await Tenant.updateMany(
        { 'subscription.usage.lastResetDate': { $lt: lastMonth } },
        {
          $set: {
            'subscription.usage.workOrdersThisMonth': 0,
            'subscription.usage.smsThisMonth': 0,
            'subscription.usage.lastResetDate': now,
          },
        }
      );

      console.log('📅 Monthly usage counters reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset monthly usage counters:', error);
    }
  }

  /**
   * Update tenant usage counters
   */
  static async updateUsage(
    tenantId: string,
    action: string,
    count: number = 1
  ): Promise<void> {
    const { Tenant } = require('../models/Tenant');

    let updateField: string;
    switch (action) {
      case 'user_created':
        updateField = 'subscription.usage.currentUsers';
        break;
      case 'user_deleted':
        updateField = 'subscription.usage.currentUsers';
        count = -count;
        break;
      case 'client_created':
        updateField = 'subscription.usage.currentClients';
        break;
      case 'client_deleted':
        updateField = 'subscription.usage.currentClients';
        count = -count;
        break;
      case 'work_order_created':
        updateField = 'subscription.usage.workOrdersThisMonth';
        break;
      case 'sms_sent':
        updateField = 'subscription.usage.smsThisMonth';
        break;
      case 'storage_used':
        updateField = 'subscription.usage.storageUsedGB';
        // count should be in GB
        break;
      case 'storage_freed':
        updateField = 'subscription.usage.storageUsedGB';
        count = -count; // Subtract freed storage
        break;
      default:
        return;
    }

    await Tenant.findByIdAndUpdate(
      tenantId,
      { $inc: { [updateField]: count } },
      { new: true }
    );
  }
}