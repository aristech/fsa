import { FastifyRequest, FastifyReply } from "fastify";
import { Tenant } from "../models/Tenant";
import { EnvSubscriptionService } from "../services/env-subscription-service";
import { sendBadRequest, sendForbidden } from "../utils/error-handler";
import { BUSINESS_MESSAGES } from "../constants/error-messages";

export interface SubscriptionCheckRequest extends FastifyRequest {
  tenant?: any;
  user: any;
}

/**
 * Middleware to check subscription limits before allowing certain actions
 */
export function checkSubscriptionLimit(action: string, count: number = 1) {
  return async (request: SubscriptionCheckRequest, reply: FastifyReply) => {
    try {
      // Get tenant ID from request (assuming it's set by tenant isolation middleware)
      const tenantId = (request as any).tenantId || request.user?.tenantId;

      if (!tenantId) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant information not found"
        );
      }

      // Fetch tenant with subscription information
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant not found"
        );
      }

      // Check if tenant subscription is active
      if (tenant.subscription.status === "cancelled" || tenant.subscription.status === "inactive") {
        return sendForbidden(
          reply,
          BUSINESS_MESSAGES.SUBSCRIPTION_INACTIVE,
          "Subscription is not active"
        );
      }

      // Check if trial has expired
      if (tenant.subscription.status === "trial" && tenant.subscription.trialEndDate) {
        const now = new Date();
        if (now > tenant.subscription.trialEndDate) {
          return sendForbidden(
            reply,
            BUSINESS_MESSAGES.TRIAL_EXPIRED,
            "Trial period has expired. Please upgrade your subscription."
          );
        }
      }

      // Check subscription limits
      const limitCheck = EnvSubscriptionService.canPerformAction(tenant, action, count);

      if (!limitCheck.allowed) {
        return sendForbidden(
          reply,
          BUSINESS_MESSAGES.SUBSCRIPTION_LIMIT_EXCEEDED,
          limitCheck.reason || "Subscription limit exceeded"
        );
      }

      // Add tenant to request for use in route handlers
      request.tenant = tenant;
    } catch (error) {
      console.error("Subscription check error:", error);
      return sendBadRequest(
        reply,
        BUSINESS_MESSAGES.SUBSCRIPTION_ERROR,
        "Error checking subscription limits"
      );
    }
  };
}

/**
 * Middleware to check if a feature is available in the current subscription plan
 */
export function requireFeature(featureName: string) {
  return async (request: SubscriptionCheckRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || request.user?.tenantId;

      if (!tenantId) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant information not found"
        );
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant not found"
        );
      }

      const featureCheck = EnvSubscriptionService.canPerformAction(tenant, `use_${featureName}`);

      if (!featureCheck.allowed) {
        return sendForbidden(
          reply,
          BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE,
          featureCheck.reason || `Feature '${featureName}' is not available in your current plan`
        );
      }

      request.tenant = tenant;
    } catch (error) {
      console.error("Feature check error:", error);
      return sendBadRequest(
        reply,
        BUSINESS_MESSAGES.SUBSCRIPTION_ERROR,
        "Error checking feature availability"
      );
    }
  };
}

/**
 * Get list of plans that include a specific feature
 */
function getPlansWithFeature(featureName: string): string[] {
  const plans = EnvSubscriptionService.getAllPlans();
  const availablePlans: string[] = [];

  Object.entries(plans).forEach(([planId, plan]) => {
    if ((plan.limits.features as any)[featureName]) {
      availablePlans.push(plan.name);
    }
  });

  return availablePlans;
}

/**
 * Utility function to update usage after successful action
 */
export async function updateUsageAfterAction(
  tenantId: string,
  action: string,
  count: number = 1
): Promise<void> {
  let usageAction: string;

  switch (action) {
    case 'create_user':
      usageAction = 'user_created';
      break;
    case 'create_client':
      usageAction = 'client_created';
      break;
    case 'create_work_order':
      usageAction = 'work_order_created';
      break;
    case 'send_sms':
      usageAction = 'sms_sent';
      break;
    case 'upload_file':
      usageAction = 'storage_used';
      // count should be file size in GB
      break;
    default:
      return; // No usage tracking for this action
  }

  await EnvSubscriptionService.updateUsage(tenantId, usageAction, count);
}

/**
 * Middleware factory for common subscription checks
 */
export const subscriptionMiddleware = {
  // User creation limit
  checkUserLimit: (count: number = 1) => checkSubscriptionLimit('create_user', count),

  // Client creation limit
  checkClientLimit: (count: number = 1) => checkSubscriptionLimit('create_client', count),

  // Work order creation limit
  checkWorkOrderLimit: (count: number = 1) => checkSubscriptionLimit('create_work_order', count),

  // SMS sending limit
  checkSmsLimit: (count: number = 1) => checkSubscriptionLimit('send_sms', count),

  // Storage limit (expects file size in bytes)
  checkStorageLimit: (fileSizeBytes: number) => checkSubscriptionLimit('upload_file', fileSizeBytes),

  // Feature requirements
  requireSmsReminders: () => requireFeature('sms_reminders'),
  requireAdvancedReporting: () => requireFeature('advanced_reporting'),
  requireApiAccess: () => requireFeature('api'),
  requireCustomBranding: () => requireFeature('custom_branding'),
  requireMultiLocation: () => requireFeature('multi_location'),
  requireIntegrations: () => requireFeature('integrations'),
};

/**
 * Get subscription status for current tenant
 */
export async function getSubscriptionStatus(request: FastifyRequest): Promise<any> {
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