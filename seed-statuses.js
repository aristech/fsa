#!/usr/bin/env node

// Simple wrapper to run the status seeding script
const { spawn } = require('child_process');

console.log('🌱 Seeding default statuses...\n');

const child = spawn('npx', ['tsx', 'src/scripts/seed-default-statuses.ts'], {
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Status seeding completed successfully!');
  } else {
    console.log(`\n❌ Status seeding failed with code ${code}`);
  }
  process.exit(code);
});
