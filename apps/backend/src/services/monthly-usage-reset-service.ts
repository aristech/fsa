import { Tenant } from '../models/Tenant';

/**
 * Service to handle monthly usage reset on login
 * This is a "lazy evaluation" approach - checks and resets when needed
 */
export class MonthlyUsageResetService {
  private static resetInProgress = new Map<string, boolean>();

  /**
   * Check if tenant needs monthly reset and perform it if needed
   * Called on every user login
   */
  static async checkAndResetIfNeeded(tenantId: string): Promise<{
    wasReset: boolean;
    message?: string;
  }> {
    try {
      // Prevent concurrent resets for same tenant (race condition protection)
      if (this.resetInProgress.get(tenantId)) {
        console.log(`⏳ Monthly reset already in progress for tenant ${tenantId}, skipping`);
        return { wasReset: false, message: 'Reset already in progress' };
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return { wasReset: false, message: 'Tenant not found' };
      }

      const lastResetDate = tenant.subscription?.usage?.lastResetDate;
      if (!lastResetDate) {
        console.log(`⚠️  No lastResetDate found for tenant ${tenantId}, skipping reset`);
        return { wasReset: false, message: 'No lastResetDate found' };
      }

      const now = new Date();
      const lastResetMonth = lastResetDate.getMonth();
      const lastResetYear = lastResetDate.getFullYear();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Check if we're in a different month/year than the last reset
      const needsReset =
        currentYear > lastResetYear ||
        (currentYear === lastResetYear && currentMonth > lastResetMonth);

      if (!needsReset) {
        // Already reset this month, no action needed
        return { wasReset: false, message: 'Already reset this month' };
      }

      // Mark reset in progress (lock)
      this.resetInProgress.set(tenantId, true);

      try {
        // Perform the reset
        const previousWorkOrders = tenant.subscription.usage.workOrdersThisMonth || 0;
        const previousSms = tenant.subscription.usage.smsThisMonth || 0;

        await Tenant.findByIdAndUpdate(
          tenantId,
          {
            $set: {
              'subscription.usage.workOrdersThisMonth': 0,
              'subscription.usage.smsThisMonth': 0,
              'subscription.usage.lastResetDate': now,
            },
          },
          { new: true }
        );

        console.log(`✅ Monthly usage reset for tenant ${tenantId}:`, {
          previousWorkOrders,
          previousSms,
          lastResetDate: lastResetDate.toISOString(),
          newResetDate: now.toISOString(),
        });

        return {
          wasReset: true,
          message: `Monthly counters reset (WO: ${previousWorkOrders}→0, SMS: ${previousSms}→0)`,
        };
      } finally {
        // Release lock
        this.resetInProgress.delete(tenantId);
      }
    } catch (error) {
      console.error(`❌ Error checking/resetting monthly usage for tenant ${tenantId}:`, error);
      // Release lock on error
      this.resetInProgress.delete(tenantId);
      return { wasReset: false, message: `Error: ${error}` };
    }
  }

  /**
   * Get the first day of the current month
   */
  static getFirstDayOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Check if a date is in the current month
   */
  static isCurrentMonth(date: Date): boolean {
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
}
