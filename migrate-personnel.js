#!/usr/bin/env node

// Simple wrapper to run the personnel migration script
const { spawn } = require('child_process');

console.log('🔄 Migrating technicians to personnel...\n');

const child = spawn('npx', ['tsx', 'src/scripts/migrate-technicians-to-personnel.ts'], {
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Personnel migration completed successfully!');
  } else {
    console.log(`\n❌ Personnel migration failed with code ${code}`);
  }
  process.exit(code);
});
