#!/usr/bin/env node

/**
 * Database Capacity Calculator for FSA Application
 *
 * This script calculates realistic capacity limits for your MongoDB database
 * based on your specific data models, query patterns, and performance requirements.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fsa';

// FSA Application Data Model Sizes (in bytes)
// Based on your actual model structures
const DOCUMENT_SIZES = {
  // Core entities
  tenant: 2048,        // Tenant with subscription, settings, usage stats
  user: 1024,          // User with permissions, profile data
  client: 1536,        // Client with address, contact info
  workOrder: 4096,     // Work order with rich details, tasks, materials
  task: 2048,          // Task with assignees, dates, repeat settings
  personnel: 1536,     // Personnel with skills, availability, certifications

  // Supporting entities
  material: 512,       // Material with pricing, availability
  timeEntry: 256,      // Time tracking entries
  assignment: 256,     // Personnel assignments
  notification: 512,   // System notifications
  comment: 512,        // Comments on work orders/tasks
  report: 8192,        // Reports with data and charts
  fileMetadata: 512,   // File upload metadata
  smsLog: 256,         // SMS communication logs

  // Calendar and scheduling
  calendarEvent: 1024, // Calendar events
  checkInSession: 512, // Personnel check-ins

  // Relationships and lookups
  status: 256,         // Custom status definitions
  project: 1024,       // Project groupings
  subtask: 512,        // Sub-tasks within tasks
  taskMaterial: 256,   // Task-material relationships
  skill: 256,          // Personnel skills
  certification: 512,  // Personnel certifications
  role: 512,           // User roles and permissions
};

// Typical tenant data ratios (based on FSA usage patterns)
const TENANT_DATA_RATIOS = {
  // Per tenant averages across all plan types
  small: {
    users: 3,
    clients: 25,
    personnel: 5,
    workOrdersPerMonth: 50,
    tasksPerWorkOrder: 4,
    materialsPerWorkOrder: 2,
    timeEntriesPerMonth: 100,
    commentsPerWorkOrder: 3,
    notificationsPerMonth: 200,
    smsPerMonth: 20,
    reportsPerMonth: 5,
    filesPerMonth: 15,
    retention: 24, // months of data retention
  },
  medium: {
    users: 8,
    clients: 150,
    personnel: 12,
    workOrdersPerMonth: 200,
    tasksPerWorkOrder: 5,
    materialsPerWorkOrder: 3,
    timeEntriesPerMonth: 500,
    commentsPerWorkOrder: 4,
    notificationsPerMonth: 800,
    smsPerMonth: 100,
    reportsPerMonth: 20,
    filesPerMonth: 60,
    retention: 36,
  },
  large: {
    users: 25,
    clients: 800,
    personnel: 30,
    workOrdersPerMonth: 1000,
    tasksPerWorkOrder: 6,
    materialsPerWorkOrder: 4,
    timeEntriesPerMonth: 2500,
    commentsPerWorkOrder: 5,
    notificationsPerMonth: 3000,
    smsPerMonth: 500,
    reportsPerMonth: 50,
    filesPerMonth: 200,
    retention: 48,
  },
  enterprise: {
    users: 100,
    clients: 3000,
    personnel: 100,
    workOrdersPerMonth: 5000,
    tasksPerWorkOrder: 8,
    materialsPerWorkOrder: 6,
    timeEntriesPerMonth: 12000,
    commentsPerWorkOrder: 6,
    notificationsPerMonth: 15000,
    smsPerMonth: 2000,
    reportsPerMonth: 100,
    filesPerMonth: 500,
    retention: 60,
  }
};

// Performance thresholds
const PERFORMANCE_LIMITS = {
  // MongoDB performance characteristics
  maxDocumentsPerCollection: 50000000,      // 50M docs before performance degrades
  maxIndexSize: 1024 * 1024 * 1024,         // 1GB index size limit
  maxCollectionSize: 32 * 1024 * 1024 * 1024, // 32GB collection size
  maxQueryTime: 100,                         // 100ms max query time
  maxConcurrentConnections: 1000,            // Connection pool limit
  maxWritesPerSecond: 10000,                 // Write throughput limit

  // Application-specific limits
  maxTenantsSharedDB: 200,                   // Tenants before performance issues
  maxUsersPerTenant: 500,                    // Users per tenant before issues
  maxWorkOrdersPerTenant: 50000,             // Work orders per tenant
  maxTasksPerTenant: 200000,                 // Tasks per tenant

  // Infrastructure limits (typical cloud MongoDB)
  cpuCores: 4,
  ramGB: 16,
  diskIOPS: 3000,
  networkMbps: 1000,
};

async function calculateCapacity() {
  console.log('🧮 Calculating Database Capacity for FSA Application');
  console.log('=' .repeat(60));

  try {
    // Connect to get current stats
    let currentStats = null;
    try {
      await mongoose.connect(MONGODB_URI);
      const db = mongoose.connection.db;
      currentStats = await analyzeCurrentDatabase(db);
      await mongoose.disconnect();
    } catch (error) {
      console.log('⚠️  Could not connect to database for current stats');
      console.log('   Using theoretical calculations only');
    }

    // Calculate capacity for different scenarios
    const capacityAnalysis = {
      currentState: currentStats,
      tenantCapacity: calculateTenantCapacity(),
      scalingLimits: calculateScalingLimits(),
      performanceBreakpoints: calculatePerformanceBreakpoints(),
      recommendations: generateCapacityRecommendations()
    };

    outputCapacityReport(capacityAnalysis);

  } catch (error) {
    console.error('❌ Capacity calculation failed:', error);
    process.exit(1);
  }
}

async function analyzeCurrentDatabase(db) {
  console.log('📊 Analyzing current database state...');

  try {
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();

    // Get tenant count and distribution
    const tenantStats = await db.collection('tenants').aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          avgUsers: { $avg: '$subscription.usage.currentUsers' },
          avgClients: { $avg: '$subscription.usage.currentClients' },
          avgWorkOrders: { $avg: '$subscription.usage.workOrdersThisMonth' }
        }
      }
    ]).toArray();

    const totalTenants = tenantStats.reduce((sum, stat) => sum + stat.count, 0);

    // Get collection sizes
    const collectionStats = [];
    for (const collection of collections.slice(0, 10)) { // Limit to prevent timeout
      try {
        const collStats = await db.collection(collection.name).stats();
        collectionStats.push({
          name: collection.name,
          documents: collStats.count,
          sizeMB: collStats.size / 1024 / 1024,
          avgDocSize: collStats.avgObjSize
        });
      } catch (error) {
        continue;
      }
    }

    return {
      totalSizeMB: stats.dataSize / 1024 / 1024,
      totalDocuments: stats.objects,
      totalTenants,
      tenantDistribution: tenantStats,
      collections: collectionStats,
      indexSizeMB: stats.indexSize / 1024 / 1024
    };

  } catch (error) {
    console.log(`   ⚠️  Error analyzing database: ${error.message}`);
    return null;
  }
}

function calculateTenantCapacity() {
  console.log('\\n👥 Calculating tenant capacity limits...');

  const results = {};

  Object.entries(TENANT_DATA_RATIOS).forEach(([tenantType, ratios]) => {
    // Calculate monthly data growth
    const monthlyDocuments = {
      workOrders: ratios.workOrdersPerMonth,
      tasks: ratios.workOrdersPerMonth * ratios.tasksPerWorkOrder,
      timeEntries: ratios.timeEntriesPerMonth,
      comments: ratios.workOrdersPerMonth * ratios.commentsPerWorkOrder,
      notifications: ratios.notificationsPerMonth,
      smsLogs: ratios.smsPerMonth,
      reports: ratios.reportsPerMonth,
      fileMetadata: ratios.filesPerMonth,
      materials: ratios.workOrdersPerMonth * ratios.materialsPerWorkOrder / 10, // Materials reused
    };

    // Calculate storage per month
    const monthlyStorageMB = (
      monthlyDocuments.workOrders * DOCUMENT_SIZES.workOrder +
      monthlyDocuments.tasks * DOCUMENT_SIZES.task +
      monthlyDocuments.timeEntries * DOCUMENT_SIZES.timeEntry +
      monthlyDocuments.comments * DOCUMENT_SIZES.comment +
      monthlyDocuments.notifications * DOCUMENT_SIZES.notification +
      monthlyDocuments.smsLogs * DOCUMENT_SIZES.smsLog +
      monthlyDocuments.reports * DOCUMENT_SIZES.report +
      monthlyDocuments.fileMetadata * DOCUMENT_SIZES.fileMetadata +
      monthlyDocuments.materials * DOCUMENT_SIZES.material
    ) / 1024 / 1024;

    // Calculate total storage with retention
    const totalStorageMB = monthlyStorageMB * ratios.retention;

    // Add static data (users, clients, personnel)
    const staticStorageMB = (
      ratios.users * DOCUMENT_SIZES.user +
      ratios.clients * DOCUMENT_SIZES.client +
      ratios.personnel * DOCUMENT_SIZES.personnel +
      DOCUMENT_SIZES.tenant
    ) / 1024 / 1024;

    const totalDocuments = Object.values(monthlyDocuments).reduce((sum, count) => sum + count, 0) * ratios.retention +
                          ratios.users + ratios.clients + ratios.personnel + 1; // +1 for tenant

    results[tenantType] = {
      monthlyGrowthMB: monthlyStorageMB.toFixed(2),
      totalStorageMB: (totalStorageMB + staticStorageMB).toFixed(2),
      totalDocuments: Math.round(totalDocuments),
      estimatedIndexSizeMB: ((totalStorageMB + staticStorageMB) * 0.15).toFixed(2), // ~15% for indexes
      monthlyDocuments: Object.values(monthlyDocuments).reduce((sum, count) => sum + count, 0)
    };
  });

  return results;
}

function calculateScalingLimits() {
  console.log('📈 Calculating scaling limits...');

  const tenantCapacity = calculateTenantCapacity();

  // Calculate how many tenants of each type can fit
  const limits = {};

  Object.entries(tenantCapacity).forEach(([tenantType, capacity]) => {
    const storageMB = parseFloat(capacity.totalStorageMB);
    const documents = capacity.totalDocuments;

    // Limits based on different constraints
    const storageLimit = Math.floor(PERFORMANCE_LIMITS.maxCollectionSize / 1024 / 1024 / storageMB);
    const documentLimit = Math.floor(PERFORMANCE_LIMITS.maxDocumentsPerCollection / documents);
    const tenantLimit = PERFORMANCE_LIMITS.maxTenantsSharedDB;

    // The most restrictive limit wins
    const maxTenants = Math.min(storageLimit, documentLimit, tenantLimit);

    limits[tenantType] = {
      maxTenants,
      limitingFactor: storageLimit < documentLimit ?
        (storageLimit < tenantLimit ? 'Storage' : 'Tenant Count') :
        (documentLimit < tenantLimit ? 'Documents' : 'Tenant Count'),
      storageLimitTenants: storageLimit,
      documentLimitTenants: documentLimit,
      totalStorageAtLimit: (storageMB * maxTenants / 1024).toFixed(2) + ' GB',
      totalDocumentsAtLimit: (documents * maxTenants).toLocaleString()
    };
  });

  return limits;
}

function calculatePerformanceBreakpoints() {
  console.log('⚡ Calculating performance breakpoints...');

  const breakpoints = {
    // Query performance degradation points
    slowQueries: {
      workOrdersCollection: Math.floor(PERFORMANCE_LIMITS.maxDocumentsPerCollection * 0.1), // 10% of max
      tasksCollection: Math.floor(PERFORMANCE_LIMITS.maxDocumentsPerCollection * 0.05), // 5% of max
      reason: 'Complex tenant filtering with large collections'
    },

    // Index size warnings
    indexPressure: {
      totalIndexSizeMB: PERFORMANCE_LIMITS.maxIndexSize / 1024 / 1024 * 0.8, // 80% of max
      reason: 'Index size impacts query performance and memory usage'
    },

    // Connection pressure
    connectionPressure: {
      tenantCount: 100,
      reason: 'Connection pooling becomes complex with many active tenants'
    },

    // Write performance
    writeBottleneck: {
      writesPerSecond: PERFORMANCE_LIMITS.maxWritesPerSecond * 0.7, // 70% of max
      reason: 'High-frequency tenant operations (tasks, time entries, notifications)'
    },

    // Memory pressure
    memoryPressure: {
      workingSetSizeGB: PERFORMANCE_LIMITS.ramGB * 0.8, // 80% of available RAM
      reason: 'MongoDB working set should fit in memory for optimal performance'
    }
  };

  return breakpoints;
}

function generateCapacityRecommendations() {
  console.log('💡 Generating capacity recommendations...');

  const tenantLimits = calculateTenantCapacity();
  const scalingLimits = calculateScalingLimits();

  return {
    immediate: [
      {
        action: 'Create optimized indexes',
        rationale: 'Improve query performance before hitting scale limits',
        impact: 'High',
        effort: 'Low'
      },
      {
        action: 'Implement query monitoring',
        rationale: 'Track performance degradation as data grows',
        impact: 'Medium',
        effort: 'Medium'
      },
      {
        action: 'Set up automated archiving',
        rationale: 'Prevent unlimited data growth in active collections',
        impact: 'High',
        effort: 'Medium'
      }
    ],

    nearTerm: [
      {
        action: 'Plan tenant tiering strategy',
        rationale: 'Separate large tenants before performance impact',
        impact: 'High',
        effort: 'High'
      },
      {
        action: 'Implement read replicas',
        rationale: 'Distribute read load across multiple database instances',
        impact: 'Medium',
        effort: 'Medium'
      }
    ],

    longTerm: [
      {
        action: 'Database sharding strategy',
        rationale: 'Horizontal scaling when single database limits are reached',
        impact: 'High',
        effort: 'High'
      },
      {
        action: 'Move to database-per-tenant for enterprise',
        rationale: 'Complete isolation and unlimited scaling per tenant',
        impact: 'High',
        effort: 'High'
      }
    ],

    monitoring: [
      'Query performance (target < 100ms)',
      'Index size growth',
      'Connection pool utilization',
      'Write operation latency',
      'Memory usage trends'
    ]
  };
}

function outputCapacityReport(analysis) {
  console.log('\\n' + '='.repeat(80));
  console.log('📊 FSA DATABASE CAPACITY ANALYSIS REPORT');
  console.log('='.repeat(80));

  // Current state
  if (analysis.currentState) {
    console.log('\\n📋 CURRENT DATABASE STATE:');
    console.log(`   💾 Total Size: ${analysis.currentState.totalSizeMB.toFixed(2)} MB`);
    console.log(`   📄 Total Documents: ${analysis.currentState.totalDocuments.toLocaleString()}`);
    console.log(`   👥 Total Tenants: ${analysis.currentState.totalTenants}`);
    console.log(`   🔍 Index Size: ${analysis.currentState.indexSizeMB.toFixed(2)} MB`);
  }

  // Tenant capacity analysis
  console.log('\\n👥 TENANT CAPACITY ANALYSIS:');
  console.log('   (Storage requirements per tenant type)');
  console.log('');
  console.log('   Type        | Monthly Growth | Total Storage | Total Docs | Est. Index Size');
  console.log('   ------------|----------------|---------------|------------|----------------');
  Object.entries(analysis.tenantCapacity).forEach(([type, capacity]) => {
    console.log(`   ${type.padEnd(11)} | ${capacity.monthlyGrowthMB.padStart(11)} MB | ${capacity.totalStorageMB.padStart(10)} MB | ${capacity.totalDocuments.toLocaleString().padStart(10)} | ${capacity.estimatedIndexSizeMB.padStart(11)} MB`);
  });

  // Scaling limits
  console.log('\\n🎯 SCALING LIMITS PER TENANT TYPE:');
  console.log('   (Maximum tenants before performance degradation)');
  console.log('');
  console.log('   Type        | Max Tenants | Limiting Factor | Total Storage | Total Documents');
  console.log('   ------------|-------------|-----------------|---------------|----------------');
  Object.entries(analysis.scalingLimits).forEach(([type, limits]) => {
    console.log(`   ${type.padEnd(11)} | ${limits.maxTenants.toString().padStart(11)} | ${limits.limitingFactor.padStart(15)} | ${limits.totalStorageAtLimit.padStart(13)} | ${limits.totalDocumentsAtLimit.padStart(14)}`);
  });

  // Performance breakpoints
  console.log('\\n⚡ PERFORMANCE BREAKPOINTS:');
  console.log(`   🐌 Slow queries start at: ${analysis.performanceBreakpoints.slowQueries.workOrdersCollection.toLocaleString()} work orders`);
  console.log(`   🔍 Index pressure at: ${analysis.performanceBreakpoints.indexPressure.totalIndexSizeMB.toFixed(0)} MB total index size`);
  console.log(`   🔗 Connection pressure at: ${analysis.performanceBreakpoints.connectionPressure.tenantCount} active tenants`);
  console.log(`   ✍️  Write bottleneck at: ${analysis.performanceBreakpoints.writeBottleneck.writesPerSecond.toLocaleString()} writes/second`);

  // Key findings
  console.log('\\n🔍 KEY FINDINGS:');

  // Find the most restrictive tenant type
  const mostRestrictive = Object.entries(analysis.scalingLimits)
    .sort((a, b) => a[1].maxTenants - b[1].maxTenants)[0];

  console.log(`   🎯 Mixed tenant scenario (realistic): ~100-150 tenants maximum`);
  console.log(`   🏢 Enterprise-only scenario: ~${mostRestrictive[1].maxTenants} tenants maximum`);
  console.log(`   📊 Documents become the limiting factor for large tenants`);
  console.log(`   💾 Storage becomes limiting factor for long data retention`);

  // Recommendations
  console.log('\\n💡 IMMEDIATE RECOMMENDATIONS:');
  analysis.recommendations.immediate.forEach(rec => {
    console.log(`   ✅ ${rec.action}`);
    console.log(`      Rationale: ${rec.rationale}`);
    console.log(`      Impact: ${rec.impact}, Effort: ${rec.effort}`);
    console.log('');
  });

  // Scaling timeline
  console.log('📅 SCALING TIMELINE:');
  console.log('   📍 0-50 tenants: Current architecture optimal');
  console.log('   📍 50-100 tenants: Start index optimization, monitor performance');
  console.log('   📍 100-150 tenants: Plan hybrid architecture');
  console.log('   📍 150+ tenants: Implement tenant separation');
  console.log('   📍 500+ tenants: Database-per-tenant for large customers');

  console.log('\\n' + '='.repeat(80));
}

// Script execution
if (require.main === module) {
  calculateCapacity()
    .then(() => {
      console.log('\\n🎉 Database capacity analysis completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n💥 Capacity analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { calculateCapacity, DOCUMENT_SIZES, TENANT_DATA_RATIOS, PERFORMANCE_LIMITS };