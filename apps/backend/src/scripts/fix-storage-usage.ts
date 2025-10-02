#!/usr/bin/env tsx
/**
 * Fix Storage Usage Script
 *
 * This script recalculates the actual storage usage for all tenants
 * by summing up the actual file sizes from the fileMetadata array.
 *
 * This fixes the issue where storage was being double-counted during uploads.
 *
 * Usage: npx tsx apps/backend/src/scripts/fix-storage-usage.ts
 */

import { connect } from 'mongoose';
import { Tenant } from '../models/Tenant';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function fixStorageUsage() {
  try {
    // Load environment variables from .env file
    const envPath = path.join(__dirname, '..', '.env');
    dotenv.config({ path: envPath });

    // Also try .env.production.local for production
    const envProdPath = path.join(__dirname, '..', '.env.production.local');
    dotenv.config({ path: envProdPath });

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('   Tried loading from:');
      console.error(`   - ${envPath}`);
      console.error(`   - ${envProdPath}`);
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all tenants
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants to process\n`);

    let totalFixed = 0;
    let totalErrors = 0;

    for (const tenant of tenants) {
      try {
        const fileMetadata = (tenant as any).fileMetadata || [];

        // Calculate actual storage from file metadata
        let actualStorageBytes = 0;
        for (const file of fileMetadata) {
          actualStorageBytes += file.size || 0;
        }

        const actualStorageGB = actualStorageBytes / (1024 * 1024 * 1024);
        const currentStorageGB = tenant.subscription.usage.storageUsedGB || 0;

        // Only update if there's a discrepancy
        if (Math.abs(currentStorageGB - actualStorageGB) > 0.000001) { // Allow for small floating point differences
          await Tenant.findByIdAndUpdate(tenant._id, {
            $set: {
              'subscription.usage.storageUsedGB': actualStorageGB,
              'subscription.usage.totalFiles': fileMetadata.length,
            }
          });

          console.log(`✅ Fixed tenant: ${tenant.name} (${tenant._id})`);
          console.log(`   Files: ${fileMetadata.length}`);
          console.log(`   Incorrect storage: ${currentStorageGB.toFixed(6)} GB`);
          console.log(`   Correct storage:   ${actualStorageGB.toFixed(6)} GB`);
          console.log(`   Difference:        ${(currentStorageGB - actualStorageGB).toFixed(6)} GB`);
          console.log('');

          totalFixed++;
        } else {
          console.log(`✓ Tenant ${tenant.name} already correct (${actualStorageGB.toFixed(6)} GB)`);
        }
      } catch (error) {
        console.error(`❌ Error processing tenant ${tenant.name}:`, error);
        totalErrors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`Total tenants processed: ${tenants.length}`);
    console.log(`Tenants fixed: ${totalFixed}`);
    console.log(`Errors: ${totalErrors}`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixStorageUsage();
