
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
      const first = `Tech${Math.floor(Math.random() * 9000 + 1000)}`;
      const last = `User${Math.floor(Math.random() * 9000 + 1000)}`;
      user = await User.create({
        tenantId: String(tenantId),
        email: `${first.toLowerCase()}.${last.toLowerCase()}@fsa-demo.com`,
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
      notes: randomBool() ? 'Setup generated personnel' : '',
      isActive: randomBool(0.9),
    });
  }

  console.log(`Seeded ${toCreate} personnel for tenant 'fsa-demo'`);
  const finalCount = await Personnel.countDocuments({ tenantId });
  console.log(`Total personnel count now: ${finalCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
