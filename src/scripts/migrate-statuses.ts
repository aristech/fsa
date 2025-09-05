import { connectDB } from 'src/lib/db';
import { Task, Tenant, Status, Project, WorkOrder } from 'src/lib/models';

// ----------------------------------------------------------------------

// Mapping from old status values to new status names
const STATUS_MAPPING = {
  // Project statuses
  planning: 'Created',
  active: 'In Progress',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'On Hold', // Map cancelled to On Hold for now

  // Task statuses
  todo: 'Created',
  'in-progress': 'In Progress',
  review: 'In Progress', // Map review to In Progress
  done: 'Completed',
  cancelled: 'On Hold',

  // Work order statuses
  created: 'Created',
  assigned: 'Assigned',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'On Hold',
  'on-hold': 'On Hold',
};

// ----------------------------------------------------------------------

async function migrateStatuses() {
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

    // Get all statuses to verify they exist
    const statuses = await Status.find({ tenantId: tenant._id });
    console.log(`📊 Found ${statuses.length} statuses in database`);

    // Update Projects
    console.log('\n🔄 Updating Project statuses...');
    const projects = await Project.find({ tenantId: tenant._id });
    let projectUpdates = 0;

    for (const project of projects) {
      const newStatus = STATUS_MAPPING[project.status as keyof typeof STATUS_MAPPING];
      if (newStatus && newStatus !== project.status) {
        await Project.findByIdAndUpdate(project._id, { status: newStatus });
        console.log(`   - Updated project "${project.name}": ${project.status} → ${newStatus}`);
        projectUpdates++;
      }
    }
    console.log(`✅ Updated ${projectUpdates} projects`);

    // Update Tasks
    console.log('\n🔄 Updating Task statuses...');
    const tasks = await Task.find({ tenantId: tenant._id });
    let taskUpdates = 0;

    for (const task of tasks) {
      const newStatus = STATUS_MAPPING[task.status as keyof typeof STATUS_MAPPING];
      if (newStatus && newStatus !== task.status) {
        await Task.findByIdAndUpdate(task._id, { status: newStatus });
        console.log(`   - Updated task "${task.title}": ${task.status} → ${newStatus}`);
        taskUpdates++;
      }
    }
    console.log(`✅ Updated ${taskUpdates} tasks`);

    // Update Work Orders
    console.log('\n🔄 Updating WorkOrder statuses...');
    const workOrders = await WorkOrder.find({ tenantId: tenant._id });
    let workOrderUpdates = 0;

    for (const workOrder of workOrders) {
      const newStatus = STATUS_MAPPING[workOrder.status as keyof typeof STATUS_MAPPING];
      if (newStatus && newStatus !== workOrder.status) {
        await WorkOrder.findByIdAndUpdate(workOrder._id, { status: newStatus });
        console.log(
          `   - Updated work order "${workOrder.title}": ${workOrder.status} → ${newStatus}`
        );
        workOrderUpdates++;
      }
    }
    console.log(`✅ Updated ${workOrderUpdates} work orders`);

    // Show summary
    console.log('\n📊 Migration Summary:');
    console.log(`   - Projects updated: ${projectUpdates}`);
    console.log(`   - Tasks updated: ${taskUpdates}`);
    console.log(`   - Work orders updated: ${workOrderUpdates}`);
    console.log(`   - Total items updated: ${projectUpdates + taskUpdates + workOrderUpdates}`);

    console.log('\n🎉 Status migration completed successfully!');
  } catch (error) {
    console.error('❌ Error migrating statuses:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateStatuses();
