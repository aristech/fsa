import { Tenant } from '../models/Tenant';
import { HttpErrorLogUtils } from '../utils/http-error-logger';

// ----------------------------------------------------------------------

export interface UsageAction {
  entity: string;
  operation: 'create' | 'delete';
  count: number;
  metadata?: {
    entityId?: string;
    fileSizeBytes?: number;
    fileName?: string;
    fileType?: string;
  };
}

export interface UsageTrackingResult {
  success: boolean;
  previousValue: number;
  newValue: number;
  limit: number;
  entity: string;
  operation: string;
  error?: string;
}

// ----------------------------------------------------------------------

/**
 * Centralized Usage Tracking Service
 *
 * This service handles all subscription usage tracking in a centralized way:
 * - Automatic usage increments on entity creation
 * - Automatic usage decrements on entity deletion
 * - Dynamic configuration from environment variables
 * - Comprehensive logging and error handling
 * - Support for all entity types (users, clients, work orders, files, SMS)
 */
export class CentralizedUsageService {

  /**
   * Entity to database field mapping
   * This maps entity types to their corresponding tenant usage fields
   */
  private static readonly ENTITY_FIELD_MAP = {
    user: 'subscription.usage.currentUsers',
    personnel: 'subscription.usage.currentUsers', // Personnel creates users
    client: 'subscription.usage.currentClients',
    workOrder: 'subscription.usage.workOrdersThisMonth',
    sms: 'subscription.usage.smsThisMonth',
    file: 'subscription.usage.storageUsedGB',
  };

