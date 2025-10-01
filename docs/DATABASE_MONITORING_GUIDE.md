# Database Performance Monitoring Guide - FSA Application

## 🚨 Early Warning Signs Your Database is Reaching Limits

This guide helps you identify performance issues **before** they impact your users. Monitor these signs regularly to stay ahead of scaling needs.

---

## 🎯 **Quick Health Check Commands**

```bash
# Run these monthly to monitor database health
cd apps/backend

# Complete health check
npm run db:health

# Full analysis (capacity + scaling + optimization)
npm run db:full-analysis

# Quick capacity check
npm run db:capacity
```

---

## ⚠️ **WARNING SIGNS (Act Within 1-2 Weeks)**

### 📊 **Capacity Warnings:**
- **75+ tenants** (approaching 100 tenant sweet spot)
- **15+ GB database size** (approaching 32GB MongoDB limit)
- **10M+ total documents** (approaching 50M MongoDB limit)
- **500+ MB index size** (approaching RAM limits)

### ⚡ **Performance Warnings:**
- **50+ ms average query time** (should be <25ms)
- **10+ slow queries per hour** (queries >50ms)
- **70%+ connection pool usage** (connection pressure)
- **60%+ index size vs available RAM** (memory pressure)

### 📈 **Growth Rate Warnings:**
- **20%+ monthly database growth** (unsustainable)
- **5+ new tenants per week** (rapid growth)
- **10,000+ new documents daily** (high creation rate)

---

## 🚨 **CRITICAL SIGNS (Immediate Action Required)**

### 💥 **Critical Capacity:**
- **90+ tenants** (emergency scaling needed)
- **25+ GB database size** (near hard limits)
- **30M+ total documents** (performance cliff)
- **650+ MB index size** (memory exhaustion)

### 🐌 **Critical Performance:**
- **100+ ms average query time** (users notice slowness)
- **50+ slow queries per hour** (significant degradation)
- **90%+ connection pool usage** (connection failures)
- **80%+ index size vs RAM** (swapping to disk)

### 🚀 **Critical Growth:**
- **50%+ monthly growth** (exponential pattern)
- **15+ new tenants per week** (explosive growth)
- **50,000+ new documents daily** (system overload)

---

## 🔍 **What to Monitor Daily/Weekly**

### **Daily Checks (Automated):**
1. **Query Response Times**
   ```bash
   # Look for queries > 100ms
   # Should be < 25ms for good UX
   ```

2. **Connection Pool Usage**
   ```bash
   # Should be < 70% utilization
   # High usage = connection pressure
   ```

3. **Error Rates**
   ```bash
   # Watch for timeout errors
   # Database connection failures
   ```

### **Weekly Checks (Manual):**
1. **Tenant Growth Rate**
   ```bash
   npm run db:health  # Shows weekly tenant additions
   ```

2. **Document Creation Rate**
   ```bash
   # Monitor work orders, tasks, time entries
   # Sudden spikes indicate heavy usage
   ```

3. **Storage Growth**
   ```bash
   # Track GB growth per week
   # Plan capacity accordingly
   ```

### **Monthly Checks (Detailed):**
1. **Full Health Analysis**
   ```bash
   npm run db:full-analysis
   ```

2. **Capacity Planning Review**
   ```bash
   npm run db:capacity
   ```

3. **Index Optimization**
   ```bash
   npm run db:optimize
   ```

---

## 📈 **User Experience Impact Levels**

### **Green Zone (Healthy):**
- ✅ Queries < 50ms
- ✅ Pages load instantly
- ✅ No user complaints
- ✅ < 75 tenants

### **Yellow Zone (Warning):**
- ⚠️ Queries 50-100ms
- ⚠️ Slight lag noticeable
- ⚠️ Occasional slowness
- ⚠️ 75-90 tenants

### **Red Zone (Critical):**
- 🚨 Queries > 100ms
- 🚨 Users notice delays
- 🚨 Complaints about speed
- 🚨 90+ tenants

### **Emergency Zone (User Impact):**
- 💥 Queries > 500ms
- 💥 Timeouts and errors
- 💥 Users can't work
- 💥 System failures

---

## 🔧 **Specific Signs by Feature**

### **Work Order Management:**
**Warning Signs:**
- Work order list takes >2 seconds to load
- Creating work orders feels sluggish
- Search results are slow to appear

**Critical Signs:**
- Work order list fails to load
- Timeouts when creating work orders
- Search functionality breaks

### **Task Management:**
**Warning Signs:**
- Kanban board loads slowly
- Drag-and-drop feels laggy
- Task updates take >1 second

**Critical Signs:**
- Kanban board times out
- Task updates fail
- Real-time updates stop working

### **Client Management:**
**Warning Signs:**
- Client list pagination is slow
- Client search is laggy
- Client details load slowly

**Critical Signs:**
- Client list won't load
- Search returns errors
- Client creation fails

### **File Uploads:**
**Warning Signs:**
- File metadata queries slow
- Upload processing delayed
- File listings load slowly

