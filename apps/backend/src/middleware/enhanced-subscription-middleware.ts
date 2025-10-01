import { FastifyRequest, FastifyReply } from "fastify";
import { Tenant } from "../models/Tenant";
import { EnvSubscriptionService } from "../services/env-subscription-service";
import { CentralizedUsageService } from "../services/centralized-usage-service";
import { HttpErrorLogUtils } from "../utils/http-error-logger";
import { sendBadRequest, sendForbidden } from "../utils/error-handler";
import { BUSINESS_MESSAGES } from "../constants/error-messages";

export interface EnhancedSubscriptionRequest extends FastifyRequest {
  tenant?: any;
  user: any;
  startTime?: number;
}

// ----------------------------------------------------------------------

/**
 * Enhanced Subscription Middleware
 *
 * This middleware provides centralized subscription management with:
 * - Environment-based limits configuration
 * - Automatic usage tracking (increase/decrease)
 * - Better error handling and logging
 * - Dynamic entity tracking
 */
export class EnhancedSubscriptionMiddleware {

  /**
   * Check subscription limits before allowing actions
   */
  static checkLimit(entity: string, count: number = 1) {
    return async (request: EnhancedSubscriptionRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      const requestId = request.id || HttpErrorLogUtils.generateRequestId();

      try {
        const tenantId = (request as any).tenantId || request.user?.tenantId;

        if (!tenantId) {
          HttpErrorLogUtils.log400Error(
            { requestId, service: 'SubscriptionMiddleware', operation: 'check_limit' },
            "Tenant information not found"
          );

          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.INVALID_TENANT,
            "Tenant information not found"
          );
        }

        // Fetch tenant with subscription information
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
          HttpErrorLogUtils.log404Error(
            { requestId, tenantId, service: 'SubscriptionMiddleware', operation: 'check_limit' },
            "Tenant not found"
          );

          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.INVALID_TENANT,
            "Tenant not found"
          );
        }

        // Check subscription status
        const statusCheck = this.checkSubscriptionStatus(tenant);
        if (!statusCheck.valid) {
          HttpErrorLogUtils.log403Error(
            { requestId, tenantId, service: 'SubscriptionMiddleware', operation: 'check_status' },
            statusCheck.reason!
          );

          return sendForbidden(reply, statusCheck.code! as any, statusCheck.reason!);
        }

        // Check specific entity limits
        const action = this.getActionForEntity(entity);
        const limitCheck = EnvSubscriptionService.canPerformAction(tenant, action, count);

        if (!limitCheck.allowed) {
          HttpErrorLogUtils.log403Error(
            {
              requestId,
              tenantId,
              entity,
              service: 'SubscriptionMiddleware',
              operation: 'check_limit',
              businessRule: 'subscription_limit',
              metadata: {
                action,
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
                requestedCount: count,
              }
            },
            limitCheck.reason!
          );

          return sendForbidden(
            reply,
            BUSINESS_MESSAGES.SUBSCRIPTION_LIMIT_EXCEEDED,
            limitCheck.reason || "Subscription limit exceeded"
          );
        }

        // Add tenant and timing info to request for use in route handlers
        request.tenant = tenant;
        request.startTime = startTime;

