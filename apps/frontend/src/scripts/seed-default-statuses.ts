import { connectDB } from 'src/lib/db';
import { Tenant, Status } from 'src/lib/models';

// ----------------------------------------------------------------------

const DEFAULT_STATUSES = [
  {
    name: 'Created',
    description: 'Work order or project has been created',
    color: '#9e9e9e',
    order: 0,
    isDefault: true,
  },
  {
    name: 'Assigned',
    description: 'Work order or project has been assigned to a technician',
    color: '#ff9800',
    order: 1,
    isDefault: true,
  },
  {
    name: 'In Progress',
    description: 'Work order or project is currently being worked on',
    color: '#2196f3',
    order: 2,
    isDefault: true,
  },
  {
    name: 'Completed',
    description: 'Work order or project has been completed',
    color: '#4caf50',
    order: 3,
    isDefault: true,
  },
];

// ----------------------------------------------------------------------

async function seedDefaultStatuses() {
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

    // Clear existing default statuses
    await Status.deleteMany({ tenantId: tenant._id, isDefault: true });
    console.log('🗑️ Cleared existing default statuses');

    // Create default statuses
    const statuses = await Promise.all(
      DEFAULT_STATUSES.map((statusData) => {
        const status = new Status({
          ...statusData,
          tenantId: tenant._id,
          isActive: true,
        });
        return status.save();
      })
    );

    console.log(`✅ Created ${statuses.length} default statuses:`);
    statuses.forEach((status) => {
      console.log(`   - ${status.name} (${status.color})`);
    });

    console.log('\n🎉 Default statuses seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding default statuses:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedDefaultStatuses();
