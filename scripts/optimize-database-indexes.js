#!/usr/bin/env node

/**
 * Database Index Optimization Script for Multi-Tenant FSA Application
 *
 * This script creates optimized indexes for your current shared database setup
 * to improve query performance and prepare for scaling.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fsa';

// Optimized indexes for multi-tenant queries
const INDEXES_TO_CREATE = [
  // Work Orders - Most frequently queried
  {
    collection: 'workorders',
    indexes: [
      { fields: { tenantId: 1, status: 1, createdAt: -1 }, name: 'tenant_status_created' },
      { fields: { tenantId: 1, clientId: 1, status: 1 }, name: 'tenant_client_status' },
      { fields: { tenantId: 1, 'assignedTo': 1, status: 1 }, name: 'tenant_assigned_status' },
      { fields: { tenantId: 1, dueDate: 1 }, name: 'tenant_due_date' },
      { fields: { tenantId: 1, priority: 1, status: 1 }, name: 'tenant_priority_status' },
      { fields: { tenantId: 1, workOrderNumber: 1 }, name: 'tenant_number', unique: true },
    ]
  },

  // Clients - Second most queried
  {
    collection: 'clients',
    indexes: [
      { fields: { tenantId: 1, isActive: 1, name: 1 }, name: 'tenant_active_name' },
      { fields: { tenantId: 1, email: 1 }, name: 'tenant_email' },
      { fields: { tenantId: 1, phone: 1 }, name: 'tenant_phone' },
      { fields: { tenantId: 1, 'address.city': 1 }, name: 'tenant_city' },
      { fields: { tenantId: 1, createdAt: -1 }, name: 'tenant_created' },
    ]
  },

  // Users - For authentication and team management
  {
    collection: 'users',
    indexes: [
      { fields: { tenantId: 1, role: 1, isActive: 1 }, name: 'tenant_role_active' },
      { fields: { tenantId: 1, email: 1 }, name: 'tenant_email_user', unique: true },
      { fields: { tenantId: 1, 'permissions.resource': 1 }, name: 'tenant_permissions' },
    ]
  },

  // Personnel - For field service assignments
  {
    collection: 'personnel',
    indexes: [
      { fields: { tenantId: 1, isActive: 1, role: 1 }, name: 'tenant_active_role' },
      { fields: { tenantId: 1, 'skills': 1 }, name: 'tenant_skills' },
      { fields: { tenantId: 1, 'availability.isAvailable': 1 }, name: 'tenant_available' },
    ]
  },

  // Tasks - Work order sub-tasks
  {
    collection: 'tasks',
    indexes: [
      { fields: { tenantId: 1, workOrderId: 1, status: 1 }, name: 'tenant_workorder_status' },
      { fields: { tenantId: 1, assignedToId: 1, status: 1 }, name: 'tenant_assigned_task' },
      { fields: { tenantId: 1, dueDate: 1, status: 1 }, name: 'tenant_due_task' },
    ]
  },

  // File Metadata - For uploads and attachments
  {
    collection: 'filemetadata',
    indexes: [
      { fields: { tenantId: 1, fileType: 1, isActive: 1 }, name: 'tenant_filetype_active' },
      { fields: { tenantId: 1, ownerId: 1, ownerType: 1 }, name: 'tenant_owner' },
      { fields: { tenantId: 1, uploadDate: -1 }, name: 'tenant_upload_date' },
      { fields: { tenantId: 1, mimeType: 1 }, name: 'tenant_mime' },
    ]
  },

  // Tenants - For admin and subscription management
  {
    collection: 'tenants',
    indexes: [
      { fields: { 'subscription.plan': 1, 'subscription.status': 1 }, name: 'subscription_plan_status' },
      { fields: { 'subscription.stripeCustomerId': 1 }, name: 'stripe_customer', sparse: true },
      { fields: { slug: 1 }, name: 'tenant_slug', unique: true },
      { fields: { ownerId: 1 }, name: 'owner_id' },
    ]
  },

  // SMS Logs - For communication tracking
  {
    collection: 'smslogs',
    indexes: [
      { fields: { tenantId: 1, status: 1, createdAt: -1 }, name: 'tenant_sms_status' },
      { fields: { tenantId: 1, to: 1, createdAt: -1 }, name: 'tenant_sms_recipient' },
      { fields: { tenantId: 1, workOrderId: 1 }, name: 'tenant_sms_workorder' },
    ]
  },
];

async function createIndexes() {
  console.log('🚀 Starting database index optimization...');
  console.log(`📊 Connecting to: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    let totalIndexesCreated = 0;
    let totalIndexesSkipped = 0;

    for (const { collection, indexes } of INDEXES_TO_CREATE) {
      console.log(`\\n📋 Processing collection: ${collection}`);

      // Check if collection exists
      const collections = await db.listCollections({ name: collection }).toArray();
      if (collections.length === 0) {
        console.log(`   ⚠️  Collection '${collection}' doesn't exist - skipping`);
        continue;
      }

      const coll = db.collection(collection);

      // Get existing indexes
      const existingIndexes = await coll.listIndexes().toArray();
      const existingIndexNames = existingIndexes.map(idx => idx.name);

      for (const { fields, name, unique = false } of indexes) {
        if (existingIndexNames.includes(name)) {
          console.log(`   ⏭️  Index '${name}' already exists - skipping`);
          totalIndexesSkipped++;
          continue;
        }

        try {
          const indexOptions = { name, background: true };
          if (unique) indexOptions.unique = true;

          await coll.createIndex(fields, indexOptions);
          console.log(`   ✅ Created index '${name}': ${JSON.stringify(fields)}`);
          totalIndexesCreated++;
        } catch (error) {
          if (error.code === 11000) {
            console.log(`   ⚠️  Unique constraint violation for '${name}' - index may need cleanup`);
          } else {
            console.log(`   ❌ Failed to create index '${name}': ${error.message}`);
          }
        }
      }
    }

    console.log('\\n📊 Index Creation Summary:');
    console.log(`   ✅ Indexes created: ${totalIndexesCreated}`);
    console.log(`   ⏭️  Indexes skipped: ${totalIndexesSkipped}`);

    // Analyze database performance
    console.log('\\n🔍 Analyzing database performance...');
    await analyzePerformance(db);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\\n👋 Disconnected from MongoDB');
  }
}

async function analyzePerformance(db) {
  try {
    // Get database statistics
    const stats = await db.stats();
    console.log(`   📊 Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📄 Total documents: ${stats.objects.toLocaleString()}`);
    console.log(`   📋 Total collections: ${stats.collections}`);
    console.log(`   🔍 Total indexes: ${stats.indexes}`);

    // Get tenant distribution
    const tenantStats = await db.collection('tenants').aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          avgUsers: { $avg: '$subscription.usage.currentUsers' },
          avgClients: { $avg: '$subscription.usage.currentClients' },
          avgWorkOrders: { $avg: '$subscription.usage.workOrdersThisMonth' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\\n👥 Tenant Distribution:');
    tenantStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} tenants, avg ${Math.round(stat.avgUsers || 0)} users, ${Math.round(stat.avgClients || 0)} clients, ${Math.round(stat.avgWorkOrders || 0)} work orders/month`);
    });

    // Check for potential performance issues
    console.log('\\n⚡ Performance Recommendations:');

    const totalTenants = tenantStats.reduce((sum, stat) => sum + stat.count, 0);
    if (totalTenants > 50) {
      console.log('   ⚠️  Consider implementing tenant tiering strategy (50+ tenants detected)');
    }

    const workOrdersCount = await db.collection('workorders').countDocuments();
    if (workOrdersCount > 10000) {
      console.log('   ⚠️  Large work orders collection detected - consider archiving old records');
    }

    const avgIndexSize = stats.indexSize / stats.indexes;
    if (avgIndexSize > 10 * 1024 * 1024) { // 10MB per index
      console.log('   ⚠️  Large index sizes detected - monitor query performance');
    }

  } catch (error) {
    console.log(`   ⚠️  Could not analyze performance: ${error.message}`);
  }
}

// Script execution
if (require.main === module) {
  createIndexes()
    .then(() => {
      console.log('\\n🎉 Database optimization completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n💥 Database optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { createIndexes, INDEXES_TO_CREATE };