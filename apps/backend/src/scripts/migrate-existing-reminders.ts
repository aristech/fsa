#!/usr/bin/env node
/**
 * Migration script to update existing task reminders with timezone-aware calculations
 *
 * This script finds all existing tasks with reminder settings and recalculates
 * their reminder times using the new timezone-aware system.
 *
 * Usage: npx tsx src/scripts/migrate-existing-reminders.ts
 */

import { connect } from "mongoose";
import { Task } from "../models/Task";
import { Tenant } from "../models/Tenant";
import { TimezoneAwareReminderService } from "../services/timezone-aware-reminder-service";
import { TimezoneAwareRecurringTaskService } from "../services/timezone-aware-recurring-task-service";
import * as dotenv from 'dotenv';
import * as path from 'path';

interface MigrationStats {
  totalTasks: number;
  remindersUpdated: number;
  recurringUpdated: number;
  errors: number;
  skipped: number;
}

async function migrateExistingReminders(): Promise<void> {
  console.log('🚀 Starting timezone-aware reminder migration...\n');

  try {
    // Load environment variables
    // __dirname is in dist/scripts when compiled, so go up two levels to reach apps/backend
    const envPath = path.join(__dirname, '..', '..', '.env');
    dotenv.config({ path: envPath });

    const envProdPath = path.join(__dirname, '..', '..', '.env.production.local');
    dotenv.config({ path: envProdPath });

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('   Tried loading from:');
      console.error(`   - ${envPath}`);
      console.error(`   - ${envProdPath}`);
      throw new Error('MONGODB_URI environment variable is required');
    }

    await connect(mongoUri);
    console.log('📊 Connected to MongoDB');

    const stats: MigrationStats = {
      totalTasks: 0,
      remindersUpdated: 0,
      recurringUpdated: 0,
      errors: 0,
      skipped: 0
    };

    // Find all tasks with reminder or recurring settings
    const tasksWithSettings = await Task.find({
      $or: [
        { 'reminder.enabled': true },
        { 'repeat.enabled': true }
      ]
    });

    stats.totalTasks = tasksWithSettings.length;
    console.log(`📋 Found ${stats.totalTasks} tasks with reminder or recurring settings\n`);

    if (stats.totalTasks === 0) {
      console.log('✅ No tasks found that need migration.');
      return;
    }

    // Process each task
    for (const task of tasksWithSettings) {
      try {
        console.log(`Processing task "${task.title}" (${task._id})`);

        // Get tenant timezone for context
        const tenant = await Tenant.findById(task.tenantId).select('timezone');
        const timezone = tenant?.timezone || 'UTC';
        console.log(`  Tenant timezone: ${timezone}`);

        let updated = false;

        // Update reminder if enabled
        if (task.reminder?.enabled && task.dueDate) {
          try {
            console.log(`  Updating reminder settings...`);
            await TimezoneAwareReminderService.updateTaskReminder(task._id.toString());
            stats.remindersUpdated++;
            updated = true;
            console.log(`  ✅ Reminder updated`);
          } catch (error) {
            console.error(`  ❌ Error updating reminder:`, error);
            stats.errors++;
          }
        }

        // Update recurring if enabled
        if (task.repeat?.enabled && task.dueDate) {
          try {
            console.log(`  Updating recurring settings...`);
            await TimezoneAwareRecurringTaskService.updateTaskRecurrence(task._id.toString());
            stats.recurringUpdated++;
            updated = true;
            console.log(`  ✅ Recurring updated`);
          } catch (error) {
            console.error(`  ❌ Error updating recurring:`, error);
            stats.errors++;
          }
        }

        if (!updated) {
          console.log(`  ⏭️ Skipped (no due date or settings disabled)`);
          stats.skipped++;
        }

        console.log('');
      } catch (error) {
        console.error(`❌ Error processing task ${task._id}:`, error);
        stats.errors++;
      }
    }

    // Display results
    console.log('📈 Migration Results:');
    console.log(`  Total tasks processed: ${stats.totalTasks}`);
    console.log(`  Reminders updated: ${stats.remindersUpdated}`);
    console.log(`  Recurring updated: ${stats.recurringUpdated}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Errors: ${stats.errors}`);

    if (stats.errors > 0) {
      console.log(`\n⚠️  ${stats.errors} error(s) occurred during migration`);
      console.log('Review the logs above for details.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

    console.log('\n📝 Next Steps:');
    console.log('1. Test reminder processing: POST /api/v1/reminders/process');
    console.log('2. Test recurring processing: POST /api/v1/reminders/process-recurring');
    console.log('3. Monitor logs during the next scheduled run');

  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Check for dry-run mode
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🧪 DRY RUN MODE: This would update reminders but not actually change anything\n');
  console.log('To run the actual migration, remove the --dry-run flag\n');
  process.exit(0);
}

// Confirm before running
console.log('⚠️  This will update reminder and recurring task calculations for all existing tasks.');
console.log('Make sure you have a database backup before proceeding.\n');
console.log('To run in dry-run mode first, use: --dry-run\n');

// Run the migration
migrateExistingReminders().catch(console.error);