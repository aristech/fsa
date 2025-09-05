#!/usr/bin/env node

/**
 * Setup Initial FSA Data
 *
 * This script creates the initial tenant and admin user, then seeds the database
 * with realistic FSA data.
 *
 * Usage: node setup-initial-data.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Setting up initial FSA data...\n');

async function setupInitialData() {
  try {
    // First, create the tenant and admin user
    console.log('📋 Creating tenant and admin user...');
    const setupScript = `
      curl -X POST http://localhost:8082/api/v1/tenants/setup \\
        -H "Content-Type: application/json" \\
        -d '{
          "tenantName": "FSA Demo Company",
          "tenantSlug": "fsa-demo",
          "adminName": "Admin User",
          "adminEmail": "admin@fsa-demo.com",
          "adminPassword": "admin123"
        }'
    `;

    execSync(setupScript, { stdio: 'inherit' });
    console.log('✅ Tenant and admin user created successfully!\n');

    // Wait a moment for the setup to complete
    console.log('⏳ Waiting for setup to complete...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Then run the seed script
    console.log('🌱 Seeding FSA data...');
    const seedScriptPath = path.join(__dirname, 'src/scripts/seed-fsa-data.ts');
    execSync(`npx tsx ${seedScriptPath}`, {
      stdio: 'inherit',
      cwd: __dirname,
    });
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
}

setupInitialData();
