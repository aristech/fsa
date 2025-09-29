import { FastifyRequest, FastifyReply } from "fastify";
import { Tenant } from "../models/Tenant";
import { SubscriptionPlansService } from "../services/subscription-plans-service";
import { FileTrackingService } from "../services/file-tracking-service";
import { sendForbidden, sendBadRequest } from "../utils/error-handler";
import { BUSINESS_MESSAGES } from "../constants/error-messages";

// ----------------------------------------------------------------------

export interface ResourceLimits {
  users: boolean;
  clients: boolean;
  workOrders: boolean;
  sms: boolean;
  storage: boolean;
  files: boolean;
}

export interface UsageTrackingRequest extends FastifyRequest {
  tenant?: any;
  user: any;
  resourceLimits?: ResourceLimits;
}

// ----------------------------------------------------------------------

/**
 * Middleware to check and enforce all resource limits before any action
 */
export function enforceResourceLimits(resourceType: keyof ResourceLimits, count: number = 1) {
  return async (request: UsageTrackingRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || request.user?.tenantId;

      if (!tenantId) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant information not found"
        );
      }

      // Fetch tenant with current usage
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant not found"
        );
      }

      // Check subscription status
      if (!isSubscriptionActive(tenant)) {
        return sendForbidden(
          reply,
          BUSINESS_MESSAGES.SUBSCRIPTION_INACTIVE,
          "Subscription is not active or trial has expired"
        );
      }

      // Check specific resource limit
      const limitCheck = await checkResourceLimit(tenant, resourceType, count);

      if (!limitCheck.allowed) {
        return sendForbidden(
          reply,
          BUSINESS_MESSAGES.SUBSCRIPTION_LIMIT_EXCEEDED,
          limitCheck.reason || `${resourceType} limit exceeded`
        );
      }

      // Add tenant to request for use in route handlers
      request.tenant = tenant;
      request.resourceLimits = await getResourceLimitsStatus(tenant);

    } catch (error) {
      console.error("Resource limit enforcement error:", error);
      return sendBadRequest(
        reply,
        BUSINESS_MESSAGES.SUBSCRIPTION_ERROR,
        "Error checking resource limits"
      );
    }
  };
}

/**
 * Middleware specifically for file uploads with comprehensive checks
 */
export function enforceFileUploadLimits(category: 'logo' | 'workorder_attachment' | 'client_document' | 'material_image' | 'other' = 'other') {
  return async (request: UsageTrackingRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || request.user?.tenantId;

      if (!tenantId) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant information not found"
        );
      }

      // Get file size from multipart data
      const data = await request.file();
      if (!data) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "No file uploaded"
        );
      }

      const buffer = await data.toBuffer();
      const fileSize = buffer.length;

      // Check if tenant can upload this file
      const canUpload = await FileTrackingService.canUploadFile(tenantId, fileSize);

      if (!canUpload.allowed) {
        return sendForbidden(
          reply,
          BUSINESS_MESSAGES.SUBSCRIPTION_LIMIT_EXCEEDED,
          canUpload.reason || "Storage limit exceeded"
        );
      }

      // Store file data for use in route handler
      (request as any).fileData = {
        buffer,
        filename: data.filename,
        mimetype: data.mimetype,
        size: fileSize,
        category
      };

      // Add tenant info
      const tenant = await Tenant.findById(tenantId);
      request.tenant = tenant;

    } catch (error) {
      console.error("File upload limit enforcement error:", error);
      return sendBadRequest(
        reply,
        BUSINESS_MESSAGES.SUBSCRIPTION_ERROR,
        "Error checking file upload limits"
      );
    }
  };
}

/**
 * Track resource usage after successful operation
 */
export async function trackResourceUsage(
  tenantId: string,
  resourceType: keyof ResourceLimits,
  count: number = 1,
  metadata?: any
): Promise<void> {
  try {
    let updateQuery: any = {};
    const now = new Date();

    switch (resourceType) {
      case 'users':
        updateQuery = {
          $inc: { 'subscription.usage.currentUsers': count }
        };
        break;

      case 'clients':
        updateQuery = {
          $inc: { 'subscription.usage.currentClients': count }
        };
        break;

      case 'workOrders':
        updateQuery = {
          $inc: { 'subscription.usage.workOrdersThisMonth': count }
        };
        break;

      case 'sms':
        updateQuery = {
          $inc: { 'subscription.usage.smsThisMonth': count }
        };
        break;

      case 'storage':
        // For file tracking, use FileTrackingService
        if (metadata) {
          await FileTrackingService.trackFileUpload(
            tenantId,
            metadata.filename,
            metadata.originalName,
            metadata.mimeType,
            metadata.size,
            metadata.category,
            metadata.filePath
          );
        }
        return;

      case 'files':
        updateQuery = {
          $inc: { 'subscription.usage.totalFiles': count }
        };
        break;

      default:
        console.warn(`Unknown resource type: ${resourceType}`);
        return;
    }

    await Tenant.findByIdAndUpdate(tenantId, updateQuery, { new: true });
    console.log(`Resource usage tracked: ${resourceType} +${count} for tenant ${tenantId}`);

  } catch (error) {
    console.error(`Error tracking ${resourceType} usage:`, error);
    throw error;
  }
}

/**
 * Track resource deletion/reduction
 */
