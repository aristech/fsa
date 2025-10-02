#!/usr/bin/env node

/**
 * Demo Tenants Seeder Script
 *
 * Creates demo tenants with different subscription plans for testing
 * Run: node scripts/seed-demo-tenants.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { TenantSetupService } = require('../dist/services/tenant-setup');
const path = require('path');

// Load environment variables from the backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production.local') });

// Demo tenant data with different subscription plans
const DEMO_TENANTS = [
  {
    companyName: "Acme Field Services",
    slug: "acme-field-services",
    email: "admin@acme-field.com",
    phone: "+1-555-0101",
    ownerFirstName: "John",
    ownerLastName: "Smith",
    subscriptionPlan: "free",
    address: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "US"
    },
    settings: {
      timezone: "America/New_York",
      currency: "USD",
      dateFormat: "MM/DD/YYYY"
    }
  },
  {
    companyName: "TechRepair Pro",
    slug: "techrepair-pro",
    email: "owner@techrepair-pro.com",
    phone: "+1-555-0102",
    ownerFirstName: "Sarah",
    ownerLastName: "Johnson",
    subscriptionPlan: "basic",
    address: {
      street: "456 Tech Ave",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      country: "US"
    },
    settings: {
      timezone: "America/Los_Angeles",
      currency: "USD",
      dateFormat: "MM/DD/YYYY"
    }
  },
  {
    companyName: "Elite Service Solutions",
    slug: "elite-service-solutions",
    email: "admin@elite-services.com",
    phone: "+1-555-0103",
    ownerFirstName: "Michael",
    ownerLastName: "Davis",
    subscriptionPlan: "premium",
    address: {
      street: "789 Business Blvd",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      country: "US"
    },
    settings: {
      timezone: "America/Chicago",
      currency: "USD",
      dateFormat: "MM/DD/YYYY"
    }
  },
  {
    companyName: "Global Field Enterprise",
    slug: "global-field-enterprise",
    email: "ceo@global-field.com",
    phone: "+1-555-0104",
    ownerFirstName: "Jennifer",
    ownerLastName: "Wilson",
    subscriptionPlan: "enterprise",
    address: {
      street: "1000 Corporate Dr",
      city: "Austin",
      state: "TX",
      zipCode: "73301",
      country: "US"
    },
    settings: {
      timezone: "America/Chicago",
      currency: "USD",
      dateFormat: "MM/DD/YYYY"
    }
  },
  {
    companyName: "StartUp Services",
    slug: "startup-services",
    email: "founder@startup-services.com",
    phone: "+1-555-0105",
    ownerFirstName: "Alex",
    ownerLastName: "Chen",
    subscriptionPlan: "basic",
    address: {
      street: "202 Innovation Way",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      country: "US"
    },
    settings: {
      timezone: "America/Los_Angeles",
      currency: "USD",
      dateFormat: "MM/DD/YYYY"
    }
  },
  {
    companyName: "Family HVAC & Repair",
    slug: "family-hvac-repair",
    email: "owner@familyhvac.com",
    phone: "+1-555-0106",
    ownerFirstName: "Robert",
    ownerLastName: "Martinez",
    subscriptionPlan: "free",
    address: {
      street: "555 Residential Rd",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      country: "US"
    },
    settings: {
      timezone: "America/Phoenix",
      currency: "USD",
      dateFormat: "MM/DD/YYYY"
    }
  }
];

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
 * Check if tenant already exists
 */
async function tenantExists(slug, email) {
  const { Tenant } = require('../dist/models/Tenant');
  const existingTenant = await Tenant.findOne({
    $or: [{ slug }, { email }]
  });
  return !!existingTenant;
}

/**
 * Create a single demo tenant
 */
