#!/usr/bin/env node

/**
 * Field Service Automation - Complete Initial Setup Script
 *
 * This script sets up everything needed for a fresh FSA installation:
 * 1. Creates environment configuration
 * 2. Creates tenant and admin user
 * 3. Seeds default statuses, roles, and FSA data
 * 4. Provides login credentials
 *
 * Usage: node setup-initial-data.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ----------------------------------------------------------------------

console.log('🚀 Field Service Automation - Complete Setup\n');
console.log('This script will set up everything needed for a fresh FSA installation.\n');

// ----------------------------------------------------------------------

/**
 * Step 1: Environment Setup
 */
function setupEnvironment() {
  console.log('📝 Step 1: Setting up environment configuration...');

  const envPath = '.env.local';

  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. Skipping environment setup.');
    return;
  }

  const envContent = `# Field Service Automation Environment Configuration

# Server Configuration
NEXT_PUBLIC_SERVER_URL=http://localhost:8082
NEXT_PUBLIC_ASSETS_DIR=/assets
BUILD_STATIC_EXPORT=false

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/field-service-automation

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-make-it-long-and-random-${Date.now()}
JWT_EXPIRES_IN=7d

# Authentication Configuration
AUTH_METHOD=jwt

# Email Configuration (AWS SES)
SMTP_HOST=email-smtp.eu-north-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAQVJFOWN5CGZ7MVV3
SMTP_PASS=BDkSRRCrrhg8W916AYnYTCycJkVSqKoJC6yNuonVUWma
SMTP_FROM=noreply@progressnet.io
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment configuration created successfully!');
}

// ----------------------------------------------------------------------

/**
 * Step 2: Create Tenant and Admin User
 */
async function createTenantAndAdmin() {
  console.log('\n📋 Step 2: Creating tenant and admin user...');

  const setupScript = `
    curl -X POST http://localhost:8082/api/v1/tenants/setup/ \\
      -H "Content-Type: application/json" \\
      -d '{
        "tenantName": "FSA Demo Company",
        "tenantSlug": "fsa-demo",
        "adminFirstName": "Admin",
        "adminLastName": "User",
        "adminEmail": "admin@fsa-demo.com",
        "adminPassword": "admin123"
      }'
  `;

  try {
    execSync(setupScript, { stdio: 'inherit' });
    console.log('✅ Tenant and admin user created successfully!');
  } catch (error) {
    console.error('❌ Error creating tenant and admin user:', error.message);
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Step 3: Seed Default Statuses
 */
async function seedDefaultStatuses() {
  console.log('\n🌱 Step 3: Seeding default statuses...');

  try {
    execSync('npx tsx src/scripts/seed-default-statuses.ts', { stdio: 'inherit' });
    console.log('✅ Default statuses seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding default statuses:', error.message);
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Step 4: Seed Default Roles
 */
async function seedDefaultRoles() {
  console.log('\n👥 Step 4: Seeding default roles...');

  try {
    execSync('npx tsx src/scripts/seed-default-roles.ts', { stdio: 'inherit' });
    console.log('✅ Default roles seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding default roles:', error.message);
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Step 5: Seed FSA Data
 */
async function seedFSAData() {
  console.log('\n🏗️  Step 5: Seeding FSA data (customers, technicians, projects, tasks)...');

  try {
    execSync('npx tsx src/scripts/seed-fsa-data.ts', { stdio: 'inherit' });
    console.log('✅ FSA data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding FSA data:', error.message);
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Step 6: Seed Personnel
 */
async function seedPersonnel() {
  console.log('\n👥 Step 6: Seeding personnel (10 random personnel)...');

  try {
    // Create a temporary script that limits personnel to 10
    const tempScript = `
import mongoose from 'mongoose';
import { connectDB } from 'src/lib/db';
import { User, Role, Personnel, Tenant } from 'src/lib/models';

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(p = 0.5) {
  return Math.random() < p;
}

const SKILL_POOL = [
  'HVAC', 'Electrical', 'Plumbing', 'Carpentry', 'Fire Safety',
  'Wiring', 'Diagnostics', 'Maintenance', 'Calibration', 'Inspection',
];

const CERT_POOL = ['OSHA-10', 'OSHA-30', 'EPA-608', 'NFPA-70E', 'First Aid', 'CPR/AED'];

