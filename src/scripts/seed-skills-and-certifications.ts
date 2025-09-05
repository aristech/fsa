/*
  Run with: npx tsx src/scripts/seed-skills-and-certifications.ts
*/

import mongoose from 'mongoose';
import { connectDB } from 'src/lib/db';
import { Tenant, Skill, Certification } from 'src/lib/models';

const DEFAULT_TENANT_SLUG = process.env.TENANT_SLUG || 'acme-field-services';

const SKILLS = [
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
const CERTS = ['OSHA-10', 'OSHA-30', 'EPA-608', 'NFPA-70E', 'First Aid', 'CPR/AED'];

async function main() {
  await connectDB();

  let tenant = await Tenant.findOne({ slug: DEFAULT_TENANT_SLUG });
  if (!tenant) tenant = await Tenant.findOne();
  if (!tenant) throw new Error('Tenant not found');
  const tenantId = new mongoose.Types.ObjectId(String(tenant._id));

  for (const name of SKILLS) {
    // eslint-disable-next-line no-await-in-loop
    await Skill.updateOne({ tenantId, name }, { $setOnInsert: { name } }, { upsert: true });
  }

  for (const name of CERTS) {
    // eslint-disable-next-line no-await-in-loop
    await Certification.updateOne({ tenantId, name }, { $setOnInsert: { name } }, { upsert: true });
  }

  console.log('Seeded skills and certifications');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
