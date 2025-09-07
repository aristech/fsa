/*
  Run with: npx tsx src/scripts/seed-random-personnel.ts
*/

import mongoose from 'mongoose';

import { connectDB } from 'src/lib/db';
import { User, Role, Tenant, Personnel } from 'src/lib/models';

const ENV_TENANT_SLUG = process.env.TENANT_SLUG?.trim();
const DEFAULT_TENANT_SLUG = 'acme-field-services';

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(p = 0.5) {
  return Math.random() < p;
}

const SKILL_POOL = [
  'HVAC',
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Fire Safety',
  'Wiring',
  'Diagnostics',
  'Maintenance',
  'Calibration',
  'Inspection',
];

const CERT_POOL = ['OSHA-10', 'OSHA-30', 'EPA-608', 'NFPA-70E', 'First Aid', 'CPR/AED'];

const FALLBACK_DEFAULT_ROLES = [
  { name: 'Supervisor', color: '#ff9800', permissions: ['view_personnel', 'edit_personnel'] },
  { name: 'Technician', color: '#2196f3', permissions: ['view_personnel'] },
  { name: 'Sales', color: '#4caf50', permissions: ['view_personnel'] },
];

async function main() {
  await connectDB();

  // Resolve tenant
  let tenant = ENV_TENANT_SLUG
    ? await Tenant.findOne({ slug: ENV_TENANT_SLUG })
    : await Tenant.findOne({ slug: DEFAULT_TENANT_SLUG });
  if (!tenant) {
    tenant = await Tenant.findOne();
  }
  if (!tenant) throw new Error('Tenant not found');
  const tenantId = new mongoose.Types.ObjectId(String(tenant._id));

  let roles = await Role.find({ tenantId });
  if (roles.length === 0) {
    // Try to adopt roles from any other tenant
    const donorRole = await Role.findOne();
    if (donorRole) {
      const donorRoles = await Role.find({ tenantId: donorRole.tenantId });
      if (donorRoles.length) {
        const created = await Role.insertMany(
          donorRoles.map((r) => ({
            tenantId,
            name: r.name,
            description: r.description,
            color: r.color,
            permissions: r.permissions,
            isDefault: !!(r as any).isDefault,
            isActive: true,
          }))
        );
        roles = created;
      }
    }
  }

  if (roles.length === 0) {
    // Final fallback: create minimal default roles
    const created = await Role.insertMany(
      FALLBACK_DEFAULT_ROLES.map((r) => ({ ...r, tenantId, isDefault: true, isActive: true }))
    );
    roles = created;
  }

  const existingCount = await Personnel.countDocuments({ tenantId });
  const toCreate = Math.max(0, 50 - existingCount);
  if (toCreate === 0) {
    console.log('Already have >=50 personnel. Skipping.');
    process.exit(0);
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
  } as const;

  for (let i = 0; i < toCreate; i += 1) {
    // Pick or create a user
    let user = randomBool(0.6) && users.length > 0 ? randomPick(users) : null;
    if (!user) {
      const first = `Tech${Math.floor(Math.random() * 9000 + 1000)}`;
      const last = `User${Math.floor(Math.random() * 9000 + 1000)}`;
      user = await User.create({
        tenantId: String(tenantId),
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
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
    const employeeId = `EMP-${empNum}`;

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
      location: { address: `${Math.floor(Math.random() * 999)} Main St, City` },
      notes: randomBool() ? 'Field generated seed personnel' : '',
      isActive: randomBool(0.85),
    });
  }

  console.log(`Seeded ${toCreate} personnel for tenant '${(tenant as any).slug}'`);
  const finalCount = await Personnel.countDocuments({ tenantId });
  console.log(`Total personnel count now: ${finalCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