async function main() {
  await connectDB();

  const tenant = await Tenant.findOne({ slug: 'fsa-demo' });
  if (!tenant) throw new Error('Tenant not found');
  const tenantId = new mongoose.Types.ObjectId(String(tenant._id));

  const roles = await Role.find({ tenantId });
  if (roles.length === 0) throw new Error('No roles found');

  const existingCount = await Personnel.countDocuments({ tenantId });
  const toCreate = Math.max(0, 10 - existingCount);

  if (toCreate === 0) {
    console.log('Already have >=10 personnel. Skipping.');
    return;
  }

  const users = await User.find({ tenantId });

  const availabilityTemplate = {
    monday: { start: '09:00', end: '17:00', available: true },
    tuesday: { start: '09:00', end: '17:00', available: true },
    wednesday: { start: '09:00', end: '17:00', available: true },
    thursday: { start: '09:00', end: '17:00', available: true },
    friday: { start: '09:00', end: '17:00', available: true },
    saturday: { start: '09:00', end: '17:00', available: false },
    sunday: { start: '09:00', end: '17:00', available: false },
  };

  for (let i = 0; i < toCreate; i += 1) {
    let user = randomBool(0.6) && users.length > 0 ? randomPick(users) : null;
    if (!user) {
      const first = \`Tech\${Math.floor(Math.random() * 9000 + 1000)}\`;
      const last = \`User\${Math.floor(Math.random() * 9000 + 1000)}\`;
      user = await User.create({
        tenantId: String(tenantId),
        email: \`\${first.toLowerCase()}.\${last.toLowerCase()}@fsa-demo.com\`,
        password: 'password123',
        firstName: first,
        lastName: last,
        role: 'technician',
        permissions: [],
        isActive: true,
      });
      users.push(user);
    }

    const role = randomPick(roles);
    const skills = Array.from({ length: Math.floor(Math.random() * 4) + 2 }, () =>
      randomPick(SKILL_POOL)
    );
    const certifications = Array.from({ length: Math.floor(Math.random() * 2) + 1 }, () =>
      randomPick(CERT_POOL)
    );

    const empNum = Math.floor(Math.random() * 900000 + 100000);
    const employeeId = \`EMP-\${empNum}\`;
    const hourlyRate = Math.floor(Math.random() * 80) + 20;

    await Personnel.create({
      tenantId,
      userId: user._id,
      employeeId,
      roleId: role._id,
      skills,
      certifications,
      hourlyRate,
      availability: availabilityTemplate,
      location: { address: \`\${Math.floor(Math.random() * 999)} Main St, City\` },
      notes: randomBool() ? 'Setup generated personnel' : '',
      isActive: randomBool(0.9),
    });
  }

  console.log(\`Seeded \${toCreate} personnel for tenant 'fsa-demo'\`);
  const finalCount = await Personnel.countDocuments({ tenantId });
  console.log(\`Total personnel count now: \${finalCount}\`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

    // Write temporary script
    fs.writeFileSync('temp-personnel-seed.ts', tempScript);

    // Run the temporary script
    execSync('npx tsx temp-personnel-seed.ts', { stdio: 'inherit' });

    // Clean up temporary script
    fs.unlinkSync('temp-personnel-seed.ts');

    console.log('✅ Personnel seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding personnel:', error.message);
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Step 7: Fix Role Consistency
 */
async function fixRoleConsistency() {
  console.log('\n🔧 Step 7: Ensuring role consistency...');

  try {
    execSync('npx tsx src/scripts/fix-role-consistency.ts', { stdio: 'inherit' });
    console.log('✅ Role consistency verified!');
  } catch (error) {
    console.error('❌ Error fixing role consistency:', error.message);
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Step 8: Verify Setup
 */
async function verifySetup() {
  console.log('\n🔍 Step 8: Verifying setup...');

  try {
    // Test login
    const loginTest = `
      curl -X POST http://localhost:8082/api/v1/auth/sign-in/ \\
        -H "Content-Type: application/json" \\
        -d '{
          "email": "admin@fsa-demo.com",
          "password": "admin123",
          "tenantSlug": "fsa-demo"
        }'
    `;

    const result = execSync(loginTest, { encoding: 'utf8' });
    const response = JSON.parse(result);

    if (response.success && response.data.user) {
      console.log('✅ Login verification successful!');
      console.log(`   Admin user: ${response.data.user.firstName} ${response.data.user.lastName}`);
      console.log(`   Tenant: ${response.data.user.tenant.name}`);
    } else {
      throw new Error('Login verification failed');
    }
  } catch (error) {
    console.error('❌ Setup verification failed:', error.message);
    throw error;
  }
}

// ----------------------------------------------------------------------

/**
 * Main setup function
 */
async function main() {
  try {
    // Check if server is running
    console.log('🔍 Checking if development server is running...');
    try {
      execSync(
        'curl -s http://localhost:8082/api/health > /dev/null 2>&1 || curl -s http://localhost:8082/ > /dev/null 2>&1',
        { stdio: 'pipe' }
      );
      console.log('✅ Development server is running on port 8082');
    } catch (error) {
      console.log('⚠️  Development server not detected on port 8082');
      console.log(
        '   Please make sure to run "yarn dev" in another terminal before running this script.'
      );
      console.log('   The server should be running on http://localhost:8082');
      process.exit(1);
    }

    // Run setup steps
    setupEnvironment();
    await createTenantAndAdmin();

    // Wait a moment for the setup to complete
    console.log('\n⏳ Waiting for setup to complete...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await seedDefaultStatuses();
    await seedDefaultRoles();
    await seedFSAData();
    await seedPersonnel();
    await fixRoleConsistency();
    await verifySetup();

    // Success message
    console.log('\n🎉 Setup completed successfully!\n');
    console.log('📋 Your FSA application is ready to use:');
    console.log('   🌐 URL: http://localhost:8082');
    console.log('   📧 Email: admin@fsa-demo.com');
    console.log('   🔑 Password: admin123');
    console.log('   🏢 Tenant Slug: fsa-demo');
    console.log('\n📊 What was created:');
    console.log('   ✅ 1 tenant (FSA Demo Company)');
    console.log('   ✅ 1 admin user');
    console.log('   ✅ 4 default statuses (Created, Assigned, In Progress, Completed)');
    console.log('   ✅ 3 default roles (Supervisor, Technician, Customer)');
    console.log('   ✅ 5 customers');
    console.log('   ✅ 5 technicians');
    console.log('   ✅ 5 projects');
    console.log('   ✅ 5 work orders');
    console.log('   ✅ 5 tasks');
    console.log('   ✅ 3 assignments');
    console.log('   ✅ 10 personnel');
    console.log('\n🚀 You can now:');
    console.log('   • View the Projects & Tasks kanban board');
    console.log('   • Manage customers and technicians');
    console.log('   • Create and assign work orders');
    console.log('   • Track project progress');
    console.log('\nHappy coding! 🎯');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure MongoDB is running on port 27017');
    console.log('   2. Make sure the development server is running on port 8082');
    console.log('   3. Check that all dependencies are installed (yarn install)');
    console.log('   4. Try running the setup again');
    process.exit(1);
  }
}

// ----------------------------------------------------------------------

// Run the setup
main();
