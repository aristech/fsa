#!/usr/bin/env node

// Simple wrapper to run the status migration script
const { spawn } = require('child_process');

console.log('🔄 Migrating existing data to new status system...\n');

const child = spawn('npx', ['tsx', 'src/scripts/migrate-statuses.ts'], {
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Status migration completed successfully!');
  } else {
    console.log(`\n❌ Status migration failed with code ${code}`);
  }
  process.exit(code);
});