  /**
   * Track usage change for an entity
   */
  static async trackUsage(
    tenantId: string,
    action: UsageAction,
    requestId?: string
  ): Promise<UsageTrackingResult> {
    const startTime = Date.now();

    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const fieldPath = this.ENTITY_FIELD_MAP[action.entity as keyof typeof this.ENTITY_FIELD_MAP];
      if (!fieldPath) {
        throw new Error(`Unknown entity type: ${action.entity}`);
      }

      // Get current value
      const previousValue = this.getNestedValue(tenant.toObject(), fieldPath) || 0;

      // Calculate change amount
      let changeAmount = action.count;

      // Handle special cases
      if (action.entity === 'file' && action.metadata?.fileSizeBytes) {
        // Convert bytes to GB for file storage
        changeAmount = action.metadata.fileSizeBytes / (1024 * 1024 * 1024);
      }

      // Apply operation direction
      if (action.operation === 'delete') {
        changeAmount = -Math.abs(changeAmount);
      } else if (action.operation === 'create') {
        changeAmount = Math.abs(changeAmount);
      }

      // Update the usage in database
      const updateResult = await Tenant.findByIdAndUpdate(
        tenantId,
        { $inc: { [fieldPath]: changeAmount } },
        { new: true }
      );

      if (!updateResult) {
        throw new Error('Failed to update tenant usage');
      }

      const newValue = Math.max(0, previousValue + changeAmount); // Ensure non-negative
      const limit = this.getEntityLimit(tenant, action.entity);

      const result: UsageTrackingResult = {
        success: true,
        previousValue,
        newValue,
        limit,
        entity: action.entity,
        operation: action.operation,
      };

      // Log the usage tracking
      this.logUsageTracking(requestId, tenantId, action, result, Date.now() - startTime);

      return result;

    } catch (error: any) {
      const result: UsageTrackingResult = {
        success: false,
        previousValue: 0,
        newValue: 0,
        limit: 0,
        entity: action.entity,
        operation: action.operation,
        error: error.message,
      };

      // Log the error
      HttpErrorLogUtils.log500Error(
        {
          requestId,
          entity: action.entity,
          service: 'CentralizedUsageService',
          operation: `track_${action.operation}`,
          tenantId,
          metadata: action.metadata,
        },
        error,
        `Failed to track ${action.operation} usage for ${action.entity}`
      );

      return result;
    }
  }

  /**
   * Track entity creation
   */
  static async trackCreation(
    tenantId: string,
    entity: string,
    count: number = 1,
    metadata?: UsageAction['metadata'],
    requestId?: string
  ): Promise<UsageTrackingResult> {
    return this.trackUsage(tenantId, {
      entity,
      operation: 'create',
      count,
      metadata,
    }, requestId);
  }

  /**
   * Track entity deletion
   */
  static async trackDeletion(
    tenantId: string,
    entity: string,
    count: number = 1,
    metadata?: UsageAction['metadata'],
    requestId?: string
  ): Promise<UsageTrackingResult> {
    return this.trackUsage(tenantId, {
      entity,
      operation: 'delete',
      count,
      metadata,
    }, requestId);
  }

  /**
   * Track personnel creation (creates user in background)
   */
  static async trackPersonnelCreation(
    tenantId: string,
    personnelId: string,
    requestId?: string
  ): Promise<UsageTrackingResult> {
    return this.trackCreation(tenantId, 'personnel', 1, { entityId: personnelId }, requestId);
  }

  /**
   * Track personnel deletion (removes user usage)
   */
  static async trackPersonnelDeletion(
    tenantId: string,
    personnelId: string,
    requestId?: string
  ): Promise<UsageTrackingResult> {
    return this.trackDeletion(tenantId, 'personnel', 1, { entityId: personnelId }, requestId);
  }

  /**
   * Track file upload
   */
  static async trackFileUpload(
    tenantId: string,
    fileSizeBytes: number,
    fileName: string,
    fileType: string,
    requestId?: string
  ): Promise<UsageTrackingResult> {
    return this.trackCreation(tenantId, 'file', 1, {
      fileSizeBytes,
      fileName,
      fileType,
    }, requestId);
  }

  /**
   * Track file deletion
   */
  static async trackFileDeletion(
    tenantId: string,
    fileSizeBytes: number,
    fileName: string,
    requestId?: string
  ): Promise<UsageTrackingResult> {
    return this.trackDeletion(tenantId, 'file', 1, {
      fileSizeBytes,
      fileName,
    }, requestId);
  }

  /**
   * Track SMS sending
   */
  static async trackSmsSent(
    tenantId: string,
    count: number = 1,
    metadata?: { recipient?: string; messageId?: string },
    requestId?: string
  ): Promise<UsageTrackingResult> {
    return this.trackCreation(tenantId, 'sms', count, metadata as any, requestId);
  }

  /**
   * Get current usage for all entities
   */
  static async getCurrentUsage(tenantId: string): Promise<any> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      return {
        users: tenant.subscription.usage.currentUsers,
        clients: tenant.subscription.usage.currentClients,
        workOrdersThisMonth: tenant.subscription.usage.workOrdersThisMonth,
        smsThisMonth: tenant.subscription.usage.smsThisMonth,
        storageUsedGB: tenant.subscription.usage.storageUsedGB,
        lastResetDate: tenant.subscription.usage.lastResetDate,
      };
    } catch (error: any) {
      console.error('Failed to get current usage:', error);
      return null;
    }
  }

  /**
   * Get usage vs limits comparison
   */
  static async getUsageComparison(tenantId: string): Promise<any> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const usage = tenant.subscription.usage;
      const limits = tenant.subscription.limits;

      return {
        users: {
          current: usage.currentUsers,
          limit: limits.maxUsers,
          percentage: limits.maxUsers > 0 ? (usage.currentUsers / limits.maxUsers) * 100 : 0,
          remaining: Math.max(0, limits.maxUsers - usage.currentUsers),
        },
        clients: {
          current: usage.currentClients,
          limit: limits.maxClients,
          percentage: limits.maxClients > 0 ? (usage.currentClients / limits.maxClients) * 100 : 0,
          remaining: Math.max(0, limits.maxClients - usage.currentClients),
        },
        workOrders: {
          current: usage.workOrdersThisMonth,
          limit: limits.maxWorkOrdersPerMonth,
          percentage: limits.maxWorkOrdersPerMonth > 0 ? (usage.workOrdersThisMonth / limits.maxWorkOrdersPerMonth) * 100 : 0,
          remaining: Math.max(0, limits.maxWorkOrdersPerMonth - usage.workOrdersThisMonth),
        },
        sms: {
          current: usage.smsThisMonth,
          limit: limits.maxSmsPerMonth,
          percentage: limits.maxSmsPerMonth > 0 ? (usage.smsThisMonth / limits.maxSmsPerMonth) * 100 : 0,
          remaining: Math.max(0, limits.maxSmsPerMonth - usage.smsThisMonth),
        },
        storage: {
          current: usage.storageUsedGB,
          limit: limits.maxStorageGB,
          percentage: limits.maxStorageGB > 0 ? (usage.storageUsedGB / limits.maxStorageGB) * 100 : 0,
          remaining: Math.max(0, limits.maxStorageGB - usage.storageUsedGB),
        },
      };
    } catch (error: any) {
      console.error('Failed to get usage comparison:', error);
      return null;
    }
  }

  /**
   * Check if usage is approaching limits (>80%)
   */
  static async checkUsageAlerts(tenantId: string): Promise<string[]> {
    const alerts: string[] = [];

    try {
      const comparison = await this.getUsageComparison(tenantId);
      if (!comparison) return alerts;

      Object.entries(comparison).forEach(([entity, data]: [string, any]) => {
        if (data.percentage > 80 && data.percentage < 100) {
          alerts.push(`${entity}_approaching_limit`);
        } else if (data.percentage >= 100) {
          alerts.push(`${entity}_limit_exceeded`);
        }
      });

      return alerts;
    } catch (error: any) {
      console.error('Failed to check usage alerts:', error);
      return [];
    }
  }

  /**
   * Bulk usage operations (for data migrations, etc.)
   */
  static async bulkUpdateUsage(
    tenantId: string,
    updates: { entity: string; value: number }[],
    requestId?: string
  ): Promise<boolean> {
    try {
      const updateObject: any = {};

      updates.forEach(({ entity, value }) => {
        const fieldPath = this.ENTITY_FIELD_MAP[entity as keyof typeof this.ENTITY_FIELD_MAP];
        if (fieldPath) {
          updateObject[fieldPath] = Math.max(0, value); // Ensure non-negative
        }
      });

      await Tenant.findByIdAndUpdate(tenantId, { $set: updateObject });

      console.log(`Bulk usage update completed for tenant ${tenantId}:`, updateObject);
      return true;
    } catch (error: any) {
      HttpErrorLogUtils.log500Error(
        {
          requestId,
          service: 'CentralizedUsageService',
          operation: 'bulk_update',
          tenantId,
        },
        error,
        'Failed to perform bulk usage update'
      );
      return false;
    }
  }

  /**
   * Reset monthly usage counters
   */
  static async resetMonthlyUsage(tenantId?: string): Promise<void> {
    try {
      const filter = tenantId ? { _id: tenantId } : {};
      const now = new Date();

      await Tenant.updateMany(filter, {
        $set: {
          'subscription.usage.workOrdersThisMonth': 0,
          'subscription.usage.smsThisMonth': 0,
          'subscription.usage.lastResetDate': now,
        },
      });

      console.log(`Monthly usage reset completed${tenantId ? ` for tenant ${tenantId}` : ' for all tenants'}`);
    } catch (error: any) {
      console.error('Failed to reset monthly usage:', error);
    }
  }

  // ----------------------------------------------------------------------
  // Private helper methods
  // ----------------------------------------------------------------------

  /**
   * Get nested object value by dot notation path
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get entity limit from tenant subscription
   */
  private static getEntityLimit(tenant: any, entity: string): number {
    const limits = tenant.subscription.limits;

    switch (entity) {
      case 'user':
      case 'personnel':
        return limits.maxUsers;
      case 'client':
        return limits.maxClients;
      case 'workOrder':
        return limits.maxWorkOrdersPerMonth;
      case 'sms':
        return limits.maxSmsPerMonth;
      case 'file':
        return limits.maxStorageGB;
      default:
        return 0;
    }
  }

  /**
   * Log usage tracking activity
   */
  private static logUsageTracking(
    requestId: string | undefined,
    tenantId: string,
    action: UsageAction,
    result: UsageTrackingResult,
    duration: number
  ): void {
    console.log(`Usage Tracking [${action.operation.toUpperCase()}]:`, {
      requestId,
      tenantId,
      entity: action.entity,
      operation: action.operation,
      count: action.count,
      previousValue: result.previousValue,
      newValue: result.newValue,
      limit: result.limit,
      duration: `${duration}ms`,
      metadata: action.metadata,
    });

    // Log to HTTP error logger for consistency
    if (requestId) {
      console.log(`📊 Usage tracked: ${action.entity} ${action.operation} - ${result.previousValue} → ${result.newValue} (limit: ${result.limit})`);
    }
  }
}