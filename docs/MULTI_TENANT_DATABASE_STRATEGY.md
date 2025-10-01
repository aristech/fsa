# Multi-Tenant Database Scaling Strategy for FSA

## Current Architecture Analysis

**Current Setup: Single Database, Shared Schema**
- ✅ Single MongoDB instance (`MONGODB_URI`)
- ✅ All models include `tenantId` field for isolation
- ✅ Application-level tenant filtering on all queries
- ✅ 4 subscription tiers: Free, Basic, Premium, Enterprise

## 🎯 Recommended Scaling Strategy: **Progressive Multi-Tenant Architecture**

Based on your FSA application characteristics, I recommend a **hybrid approach** that evolves with your business:

### Phase 1: **Enhanced Shared Database** (0-100 tenants)
*Continue current approach with optimizations*

**Keep your current setup** but add these enhancements:

#### Database Optimizations:
```javascript
// Enhanced indexes for tenant isolation
db.workorders.createIndex({ "tenantId": 1, "status": 1, "createdAt": -1 })
db.clients.createIndex({ "tenantId": 1, "isActive": 1 })
db.users.createIndex({ "tenantId": 1, "role": 1 })

// Compound indexes for common queries
db.workorders.createIndex({ "tenantId": 1, "clientId": 1, "status": 1 })
```

#### Connection Pooling:
```javascript
// Enhanced MongoDB connection
const mongooseOptions = {
  maxPoolSize: 50,        // Increased pool size
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false,
};
```

**Pros:**
- ✅ Low operational overhead
- ✅ Cost-effective
- ✅ Simple backup/maintenance
- ✅ Easy cross-tenant analytics

**Cons:**
- ⚠️ Single point of failure
- ⚠️ Noisy neighbor issues
- ⚠️ Limited isolation for enterprise clients

---

### Phase 2: **Tenant Tiering Strategy** (100-1000 tenants)
*Separate high-value tenants*

#### Implementation:
```javascript
// Database routing based on subscription tier
const getDatabaseConnection = (tenantPlan) => {
  switch (tenantPlan) {
    case 'enterprise':
      return `mongodb://enterprise-cluster/${tenantId}`;
    case 'premium':
      return process.env.PREMIUM_MONGODB_URI;
    default:
      return process.env.SHARED_MONGODB_URI;
  }
};
```

#### Tenant Distribution:
- **Enterprise customers**: Dedicated database per tenant
- **Premium customers**: Dedicated database (multiple tenants)
- **Basic/Free customers**: Shared database (current approach)

**Migration Strategy:**
```bash
# Script to migrate enterprise tenant to dedicated DB
./scripts/migrate-tenant-to-dedicated-db.sh --tenant=enterprise-client-123
```

---

### Phase 3: **Full Database-Per-Tenant** (1000+ tenants)
*For mature, high-scale operations*

## 📊 Detailed Architecture Comparison

### 1. **Single Database, Shared Schema** (Current)

**Best For:** Your current stage (0-100 tenants)

**Implementation:**
```javascript
// Current approach - keep this for Free/Basic plans
const workOrders = await WorkOrder.find({
  tenantId: req.user.tenantId,
  status: 'active'
});
```

**Characteristics:**
- 💰 **Cost**: Very low ($200-500/month for 100 tenants)
- 🔧 **Complexity**: Low
- 🚀 **Performance**: Good until ~100 tenants
- 🔒 **Security**: Application-level isolation
- 📈 **Scaling**: Limited by single database

---

### 2. **Database Per Tenant**

**Best For:** Enterprise customers, compliance-heavy industries

**Implementation:**
```javascript
// Dynamic database connection per tenant
class TenantDatabaseManager {
  static getConnection(tenantId) {
    const dbName = `fsa_tenant_${tenantId}`;
    return mongoose.createConnection(`mongodb://cluster/${dbName}`);
  }

  static async getTenantModels(tenantId) {
    const connection = this.getConnection(tenantId);
    return {
      WorkOrder: connection.model('WorkOrder', workOrderSchema),
      Client: connection.model('Client', clientSchema),
      User: connection.model('User', userSchema)
    };
  }
}
```

**Characteristics:**
- 💰 **Cost**: High ($50-100 per tenant per month)
- 🔧 **Complexity**: High
- 🚀 **Performance**: Excellent
- 🔒 **Security**: Complete database-level isolation
- 📈 **Scaling**: Horizontal scaling per tenant

---

### 3. **Hybrid Approach** (Recommended)

**Implementation Architecture:**

```javascript
// Tenant routing based on subscription plan
class DatabaseRouter {
  static async getModels(tenantId, subscriptionPlan) {
    switch (subscriptionPlan) {
      case 'enterprise':
        return await this.getEnterpriseModels(tenantId);
      case 'premium':
        return await this.getPremiumModels(tenantId);
      default:
        return await this.getSharedModels(tenantId);
    }
  }

  private static async getEnterpriseModels(tenantId) {
    // Dedicated database per enterprise tenant
    const connection = mongoose.createConnection(
      `mongodb://enterprise-cluster/fsa_${tenantId}`
    );
    return this.createModels(connection);
  }