        // Log successful limit check
        console.log(`✅ Subscription limit check passed: ${entity} (${count}) for tenant ${tenantId}`);

      } catch (error: any) {
        const duration = Date.now() - startTime;

        HttpErrorLogUtils.log500Error(
          {
            requestId,
            entity,
            service: 'SubscriptionMiddleware',
            operation: 'check_limit',
          },
          error,
          "Error checking subscription limits"
        );

        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.SUBSCRIPTION_ERROR,
          "Error checking subscription limits"
        );
      }
    };
  }

  /**
   * Track entity creation after successful operation
   */
  static async trackCreation(
    tenantId: string,
    entity: string,
    count: number = 1,
    metadata?: any,
    requestId?: string
  ): Promise<boolean> {
    try {
      const result = await CentralizedUsageService.trackCreation(
        tenantId,
        entity,
        count,
        metadata,
        requestId
      );

      if (result.success) {
        console.log(`📈 Usage tracked: ${entity} +${count} (${result.previousValue} → ${result.newValue}/${result.limit})`);
        return true;
      } else {
        console.error(`❌ Failed to track ${entity} creation:`, result.error);
        return false;
      }

    } catch (error: any) {
      console.error(`❌ Error tracking ${entity} creation:`, error);
      return false;
    }
  }

  /**
   * Track entity deletion after successful operation
   */
  static async trackDeletion(
    tenantId: string,
    entity: string,
    count: number = 1,
    metadata?: any,
    requestId?: string
  ): Promise<boolean> {
    try {
      const result = await CentralizedUsageService.trackDeletion(
        tenantId,
        entity,
        count,
        metadata,
        requestId
      );

      if (result.success) {
        console.log(`📉 Usage tracked: ${entity} -${count} (${result.previousValue} → ${result.newValue}/${result.limit})`);
        return true;
      } else {
        console.error(`❌ Failed to track ${entity} deletion:`, result.error);
        return false;
      }

    } catch (error: any) {
      console.error(`❌ Error tracking ${entity} deletion:`, error);
      return false;
    }
  }

  /**
   * Middleware for specific entities with simplified API
   */
  static checkUserLimit = (count: number = 1) => EnhancedSubscriptionMiddleware.checkLimit('user', count);
  static checkClientLimit = (count: number = 1) => EnhancedSubscriptionMiddleware.checkLimit('client', count);
  static checkWorkOrderLimit = (count: number = 1) => EnhancedSubscriptionMiddleware.checkLimit('workOrder', count);
  static checkSmsLimit = (count: number = 1) => EnhancedSubscriptionMiddleware.checkLimit('sms', count);
  static checkFileLimit = (fileSizeBytes: number) => EnhancedSubscriptionMiddleware.checkLimit('file', fileSizeBytes);

  /**
   * Feature requirement checks
   */
  static requireFeature(featureName: string) {
    return async (request: EnhancedSubscriptionRequest, reply: FastifyReply) => {
      const requestId = request.id || HttpErrorLogUtils.generateRequestId();

      try {
        const tenantId = (request as any).tenantId || request.user?.tenantId;

        if (!tenantId) {
          return sendBadRequest(reply, BUSINESS_MESSAGES.INVALID_TENANT, "Tenant information not found");
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
          return sendBadRequest(reply, BUSINESS_MESSAGES.INVALID_TENANT, "Tenant not found");
        }

        const featureCheck = EnvSubscriptionService.canPerformAction(tenant, `use_${featureName}`);

        if (!featureCheck.allowed) {
          HttpErrorLogUtils.log403Error(
            {
              requestId,
              tenantId,
              service: 'SubscriptionMiddleware',
              operation: 'check_feature',
              resourceType: featureName,
            },
            featureCheck.reason!
          );

          return sendForbidden(
            reply,
            BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE,
            featureCheck.reason || `Feature '${featureName}' is not available in your current plan`
          );
        }

        request.tenant = tenant;
      } catch (error: any) {
        HttpErrorLogUtils.log500Error(
          { requestId, service: 'SubscriptionMiddleware', operation: 'check_feature' },
          error,
          "Error checking feature availability"
        );

        return sendBadRequest(reply, BUSINESS_MESSAGES.SUBSCRIPTION_ERROR, "Error checking feature availability");
      }
    };
  }

  // Feature-specific middleware
  static requireSmsReminders = () => EnhancedSubscriptionMiddleware.requireFeature('sms_reminders');
  static requireAdvancedReporting = () => EnhancedSubscriptionMiddleware.requireFeature('advanced_reporting');
  static requireApiAccess = () => EnhancedSubscriptionMiddleware.requireFeature('api');
  static requireCustomBranding = () => EnhancedSubscriptionMiddleware.requireFeature('custom_branding');
  static requireMultiLocation = () => EnhancedSubscriptionMiddleware.requireFeature('multi_location');
  static requireIntegrations = () => EnhancedSubscriptionMiddleware.requireFeature('integrations');

  /**
   * Get subscription status for current tenant
   */
  static async getSubscriptionStatus(request: FastifyRequest): Promise<any> {
    const tenantId = (request as any).tenantId || (request as any).user?.tenantId;

    if (!tenantId) {
      return null;
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return null;
    }

    const plan = EnvSubscriptionService.getPlan(tenant.subscription.plan);

    return {
      plan: tenant.subscription.plan,
      status: tenant.subscription.status,
      limits: tenant.subscription.limits,
      usage: tenant.subscription.usage,
      trialEndDate: tenant.subscription.trialEndDate,
      planDetails: plan,
      isTrialExpired: tenant.subscription.status === "trial" &&
                     tenant.subscription.trialEndDate &&
                     new Date() > tenant.subscription.trialEndDate,
    };
  }

  // ----------------------------------------------------------------------
  // Private helper methods
  // ----------------------------------------------------------------------

  /**
   * Check subscription status (active, trial, expired, etc.)
   */
  private static checkSubscriptionStatus(tenant: any): { valid: boolean; code?: string; reason?: string } {
    // Check if subscription is active
    if (tenant.subscription.status === "cancelled" || tenant.subscription.status === "inactive") {
      return {
        valid: false,
        code: BUSINESS_MESSAGES.SUBSCRIPTION_INACTIVE,
        reason: "Subscription is not active"
      };
    }

    // Check if trial has expired
    if (tenant.subscription.status === "trial" && tenant.subscription.trialEndDate) {
      const now = new Date();
      if (now > tenant.subscription.trialEndDate) {
        return {
          valid: false,
          code: BUSINESS_MESSAGES.TRIAL_EXPIRED,
          reason: "Trial period has expired. Please upgrade your subscription."
        };
      }
    }

    return { valid: true };
  }

  /**
   * Map entity names to action names
   */
  private static getActionForEntity(entity: string): string {
    const actionMap = {
      user: 'create_user',
      personnel: 'create_user', // Personnel creates users
      client: 'create_client',
      workOrder: 'create_work_order',
      sms: 'send_sms',
      file: 'upload_file',
    };

    return actionMap[entity as keyof typeof actionMap] || `create_${entity}`;
  }
}

