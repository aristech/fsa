#!/usr/bin/env tsx
/**
 * Fix Task-Client Associations Script
 *
 * This script fixes tasks where the task's clientId doesn't match
 * the work order's clientId. When a task is linked to a work order,
 * the work order's client should be the source of truth.
 *
 * Usage: npx tsx apps/backend/src/scripts/fix-task-client-associations.ts
 */

import { connect } from 'mongoose';
import { Task } from '../models/Task';
import { WorkOrder } from '../models';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function fixTaskClientAssociations() {
  try {
    // Load environment variables
    // __dirname is in dist/scripts when compiled, so go up two levels to reach apps/backend
    const envPath = path.join(__dirname, '..', '..', '.env');
    dotenv.config({ path: envPath });

    const envProdPath = path.join(__dirname, '..', '..', '.env.production.local');
    dotenv.config({ path: envProdPath });

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('   Tried loading from:');
      console.error(`   - ${envPath}`);
      console.error(`   - ${envProdPath}`);
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all tasks that have both a workOrderId and a clientId
    const tasksWithBoth = await Task.find({
      workOrderId: { $exists: true, $ne: null },
      clientId: { $exists: true, $ne: null },
    }).lean();

    console.log(`Found ${tasksWithBoth.length} tasks with both workOrderId and clientId\n`);

    let fixedCount = 0;
    let inconsistentCount = 0;
    let errorCount = 0;

    for (const task of tasksWithBoth) {
      try {
        // Fetch the work order to get its clientId
        const workOrder: any = await WorkOrder.findById(task.workOrderId).select('clientId').lean();

        if (!workOrder) {
          console.log(`⚠️  Task ${task._id}: Work order ${task.workOrderId} not found (orphaned reference)`);
          continue;
        }

        const workOrderClientId = workOrder.clientId?.toString();
        const taskClientId = (task as any).clientId?.toString();

        // Check if they match
        if (workOrderClientId !== taskClientId) {
          inconsistentCount++;

          // Update task to match work order's client
          await Task.findByIdAndUpdate(task._id, {
            $set: {
              clientId: workOrder.clientId,
            },
            // Note: We're keeping clientName and clientCompany as they may need to be refreshed separately
          });

          console.log(`✅ Fixed task: ${task.title} (${task._id})`);
          console.log(`   Work Order Client: ${workOrderClientId}`);
          console.log(`   Task Client (old):  ${taskClientId}`);
          console.log(`   Updated to match work order\n`);

          fixedCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing task ${task._id}:`, error.message);
        errorCount++;
      }
    }

    // Also find tasks with workOrderId but no clientId and set them
    const tasksWithWOButNoClient = await Task.find({
      workOrderId: { $exists: true, $ne: null },
      $or: [
        { clientId: { $exists: false } },
        { clientId: null },
      ],
    }).lean();

    console.log(`\nFound ${tasksWithWOButNoClient.length} tasks with workOrderId but no clientId\n`);

    for (const task of tasksWithWOButNoClient) {
      try {
        const workOrder: any = await WorkOrder.findById(task.workOrderId).select('clientId').lean();

        if (!workOrder) {
          console.log(`⚠️  Task ${task._id}: Work order ${task.workOrderId} not found`);
          continue;
        }

        if (workOrder.clientId) {
          await Task.findByIdAndUpdate(task._id, {
            $set: {
              clientId: workOrder.clientId,
            },
          });

          console.log(`✅ Added client to task: ${(task as any).title} (${task._id})`);
          console.log(`   Set clientId from work order: ${workOrder.clientId}\n`);

          fixedCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing task ${task._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`Tasks checked: ${tasksWithBoth.length + tasksWithWOButNoClient.length}`);
    console.log(`Inconsistencies found: ${inconsistentCount}`);
    console.log(`Tasks fixed: ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n✅ Task-client associations have been fixed!');
      console.log('   Tasks linked to work orders now use the work order\'s client.');
    } else {
      console.log('\n✅ No inconsistencies found - all tasks are correctly associated!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixTaskClientAssociations();
