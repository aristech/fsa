import mongoose from 'mongoose';

import { connectDB } from 'src/lib/db';
import { Role, Tenant, Personnel } from 'src/lib/models';

/**
 * Script to fix role consistency issues
 * This should be run whenever roles are recreated or modified
 */
async function fixRoleConsistency() {
  await connectDB();

  console.log('🔧 Checking role consistency across all tenants...\n');

  const tenants = await Tenant.find({ isActive: true });

  for (const tenant of tenants) {
    console.log(`📋 Processing tenant: ${tenant.name} (${tenant.slug})`);
    const tenantId = new mongoose.Types.ObjectId(String(tenant._id));

    // Get all current roles for this tenant
    const currentRoles = await Role.find({ tenantId });
    console.log(`  Current roles: ${currentRoles.length}`);

    if (currentRoles.length === 0) {
      console.log('  ⚠️  No roles found - skipping');
      continue;
    }

    // Get all personnel for this tenant
    const allPersonnel = await Personnel.find({ tenantId });
    console.log(`  Total personnel: ${allPersonnel.length}`);

    // Find personnel with invalid role references
    const validRoleIds = currentRoles.map((r) => r._id.toString());
    const personnelWithInvalidRoles = allPersonnel.filter(
      (p) => p.roleId && !validRoleIds.includes(p.roleId.toString())
    );

    console.log(`  Personnel with invalid roles: ${personnelWithInvalidRoles.length}`);

    if (personnelWithInvalidRoles.length > 0) {
      // Try to map old roles to new roles by name
      const roleMapping = new Map();

      // For each invalid role, try to find a matching current role by name
      for (const person of personnelWithInvalidRoles) {
        if (person.roleId) {
          // Try to find the old role to get its name
          const oldRole = await Role.findById(person.roleId);
          if (oldRole) {
            const matchingNewRole = currentRoles.find((r) => r.name === oldRole.name);
            if (matchingNewRole) {
              roleMapping.set(person.roleId.toString(), matchingNewRole._id);
            }
          }
        }
      }

      // Update personnel with mapped roles
      let updated = 0;
      for (const person of personnelWithInvalidRoles) {
        if (person.roleId) {
          const newRoleId = roleMapping.get(person.roleId.toString());
          if (newRoleId) {
            await Personnel.findByIdAndUpdate(person._id, { roleId: newRoleId });
            updated++;
          } else {
            // Assign a random role if no mapping found
            const randomRole = currentRoles[Math.floor(Math.random() * currentRoles.length)];
            await Personnel.findByIdAndUpdate(person._id, { roleId: randomRole._id });
            updated++;
          }
        }
      }

      console.log(`  ✅ Updated ${updated} personnel with valid roles`);
    }

    // Check for personnel without roles
    const personnelWithoutRoles = await Personnel.countDocuments({
      tenantId,
      $or: [{ roleId: { $exists: false } }, { roleId: null }],
    });

    if (personnelWithoutRoles > 0) {
      console.log(
        `  ⚠️  ${personnelWithoutRoles} personnel without roles - assigning random roles`
      );

      // Assign random roles to personnel without roles
      const personnelToUpdate = await Personnel.find({
        tenantId,
        $or: [{ roleId: { $exists: false } }, { roleId: null }],
      });

      for (const person of personnelToUpdate) {
        const randomRole = currentRoles[Math.floor(Math.random() * currentRoles.length)];
        await Personnel.findByIdAndUpdate(person._id, { roleId: randomRole._id });
      }

      console.log(`  ✅ Assigned roles to ${personnelToUpdate.length} personnel`);
    }

    // Show final role distribution
    const roleDistribution = await Personnel.aggregate([
      { $match: { tenantId, roleId: { $exists: true, $ne: null } } },
      { $group: { _id: '$roleId', count: { $sum: 1 } } },
      { $lookup: { from: 'roles', localField: '_id', foreignField: '_id', as: 'role' } },
      { $unwind: '$role' },
      { $project: { roleName: '$role.name', count: 1 } },
    ]);

    console.log('  📊 Final role distribution:');
    roleDistribution.forEach((r) => {
      console.log(`    ${r.roleName}: ${r.count} personnel`);
    });

    console.log('');
  }

  console.log('✅ Role consistency check completed!');
}

// Run if called directly
if (require.main === module) {
  fixRoleConsistency().catch(console.error);
}

export { fixRoleConsistency };