export async function trackResourceReduction(
  tenantId: string,
  resourceType: keyof ResourceLimits,
  count: number = 1,
  metadata?: any
): Promise<void> {
  try {
    if (resourceType === 'storage' && metadata?.filename) {
      await FileTrackingService.trackFileDeletion(tenantId, metadata.filename);
      return;
    }

    // For other resources, reduce the count
    await trackResourceUsage(tenantId, resourceType, -count);

  } catch (error) {
    console.error(`Error tracking ${resourceType} reduction:`, error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

/**
 * Check if subscription is active and not expired
 */
function isSubscriptionActive(tenant: any): boolean {
  const subscription = tenant.subscription;

  // Check if subscription is cancelled or inactive
  if (subscription.status === "cancelled" || subscription.status === "inactive") {
    return false;
  }

  // Check if trial has expired
  if (subscription.status === "trial" && subscription.trialEndDate) {
    const now = new Date();
    if (now > subscription.trialEndDate) {
      return false;
    }
  }

  return true;
}

/**
 * Check specific resource limit
 */
async function checkResourceLimit(
  tenant: any,
  resourceType: keyof ResourceLimits,
  count: number
): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {

  const limits = tenant.subscription.limits;
  const usage = tenant.subscription.usage;

  switch (resourceType) {
    case 'users':
      if (limits.maxUsers === -1) return { allowed: true };
      const canCreateUser = (usage.currentUsers + count) <= limits.maxUsers;
      return {
        allowed: canCreateUser,
        reason: canCreateUser ? undefined : `User limit exceeded. Current: ${usage.currentUsers}, Limit: ${limits.maxUsers}`,
        currentUsage: usage.currentUsers,
        limit: limits.maxUsers,
      };

    case 'clients':
      if (limits.maxClients === -1) return { allowed: true };
      const canCreateClient = (usage.currentClients + count) <= limits.maxClients;
      return {
        allowed: canCreateClient,
        reason: canCreateClient ? undefined : `Client limit exceeded. Current: ${usage.currentClients}, Limit: ${limits.maxClients}`,
        currentUsage: usage.currentClients,
        limit: limits.maxClients,
      };

    case 'workOrders':
      if (limits.maxWorkOrdersPerMonth === -1) return { allowed: true };
      const canCreateWorkOrder = (usage.workOrdersThisMonth + count) <= limits.maxWorkOrdersPerMonth;
      return {
        allowed: canCreateWorkOrder,
        reason: canCreateWorkOrder ? undefined : `Monthly work order limit exceeded. Current: ${usage.workOrdersThisMonth}, Limit: ${limits.maxWorkOrdersPerMonth}`,
        currentUsage: usage.workOrdersThisMonth,
        limit: limits.maxWorkOrdersPerMonth,
      };

    case 'sms':
      if (limits.maxSmsPerMonth === -1) return { allowed: true };
      if (limits.maxSmsPerMonth === 0) return {
        allowed: false,
        reason: "SMS feature not available in current plan",
        currentUsage: usage.smsThisMonth,
        limit: limits.maxSmsPerMonth,
      };
      const canSendSms = (usage.smsThisMonth + count) <= limits.maxSmsPerMonth;
      return {
        allowed: canSendSms,
        reason: canSendSms ? undefined : `Monthly SMS limit exceeded. Current: ${usage.smsThisMonth}, Limit: ${limits.maxSmsPerMonth}`,
        currentUsage: usage.smsThisMonth,
        limit: limits.maxSmsPerMonth,
      };

    case 'storage':
      // This should be handled by FileTrackingService
      return { allowed: true };

    case 'files':
      // For now, we don't have a specific file count limit, but we could add one
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

/**
 * Get current resource limits status for a tenant
 */
async function getResourceLimitsStatus(tenant: any): Promise<ResourceLimits> {
  const limits = tenant.subscription.limits;
  const usage = tenant.subscription.usage;

  return {
    users: limits.maxUsers === -1 || usage.currentUsers < limits.maxUsers,
    clients: limits.maxClients === -1 || usage.currentClients < limits.maxClients,
    workOrders: limits.maxWorkOrdersPerMonth === -1 || usage.workOrdersThisMonth < limits.maxWorkOrdersPerMonth,
    sms: limits.maxSmsPerMonth === -1 || (limits.maxSmsPerMonth > 0 && usage.smsThisMonth < limits.maxSmsPerMonth),
    storage: limits.maxStorageGB === -1 || usage.storageUsedGB < limits.maxStorageGB,
    files: true, // No specific file count limit for now
  };
}

// ----------------------------------------------------------------------
// Convenience middleware factories
// ----------------------------------------------------------------------

export const resourceLimitMiddleware = {
  // User management
  checkUserCreation: (count: number = 1) => enforceResourceLimits('users', count),

  // Client management
  checkClientCreation: (count: number = 1) => enforceResourceLimits('clients', count),

  // Work order management
  checkWorkOrderCreation: (count: number = 1) => enforceResourceLimits('workOrders', count),

  // SMS management
  checkSmsUsage: (count: number = 1) => enforceResourceLimits('sms', count),

  // File management
  checkFileUpload: (category: 'logo' | 'workorder_attachment' | 'client_document' | 'material_image' | 'other' = 'other') =>
    enforceFileUploadLimits(category),
};