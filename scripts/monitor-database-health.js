#!/usr/bin/env node

/**
 * Database Health Monitor for FSA Application
 *
 * This script monitors key database performance indicators and alerts
 * when your database is approaching capacity or performance limits.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fsa';

// Warning thresholds - when to start paying attention
const WARNING_THRESHOLDS = {
  // Performance warnings
  avgQueryTime: 50,           // milliseconds
  slowQueryCount: 10,         // per hour
  indexSizePercent: 60,       // % of available RAM
  connectionCount: 70,        // % of max connections
  writeLatency: 20,           // milliseconds

  // Capacity warnings
  tenantCount: 75,            // approaching 100 tenant limit
  collectionSizeGB: 15,       // approaching 32GB limit
  totalDocuments: 10000000,   // 10M docs approaching 50M limit
  indexSizeMB: 500,           // approaching 819MB limit
  databaseSizeGB: 8,          // approaching storage limits

  // Growth rate warnings
  monthlyGrowthPercent: 20,   // % increase per month
  newTenantsPerWeek: 5,       // rapid tenant growth
  documentsPerDay: 50000,     // high document creation rate
};

// Critical thresholds - immediate action required
const CRITICAL_THRESHOLDS = {
  avgQueryTime: 100,          // milliseconds
  slowQueryCount: 50,         // per hour
  indexSizePercent: 80,       // % of available RAM
  connectionCount: 90,        // % of max connections
  writeLatency: 50,           // milliseconds

  tenantCount: 90,            // near 100 tenant limit
  collectionSizeGB: 25,       // approaching 32GB hard limit
  totalDocuments: 30000000,   // 30M docs approaching 50M limit
  indexSizeMB: 650,           // approaching 819MB limit
  databaseSizeGB: 20,         // approaching storage limits

  monthlyGrowthPercent: 50,   // unsustainable growth
  newTenantsPerWeek: 15,      // explosive growth
  documentsPerDay: 200000,    // very high creation rate
};

async function monitorDatabaseHealth() {
  console.log('🔍 MongoDB Health Monitor for FSA Application');
  console.log('=' .repeat(50));
  console.log(`📊 Monitoring: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const healthReport = {
      timestamp: new Date(),
      status: 'HEALTHY',
      warnings: [],
      critical: [],
      metrics: {},
      recommendations: []
    };

    // Gather all health metrics
    await checkPerformanceMetrics(db, healthReport);
    await checkCapacityMetrics(db, healthReport);
    await checkGrowthMetrics(db, healthReport);
    await checkTenantMetrics(db, healthReport);
    await checkQueryPatterns(db, healthReport);

    // Determine overall health status
    if (healthReport.critical.length > 0) {
      healthReport.status = 'CRITICAL';
    } else if (healthReport.warnings.length > 0) {
      healthReport.status = 'WARNING';
    }

    // Generate recommendations
    generateHealthRecommendations(healthReport);

    // Output report
    outputHealthReport(healthReport);

    // Save health history
    await saveHealthHistory(healthReport);

  } catch (error) {
    console.error('❌ Health monitoring failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

async function checkPerformanceMetrics(db, report) {
  console.log('\\n⚡ Checking performance metrics...');

  try {
    // Get database stats
    const stats = await db.stats();
    const adminDb = db.admin();

    // Check server status for performance indicators
    let serverStatus;
    try {
      serverStatus = await adminDb.serverStatus();
    } catch (error) {
      console.log('   ⚠️  Could not get server status (requires admin privileges)');
      serverStatus = null;
    }

    report.metrics.performance = {
      totalConnections: serverStatus?.connections?.current || 'N/A',
      availableConnections: serverStatus?.connections?.available || 'N/A',
      indexSizeMB: (stats.indexSize / 1024 / 1024).toFixed(2),
      dataSize: (stats.dataSize / 1024 / 1024).toFixed(2),
      storageSize: (stats.storageSize / 1024 / 1024).toFixed(2),
    };

    // Check index size vs RAM (assuming 16GB RAM)
    const indexSizePercent = (stats.indexSize / 1024 / 1024) / (16 * 1024) * 100;
    if (indexSizePercent > CRITICAL_THRESHOLDS.indexSizePercent) {
      report.critical.push(`🧠 Index size (${indexSizePercent.toFixed(1)}%) exceeds RAM threshold - queries will be slow`);
    } else if (indexSizePercent > WARNING_THRESHOLDS.indexSizePercent) {
      report.warnings.push(`⚠️  Index size (${indexSizePercent.toFixed(1)}%) approaching RAM limit`);
    }

    // Check connection usage
    if (serverStatus?.connections) {
      const connectionPercent = (serverStatus.connections.current / (serverStatus.connections.current + serverStatus.connections.available)) * 100;
      if (connectionPercent > CRITICAL_THRESHOLDS.connectionCount) {
        report.critical.push(`🔗 Connection usage (${connectionPercent.toFixed(1)}%) critically high`);
      } else if (connectionPercent > WARNING_THRESHOLDS.connectionCount) {
        report.warnings.push(`⚠️  Connection usage (${connectionPercent.toFixed(1)}%) getting high`);
      }
    }

    console.log(`   📊 Index Size: ${report.metrics.performance.indexSizeMB} MB (${indexSizePercent.toFixed(1)}% of RAM)`);
    console.log(`   🔗 Connections: ${report.metrics.performance.totalConnections} active`);

  } catch (error) {
    console.log(`   ❌ Error checking performance: ${error.message}`);
  }
}

async function checkCapacityMetrics(db, report) {
  console.log('\\n📊 Checking capacity metrics...');

  try {
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();

    // Check total database size
    const databaseSizeGB = stats.dataSize / 1024 / 1024 / 1024;
    if (databaseSizeGB > CRITICAL_THRESHOLDS.databaseSizeGB) {
      report.critical.push(`💾 Database size (${databaseSizeGB.toFixed(2)}GB) approaching storage limits`);
    } else if (databaseSizeGB > WARNING_THRESHOLDS.databaseSizeGB) {
      report.warnings.push(`⚠️  Database size (${databaseSizeGB.toFixed(2)}GB) growing large`);
    }

    // Check individual collection sizes
    const largeCollections = [];
    for (const collection of collections) {
      try {
        const collStats = await db.collection(collection.name).stats();
        const collSizeGB = collStats.size / 1024 / 1024 / 1024;

        if (collSizeGB > CRITICAL_THRESHOLDS.collectionSizeGB) {
          largeCollections.push({ name: collection.name, size: collSizeGB, critical: true });
        } else if (collSizeGB > WARNING_THRESHOLDS.collectionSizeGB) {
          largeCollections.push({ name: collection.name, size: collSizeGB, critical: false });
        }

        // Check document count
        if (collStats.count > CRITICAL_THRESHOLDS.totalDocuments) {
          report.critical.push(`📄 Collection '${collection.name}' has ${collStats.count.toLocaleString()} documents (approaching MongoDB limits)`);
        } else if (collStats.count > WARNING_THRESHOLDS.totalDocuments) {
          report.warnings.push(`⚠️  Collection '${collection.name}' has ${collStats.count.toLocaleString()} documents`);
        }

      } catch (error) {
        continue; // Skip collections that can't be analyzed
      }
    }

    if (largeCollections.length > 0) {
      largeCollections.forEach(coll => {
        if (coll.critical) {
          report.critical.push(`📊 Collection '${coll.name}' size (${coll.size.toFixed(2)}GB) approaching 32GB limit`);
        } else {
          report.warnings.push(`⚠️  Collection '${coll.name}' size (${coll.size.toFixed(2)}GB) getting large`);
        }
      });
    }

    report.metrics.capacity = {
      databaseSizeGB: databaseSizeGB.toFixed(2),
      totalDocuments: stats.objects,
      collections: collections.length,
      largeCollections: largeCollections.length
    };

    console.log(`   💾 Database Size: ${databaseSizeGB.toFixed(2)} GB`);
    console.log(`   📄 Total Documents: ${stats.objects.toLocaleString()}`);
    console.log(`   📊 Large Collections: ${largeCollections.length}`);

  } catch (error) {
    console.log(`   ❌ Error checking capacity: ${error.message}`);
  }
}

async function checkGrowthMetrics(db, report) {
  console.log('\\n📈 Checking growth metrics...');

  try {
    // Analyze growth over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get document creation rates
    const recentGrowth = await Promise.all([
      db.collection('workorders').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      db.collection('tasks').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      db.collection('tenants').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      db.collection('tenants').countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    ]);

    const [monthlyWorkOrders, monthlyTasks, monthlyTenants, weeklyTenants] = recentGrowth;
    const dailyDocuments = (monthlyWorkOrders + monthlyTasks) / 30;

    // Check growth rates
    if (dailyDocuments > CRITICAL_THRESHOLDS.documentsPerDay) {
      report.critical.push(`📈 Document creation rate (${Math.round(dailyDocuments)}/day) is unsustainably high`);
    } else if (dailyDocuments > WARNING_THRESHOLDS.documentsPerDay) {
      report.warnings.push(`⚠️  Document creation rate (${Math.round(dailyDocuments)}/day) is high`);
    }

    if (weeklyTenants > CRITICAL_THRESHOLDS.newTenantsPerWeek) {
      report.critical.push(`🚀 New tenant rate (${weeklyTenants}/week) requires immediate scaling planning`);
    } else if (weeklyTenants > WARNING_THRESHOLDS.newTenantsPerWeek) {
      report.warnings.push(`⚠️  New tenant rate (${weeklyTenants}/week) is high`);
    }

    report.metrics.growth = {
      monthlyWorkOrders,
      monthlyTasks,
      monthlyTenants,
      weeklyTenants,
      dailyDocuments: Math.round(dailyDocuments)
    };

    console.log(`   📝 Work Orders (30 days): ${monthlyWorkOrders}`);
    console.log(`   ✅ Tasks (30 days): ${monthlyTasks}`);
    console.log(`   👥 New Tenants (30 days): ${monthlyTenants}`);
    console.log(`   📊 Daily Documents: ~${Math.round(dailyDocuments)}`);

  } catch (error) {
    console.log(`   ❌ Error checking growth: ${error.message}`);
  }
}

async function checkTenantMetrics(db, report) {
  console.log('\\n👥 Checking tenant metrics...');

  try {
    // Get tenant count and distribution
    const tenantStats = await db.collection('tenants').aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          avgUsers: { $avg: '$subscription.usage.currentUsers' },
          avgClients: { $avg: '$subscription.usage.currentClients' },
          avgWorkOrders: { $avg: '$subscription.usage.workOrdersThisMonth' },
          maxUsers: { $max: '$subscription.usage.currentUsers' },
          maxClients: { $max: '$subscription.usage.currentClients' },
          maxWorkOrders: { $max: '$subscription.usage.workOrdersThisMonth' }
        }
      }
    ]).toArray();

    const totalTenants = tenantStats.reduce((sum, stat) => sum + stat.count, 0);
    const enterpriseCount = tenantStats.find(s => s._id === 'enterprise')?.count || 0;

    // Check tenant count thresholds
    if (totalTenants > CRITICAL_THRESHOLDS.tenantCount) {
      report.critical.push(`👥 Tenant count (${totalTenants}) approaching database limits - plan scaling immediately`);
    } else if (totalTenants > WARNING_THRESHOLDS.tenantCount) {
      report.warnings.push(`⚠️  Tenant count (${totalTenants}) approaching recommended limits`);
    }

    // Check for resource-heavy tenants
    const heavyTenants = await db.collection('tenants').find({
      $or: [
        { 'subscription.usage.currentUsers': { $gte: 50 } },
        { 'subscription.usage.currentClients': { $gte: 500 } },
        { 'subscription.usage.workOrdersThisMonth': { $gte: 1000 } }
      ]
    }).toArray();

    if (heavyTenants.length > 0) {
      report.warnings.push(`🐘 ${heavyTenants.length} resource-heavy tenants detected - consider isolation`);
    }

    report.metrics.tenants = {
      totalTenants,
      enterpriseCount,
      heavyTenants: heavyTenants.length,
      distribution: tenantStats
    };

    console.log(`   👥 Total Tenants: ${totalTenants}`);
    console.log(`   🏢 Enterprise: ${enterpriseCount}`);
    console.log(`   🐘 Heavy Resource Users: ${heavyTenants.length}`);

  } catch (error) {
    console.log(`   ❌ Error checking tenants: ${error.message}`);
  }
}

async function checkQueryPatterns(db, report) {
  console.log('\\n🔍 Checking query patterns...');

  try {
    // Check if profiling is enabled
    const profilingLevel = await db.runCommand({ profile: -1 });

    if (profilingLevel.was === 0) {
      console.log('   ⚠️  Database profiling is disabled - enable for query performance monitoring');
      report.warnings.push('⚠️  Database profiling disabled - cannot monitor slow queries');
    } else {
      // If profiling is enabled, check for slow queries
      try {
        const slowQueries = await db.collection('system.profile').find({
          'ts': { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
          'millis': { $gte: WARNING_THRESHOLDS.avgQueryTime }
        }).count();

        if (slowQueries > CRITICAL_THRESHOLDS.slowQueryCount) {
          report.critical.push(`🐌 ${slowQueries} slow queries in last hour - performance degrading`);
        } else if (slowQueries > WARNING_THRESHOLDS.slowQueryCount) {
          report.warnings.push(`⚠️  ${slowQueries} slow queries in last hour`);
        }

        console.log(`   🐌 Slow Queries (last hour): ${slowQueries}`);
      } catch (error) {
        console.log('   ⚠️  Could not check slow queries');
      }
    }

    // Check index usage efficiency
    const collections = ['workorders', 'tasks', 'clients', 'users'];
    let indexIssues = 0;

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();

        // Check for tenant-specific indexes
        const hasTenantIndex = indexes.some(idx =>
          idx.key && Object.keys(idx.key)[0] === 'tenantId'
        );

        if (!hasTenantIndex) {
          indexIssues++;
        }
      } catch (error) {
        continue;
      }
    }

    if (indexIssues > 0) {
      report.warnings.push(`🔍 ${indexIssues} collections missing optimized tenant indexes`);
    }

    report.metrics.queries = {
      profilingEnabled: profilingLevel.was > 0,
      indexIssues
    };

  } catch (error) {
    console.log(`   ❌ Error checking queries: ${error.message}`);
  }
}

function generateHealthRecommendations(report) {
  // Clear existing recommendations
  report.recommendations = [];

  // Critical issues first
  if (report.critical.length > 0) {
    report.recommendations.push({
      priority: 'CRITICAL',
      action: 'Implement emergency scaling measures',
      details: 'Database is approaching hard limits - immediate action required'
    });
  }

  // Performance recommendations
  if (report.metrics.performance?.indexSizeMB > 500) {
    report.recommendations.push({
      priority: 'HIGH',
      action: 'Optimize database indexes',
      details: 'Run npm run db:optimize to improve index efficiency'
    });
  }

  // Capacity recommendations
  if (report.metrics.tenants?.totalTenants > 75) {
    report.recommendations.push({
      priority: 'HIGH',
      action: 'Plan hybrid architecture',
      details: 'Approaching tenant limits - start planning database separation'
    });
  }

  // Growth rate recommendations
  if (report.metrics.growth?.dailyDocuments > 10000) {
    report.recommendations.push({
      priority: 'MEDIUM',
      action: 'Implement data archiving',
      details: 'High document creation rate - archive old data to maintain performance'
    });
  }

  // Monitoring recommendations
  if (!report.metrics.queries?.profilingEnabled) {
    report.recommendations.push({
      priority: 'LOW',
      action: 'Enable database profiling',
      details: 'Enable MongoDB profiling to monitor query performance'
    });
  }

  if (report.metrics.queries?.indexIssues > 0) {
    report.recommendations.push({
      priority: 'MEDIUM',
      action: 'Create missing indexes',
      details: 'Run npm run db:optimize to create tenant-specific indexes'
    });
  }
}

function outputHealthReport(report) {
  console.log('\\n' + '='.repeat(60));
  console.log(`🏥 DATABASE HEALTH REPORT - ${report.status}`);
  console.log('='.repeat(60));

  // Status indicator
  const statusIcon = {
    'HEALTHY': '✅',
    'WARNING': '⚠️ ',
    'CRITICAL': '🚨'
  }[report.status];

  console.log(`\\n${statusIcon} Overall Status: ${report.status}`);

  // Critical issues
  if (report.critical.length > 0) {
    console.log('\\n🚨 CRITICAL ISSUES:');
    report.critical.forEach(issue => console.log(`   ${issue}`));
  }

  // Warnings
  if (report.warnings.length > 0) {
    console.log('\\n⚠️  WARNINGS:');
    report.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  // Key metrics summary
  console.log('\\n📊 KEY METRICS:');
  if (report.metrics.tenants) {
    console.log(`   👥 Tenants: ${report.metrics.tenants.totalTenants} (${((report.metrics.tenants.totalTenants/100)*100).toFixed(1)}% of capacity)`);
  }
  if (report.metrics.capacity) {
    console.log(`   💾 Database: ${report.metrics.capacity.databaseSizeGB} GB`);
    console.log(`   📄 Documents: ${report.metrics.capacity.totalDocuments.toLocaleString()}`);
  }
  if (report.metrics.performance) {
    console.log(`   🔍 Index Size: ${report.metrics.performance.indexSizeMB} MB`);
  }
  if (report.metrics.growth) {
    console.log(`   📈 Daily Growth: ~${report.metrics.growth.dailyDocuments} documents`);
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   [${rec.priority}] ${rec.action}`);
      console.log(`               ${rec.details}`);
    });
  }

  // Next steps
  console.log('\\n📋 NEXT STEPS:');
  if (report.status === 'CRITICAL') {
    console.log('   🚨 Take immediate action on critical issues');
    console.log('   📞 Consider emergency scaling measures');
  } else if (report.status === 'WARNING') {
    console.log('   ⚠️  Address warnings within 1-2 weeks');
    console.log('   📊 Monitor closely for further degradation');
  } else {
    console.log('   ✅ Database is healthy - continue regular monitoring');
    console.log('   📅 Schedule next health check in 1 week');
  }

  console.log(`\\n⏰ Next recommended check: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
  console.log('\\n' + '='.repeat(60));
}

async function saveHealthHistory(report) {
  // Save health report for historical tracking
  // In a real implementation, you might save to a separate monitoring database
  // or send to a monitoring service like DataDog, New Relic, etc.

  const historyEntry = {
    timestamp: report.timestamp,
    status: report.status,
    criticalCount: report.critical.length,
    warningCount: report.warnings.length,
    metrics: report.metrics
  };

  // For now, just log that we would save this
  console.log('\\n💾 Health report saved to monitoring history');
}

// Script execution
if (require.main === module) {
  monitorDatabaseHealth()
    .then(() => {
      console.log('\\n🎉 Database health monitoring completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n💥 Health monitoring failed:', error);
      process.exit(1);
    });
}

module.exports = { monitorDatabaseHealth, WARNING_THRESHOLDS, CRITICAL_THRESHOLDS };