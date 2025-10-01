#!/usr/bin/env node

/**
 * Database Scaling Monitor Script
 *
 * This script monitors your database performance and provides recommendations
 * on when to move from shared database to hybrid or database-per-tenant approach.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fsa';

// Scaling thresholds
const SCALING_THRESHOLDS = {
  // Tenant count thresholds
  SHARED_TO_HYBRID_TENANTS: 50,
  HYBRID_TO_DEDICATED_TENANTS: 200,

  // Performance thresholds (milliseconds)
  SLOW_QUERY_THRESHOLD: 100,
  CRITICAL_QUERY_THRESHOLD: 500,

  // Data size thresholds (MB)
  LARGE_COLLECTION_SIZE: 1000,
  CRITICAL_DATABASE_SIZE: 10000,

  // Enterprise customer thresholds
  ENTERPRISE_CUSTOMERS_FOR_HYBRID: 5,
  LARGE_TENANT_WORKORDERS_THRESHOLD: 1000,
  LARGE_TENANT_CLIENTS_THRESHOLD: 500,
};

async function analyzeScalingNeeds() {
  console.log('🔍 Analyzing database scaling requirements...');
  console.log('=' .repeat(50));

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\\n');

    const db = mongoose.connection.db;
    const scalingReport = {
      currentArchitecture: 'Shared Database',
      recommendedAction: 'MAINTAIN',
      urgency: 'LOW',
      findings: [],
      recommendations: [],
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    // 1. Analyze tenant distribution and growth
    await analyzeTenantDistribution(db, scalingReport);

    // 2. Analyze database performance
    await analyzeDatabasePerformance(db, scalingReport);

    // 3. Analyze data size and growth
    await analyzeDataSize(db, scalingReport);

    // 4. Analyze tenant resource consumption
    await analyzeTenantResourceConsumption(db, scalingReport);

    // 5. Analyze query patterns
    await analyzeQueryPatterns(db, scalingReport);

    // Generate final recommendations
    generateScalingRecommendations(scalingReport);

    // Output report
    outputScalingReport(scalingReport);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

async function analyzeTenantDistribution(db, report) {
  console.log('👥 Analyzing tenant distribution...');

  try {
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
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const totalTenants = tenantStats.reduce((sum, stat) => sum + stat.count, 0);
    const enterpriseCount = tenantStats.find(s => s._id === 'enterprise')?.count || 0;
    const premiumCount = tenantStats.find(s => s._id === 'premium')?.count || 0;

    console.log(`   📊 Total tenants: ${totalTenants}`);
    console.log(`   🏢 Enterprise customers: ${enterpriseCount}`);
    console.log(`   💎 Premium customers: ${premiumCount}`);

    // Check tenant scaling thresholds
    if (totalTenants >= SCALING_THRESHOLDS.HYBRID_TO_DEDICATED_TENANTS) {
      report.findings.push(`🚨 CRITICAL: ${totalTenants} tenants exceeds dedicated database threshold (${SCALING_THRESHOLDS.HYBRID_TO_DEDICATED_TENANTS})`);
      report.urgency = 'CRITICAL';
      report.recommendedAction = 'MIGRATE_TO_DEDICATED';
    } else if (totalTenants >= SCALING_THRESHOLDS.SHARED_TO_HYBRID_TENANTS) {
      report.findings.push(`⚠️  WARNING: ${totalTenants} tenants approaching hybrid architecture threshold (${SCALING_THRESHOLDS.SHARED_TO_HYBRID_TENANTS})`);
      if (report.urgency !== 'CRITICAL') report.urgency = 'MEDIUM';
      report.recommendedAction = 'PLAN_HYBRID';
    }

    if (enterpriseCount >= SCALING_THRESHOLDS.ENTERPRISE_CUSTOMERS_FOR_HYBRID) {
      report.findings.push(`🏢 ${enterpriseCount} enterprise customers suggest need for dedicated databases`);
      if (report.urgency === 'LOW') report.urgency = 'MEDIUM';
    }

    // Identify large tenants
    const largeTenants = await db.collection('tenants').find({
      $or: [
        { 'subscription.usage.currentClients': { $gte: SCALING_THRESHOLDS.LARGE_TENANT_CLIENTS_THRESHOLD } },
        { 'subscription.usage.workOrdersThisMonth': { $gte: SCALING_THRESHOLDS.LARGE_TENANT_WORKORDERS_THRESHOLD } }
      ]
    }).toArray();

    if (largeTenants.length > 0) {
      console.log(`   🐘 Large tenants detected: ${largeTenants.length}`);
      report.findings.push(`🐘 ${largeTenants.length} large tenants may be causing performance issues`);
      largeTenants.forEach(tenant => {
        console.log(`      - ${tenant.name}: ${tenant.subscription.usage.currentClients} clients, ${tenant.subscription.usage.workOrdersThisMonth} work orders/month`);
      });
    }

    report.tenantStats = { totalTenants, enterpriseCount, premiumCount, largeTenants: largeTenants.length };

  } catch (error) {
    console.log(`   ❌ Error analyzing tenants: ${error.message}`);
  }
}

async function analyzeDatabasePerformance(db, report) {
  console.log('\\n⚡ Analyzing database performance...');

  try {
    const stats = await db.stats();
    const databaseSizeMB = stats.dataSize / 1024 / 1024;
    const indexSizeMB = stats.indexSize / 1024 / 1024;

    console.log(`   💾 Database size: ${databaseSizeMB.toFixed(2)} MB`);
    console.log(`   🔍 Index size: ${indexSizeMB.toFixed(2)} MB`);
    console.log(`   📄 Total documents: ${stats.objects.toLocaleString()}`);

    if (databaseSizeMB >= SCALING_THRESHOLDS.CRITICAL_DATABASE_SIZE) {
      report.findings.push(`🚨 Database size (${databaseSizeMB.toFixed(0)}MB) exceeds critical threshold (${SCALING_THRESHOLDS.CRITICAL_DATABASE_SIZE}MB)`);
      report.urgency = 'CRITICAL';
    } else if (databaseSizeMB >= SCALING_THRESHOLDS.LARGE_COLLECTION_SIZE) {
      report.findings.push(`⚠️  Database size (${databaseSizeMB.toFixed(0)}MB) approaching large threshold`);
      if (report.urgency === 'LOW') report.urgency = 'MEDIUM';
    }

    // Analyze collection sizes
    const collections = await db.listCollections().toArray();
    const largeCollections = [];

    for (const collection of collections) {
      try {
        const collStats = await db.collection(collection.name).stats();
        const collSizeMB = collStats.size / 1024 / 1024;

        if (collSizeMB >= SCALING_THRESHOLDS.LARGE_COLLECTION_SIZE) {
          largeCollections.push({
            name: collection.name,
            size: collSizeMB,
            documents: collStats.count
          });
        }
      } catch (error) {
        // Skip collections that can't be analyzed
        continue;
      }
    }

    if (largeCollections.length > 0) {
      console.log(`   📊 Large collections:`);
      largeCollections.forEach(coll => {
        console.log(`      - ${coll.name}: ${coll.size.toFixed(2)} MB (${coll.documents.toLocaleString()} docs)`);
      });
      report.findings.push(`📊 ${largeCollections.length} collections exceed size thresholds`);
    }

    report.performanceStats = {
      databaseSizeMB: databaseSizeMB.toFixed(2),
      indexSizeMB: indexSizeMB.toFixed(2),
      totalDocuments: stats.objects,
      largeCollections
    };

  } catch (error) {
    console.log(`   ❌ Error analyzing performance: ${error.message}`);
  }
}

async function analyzeDataSize(db, report) {
  console.log('\\n📊 Analyzing data growth patterns...');

  try {
    // Analyze recent growth (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentGrowth = await Promise.all([
      db.collection('workorders').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      db.collection('clients').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      db.collection('users').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      db.collection('tenants').countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    const [newWorkOrders, newClients, newUsers, newTenants] = recentGrowth;

    console.log(`   📈 Growth in last 30 days:`);
    console.log(`      - Work Orders: ${newWorkOrders}`);
    console.log(`      - Clients: ${newClients}`);
    console.log(`      - Users: ${newUsers}`);
    console.log(`      - Tenants: ${newTenants}`);

    // Project growth rate
    const monthlyWorkOrderGrowth = newWorkOrders;
    const projectedAnnualWorkOrders = monthlyWorkOrderGrowth * 12;

    if (projectedAnnualWorkOrders > 50000) {
      report.findings.push(`📈 High growth rate: Projected ${projectedAnnualWorkOrders} work orders annually`);
      if (report.urgency === 'LOW') report.urgency = 'MEDIUM';
    }

    if (newTenants > 10) {
      report.findings.push(`🚀 Rapid tenant growth: ${newTenants} new tenants this month`);
    }

    report.growthStats = {
      monthlyWorkOrders: newWorkOrders,
      monthlyClients: newClients,
      monthlyUsers: newUsers,
      monthlyTenants: newTenants,
      projectedAnnualWorkOrders
    };

  } catch (error) {
    console.log(`   ❌ Error analyzing growth: ${error.message}`);
  }
}

async function analyzeTenantResourceConsumption(db, report) {
  console.log('\\n🔋 Analyzing tenant resource consumption...');

  try {
    // Find resource-heavy tenants
    const resourceConsumption = await db.collection('tenants').aggregate([
      {
        $project: {
          name: 1,
          plan: '$subscription.plan',
          users: '$subscription.usage.currentUsers',
          clients: '$subscription.usage.currentClients',
          workOrders: '$subscription.usage.workOrdersThisMonth',
          storage: '$subscription.usage.storageUsedGB',
          totalScore: {
            $add: [
              { $multiply: ['$subscription.usage.currentUsers', 1] },
              { $multiply: ['$subscription.usage.currentClients', 0.5] },
              { $multiply: ['$subscription.usage.workOrdersThisMonth', 0.1] },
              { $multiply: ['$subscription.usage.storageUsedGB', 2] }
            ]
          }
        }
      },
      { $sort: { totalScore: -1 } },
      { $limit: 10 }
    ]).toArray();

    console.log(`   🏆 Top resource consumers:`);
    resourceConsumption.slice(0, 5).forEach((tenant, index) => {
      console.log(`      ${index + 1}. ${tenant.name} (${tenant.plan}): Score ${tenant.totalScore?.toFixed(1) || 0}`);
    });

    // Check for unbalanced resource usage
    const top20PercentThreshold = Math.ceil(report.tenantStats?.totalTenants * 0.2);
    const heavyUsers = resourceConsumption.slice(0, top20PercentThreshold);

    if (heavyUsers.length > 0 && heavyUsers[0].totalScore > 100) {
      report.findings.push(`⚖️  Resource imbalance: Top 20% of tenants consuming disproportionate resources`);
      if (report.urgency === 'LOW') report.urgency = 'MEDIUM';
    }

    report.resourceStats = {
      topConsumers: resourceConsumption.slice(0, 5),
      resourceImbalance: heavyUsers[0]?.totalScore > 100
    };

  } catch (error) {
    console.log(`   ❌ Error analyzing resource consumption: ${error.message}`);
  }
}

async function analyzeQueryPatterns(db, report) {
  console.log('\\n🔍 Analyzing query patterns...');

  try {
    // This would require MongoDB profiling to be enabled
    // For now, we'll check index usage and provide recommendations

    const collections = ['workorders', 'clients', 'users', 'personnel'];
    const indexAnalysis = [];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();

        const tenantIndexExists = indexes.some(idx =>
          idx.key && Object.keys(idx.key)[0] === 'tenantId'
        );

        indexAnalysis.push({
          collection: collectionName,
          totalIndexes: indexes.length,
          hasTenantIndex: tenantIndexExists,
          indexes: indexes.map(idx => ({
            name: idx.name,
            key: idx.key,
            unique: idx.unique || false
          }))
        });

        if (!tenantIndexExists) {
          report.findings.push(`🔍 Missing tenant index on ${collectionName} collection`);
        }

      } catch (error) {
        continue; // Skip collections that don't exist
      }
    }

    console.log(`   📋 Index analysis completed for ${indexAnalysis.length} collections`);

    report.indexAnalysis = indexAnalysis;

  } catch (error) {
    console.log(`   ❌ Error analyzing queries: ${error.message}`);
  }
}

function generateScalingRecommendations(report) {
  console.log('\\n💡 Generating scaling recommendations...');

  // Clear previous recommendations
  report.recommendations = [];

  switch (report.urgency) {
    case 'CRITICAL':
      report.recommendations.push({
        priority: 'IMMEDIATE',
        action: 'Implement database sharding or hybrid architecture',
        timeline: '1-2 weeks',
        impact: 'HIGH'
      });
      report.recommendations.push({
        priority: 'IMMEDIATE',
        action: 'Move enterprise customers to dedicated databases',
        timeline: '2-4 weeks',
        impact: 'HIGH'
      });
      report.nextReviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week
      break;

    case 'MEDIUM':
      report.recommendations.push({
        priority: 'HIGH',
        action: 'Plan hybrid architecture implementation',
        timeline: '4-8 weeks',
        impact: 'MEDIUM'
      });
      report.recommendations.push({
        priority: 'MEDIUM',
        action: 'Optimize existing database indexes',
        timeline: '1-2 weeks',
        impact: 'LOW'
      });
      report.nextReviewDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
      break;

    default:
      report.recommendations.push({
        priority: 'LOW',
        action: 'Continue monitoring and optimize queries',
        timeline: 'Ongoing',
        impact: 'LOW'
      });
      report.recommendations.push({
        priority: 'LOW',
        action: 'Implement database performance monitoring',
        timeline: '2-4 weeks',
        impact: 'LOW'
      });
  }

  // Add specific recommendations based on findings
  if (report.indexAnalysis?.some(analysis => !analysis.hasTenantIndex)) {
    report.recommendations.push({
      priority: 'MEDIUM',
      action: 'Run database index optimization script',
      timeline: '1 day',
      impact: 'MEDIUM'
    });
  }

  if (report.resourceStats?.resourceImbalance) {
    report.recommendations.push({
      priority: 'MEDIUM',
      action: 'Implement tenant-specific resource limits',
      timeline: '2-3 weeks',
      impact: 'MEDIUM'
    });
  }
}

function outputScalingReport(report) {
  console.log('\\n' + '='.repeat(60));
  console.log('📋 DATABASE SCALING ANALYSIS REPORT');
  console.log('='.repeat(60));

  console.log(`\\n🏗️  Current Architecture: ${report.currentArchitecture}`);
  console.log(`🎯 Recommended Action: ${report.recommendedAction}`);
  console.log(`🚨 Urgency Level: ${report.urgency}`);
  console.log(`📅 Next Review: ${report.nextReviewDate.toLocaleDateString()}`);

  if (report.findings.length > 0) {
    console.log('\\n🔍 KEY FINDINGS:');
    report.findings.forEach(finding => console.log(`   ${finding}`));
  }

  if (report.recommendations.length > 0) {
    console.log('\\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   [${rec.priority}] ${rec.action}`);
      console.log(`               Timeline: ${rec.timeline}, Impact: ${rec.impact}`);
    });
  }

  console.log('\\n📊 SUMMARY STATISTICS:');
  if (report.tenantStats) {
    console.log(`   👥 Total Tenants: ${report.tenantStats.totalTenants}`);
    console.log(`   🏢 Enterprise: ${report.tenantStats.enterpriseCount}`);
    console.log(`   🐘 Large Tenants: ${report.tenantStats.largeTenants}`);
  }
  if (report.performanceStats) {
    console.log(`   💾 Database Size: ${report.performanceStats.databaseSizeMB} MB`);
    console.log(`   📄 Total Documents: ${report.performanceStats.totalDocuments.toLocaleString()}`);
  }

  console.log('\\n📋 NEXT STEPS:');
  console.log('   1. Review and prioritize recommendations');
  console.log('   2. Plan implementation timeline');
  console.log('   3. Set up regular monitoring');
  console.log(`   4. Schedule next review for ${report.nextReviewDate.toLocaleDateString()}`);

  console.log('\\n' + '='.repeat(60));
}

// Script execution
if (require.main === module) {
  analyzeScalingNeeds()
    .then(() => {
      console.log('\\n🎉 Database scaling analysis completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n💥 Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeScalingNeeds, SCALING_THRESHOLDS };