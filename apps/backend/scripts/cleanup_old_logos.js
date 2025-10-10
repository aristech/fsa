#!/usr/bin/env node

/**
 * Cleanup Old Logos Script
 *
 * This script removes old logo files from tenant branding directories,
 * keeping only the currently active logo referenced in the database.
 *
 * IMPORTANT: Run this after ensuring no logo uploads are in progress.
 *
 * Usage:
 *   node scripts/cleanup_old_logos.js [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run   Show what would be done without making changes
 *   --verbose   Show detailed logging
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Get backend root directory (script is in /scripts, so go up one level)
const BACKEND_ROOT = path.join(__dirname, '..');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fsa';

// Stats tracking
const stats = {
  tenantsProcessed: 0,
  tenantsWithLogos: 0,
  totalLogosFound: 0,
  logosDeleted: 0,
  spaceFreed: 0,
  errors: [],
};

// Define tenant schema (minimal)
const TenantSchema = new mongoose.Schema({
  name: String,
  branding: {
    logoUrl: String,
  },
  fileMetadata: [{
    filename: String,
    originalName: String,
    size: Number,
    uploadDate: Date,
  }]
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

// Extract filename from logo URL
function extractFilenameFromUrl(logoUrl) {
  if (!logoUrl) return null;

  try {
    // URL format: http://.../api/v1/uploads/{tenantId}/branding/logo/{filename}?token=...
    const urlParts = logoUrl.split('/');
    const filenameWithQuery = urlParts[urlParts.length - 1];
    const filename = filenameWithQuery.split('?')[0]; // Remove query params
    const decodedFilename = decodeURIComponent(filename);

    // Validate it's a real filename (not a URL)
    if (filename && !filename.includes('http')) {
      return decodedFilename;
    }
  } catch (error) {
    log(`Error extracting filename from URL: ${logoUrl}`, 'error');
  }

  return null;
}

// Main cleanup function
async function cleanupOldLogos() {
  log('Starting old logo cleanup...', 'info');

  if (DRY_RUN) {
    log('Running in DRY RUN mode - no changes will be made', 'warning');
  }

  try {
    // Connect to MongoDB
    log(`Connecting to MongoDB: ${MONGO_URI}`, 'info');
    await mongoose.connect(MONGO_URI);
    log('Connected to MongoDB', 'success');

    // Get all tenants
    const tenants = await Tenant.find({}).lean();
    stats.tenantsProcessed = tenants.length;
    log(`Found ${tenants.length} tenants`, 'info');

    // Process each tenant
    for (const tenant of tenants) {
      await processTenant(tenant);
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

async function processTenant(tenant) {
  const tenantId = tenant._id.toString();
  const tenantName = tenant.name || 'Unknown';

  logVerbose(`Processing tenant: ${tenantName} (${tenantId})`);

  // Get branding logo directory
  const logoDir = path.join(BACKEND_ROOT, 'uploads', tenantId, 'branding', 'logo');

  // Check if directory exists
  try {
    await fs.access(logoDir);
  } catch (error) {
    logVerbose(`  No branding directory for tenant ${tenantName}`);
    return;
  }

  // Get all files in logo directory
  const files = await fs.readdir(logoDir);
  if (files.length === 0) {
    logVerbose(`  No logo files for tenant ${tenantName}`);
    return;
  }

  stats.tenantsWithLogos++;
  stats.totalLogosFound += files.length;

  log(`  Tenant ${tenantName}: Found ${files.length} logo file(s)`, 'info');

  // Extract active logo filename from database
  const activeLogoFilename = extractFilenameFromUrl(tenant.branding?.logoUrl);

  if (!activeLogoFilename) {
    log(`  WARNING: Tenant ${tenantName} has logo files but no active logoUrl in database`, 'warning');
    log(`  Keeping all ${files.length} files for safety`, 'warning');
    return;
  }

  logVerbose(`  Active logo: ${activeLogoFilename}`);

  // Find old logos (files that are NOT the active logo)
  const oldLogos = files.filter(filename => filename !== activeLogoFilename);

  if (oldLogos.length === 0) {
    log(`  ✓ Tenant ${tenantName}: Already clean (1 logo only)`, 'success');
    return;
  }

  log(`  Found ${oldLogos.length} old logo(s) to delete for ${tenantName}`, 'warning');

  // Delete old logos
  for (const oldLogo of oldLogos) {
    await deleteOldLogo(tenantId, tenantName, logoDir, oldLogo, tenant);
  }
}

async function deleteOldLogo(tenantId, tenantName, logoDir, filename, tenant) {
  const filePath = path.join(logoDir, filename);

  try {
    // Get file size before deletion
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;

    if (!DRY_RUN) {
      // Delete file from disk
      await fs.unlink(filePath);

      // Remove from fileMetadata if tracked
      const isTracked = tenant.fileMetadata?.some(meta => meta.filename === filename);
      if (isTracked) {
        await Tenant.findByIdAndUpdate(tenantId, {
          $pull: { fileMetadata: { filename } },
          $inc: {
            'subscription.usage.totalFiles': -1,
            'subscription.usage.storageUsedGB': -(fileSize / (1024 * 1024 * 1024)),
          }
        });
        logVerbose(`    Untracked file: ${filename} (${(fileSize / 1024).toFixed(2)} KB)`);
      }

      log(`    Deleted: ${filename} (${(fileSize / 1024).toFixed(2)} KB)`, 'success');
      stats.logosDeleted++;
      stats.spaceFreed += fileSize;
    } else {
      log(`    Would delete: ${filename} (${(fileSize / 1024).toFixed(2)} KB)`, 'info');
      stats.logosDeleted++;
      stats.spaceFreed += fileSize;
    }
  } catch (error) {
    log(`    Error deleting ${filename}: ${error.message}`, 'error');
    stats.errors.push({
      tenantId,
      tenantName,
      filename,
      error: error.message
    });
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('LOGO CLEANUP SUMMARY');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE (changes applied)'}`);
  console.log('');
  console.log(`Tenants processed: ${stats.tenantsProcessed}`);
  console.log(`Tenants with logos: ${stats.tenantsWithLogos}`);
  console.log(`Total logo files found: ${stats.totalLogosFound}`);
  console.log(`Old logos deleted: ${stats.logosDeleted}`);
  console.log(`Space freed: ${(stats.spaceFreed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Errors: ${stats.errors.length}`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('ERRORS:');
    console.log('-'.repeat(80));
    stats.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.error}`);
      console.log(`   Tenant: ${err.tenantName} (${err.tenantId})`);
      console.log(`   File: ${err.filename}`);
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
cleanupOldLogos()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
