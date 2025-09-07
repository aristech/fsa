import { connectDB } from 'src/lib/db';
import { Role, User, Tenant, Personnel, Technician } from 'src/lib/models';

// ----------------------------------------------------------------------

async function migrateTechniciansToPersonnel() {
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

    // Get the default Technician role
    const technicianRole = await Role.findOne({
      tenantId: tenant._id,
      name: 'Technician',
      isDefault: true,
    });

    if (!technicianRole) {
      console.log('❌ Technician role not found. Please run the roles seed script first.');
      return;
    }

    console.log(`🔧 Found Technician role: ${technicianRole.name}`);

    // Get all existing technicians
    const technicians = await Technician.find({ tenantId: tenant._id });
    console.log(`👥 Found ${technicians.length} technicians to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const technician of technicians) {
      // Check if personnel already exists for this user
      const existingPersonnel = await Personnel.findOne({
        tenantId: tenant._id,
        userId: technician.userId,
      });

      if (existingPersonnel) {
        console.log(`   ⏭️ Skipped ${technician.employeeId} - already exists as personnel`);
        skippedCount++;
        continue;
      }

      // Verify the user exists
      const user = await User.findById(technician.userId);
      if (!user) {
        console.log(`   ❌ Skipped ${technician.employeeId} - user not found`);
        skippedCount++;
        continue;
      }

      // Create new personnel record
      const personnel = new Personnel({
        tenantId: tenant._id,
        userId: technician.userId,
        employeeId: technician.employeeId,
        roleId: technicianRole._id, // Assign Technician role
        skills: technician.skills,
        certifications: technician.certifications,
        hourlyRate: technician.hourlyRate,
        availability: technician.availability,
        location: technician.location,
        isActive: technician.isActive,
      });

      await personnel.save();
      console.log(
        `   ✅ Migrated ${technician.employeeId} (${user.name}) to Personnel with Technician role`
      );
      migratedCount++;
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   - Technicians migrated: ${migratedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Total processed: ${migratedCount + skippedCount}`);

    console.log('\n🎉 Technician to Personnel migration completed successfully!');
  } catch (error) {
    console.error('❌ Error migrating technicians:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateTechniciansToPersonnel();