async function createDemoTenant(tenantData) {
  try {
    console.log(`\n🏢 Creating tenant: ${tenantData.companyName}`);

    // Check if tenant already exists
    const exists = await tenantExists(tenantData.slug, tenantData.email);
    if (exists) {
      console.log(`⚠️  Tenant already exists, skipping: ${tenantData.companyName}`);
      return null;
    }

    // Create tenant using the TenantSetupService
    const result = await TenantSetupService.setupNewTenant({
      name: tenantData.companyName,
      slug: tenantData.slug,
      email: tenantData.email,
      phone: tenantData.phone,
      address: tenantData.address,
      settings: tenantData.settings,
      ownerFirstName: tenantData.ownerFirstName,
      ownerLastName: tenantData.ownerLastName,
      subscriptionPlan: tenantData.subscriptionPlan
    });

    // Activate the tenant and owner (skip magic link process for demo)
    const { Tenant } = require('../dist/models/Tenant');
    const { User } = require('../dist/models/User');

    await Tenant.findByIdAndUpdate(result.tenant._id, {
      isActive: true
    });

    // Set a demo password for the owner
    const hashedPassword = await bcrypt.hash('Demo123!@#', 10);
    await User.findByIdAndUpdate(result.owner._id, {
      isActive: true,
      password: hashedPassword
    });

    console.log(`✅ Created tenant: ${tenantData.companyName}`);
    console.log(`   📧 Admin: ${tenantData.email}`);
    console.log(`   🔑 Password: Demo123!@#`);
    console.log(`   📋 Plan: ${tenantData.subscriptionPlan}`);
    console.log(`   🏷️  Slug: ${tenantData.slug}`);

    return result;
  } catch (error) {
    console.error(`❌ Error creating tenant ${tenantData.companyName}:`, error);
    return null;
  }
}

/**
 * Add some demo usage data to make tenants look more realistic
 */
async function addDemoUsage(tenantId, plan) {
  try {
    const { Tenant } = require('../dist/models/Tenant');

    // Define realistic usage based on plan
    const usageData = {
      free: {
        currentUsers: 1, // Just the owner
        currentClients: 5,
        workOrdersThisMonth: 15,
        smsThisMonth: 0,
        storageUsedGB: 0.2
      },
      basic: {
        currentUsers: 3,
        currentClients: 25,
        workOrdersThisMonth: 120,
        smsThisMonth: 45,
        storageUsedGB: 2.1
      },
      premium: {
        currentUsers: 12,
        currentClients: 340,
        workOrdersThisMonth: 850,
        smsThisMonth: 280,
        storageUsedGB: 18.5
      },
      enterprise: {
        currentUsers: 45,
        currentClients: 1250,
        workOrdersThisMonth: 3200,
        smsThisMonth: 1100,
        storageUsedGB: 67.8
      }
    };

    const usage = usageData[plan] || usageData.free;

    await Tenant.findByIdAndUpdate(tenantId, {
      'subscription.usage': {
        ...usage,
        lastResetDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // First of current month
      }
    });

    console.log(`   📊 Added ${plan} plan usage data`);
  } catch (error) {
    console.error(`❌ Error adding usage data:`, error);
  }
}

/**
 * Display summary of created tenants
 */
function displaySummary(results) {
  console.log('\n📋 DEMO TENANTS SUMMARY');
  console.log('========================');

  const created = results.filter(r => r !== null);
  const skipped = results.filter(r => r === null);

  console.log(`✅ Created: ${created.length} tenants`);
  console.log(`⚠️  Skipped: ${skipped.length} tenants (already exist)`);

  if (created.length > 0) {
    console.log('\n🔐 LOGIN CREDENTIALS (All tenants):');
    console.log('Password: Demo123!@#');
    console.log('\n📧 EMAIL ADDRESSES:');
    DEMO_TENANTS.forEach(tenant => {
      const result = results.find(r => r && r.tenant.email === tenant.email);
      if (result) {
        console.log(`   ${tenant.companyName}: ${tenant.email} (${tenant.subscriptionPlan})`);
      }
    });
  }

  console.log('\n🌐 TEST URLS:');
  DEMO_TENANTS.forEach(tenant => {
    console.log(`   ${tenant.companyName}: http://localhost:3000/auth/signin`);
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log('🌱 Starting Demo Tenants Seeder...\n');

  try {
    // Connect to database
    await connectToDatabase();

    // Create all demo tenants
    const results = [];
    for (const tenantData of DEMO_TENANTS) {
      const result = await createDemoTenant(tenantData);
      results.push(result);

      // Add realistic usage data if tenant was created
      if (result) {
        await addDemoUsage(result.tenant._id, tenantData.subscriptionPlan);
      }
    }

    // Display summary
    displaySummary(results);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🎉 Demo tenants seeding completed!');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, DEMO_TENANTS };