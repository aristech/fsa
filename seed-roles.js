#!/usr/bin/env node

// Simple wrapper to run the roles seeding script
const { spawn } = require('child_process');

console.log('🌱 Seeding default roles...\n');

const child = spawn('npx', ['tsx', 'src/scripts/seed-default-roles.ts'], {
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Roles seeding completed successfully!');
  } else {
    console.log(`\n❌ Roles seeding failed with code ${code}`);
  }
  process.exit(code);
});
