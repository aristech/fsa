#!/usr/bin/env node

/**
 * Update Tenant Schemas Script
 *
 * Updates existing tenants to have the complete subscription and branding schemas
 * Run: node scripts/update-tenant-schemas.js
 */

const mongoose = require('mongoose');
const { SubscriptionPlansService } = require('../dist/services/subscription-plans-service');
const path = require('path');

// Load environment variables from the backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production.local') });

/**
 * Connect to MongoDB
 */
async function connectToDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fsa';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Update tenant with complete subscription and branding schemas
 */
async function updateTenantSchema(tenant) {
  try {
    const { Tenant } = require('../dist/models/Tenant');

    console.log(`\n🔄 Updating tenant: ${tenant.name}`);

    // Get the current subscription plan (from usage data added by seeder)
    const currentPlan = tenant.subscription?.plan || 'free';

    // Get complete subscription schema for the plan
    const subscriptionSchema = SubscriptionPlansService.applyPlanLimits(currentPlan);

    // Preserve existing usage data if it exists
    if (tenant.subscription?.usage) {
      subscriptionSchema.usage = {
        ...subscriptionSchema.usage,
        ...tenant.subscription.usage
      };
    }

    // Create default branding schema
    const brandingSchema = {
      logoUrl: null,
      primaryColor: '#1976d2', // Default blue
      secondaryColor: '#dc004e', // Default red
      companyInfo: {
        website: null,
        description: null,
        industry: 'Field Services'
      }
    };

    // Update the tenant with complete schemas
    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenant._id,
      {
        $set: {
          subscription: subscriptionSchema,
          branding: brandingSchema,
          // Ensure other required fields exist
          settings: tenant.settings || {
            timezone: 'America/New_York',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            sms: {
              enabled: subscriptionSchema.limits.features.smsReminders,
              provider: 'yuboto',
              fallbackProvider: 'apifon'
            }
          },
          address: tenant.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
          }
        }
      },
      { new: true }
    );

    console.log(`✅ Updated tenant: ${tenant.name}`);
    console.log(`   📋 Plan: ${subscriptionSchema.plan}`);
    console.log(`   📊 Max Users: ${subscriptionSchema.limits.maxUsers === -1 ? 'Unlimited' : subscriptionSchema.limits.maxUsers}`);
    console.log(`   📱 SMS Enabled: ${subscriptionSchema.limits.features.smsReminders}`);
    console.log(`   🎨 Branding Available: ${subscriptionSchema.limits.features.customBranding}`);

    return updatedTenant;
  } catch (error) {
    console.error(`❌ Error updating tenant ${tenant.name}:`, error);
    return null;
  }
}

/**
 * Display summary of updated tenants
 */
function displaySummary(results) {
  console.log('\n📋 TENANT SCHEMA UPDATE SUMMARY');
  console.log('=================================');

  const updated = results.filter(r => r !== null);
  const failed = results.filter(r => r === null);

  console.log(`✅ Updated: ${updated.length} tenants`);
  console.log(`❌ Failed: ${failed.length} tenants`);

  if (updated.length > 0) {
    console.log('\n🏢 UPDATED TENANTS:');
    updated.forEach(tenant => {
      console.log(`   ${tenant.name}: ${tenant.subscription.plan} plan`);
    });
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔄 Starting Tenant Schema Update...\n');

  try {
    // Connect to database
    await connectToDatabase();

    // Get all tenants
    const { Tenant } = require('../dist/models/Tenant');
    const tenants = await Tenant.find({});

    console.log(`Found ${tenants.length} tenants to update`);

    // Update all tenants
    const results = [];
    for (const tenant of tenants) {
      const result = await updateTenantSchema(tenant);
      results.push(result);
    }

    // Display summary
    displaySummary(results);

  } catch (error) {
    console.error('❌ Schema update failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🎉 Tenant schema update completed!');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };