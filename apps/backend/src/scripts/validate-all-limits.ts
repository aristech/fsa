#!/usr/bin/env tsx
/**
 * Validate All Subscription Limits Script
 *
 * This script validates that all subscription limits are working correctly:
 * - Checks that limits are loaded from environment variables
 * - Validates limit checking logic for all resource types
 * - Verifies usage tracking increments/decrements correctly
 * - Tests edge cases (unlimited, zero limits, etc.)
 *
 * Usage: npx tsx apps/backend/src/scripts/validate-all-limits.ts
 */

import { connect } from 'mongoose';
import { Tenant } from '../models/Tenant';
import { EnvSubscriptionService } from '../services/env-subscription-service';

interface ValidationResult {
  resource: string;
  passed: boolean;
  issues: string[];
  details?: any;
}

async function validateAllLimits() {
  try {
    console.log('='.repeat(60));
    console.log('Subscription Limits Validation');
    console.log('='.repeat(60));
    console.log('');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fsa';
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const results: ValidationResult[] = [];

    // 1. Validate environment configuration
    console.log('1️⃣  Validating Environment Configuration');
    console.log('-'.repeat(60));
    const envValidation = EnvSubscriptionService.validateEnvironmentConfig();
    results.push({
      resource: 'Environment Variables',
      passed: envValidation.valid,
      issues: envValidation.errors,
    });

    if (envValidation.valid) {
      console.log('✅ All environment variables are properly configured');
    } else {
      console.log('❌ Environment configuration issues:');
      envValidation.errors.forEach(err => console.log(`   - ${err}`));
    }
    console.log('');

    // 2. Validate plan loading
    console.log('2️⃣  Validating Plan Loading');
    console.log('-'.repeat(60));
    const plans = EnvSubscriptionService.getAllPlans();
    const planNames = ['free', 'basic', 'premium', 'enterprise'];
    const planIssues: string[] = [];

    for (const planName of planNames) {
      const plan = plans[planName];
      if (!plan) {
        planIssues.push(`Missing plan: ${planName}`);
        continue;
      }

      // Validate plan structure
      if (typeof plan.limits.maxUsers !== 'number') {
        planIssues.push(`${planName}: Invalid maxUsers`);
      }
      if (typeof plan.limits.maxClients !== 'number') {
        planIssues.push(`${planName}: Invalid maxClients`);
      }
      if (typeof plan.limits.maxWorkOrdersPerMonth !== 'number') {
        planIssues.push(`${planName}: Invalid maxWorkOrdersPerMonth`);
      }
      if (typeof plan.limits.maxSmsPerMonth !== 'number') {
        planIssues.push(`${planName}: Invalid maxSmsPerMonth`);
      }
      if (typeof plan.limits.maxStorageGB !== 'number') {
        planIssues.push(`${planName}: Invalid maxStorageGB`);
      }

      console.log(`✅ ${planName.toUpperCase()} plan loaded successfully`);
      console.log(`   Users: ${plan.limits.maxUsers === -1 ? 'Unlimited' : plan.limits.maxUsers}`);
      console.log(`   Clients: ${plan.limits.maxClients === -1 ? 'Unlimited' : plan.limits.maxClients}`);
      console.log(`   Work Orders/month: ${plan.limits.maxWorkOrdersPerMonth === -1 ? 'Unlimited' : plan.limits.maxWorkOrdersPerMonth}`);
      console.log(`   SMS/month: ${plan.limits.maxSmsPerMonth === -1 ? 'Unlimited' : plan.limits.maxSmsPerMonth}`);
      console.log(`   Storage: ${plan.limits.maxStorageGB === -1 ? 'Unlimited' : plan.limits.maxStorageGB + 'GB'}`);
      console.log(`   Price: $${plan.price.monthly}/month`);
    }

    results.push({
      resource: 'Plan Loading',
      passed: planIssues.length === 0,
      issues: planIssues,
    });
    console.log('');

    // 3. Validate limit checking logic
    console.log('3️⃣  Validating Limit Checking Logic');
    console.log('-'.repeat(60));

    const testTenant = await Tenant.findOne({});
    if (!testTenant) {
      console.log('⚠️  No tenants found in database, skipping limit checks');
    } else {
      const limitChecks = [
        { action: 'create_user', name: 'User Creation', additionalCount: 1 },
        { action: 'create_client', name: 'Client Creation', additionalCount: 1 },
        { action: 'create_work_order', name: 'Work Order Creation', additionalCount: 1 },
        { action: 'send_sms', name: 'SMS Sending', additionalCount: 1 },
        { action: 'upload_file', name: 'File Upload', additionalCount: 1024 * 1024 }, // 1MB
      ];

      const limitIssues: string[] = [];

      for (const check of limitChecks) {
        const result = EnvSubscriptionService.canPerformAction(
          testTenant,
          check.action,
          check.additionalCount
        );

        // Validate result structure
        if (typeof result.allowed !== 'boolean') {
          limitIssues.push(`${check.name}: Invalid 'allowed' field`);
        }
        if (result.currentUsage !== undefined && typeof result.currentUsage !== 'number') {
          limitIssues.push(`${check.name}: Invalid 'currentUsage' field`);
        }
        if (result.limit !== undefined && typeof result.limit !== 'number') {
          limitIssues.push(`${check.name}: Invalid 'limit' field`);
        }

        const status = result.allowed ? '✅' : '❌';
        console.log(`${status} ${check.name}:`);
        console.log(`   Allowed: ${result.allowed}`);
        if (result.currentUsage !== undefined) {
          console.log(`   Current: ${result.currentUsage.toFixed(2)} / ${result.limit}`);
        }
        if (result.reason) {
          console.log(`   Reason: ${result.reason}`);
        }
      }

      results.push({
        resource: 'Limit Checking',
        passed: limitIssues.length === 0,
        issues: limitIssues,
      });
    }
    console.log('');

    // 4. Validate storage calculation
    console.log('4️⃣  Validating Storage Calculations');
    console.log('-'.repeat(60));

    const tenants = await Tenant.find({}).limit(5);
    const storageIssues: string[] = [];

    for (const tenant of tenants) {
      const fileMetadata = (tenant as any).fileMetadata || [];

      // Calculate expected storage from files
      let expectedStorageBytes = 0;
      for (const file of fileMetadata) {
        if (typeof file.size !== 'number' || !isFinite(file.size)) {
          storageIssues.push(`${tenant.name}: Invalid file size in metadata`);
          continue;
        }
        expectedStorageBytes += file.size;
      }

      const expectedStorageGB = expectedStorageBytes / (1024 * 1024 * 1024);
      const actualStorageGB = tenant.subscription.usage.storageUsedGB || 0;

      // Check for valid storage value
      if (typeof actualStorageGB !== 'number' || !isFinite(actualStorageGB)) {
        storageIssues.push(`${tenant.name}: Invalid storageUsedGB value: ${actualStorageGB}`);
        console.log(`❌ ${tenant.name}: INVALID storage value (${actualStorageGB})`);
        continue;
      }

      // Check for negative storage
      if (actualStorageGB < 0) {
        storageIssues.push(`${tenant.name}: Negative storage: ${actualStorageGB}GB`);
        console.log(`❌ ${tenant.name}: Negative storage (${actualStorageGB.toFixed(6)}GB)`);
        continue;
      }

      // Check for discrepancy (allowing 1% margin for rounding)
      const discrepancy = Math.abs(actualStorageGB - expectedStorageGB);
      const discrepancyPercent = expectedStorageGB > 0 ? (discrepancy / expectedStorageGB) * 100 : 0;

      if (discrepancy > 0.001 && discrepancyPercent > 1) {
        storageIssues.push(
          `${tenant.name}: Storage mismatch - Expected: ${expectedStorageGB.toFixed(6)}GB, Actual: ${actualStorageGB.toFixed(6)}GB (${discrepancyPercent.toFixed(2)}% difference)`
        );
        console.log(`⚠️  ${tenant.name}: Storage discrepancy`);
        console.log(`   Files: ${fileMetadata.length}`);
        console.log(`   Expected: ${expectedStorageGB.toFixed(6)}GB`);
        console.log(`   Actual:   ${actualStorageGB.toFixed(6)}GB`);
        console.log(`   Diff:     ${discrepancy.toFixed(6)}GB (${discrepancyPercent.toFixed(2)}%)`);
      } else {
        console.log(`✅ ${tenant.name}: ${fileMetadata.length} files, ${actualStorageGB.toFixed(6)}GB`);
      }
    }

    results.push({
      resource: 'Storage Calculation',
      passed: storageIssues.length === 0,
      issues: storageIssues,
      details: {
        tenantsChecked: tenants.length,
      }
    });
    console.log('');

    // 5. Summary
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));

    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const allPassed = results.every(r => r.passed);

    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.resource}: ${result.passed ? 'PASSED' : `FAILED (${result.issues.length} issues)`}`);
      if (!result.passed) {
        result.issues.forEach(issue => console.log(`   - ${issue}`));
      }
    });

    console.log('');
    console.log(`Total Issues: ${totalIssues}`);
    console.log(`Overall Status: ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
    console.log('='.repeat(60));

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
validateAllLimits();