// ----------------------------------------------------------------------
// Convenience functions for backward compatibility
// ----------------------------------------------------------------------

/**
 * Check subscription limit (backward compatible)
 */
export function checkSubscriptionLimit(action: string, count: number = 1) {
  // Map old action names to new entity names
  const entityMap = {
    'create_user': 'user',
    'create_client': 'client',
    'create_work_order': 'workOrder',
    'send_sms': 'sms',
    'upload_file': 'file',
  };

  const entity = entityMap[action as keyof typeof entityMap] || action.replace('create_', '');
  return EnhancedSubscriptionMiddleware.checkLimit(entity, count);
}

/**
 * Update usage after action (enhanced version)
 */
export async function updateUsageAfterAction(
  tenantId: string,
  action: string,
  count: number = 1,
  metadata?: any,
  requestId?: string
): Promise<void> {
  // Map old action names to new entity names and operations
  const actionMap = {
    'create_user': { entity: 'user', operation: 'create' },
    'delete_user': { entity: 'user', operation: 'delete' },
    'create_client': { entity: 'client', operation: 'create' },
    'delete_client': { entity: 'client', operation: 'delete' },
    'create_work_order': { entity: 'workOrder', operation: 'create' },
    'delete_work_order': { entity: 'workOrder', operation: 'delete' },
    'send_sms': { entity: 'sms', operation: 'create' },
    'upload_file': { entity: 'file', operation: 'create' },
    'delete_file': { entity: 'file', operation: 'delete' },
  };

  const mappedAction = actionMap[action as keyof typeof actionMap];
  if (!mappedAction) {
    console.warn(`Unknown action for usage tracking: ${action}`);
    return;
  }

  if (mappedAction.operation === 'create') {
    await EnhancedSubscriptionMiddleware.trackCreation(tenantId, mappedAction.entity, count, metadata, requestId);
  } else if (mappedAction.operation === 'delete') {
    await EnhancedSubscriptionMiddleware.trackDeletion(tenantId, mappedAction.entity, count, metadata, requestId);
  }
}

// Export the main class as default and individual functions
export default EnhancedSubscriptionMiddleware;