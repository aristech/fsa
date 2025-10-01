import { connect } from "mongoose";
import { Tenant } from "../models/Tenant";
import { EnvSubscriptionService } from "../services/env-subscription-service";

/**
 * Sync Subscription Plans Script
 *
 * This script synchronizes subscription plans from environment variables
 * to existing tenant records in the database.
 *
 * Usage:
 * - Run during deployment to update existing tenants with new plan limits
 * - Run after changing environment variables to sync changes
 * - Can be run safely multiple times (idempotent)
 *
 * Run with: npm run sync-subscription-plans
 * Or: node -r ts-node/register src/scripts/sync-subscription-plans.ts
 */

interface SyncStats {
  totalTenants: number;
  updatedTenants: number;
  skippedTenants: number;
  errors: number;
  planDistribution: Record<string, number>;
}

async function syncSubscriptionPlans() {
  console.log('🚀 Starting subscription plans synchronization...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await connect(mongoUri);
    console.log('📊 Connected to MongoDB');

    // Validate environment configuration
    const validation = EnvSubscriptionService.validateEnvironmentConfig();
    if (!validation.valid) {
      throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
    }

    // Load plans from environment
    const envPlans = EnvSubscriptionService.getAllPlans();
    console.log(`📋 Loaded ${Object.keys(envPlans).length} plans from environment:`, Object.keys(envPlans));

    // Get all tenants
    const tenants = await Tenant.find({});
    console.log(`👥 Found ${tenants.length} tenants to process\n`);

    const stats: SyncStats = {
      totalTenants: tenants.length,
      updatedTenants: 0,
      skippedTenants: 0,
      errors: 0,
      planDistribution: {},
    };

    // Process each tenant
    for (const tenant of tenants) {
      try {
        await syncTenantSubscription(tenant, envPlans, stats);
      } catch (error) {
        console.error(`❌ Error processing tenant ${tenant._id}:`, error);
        stats.errors++;
      }
    }

    // Display results
    console.log('\n📈 Synchronization Results:');
    console.log(`  Total Tenants: ${stats.totalTenants}`);
    console.log(`  Updated: ${stats.updatedTenants}`);
    console.log(`  Skipped: ${stats.skippedTenants}`);
    console.log(`  Errors: ${stats.errors}`);

    if (Object.keys(stats.planDistribution).length > 0) {
      console.log('\n📊 Plan Distribution:');
      Object.entries(stats.planDistribution).forEach(([plan, count]) => {
        console.log(`  ${plan}: ${count} tenant(s)`);
      });
    }

    console.log('\n✅ Subscription plans synchronization completed!');

    if (stats.errors > 0) {
      console.log(`⚠️  ${stats.errors} error(s) occurred during synchronization`);
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Fatal error during synchronization:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

async function syncTenantSubscription(
  tenant: any,
  envPlans: Record<string, any>,
  stats: SyncStats
): Promise<void> {
  const tenantPlan = tenant.subscription?.plan || 'free';

  // Track plan distribution
  stats.planDistribution[tenantPlan] = (stats.planDistribution[tenantPlan] || 0) + 1;

  // Check if plan exists in environment
  const envPlan = envPlans[tenantPlan];
  if (!envPlan) {
    console.warn(`⚠️  Tenant ${tenant._id} has unknown plan: ${tenantPlan}, defaulting to 'free'`);
    tenant.subscription.plan = 'free';
    const freePlan = envPlans['free'];
    if (freePlan) {
      await updateTenantLimits(tenant, freePlan);
      stats.updatedTenants++;
    }
    return;
  }

  // Check if limits need updating
  const currentLimits = tenant.subscription?.limits || {};
  const newLimits = envPlan.limits;

  const needsUpdate = (
    currentLimits.maxUsers !== newLimits.maxUsers ||
    currentLimits.maxClients !== newLimits.maxClients ||
    currentLimits.maxWorkOrdersPerMonth !== newLimits.maxWorkOrdersPerMonth ||
    currentLimits.maxSmsPerMonth !== newLimits.maxSmsPerMonth ||
    currentLimits.maxStorageGB !== newLimits.maxStorageGB ||
    JSON.stringify(currentLimits.features) !== JSON.stringify(newLimits.features)
  );

  if (needsUpdate) {
    await updateTenantLimits(tenant, envPlan);
    console.log(`✅ Updated tenant ${tenant._id} (${tenantPlan} plan)`);
    stats.updatedTenants++;
  } else {
    console.log(`⏭️  Skipped tenant ${tenant._id} (${tenantPlan} plan) - already up to date`);
    stats.skippedTenants++;
  }
}

async function updateTenantLimits(tenant: any, envPlan: any): Promise<void> {
  // Preserve existing usage data
  const existingUsage = tenant.subscription?.usage || {
    currentUsers: 0,
    currentClients: 0,
    workOrdersThisMonth: 0,
    smsThisMonth: 0,
    storageUsedGB: 0,
    lastResetDate: new Date(),
  };

  // Update subscription with new limits from environment
  tenant.subscription = {
    ...tenant.subscription,
    limits: {
      maxUsers: envPlan.limits.maxUsers,
      maxClients: envPlan.limits.maxClients,
      maxWorkOrdersPerMonth: envPlan.limits.maxWorkOrdersPerMonth,
      maxSmsPerMonth: envPlan.limits.maxSmsPerMonth,
      maxStorageGB: envPlan.limits.maxStorageGB,
      features: { ...envPlan.limits.features },
    },
    usage: existingUsage, // Keep existing usage
  };

  await tenant.save();

  // Log the changes for debugging
  console.log(`    Limits updated:`, {
    users: `${existingUsage.currentUsers}/${envPlan.limits.maxUsers}`,
    clients: `${existingUsage.currentClients}/${envPlan.limits.maxClients}`,
    workOrders: `${existingUsage.workOrdersThisMonth}/${envPlan.limits.maxWorkOrdersPerMonth}`,
    sms: `${existingUsage.smsThisMonth}/${envPlan.limits.maxSmsPerMonth}`,
    storage: `${existingUsage.storageUsedGB.toFixed(2)}GB/${envPlan.limits.maxStorageGB}GB`,
  });
}

// Add command line argument support
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🧪 DRY RUN MODE: No changes will be made to the database\n');
}

// Run the synchronization
syncSubscriptionPlans().catch(console.error);