#!/usr/bin/env tsx
/**
 * Migration Script: Convert Old Token-Based URLs to Signed URLs
 *
 * This script migrates all attachment URLs in the database from the old
 * JWT token-based format to the new secure signed URL format.
 *
 * Usage:
 *   npx tsx scripts/migrate-attachment-urls-to-signed.ts [--dry-run] [--batch-size=100]
 *
 * Options:
 *   --dry-run       Preview changes without updating database
 *   --batch-size    Number of records to process at once (default: 100)
 */

import mongoose from 'mongoose';
import { Subtask } from '../src/models/Subtask';
import { Task } from '../src/models/Task';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface MigrationStats {
  subtasksProcessed: number;
  subtasksUpdated: number;
  attachmentsConverted: number;
  errors: number;
}

const stats: MigrationStats = {
  subtasksProcessed: 0,
  subtasksUpdated: 0,
  attachmentsConverted: 0,
  errors: 0,
};

/**
 * Check if URL uses old token format
 */
function isOldTokenUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('?token=') || url.includes('&token=');
}

/**
 * Extract file metadata from old URL format
 */
function extractMetadataFromUrl(url: string): {
  tenantId: string;
  scope: string;
  ownerId: string;
  filename: string;
} | null {
  try {
    const urlWithoutQuery = url.split('?')[0];
    const pathParts = urlWithoutQuery.split('/');
    const uploadsIndex = pathParts.indexOf('uploads');

    if (uploadsIndex === -1 || pathParts.length < uploadsIndex + 5) {
      return null;
    }

    return {
      tenantId: pathParts[uploadsIndex + 1],
      scope: pathParts[uploadsIndex + 2],
      ownerId: pathParts[uploadsIndex + 3],
      filename: decodeURIComponent(pathParts[uploadsIndex + 4]),
    };
  } catch (error) {
    console.error('Failed to extract metadata from URL:', error);
    return null;
  }
}

/**
 * Convert old URL to new format (without token, to be signed on-the-fly by frontend)
 */
function convertUrl(oldUrl: string): string | null {
  const metadata = extractMetadataFromUrl(oldUrl);
  if (!metadata) return null;

  // New URL format without token - frontend will generate signed URL
  return `/api/v1/uploads/${metadata.tenantId}/${metadata.scope}/${metadata.ownerId}/${encodeURIComponent(metadata.filename)}`;
}

/**
 * Migrate subtask attachments
 */
async function migrateSubtasks(dryRun: boolean, batchSize: number): Promise<void> {
  console.log('\n📦 Migrating subtask attachments...\n');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const subtasks = await Subtask.find({
      'attachments.0': { $exists: true },
    })
      .limit(batchSize)
      .skip(skip);

    if (subtasks.length === 0) {
      hasMore = false;
      break;
    }

    for (const subtask of subtasks) {
      stats.subtasksProcessed++;

      let needsUpdate = false;

      if (subtask.attachments && subtask.attachments.length > 0) {
        for (const attachment of subtask.attachments) {
          if (attachment.url && isOldTokenUrl(attachment.url)) {
            const newUrl = convertUrl(attachment.url);

            if (newUrl) {
              console.log(`  Converting: ${attachment.originalName}`);
              console.log(`    Old: ${attachment.url.substring(0, 80)}...`);
              console.log(`    New: ${newUrl}`);

              if (!dryRun) {
                attachment.url = newUrl;
              }

              stats.attachmentsConverted++;
              needsUpdate = true;
            } else {
              console.warn(`  ⚠️  Failed to convert URL for: ${attachment.originalName}`);
              stats.errors++;
            }
          }
        }
      }

      if (needsUpdate && !dryRun) {
        try {
          await subtask.save();
          stats.subtasksUpdated++;
        } catch (error) {
          console.error(`  ❌ Failed to update subtask ${subtask._id}:`, error);
          stats.errors++;
        }
      } else if (needsUpdate) {
        stats.subtasksUpdated++;
      }

      if (stats.subtasksProcessed % 10 === 0) {
        console.log(`\n  Progress: ${stats.subtasksProcessed} subtasks processed...`);
      }
    }

    skip += batchSize;
  }
}

/**
 * Migrate task attachments (if applicable)
 */
async function migrateTasks(dryRun: boolean, batchSize: number): Promise<void> {
  console.log('\n📋 Migrating task attachments...\n');

  let skip = 0;
  let hasMore = true;
  let tasksProcessed = 0;
  let tasksUpdated = 0;

  while (hasMore) {
    const tasks = await Task.find({
      'attachments.0': { $exists: true },
    })
      .limit(batchSize)
      .skip(skip);

    if (tasks.length === 0) {
      hasMore = false;
      break;
    }

    for (const task of tasks) {
      tasksProcessed++;

      if (Array.isArray(task.attachments) && task.attachments.length > 0) {
        let needsUpdate = false;
        const newAttachments = task.attachments.map((att) => {
          if (typeof att === 'string' && isOldTokenUrl(att)) {
            const newUrl = convertUrl(att);
            if (newUrl) {
              console.log(`  Converting task attachment: ${task.name}`);
              stats.attachmentsConverted++;
              needsUpdate = true;
              return newUrl;
            }
          }
          return att;
        });

        if (needsUpdate && !dryRun) {
          try {
            task.attachments = newAttachments as any;
            await task.save();
            tasksUpdated++;
          } catch (error) {
            console.error(`  ❌ Failed to update task ${task._id}:`, error);
            stats.errors++;
          }
        } else if (needsUpdate) {
          tasksUpdated++;
        }
      }

      if (tasksProcessed % 10 === 0) {
        console.log(`\n  Progress: ${tasksProcessed} tasks processed...`);
      }
    }

    skip += batchSize;
  }

  console.log(`\n  ✅ Tasks processed: ${tasksProcessed}`);
  console.log(`  ✅ Tasks updated: ${tasksUpdated}`);
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 100;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ATTACHMENT URL MIGRATION: Token-Based → Signed URLs       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be saved\n');
  } else {
    console.log('⚠️  LIVE MODE - Changes will be saved to database\n');
  }

  console.log(`Batch size: ${batchSize}\n`);

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🔌 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Run migrations
    await migrateSubtasks(dryRun, batchSize);
    await migrateTasks(dryRun, batchSize);

    // Print summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    MIGRATION SUMMARY                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`  Subtasks processed:      ${stats.subtasksProcessed}`);
    console.log(`  Subtasks updated:        ${stats.subtasksUpdated}`);
    console.log(`  Attachments converted:   ${stats.attachmentsConverted}`);
    console.log(`  Errors:                  ${stats.errors}`);

    if (dryRun) {
      console.log('\n🔍 This was a dry run. No changes were saved.');
      console.log('   Run without --dry-run to apply changes.\n');
    } else {
      console.log('\n✅ Migration completed successfully!\n');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database\n');
  }
}

// Run migration
main();
