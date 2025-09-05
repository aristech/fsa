#!/usr/bin/env node

/**
 * Seed FSA Data Script
 *
 * This script populates the database with realistic FSA data including:
 * - Customers
 * - Technicians
 * - Projects
 * - Work Orders
 * - Tasks
 * - Assignments
 *
 * Usage: node seed-fsa-data.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Starting FSA data seeding...\n');

try {
  // Run the TypeScript seed script
  const scriptPath = path.join(__dirname, 'src/scripts/seed-fsa-data.ts');
  execSync(`npx tsx ${scriptPath}`, {
    stdio: 'inherit',
    cwd: __dirname,
  });
} catch (error) {
  console.error('❌ Error running seed script:', error.message);
  process.exit(1);
}
