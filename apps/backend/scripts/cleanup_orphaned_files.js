#!/usr/bin/env node

/**
 * Cleanup Orphaned Files Script
 *
 * This script removes:
 * 1. Upload directories for deleted/non-existent tenants
 * 2. Old logo files (keeping only the active logo per tenant)
 *
 * IMPORTANT: Backup your data before running this script!
 *
 * Usage:
 *   node scripts/cleanup_orphaned_files.js [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run   Show what would be done without making changes
 *   --verbose   Show detailed logging
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Get backend root directory
const BACKEND_ROOT = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(BACKEND_ROOT, 'uploads');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fsa';

// Stats tracking
const stats = {
  activeTenants: 0,
  uploadDirectories: 0,
  orphanedDirectories: 0,
  oldLogosDeleted: 0,
  spaceFreed: 0,
  errors: [],
};

// Define tenant schema (minimal)
const TenantSchema = new mongoose.Schema({
  name: String,
  branding: {
    logoUrl: String,
  }
}, { collection: 'tenants' });

const Tenant = mongoose.model('Tenant', TenantSchema);

// Logging helpers
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = DRY_RUN ? '[DRY RUN] ' : '';

  if (level === 'verbose' && !VERBOSE) return;

  const emoji = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌',
    verbose: '🔍',
  }[level] || '';

  console.log(`${timestamp} ${prefix}${emoji} ${message}`);
}

function logVerbose(message) {
  log(message, 'verbose');
}

// Get directory size
async function getDirectorySize(dirPath) {
  try {
    const { stdout } = await execPromise(`du -sb "${dirPath}"`);
    const size = parseInt(stdout.split('\t')[0]);
    return size;
  } catch (error) {
    return 0;
  }
}

// Extract filename from logo URL
function extractFilenameFromUrl(logoUrl) {
  if (!logoUrl) return null;

  try {
    const urlParts = logoUrl.split('/');
    const filenameWithQuery = urlParts[urlParts.length - 1];
    const filename = filenameWithQuery.split('?')[0];
    return decodeURIComponent(filename);
  } catch (error) {
    return null;
  }
}

// Main cleanup function
async function cleanupOrphanedFiles() {
  log('Starting orphaned files cleanup...', 'info');

  if (DRY_RUN) {
    log('Running in DRY RUN mode - no changes will be made', 'warning');
  }

  try {
    // Connect to MongoDB
    log(`Connecting to MongoDB: ${MONGO_URI}`, 'info');
    await mongoose.connect(MONGO_URI);
    log('Connected to MongoDB', 'success');

    // Get all active tenant IDs
    const tenants = await Tenant.find({}).lean();
    const activeTenantIds = new Set(tenants.map(t => t._id.toString()));
    stats.activeTenants = activeTenantIds.size;

    log(`Found ${stats.activeTenants} active tenants`, 'info');

    // Get all upload directories
    const uploadDirs = await fs.readdir(UPLOADS_DIR);
    stats.uploadDirectories = uploadDirs.length;

    log(`Found ${stats.uploadDirectories} upload directories`, 'info');

    // Process each directory
    for (const dirName of uploadDirs) {
      const dirPath = path.join(UPLOADS_DIR, dirName);
      const stat = await fs.stat(dirPath);

      if (!stat.isDirectory()) continue;

      if (activeTenantIds.has(dirName)) {
        // Active tenant - check for old logos
        logVerbose(`  Active tenant directory: ${dirName}`);
        await cleanupOldLogos(dirName, tenants.find(t => t._id.toString() === dirName));
      } else {
        // Orphaned directory
        stats.orphanedDirectories++;
        await cleanupOrphanedDirectory(dirPath, dirName);
      }
    }

    // Print summary
    printSummary();

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('Disconnected from MongoDB', 'info');
  }
}

async function cleanupOldLogos(tenantId, tenant) {
  const logoDir = path.join(UPLOADS_DIR, tenantId, 'branding', 'logo');

  try {
    await fs.access(logoDir);
  } catch {
    return; // No logo directory
  }

  const files = await fs.readdir(logoDir);
  if (files.length <= 1) return; // Already clean

  const activeLogoFilename = extractFilenameFromUrl(tenant?.branding?.logoUrl);

  if (!activeLogoFilename) {
    log(`  WARNING: Tenant ${tenantId} has ${files.length} logos but no active logoUrl`, 'warning');
    return;
  }

  const oldLogos = files.filter(f => f !== activeLogoFilename);

  log(`  Found ${oldLogos.length} old logo(s) for tenant ${tenantId}`, 'info');

  for (const oldLogo of oldLogos) {
    const filePath = path.join(logoDir, oldLogo);
    try {
      const stat = await fs.stat(filePath);
      const size = stat.size;

      if (!DRY_RUN) {
        await fs.unlink(filePath);
        log(`    Deleted old logo: ${oldLogo} (${(size / 1024).toFixed(2)} KB)`, 'success');
      } else {
        log(`    Would delete old logo: ${oldLogo} (${(size / 1024).toFixed(2)} KB)`, 'info');
      }

      stats.oldLogosDeleted++;
      stats.spaceFreed += size;
    } catch (error) {
      log(`    Error deleting ${oldLogo}: ${error.message}`, 'error');
      stats.errors.push({ tenantId, file: oldLogo, error: error.message });
    }
  }
}

async function cleanupOrphanedDirectory(dirPath, dirName) {
  const dirSize = await getDirectorySize(dirPath);

  log(`  Orphaned directory: ${dirName} (${(dirSize / (1024 * 1024)).toFixed(2)} MB)`, 'warning');

  if (!DRY_RUN) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      log(`    Deleted orphaned directory: ${dirName}`, 'success');
      stats.spaceFreed += dirSize;
    } catch (error) {
      log(`    Error deleting directory: ${error.message}`, 'error');
      stats.errors.push({ directory: dirName, error: error.message });
    }
  } else {
    log(`    Would delete orphaned directory: ${dirName}`, 'info');
    stats.spaceFreed += dirSize;
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('ORPHANED FILES CLEANUP SUMMARY');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE (changes applied)'}`);
  console.log('');
  console.log(`Active tenants: ${stats.activeTenants}`);
  console.log(`Upload directories found: ${stats.uploadDirectories}`);
  console.log(`Orphaned directories: ${stats.orphanedDirectories}`);
  console.log(`Old logos deleted: ${stats.oldLogosDeleted}`);
  console.log(`Total space freed: ${(stats.spaceFreed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Errors: ${stats.errors.length}`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('ERRORS:');
    console.log('-'.repeat(80));
    stats.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.error}`);
      if (err.tenantId) console.log(`   Tenant: ${err.tenantId}`);
      if (err.directory) console.log(`   Directory: ${err.directory}`);
      if (err.file) console.log(`   File: ${err.file}`);
    });
  }

  console.log('='.repeat(80));

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Cleanup complete!');
  }
}

// Run cleanup
cleanupOrphanedFiles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