  private static async getPremiumModels(tenantId) {
    // Shared premium database (5-10 tenants per DB)
    const shardKey = this.getPremiumShard(tenantId);
    const connection = mongoose.createConnection(
      `mongodb://premium-cluster/fsa_premium_${shardKey}`
    );
    return this.createModels(connection);
  }

  private static async getSharedModels(tenantId) {
    // Current shared database approach
    return {
      WorkOrder: WorkOrder,
      Client: Client,
      User: User
    };
  }
}
```

## 🎯 **Specific Recommendations for Your FSA Application**

### **Immediate Actions (Next 3 months):**

1. **Optimize Current Database:**
   ```javascript
   // Add these indexes immediately
   db.workorders.createIndex({ "tenantId": 1, "status": 1, "dueDate": 1 })
   db.clients.createIndex({ "tenantId": 1, "name": "text" })
   db.fileMetadata.createIndex({ "tenantId": 1, "fileType": 1 })
   ```

2. **Implement Database Health Monitoring:**
   ```javascript
   // Add to your monitoring dashboard
   const getDatabaseMetrics = async () => {
     const stats = await mongoose.connection.db.stats();
     const tenantCounts = await Tenant.aggregate([
       { $group: { _id: "$subscription.plan", count: { $sum: 1 } } }
     ]);
     return { stats, tenantCounts };
   };
   ```

3. **Add Tenant Data Limits:**
   ```javascript
   // Prevent runaway tenants from affecting others
   const TENANT_QUERY_LIMITS = {
     free: { workOrders: 100, clients: 50 },
     basic: { workOrders: 500, clients: 200 },
     premium: { workOrders: 2000, clients: 1000 },
     enterprise: { workOrders: -1, clients: -1 } // unlimited
   };
   ```

### **Medium-term Evolution (6-12 months):**

1. **Implement Enterprise Tenant Separation:**
   - Move enterprise customers to dedicated databases
   - Implement tenant migration scripts
   - Add database routing logic

2. **Geographic Distribution:**
   ```javascript
   // Route by geographic region for performance
   const getRegionalDatabase = (tenantLocation) => {
     const regions = {
       'EU': process.env.EU_MONGODB_URI,
       'US': process.env.US_MONGODB_URI,
       'ASIA': process.env.ASIA_MONGODB_URI
     };
     return regions[tenantLocation] || process.env.DEFAULT_MONGODB_URI;
   };
   ```

### **Long-term Architecture (12+ months):**

1. **Full Multi-Database Support**
2. **Automated Tenant Migration**
3. **Database Sharding by Tenant Size**
4. **Real-time Analytics Across Databases**

## 🚨 **Critical Considerations for FSA Applications**

### **Data Relationships:**
Your FSA app has complex relationships (WorkOrders → Clients → Personnel → Tasks). Database-per-tenant makes cross-tenant analytics harder but provides better isolation.

### **File Storage Integration:**
Your file storage solution should align with database strategy:
```javascript
// File storage routing by tenant tier
const getFileStorage = (tenantPlan) => {
  switch (tenantPlan) {
    case 'enterprise':
      return `s3://enterprise-bucket/${tenantId}/`;
    case 'premium':
      return `s3://premium-bucket/${tenantId}/`;
    default:
      return `/var/lib/fsa-uploads/${tenantId}/`;
  }
};
```

### **Backup Strategy:**
```bash
# Different backup strategies per tier
# Enterprise: Real-time replication + daily snapshots
# Premium: 4-hour snapshots
# Basic/Free: Daily backups
```

## 💡 **Decision Framework**

**Stay with Shared Database if:**
- ✅ You have < 50 active tenants
- ✅ Most tenants are Free/Basic plan
- ✅ No strict compliance requirements
- ✅ Limited ops team

**Move to Hybrid if:**
- ✅ You have > 10 Enterprise customers
- ✅ Enterprise customers need compliance isolation
- ✅ You have performance issues with large tenants
- ✅ You need geographical distribution

**Go Database-per-Tenant if:**
- ✅ You have > 1000 tenants
- ✅ Strong ops team and infrastructure
- ✅ High revenue per tenant ($500+/month)
- ✅ Strict regulatory requirements

## 📈 **Migration Path**

### **Phase 1 → Phase 2 Migration:**
```bash
# 1. Create enterprise database
# 2. Export tenant data
# 3. Import to new database
# 4. Update routing logic
# 5. Verify and switch over
# 6. Clean up old data

./scripts/migrate-enterprise-tenant.sh --tenant=big-client-123
```

### **Cost Analysis:**

| Architecture | Setup Cost | Monthly Cost (100 tenants) | Ops Overhead |
|--------------|------------|---------------------------|---------------|
| Shared DB    | $0         | $300                      | Low           |
| Hybrid       | $5,000     | $800                      | Medium        |
| Per-Tenant   | $15,000    | $3,000                    | High          |

## 🎯 **Final Recommendation**

**For your current stage:** Keep the shared database approach but implement the optimizations above.

**Start planning hybrid approach** when you hit any of these thresholds:
- 🎯 10+ Enterprise customers
- 🎯 Database queries > 100ms average
- 🎯 Storage > 100GB
- 🎯 Customer requests for data isolation

Your current architecture is actually **perfect for your stage**. Focus on optimizing it rather than premature over-engineering!