**Critical Signs:**
- File uploads fail
- Metadata queries timeout
- File serving errors

---

## 🎯 **MongoDB-Specific Warning Signs**

### **Collection-Level Issues:**
```bash
# Check for these in MongoDB logs:

# Slow query warnings
"Slow query: { ... }"

# Index size warnings
"Index size exceeds available memory"

# Connection warnings
"Connection pool exhausted"

# Storage warnings
"Collection approaching size limit"
```

### **Server-Level Issues:**
```bash
# Monitor these MongoDB metrics:

# Memory usage > 80%
"Memory usage: high"

# Disk I/O saturation
"Disk queue length: high"

# CPU usage > 90%
"CPU usage: sustained high"

# Network saturation
"Network bandwidth: saturated"
```

---

## 📊 **Monitoring Dashboard Metrics**

### **Essential Metrics to Track:**

1. **Response Time Percentiles:**
   - p50 (median): < 25ms
   - p95: < 100ms
   - p99: < 500ms

2. **Throughput Metrics:**
   - Queries per second
   - Documents created per hour
   - Active connections

3. **Resource Utilization:**
   - CPU usage < 70%
   - Memory usage < 80%
   - Disk usage < 85%

4. **Error Rates:**
   - Query timeout rate < 0.1%
   - Connection failure rate < 0.01%
   - Document write failure rate < 0.01%

---

## 🎛️ **Setting Up Monitoring**

### **Application-Level Monitoring:**
```javascript
// Add to your route handlers
const startTime = Date.now();
// ... perform database operation
const queryTime = Date.now() - startTime;

if (queryTime > 100) {
  console.warn(`Slow query: ${queryTime}ms`);
}

// Log slow operations
if (queryTime > 500) {
  console.error(`Critical slow query: ${queryTime}ms`);
}
```

### **Database-Level Monitoring:**
```bash
# Enable MongoDB profiling for slow query detection
db.setProfilingLevel(1, { slowms: 100 })

# Monitor with built-in tools
mongostat --host localhost:27017
mongotop --host localhost:27017
```

### **Infrastructure Monitoring:**
```bash
# System resource monitoring
htop          # CPU and memory
iotop         # Disk I/O
netstat -i    # Network usage
df -h         # Disk space
```

---

## 🚨 **Alert Thresholds to Set Up**

### **Immediate Alerts (SMS/Slack):**
- Average query time > 500ms for 5 minutes
- Error rate > 1% for 2 minutes
- CPU usage > 90% for 5 minutes
- Memory usage > 95% for 2 minutes
- Disk space > 90% used

### **Warning Alerts (Email):**
- Average query time > 100ms for 15 minutes
- Tenant count > 75
- Database size > 15GB
- Index size > 500MB
- Monthly growth rate > 30%

### **Planning Alerts (Daily Summary):**
- Weekly tenant growth > 5
- Daily document creation > 10,000
- Collection approaching 10M documents
- Storage approaching 25GB

---

## 🔄 **Response Procedures**

### **When Warning Signs Appear:**
1. **Immediate (Same Day):**
   - Run `npm run db:health` to assess
   - Check recent tenant additions
   - Review query performance logs

2. **Short Term (Within Week):**
   - Run `npm run db:optimize`
   - Plan capacity scaling
   - Review heavy tenants for isolation

3. **Medium Term (Within Month):**
   - Implement recommended optimizations
   - Plan architecture changes
   - Set up enhanced monitoring

### **When Critical Signs Appear:**
1. **Emergency Response (Within Hours):**
   - Scale infrastructure immediately
   - Implement query limits
   - Contact hosting provider

2. **Crisis Management (Same Day):**
   - Implement emergency tenant separation
   - Archive old data aggressively
   - Communicate with affected users

3. **Recovery (Within Week):**
   - Implement permanent scaling solution
   - Review and improve monitoring
   - Post-incident analysis

---

## 📞 **Escalation Procedures**

### **Level 1 - Development Team:**
- Query times 50-100ms
- 75-90 tenants
- Growth rate 20-30%

### **Level 2 - Technical Leadership:**
- Query times 100-500ms
- 90+ tenants
- Growth rate 30-50%

### **Level 3 - Emergency Response:**
- Query times > 500ms
- System failures
- User-impacting outages

---

## 📚 **Additional Resources**

### **MongoDB Documentation:**
- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [MongoDB Monitoring](https://docs.mongodb.com/manual/administration/monitoring/)

### **Your FSA Monitoring Scripts:**
- `npm run db:health` - Real-time health check
- `npm run db:capacity` - Capacity analysis
- `npm run db:monitor` - Scaling recommendations
- `npm run db:optimize` - Performance optimization

### **External Monitoring Services:**
- **MongoDB Atlas** (built-in monitoring)
- **DataDog** (comprehensive monitoring)
- **New Relic** (application performance)
- **Grafana + Prometheus** (open source)

---

**Remember:** The key to successful scaling is **proactive monitoring**. Don't wait for users to complain about performance - monitor these signs regularly and act on warnings before they become critical issues! 🎯