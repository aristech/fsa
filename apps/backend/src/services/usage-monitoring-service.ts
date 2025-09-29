import { Tenant } from '../models/Tenant';
import { SubscriptionPlansService } from './subscription-plans-service';
import { FileTrackingService } from './file-tracking-service';

// ----------------------------------------------------------------------

export interface UsageAlert {
  resourceType: 'users' | 'clients' | 'workOrders' | 'sms' | 'storage';
  severity: 'warning' | 'critical' | 'limit_reached';
  message: string;
  currentUsage: number;
  limit: number;
  percentage: number;
}

export interface TenantUsageReport {
  tenantId: string;
  tenantName: string;
  plan: string;
  status: string;
  usage: {
    users: { current: number; limit: number; percentage: number };
    clients: { current: number; limit: number; percentage: number };
    workOrders: { current: number; limit: number; percentage: number };
    sms: { current: number; limit: number; percentage: number };
    storage: { current: number; limit: number; percentage: number };
  };
  alerts: UsageAlert[];
  isOverLimit: boolean;
  trialDaysRemaining?: number;
}

// ----------------------------------------------------------------------

export class UsageMonitoringService {
  /**
   * Get comprehensive usage report for a tenant
   */
  static async getTenantUsageReport(tenantId: string): Promise<TenantUsageReport | null> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return null;
      }

      const limits = tenant.subscription.limits;
      const usage = tenant.subscription.usage;
      const alerts: UsageAlert[] = [];

      // Calculate usage percentages and generate alerts
      const usageData = {
        users: this.calculateUsageMetrics('users', usage.currentUsers, limits.maxUsers),
        clients: this.calculateUsageMetrics('clients', usage.currentClients, limits.maxClients),
        workOrders: this.calculateUsageMetrics('workOrders', usage.workOrdersThisMonth, limits.maxWorkOrdersPerMonth),
        sms: this.calculateUsageMetrics('sms', usage.smsThisMonth, limits.maxSmsPerMonth),
        storage: this.calculateUsageMetrics('storage', usage.storageUsedGB, limits.maxStorageGB),
      };

      // Generate alerts based on usage
      Object.entries(usageData).forEach(([resourceType, metrics]) => {
        const alert = this.generateUsageAlert(resourceType as any, metrics.current, metrics.limit, metrics.percentage);
        if (alert) {
          alerts.push(alert);
        }
      });

      // Check if any resource is over limit
      const isOverLimit = Object.values(usageData).some(metrics => metrics.percentage >= 100);

      // Calculate trial days remaining
      let trialDaysRemaining: number | undefined;
      if (tenant.subscription.status === 'trial' && tenant.subscription.trialEndDate) {
        const now = new Date();
        const trialEnd = new Date(tenant.subscription.trialEndDate);
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        trialDaysRemaining = Math.max(0, diffDays);
      }

      return {
        tenantId,
        tenantName: tenant.name,
        plan: tenant.subscription.plan,
        status: tenant.subscription.status,
        usage: usageData,
        alerts,
        isOverLimit,
        trialDaysRemaining,
      };
    } catch (error) {
      console.error('Error getting tenant usage report:', error);
      return null;
    }
  }

  /**
   * Get usage reports for all tenants (for admin monitoring)
   */
  static async getAllTenantsUsageReport(): Promise<TenantUsageReport[]> {
    try {
      const tenants = await Tenant.find({ isActive: true }).select('_id');
      const reports: TenantUsageReport[] = [];

      for (const tenant of tenants) {
        const report = await this.getTenantUsageReport(tenant._id.toString());
        if (report) {
          reports.push(report);
        }
      }

      return reports.sort((a, b) => {
        // Sort by alerts severity, then by percentage usage
        if (a.isOverLimit && !b.isOverLimit) return -1;
        if (!a.isOverLimit && b.isOverLimit) return 1;

        const aMaxPercentage = Math.max(...Object.values(a.usage).map(u => u.percentage));
        const bMaxPercentage = Math.max(...Object.values(b.usage).map(u => u.percentage));

        return bMaxPercentage - aMaxPercentage;
      });
    } catch (error) {
      console.error('Error getting all tenants usage report:', error);
      return [];
    }
  }

  /**
   * Get tenants that are approaching or exceeding limits
   */
  static async getTenantsWithAlerts(severity?: 'warning' | 'critical' | 'limit_reached'): Promise<TenantUsageReport[]> {
    const allReports = await this.getAllTenantsUsageReport();

    return allReports.filter(report => {
      if (severity) {
        return report.alerts.some(alert => alert.severity === severity);
      }
      return report.alerts.length > 0;
    });
  }

  /**
   * Check if tenant needs to be notified about usage
   */
  static async shouldNotifyTenant(tenantId: string): Promise<{ shouldNotify: boolean; alerts: UsageAlert[] }> {
    const report = await this.getTenantUsageReport(tenantId);

    if (!report) {
      return { shouldNotify: false, alerts: [] };
    }

    // Notify if any critical alerts or limit reached
    const criticalAlerts = report.alerts.filter(
      alert => alert.severity === 'critical' || alert.severity === 'limit_reached'
    );

    return {
      shouldNotify: criticalAlerts.length > 0 || report.isOverLimit,
      alerts: criticalAlerts,
    };
  }

  /**
   * Get upgrade recommendations for a tenant
   */
  static async getUpgradeRecommendations(tenantId: string): Promise<{
    shouldUpgrade: boolean;
    currentPlan: string;
    recommendedPlan: string;
    reasons: string[];
  }> {
    const report = await this.getTenantUsageReport(tenantId);

    if (!report) {
      return { shouldUpgrade: false, currentPlan: '', recommendedPlan: '', reasons: [] };
    }

    const reasons: string[] = [];
    const currentPlan = report.plan;
    let recommendedPlan = currentPlan;

    // Check which resources are over or near limits
    Object.entries(report.usage).forEach(([resource, metrics]) => {
      if (metrics.percentage >= 100) {
        reasons.push(`${resource} limit exceeded (${metrics.current}/${metrics.limit})`);
      } else if (metrics.percentage >= 80) {
        reasons.push(`${resource} usage is ${metrics.percentage.toFixed(0)}% of limit`);
      }
    });

    // Recommend upgrade based on current plan
    if (reasons.length > 0) {
      const plans = ['free', 'basic', 'premium', 'enterprise'];
      const currentIndex = plans.indexOf(currentPlan);

      if (currentIndex < plans.length - 1) {
        recommendedPlan = plans[currentIndex + 1];
      }
    }

    return {
      shouldUpgrade: reasons.length > 0 && recommendedPlan !== currentPlan,
      currentPlan,
      recommendedPlan,
      reasons,
    };
  }

  /**
   * Reset monthly usage counters for all tenants
   */
  static async resetMonthlyUsage(): Promise<{ updated: number; errors: string[] }> {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Find tenants that haven't been reset this month
      const tenantsToReset = await Tenant.find({
        $or: [
          { 'subscription.usage.lastResetDate': { $lt: firstDayOfMonth } },
          { 'subscription.usage.lastResetDate': { $exists: false } }
        ]
      });

      let updated = 0;
      const errors: string[] = [];

      for (const tenant of tenantsToReset) {
        try {
          await Tenant.findByIdAndUpdate(
            tenant._id,
            {
              $set: {
                'subscription.usage.workOrdersThisMonth': 0,
                'subscription.usage.smsThisMonth': 0,
                'subscription.usage.lastResetDate': now,
              }
            }
          );
          updated++;
        } catch (error) {
          errors.push(`Failed to reset usage for tenant ${tenant._id}: ${error}`);
        }
      }

      console.log(`Monthly usage reset completed. Updated ${updated} tenants, ${errors.length} errors`);
      return { updated, errors };
    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      return { updated: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // ----------------------------------------------------------------------
  // Private Helper Methods
  // ----------------------------------------------------------------------

  private static calculateUsageMetrics(
    resourceType: string,
    current: number,
    limit: number
  ): { current: number; limit: number; percentage: number } {
    // Handle unlimited resources (-1)
    if (limit === -1) {
      return { current, limit: -1, percentage: 0 };
    }

    // Handle disabled features (0 limit)
    if (limit === 0) {
      return { current, limit: 0, percentage: current > 0 ? 100 : 0 };
    }

    const percentage = limit > 0 ? (current / limit) * 100 : 0;
    return { current, limit, percentage: Math.min(percentage, 100) };
  }

  private static generateUsageAlert(
    resourceType: 'users' | 'clients' | 'workOrders' | 'sms' | 'storage',
    current: number,
    limit: number,
    percentage: number
  ): UsageAlert | null {
    // No alerts for unlimited resources
    if (limit === -1) {
      return null;
    }

    let severity: UsageAlert['severity'];
    let message: string;

    if (percentage >= 100) {
      severity = 'limit_reached';
      message = `${resourceType} limit reached (${current}/${limit})`;
    } else if (percentage >= 90) {
      severity = 'critical';
      message = `${resourceType} usage critical: ${percentage.toFixed(0)}% of limit used`;
    } else if (percentage >= 75) {
      severity = 'warning';
      message = `${resourceType} usage warning: ${percentage.toFixed(0)}% of limit used`;
    } else {
      return null; // No alert needed
    }

    return {
      resourceType,
      severity,
      message,
      currentUsage: current,
      limit,
      percentage,
    };
  }
}