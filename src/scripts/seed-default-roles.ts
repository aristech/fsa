import { connectDB } from 'src/lib/db';
import { Role, Tenant } from 'src/lib/models';

// ----------------------------------------------------------------------

const DEFAULT_ROLES = [
  {
    name: 'Supervisor',
    description: 'Manages teams and oversees project execution',
    color: '#ff9800',
    permissions: [
      'view_work_orders',
      'create_work_orders',
      'edit_work_orders',
      'view_projects',
      'create_projects',
      'edit_projects',
      'view_tasks',
      'create_tasks',
      'edit_tasks',
      'view_customers',
      'view_personnel',
      'view_reports',
    ],
    isDefault: true,
  },
  {
    name: 'Technician',
    description: 'Performs field work and technical tasks',
    color: '#2196f3',
    permissions: [
      'view_work_orders',
      'edit_work_orders',
      'view_projects',
      'view_tasks',
      'edit_tasks',
      'view_customers',
    ],
    isDefault: true,
  },
  {
    name: 'Sales',
    description: 'Handles customer relationships and business development',
    color: '#4caf50',
    permissions: [
      'view_work_orders',
      'create_work_orders',
      'view_projects',
      'create_projects',
      'view_tasks',
      'view_customers',
      'create_customers',
      'edit_customers',
      'view_reports',
    ],
    isDefault: true,
  },
];

// ----------------------------------------------------------------------

async function seedDefaultRoles() {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');

    // Find the tenant
    const tenant = await Tenant.findOne({ slug: 'fsa-demo' });
    if (!tenant) {
      console.log('❌ Tenant not found. Please run the main seed script first.');
      return;
    }

    console.log(`📋 Found tenant: ${tenant.name}`);

    // Clear existing default roles
    await Role.deleteMany({ tenantId: tenant._id, isDefault: true });
    console.log('🗑️ Cleared existing default roles');

    // Create default roles
    const roles = await Promise.all(
      DEFAULT_ROLES.map((roleData) => {
        const role = new Role({
          ...roleData,
          tenantId: tenant._id,
          isActive: true,
        });
        return role.save();
      })
    );

    console.log(`✅ Created ${roles.length} default roles:`);
    roles.forEach((role) => {
      console.log(`   - ${role.name} (${role.color}) - ${role.permissions.length} permissions`);
    });

    console.log('\n🎉 Default roles seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding default roles:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedDefaultRoles();
