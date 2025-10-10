#!/usr/bin/env node

/**
 * Migration Script: Move Subtask Files to Tenant-Scoped Paths
 *
 * This script migrates existing subtask attachments from the old non-tenant-scoped
 * directory structure to the new tenant-scoped structure and adds file tracking.
 *
 * OLD: /uploads/subtask-attachments/{filename}
 * NEW: /uploads/{tenantId}/subtasks/{subtaskId}/{filename}
 *
 * IMPORTANT: Backup your data before running this script!
 *
 * Usage (can be run from anywhere):
 *   node scripts/migrate_subtask_files.js [--dry-run] [--verbose]
 *   # OR
 *   cd scripts && node migrate_subtask_files.js [--dry-run] [--verbose]
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
const OLD_SUBTASK_DIR = path.join(BACKEND_ROOT, 'uploads', 'subtask-attachments');

// MongoDB connection (adjust as needed)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fsa';

// Stats tracking
const stats = {
  totalSubtasks: 0,
  subtasksWithAttachments: 0,
  filesProcessed: 0,
  filesMoved: 0,
  filesTracked: 0,
  filesMissing: 0,
  errors: [],
};

// Define schemas (minimal versions)
const SubtaskSchema = new mongoose.Schema({
  taskId: mongoose.Schema.Types.ObjectId,
  tenantId: mongoose.Schema.Types.ObjectId,
  attachments: [{
    _id: mongoose.Schema.Types.ObjectId,
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String,
    uploadedAt: Date,
    uploadedBy: mongoose.Schema.Types.ObjectId,
  }]
}, { collection: 'subtasks' });

const TenantSchema = new mongoose.Schema({
  name: String,
  subscription: {
    usage: {
      storageUsedGB: Number,
      totalFiles: Number,
    }
  },
  fileMetadata: [{
    filename: String,
    originalName: String,
    size: Number,
    uploadedAt: Date,
  }]
}, { collection: 'tenants' });

const Subtask = mongoose.model('Subtask', SubtaskSchema);
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

// Main migration function
async function migrateSubtaskFiles() {
  log('Starting subtask file migration...', 'info');

  if (DRY_RUN) {
    log('Running in DRY RUN mode - no changes will be made', 'warning');
  }

  try {
    // Connect to MongoDB
    log(`Connecting to MongoDB: ${MONGO_URI}`, 'info');
    await mongoose.connect(MONGO_URI);
    log('Connected to MongoDB', 'success');

    // Check if old directory exists
    try {
      await fs.access(OLD_SUBTASK_DIR);
      log(`Found old subtask directory: ${OLD_SUBTASK_DIR}`, 'info');
    } catch (error) {
      log(`Old subtask directory not found: ${OLD_SUBTASK_DIR}`, 'warning');
      log('Nothing to migrate. Exiting.', 'info');
      return;
    }

    // Get all files in old directory
    const oldFiles = await fs.readdir(OLD_SUBTASK_DIR);
    log(`Found ${oldFiles.length} files in old directory`, 'info');

    // Get all subtasks with attachments
    const subtasks = await Subtask.find({
      attachments: { $exists: true, $ne: [] }
    }).lean();

    stats.totalSubtasks = subtasks.length;
    log(`Found ${subtasks.length} subtasks with attachments`, 'info');

    // Process each subtask
    for (const subtask of subtasks) {
      await processSubtask(subtask, oldFiles);
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

async function processSubtask(subtask, oldFiles) {
  const subtaskId = subtask._id.toString();
  const tenantId = subtask.tenantId.toString();

  logVerbose(`Processing subtask ${subtaskId} for tenant ${tenantId}`);

  if (!subtask.attachments || subtask.attachments.length === 0) {
    return;
  }

  stats.subtasksWithAttachments++;

  // Get tenant for tracking
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    log(`Tenant ${tenantId} not found for subtask ${subtaskId}`, 'warning');
    stats.errors.push({
      subtaskId,
      tenantId,
      error: 'Tenant not found'
    });
    return;
  }

  // Process each attachment
  for (const attachment of subtask.attachments) {
    await processAttachment(attachment, subtaskId, tenantId, tenant, oldFiles);
  }
}

async function processAttachment(attachment, subtaskId, tenantId, tenant, oldFiles) {
  const filename = attachment.filename;
  stats.filesProcessed++;

  logVerbose(`Processing file: ${filename}`);

  // Check if file exists in old location
  if (!oldFiles.includes(filename)) {
    log(`File not found in old directory: ${filename}`, 'warning');
    stats.filesMissing++;
    return;
  }

  const oldPath = path.join(OLD_SUBTASK_DIR, filename);
  const newDir = path.join(BACKEND_ROOT, 'uploads', tenantId, 'subtasks', subtaskId);
  const newPath = path.join(newDir, filename);

  try {
    if (!DRY_RUN) {
      // Create new directory
      await fs.mkdir(newDir, { recursive: true });

      // Move file
      await fs.rename(oldPath, newPath);
      log(`Moved: ${filename} -> ${newPath}`, 'success');
      stats.filesMoved++;
    } else {
      log(`Would move: ${filename} -> ${newPath}`, 'info');
    }

    // Track file if not already tracked
    const isTracked = tenant.fileMetadata?.some(meta => meta.filename === filename);

    if (!isTracked) {
      if (!DRY_RUN) {
        // Add to tenant's fileMetadata
        await Tenant.findByIdAndUpdate(tenantId, {
          $push: {
            fileMetadata: {
              filename: filename,
              originalName: attachment.originalName || filename,
              size: attachment.size || 0,
              uploadedAt: attachment.uploadedAt || new Date(),
            }
          },
          $inc: {
            'subscription.usage.totalFiles': 1,
            'subscription.usage.storageUsedGB': (attachment.size || 0) / (1024 * 1024 * 1024),
          }
        });

        log(`Tracked file in usage: ${filename} (${attachment.size} bytes)`, 'success');
        stats.filesTracked++;
      } else {
        log(`Would track file: ${filename} (${attachment.size} bytes)`, 'info');
      }
    } else {
      logVerbose(`File already tracked: ${filename}`);
    }

  } catch (error) {
    log(`Error processing ${filename}: ${error.message}`, 'error');
    stats.errors.push({
      filename,
      subtaskId,
      tenantId,
      error: error.message
    });
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE (changes applied)'}`);
  console.log('');
  console.log(`Total subtasks: ${stats.totalSubtasks}`);
  console.log(`Subtasks with attachments: ${stats.subtasksWithAttachments}`);
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files moved: ${stats.filesMoved}`);
  console.log(`Files tracked: ${stats.filesTracked}`);
  console.log(`Files missing: ${stats.filesMissing}`);
  console.log(`Errors: ${stats.errors.length}`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('ERRORS:');
    console.log('-'.repeat(80));
    stats.errors.slice(0, 10).forEach((err, i) => {
      console.log(`${i + 1}. ${err.error}`);
      console.log(`   Subtask: ${err.subtaskId}, Tenant: ${err.tenantId}`);
      if (err.filename) console.log(`   File: ${err.filename}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }

  console.log('='.repeat(80));

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Migration complete!');
  }
}

// Run migration
migrateSubtaskFiles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
