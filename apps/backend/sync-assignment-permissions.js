/**
 * One-time script to sync assignment-based permissions for existing data
 * Run this after deploying the new permission system
 */

require('dotenv').config();

async function syncAssignmentPermissions() {
  console.log('🔄 Starting assignment permission sync...');
  
  try {
    // Load models using tsx since we're using TypeScript
    const { execSync } = require('child_process');
    
    // Use tsx to run the actual sync logic
    const tsxCommand = `npx tsx -e "
      import { connectDB } from './src/utils/database';
      import { AssignmentPermissionService } from './src/services/assignment-permission-service';
      import { Tenant } from './src/models';
      
      async function run() {
        console.log('📡 Connecting to database...');
        await connectDB();
        
        console.log('🔍 Finding all tenants...');
        const tenants = await Tenant.find({}).select('_id name');
        console.log(\`Found \${tenants.length} tenants\`);
        
        for (const tenant of tenants) {
          console.log(\`🏢 Syncing permissions for tenant: \${tenant.name} (\${tenant._id})\`);
          await AssignmentPermissionService.syncAllAssignmentPermissions(tenant._id.toString());
        }
        
        console.log('✅ Assignment permission sync completed successfully!');
        process.exit(0);
      }
      
      run().catch((error) => {
        console.error('❌ Error during sync:', error);
        process.exit(1);
      });
    "`;
    
    execSync(tsxCommand, { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncAssignmentPermissions();
}

module.exports = { syncAssignmentPermissions };
