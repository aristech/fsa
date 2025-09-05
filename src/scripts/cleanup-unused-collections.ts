/*
  Remove unused MongoDB collections safely.

  Usage:
    DRY_RUN=true npx tsx src/scripts/cleanup-unused-collections.ts
    FORCE_DROP=true npx tsx src/scripts/cleanup-unused-collections.ts

  Environment options:
    - DRY_RUN (default: true)  -> Only logs what would be dropped
    - FORCE_DROP (default: false) -> Actually drop collections when true
*/

import mongoose from 'mongoose';
import { connectDB } from 'src/lib/db';

async function main() {
  const DRY_RUN = (process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
  const FORCE_DROP = (process.env.FORCE_DROP ?? 'false').toLowerCase() === 'true';

  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error('No db connection');

  // Whitelist of expected collection names (lowercase, pluralized by mongoose)
  const expected = new Set<string>([
    'users',
    'roles',
    'tasks',
    'tenants',
    'statuses',
    'projects',
    'customers',
    'personnels',
    'workorders',
    'technicians',
    'assignments',
    'skills',
    'certifications',
    // Mongoose >= 6 may create system collections for transactions/locks – we skip them explicitly
    'system.indexes',
  ]);

  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  const unknown = names.filter((n) => !expected.has(n));

  console.log(`Found ${names.length} collections.`);
  console.log(`Expected: ${Array.from(expected).sort().join(', ')}`);
  console.log(`Unknown: ${unknown.length ? unknown.join(', ') : '(none)'}\n`);

  const toDrop: string[] = [];

  for (const name of unknown) {
    if (name.startsWith('system.')) continue; // never drop system collections

    const count = await db
      .collection(name)
      .countDocuments()
      .catch(() => -1);
    console.log(`- ${name}: ${count} docs${count === 0 ? ' (empty)' : ''}`);
    toDrop.push(name);
  }

  if (!toDrop.length) {
    console.log('No unknown collections to drop.');
    process.exit(0);
  }

  if (DRY_RUN && !FORCE_DROP) {
    console.log('\nDRY RUN: No collections were dropped.');
    console.log('Set FORCE_DROP=true to drop the above collections.');
    process.exit(0);
  }

  for (const name of toDrop) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await db.dropCollection(name);
      console.log(`Dropped collection: ${name}`);
    } catch (err) {
      console.error(`Failed to drop ${name}:`, err);
    }
  }

  console.log('Cleanup complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
