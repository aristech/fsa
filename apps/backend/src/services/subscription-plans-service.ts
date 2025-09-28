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

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    name: "Free",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      maxUsers: 2,
      maxClients: 10,
      maxWorkOrdersPerMonth: 50,
      maxSmsPerMonth: 0,
      maxStorageGB: 1,
      features: {
        smsReminders: false,
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        multiLocation: false,
        integrations: false,
        prioritySupport: false,
      },
    },
    trialDays: 0,
    description: "Perfect for getting started with basic field service management",
    highlights: [
      "Up to 2 users",
      "Up to 10 clients",
      "50 work orders per month",
      "Basic reporting",
      "1GB storage",
      "Community support"
    ],
  },

  basic: {
    name: "Basic",
    price: {
      monthly: 29,
      yearly: 290, // 2 months free
    },
    limits: {
      maxUsers: 5,
      maxClients: 100,
      maxWorkOrdersPerMonth: 500,
      maxSmsPerMonth: 100,
      maxStorageGB: 10,
      features: {
        smsReminders: true,
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        multiLocation: false,
        integrations: false,
        prioritySupport: false,
      },
    },
    trialDays: 14,
    description: "Essential features for small teams with SMS notifications",
    highlights: [
      "Up to 5 users",
      "Up to 100 clients",
      "500 work orders per month",
      "100 SMS per month",
      "SMS reminders",
      "10GB storage",
      "Email support"
    ],
  },

  premium: {
    name: "Premium",
    price: {
      monthly: 79,
      yearly: 790, // 2 months free
    },
    limits: {
      maxUsers: 20,
      maxClients: 1000,
      maxWorkOrdersPerMonth: 2000,
      maxSmsPerMonth: 500,
      maxStorageGB: 50,
      features: {
        smsReminders: true,
        advancedReporting: true,
        apiAccess: true,
        customBranding: true,
        multiLocation: true,
        integrations: false,
        prioritySupport: false,
      },
    },
    trialDays: 14,
    description: "Advanced features for growing businesses with multiple locations",
    highlights: [
      "Up to 20 users",
      "Up to 1,000 clients",
      "2,000 work orders per month",
      "500 SMS per month",
      "Advanced reporting & analytics",
      "API access",
      "Custom branding",
      "Multi-location support",
      "50GB storage",
      "Priority email support"
    ],
  },

  enterprise: {
    name: "Enterprise",
    price: {
      monthly: 199,
      yearly: 1990, // 2 months free
    },
    limits: {
      maxUsers: -1, // Unlimited
      maxClients: -1, // Unlimited
      maxWorkOrdersPerMonth: -1, // Unlimited
      maxSmsPerMonth: 2000,
      maxStorageGB: 200,
      features: {
        smsReminders: true,
        advancedReporting: true,
        apiAccess: true,
        customBranding: true,
        multiLocation: true,
        integrations: true,
        prioritySupport: true,
      },
    },
    trialDays: 30,
    description: "Full-featured solution for large organizations with dedicated support",
    highlights: [
      "Unlimited users",
      "Unlimited clients",
      "Unlimited work orders",
      "2,000 SMS per month",
      "All premium features",
      "Third-party integrations",
      "Dedicated account manager",
      "Phone & priority support",
      "200GB storage",
      "Custom onboarding"
    ],
  },
};

export class SubscriptionPlansService {
  /**
   * Get subscription plan details
   */
  static getPlan(planName: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS[planName] || null;
  }

  /**
   * Get all available plans
   */
  static getAllPlans(): Record<string, SubscriptionPlan> {
    return SUBSCRIPTION_PLANS;
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

  /**
   * Reset monthly usage counters (to be called by a cron job)
   */
  static async resetMonthlyUsage(): Promise<void> {
    const { Tenant } = require('../models/Tenant');

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
    return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
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
      // Additional translation keys for common UI elements
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
}