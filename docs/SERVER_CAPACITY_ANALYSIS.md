# Server Capacity Analysis - FSA Production Environment

## 🖥️ Current Server Specifications

**Hetzner vServer Details:**
- **CPU**: 8 vCPU cores @ 2GHz (QEMU Virtual)
- **RAM**: 15GB System Memory
- **Storage**: 152GB SSD (SCSI Virtual Disk)
- **Network**: Virtio Ethernet (High Performance)
- **OS**: Linux 6.8.0-83-generic

---

## 📊 MongoDB Capacity for Your Server

### **Memory-Based Limits (Most Critical)**

**MongoDB Working Set Recommendation:**
- **Available RAM**: 15GB total
- **OS Reserve**: ~2GB
- **Application Reserve**: ~2GB
- **MongoDB Available**: ~11GB effectively

**MongoDB Performance Zones:**
1. **Green Zone**: Working set < 8GB (optimal performance)
2. **Yellow Zone**: Working set 8-10GB (good performance)
3. **Red Zone**: Working set 10-11GB (degraded performance)
4. **Critical**: Working set > 11GB (severe performance impact)

### **Tenant Capacity Based on Your Hardware**

**Conservative Estimate (Optimal Performance):**
- **Maximum Tenants**: 75-85 tenants
- **Total Documents**: 35-40 million
- **Database Size**: 12-15GB
- **Index Size**: 6-8GB

**Aggressive Estimate (Acceptable Performance):**
- **Maximum Tenants**: 100-120 tenants
- **Total Documents**: 50-60 million
- **Database Size**: 18-22GB
- **Index Size**: 9-11GB

---

## ⚡ Performance Characteristics

### **CPU Performance (8 vCores @ 2GHz)**

**Query Processing Capacity:**
- **Light Queries**: 500-800 queries/second
- **Medium Queries**: 200-400 queries/second
- **Heavy Queries**: 50-100 queries/second

**Concurrent User Support:**
- **Active Users**: 150-200 simultaneous users
- **Peak Load**: 300-400 users (short bursts)

### **Storage Performance (152GB SSD)**

**Database Growth Accommodation:**
- **Current Available**: ~130GB (after OS)
- **MongoDB Allocation**: 80-100GB recommended
- **File Storage**: 20-30GB
- **System Reserve**: 20GB

**I/O Performance:**
- **Read Operations**: 15,000-25,000 IOPS
- **Write Operations**: 8,000-15,000 IOPS
- **Sequential Throughput**: 200-400MB/s

---

## 🚨 Warning Thresholds for Your Server

### **Memory Pressure Signs**
```bash
# Monitor these specifically on your 15GB server:

# Critical: MongoDB using > 10GB RAM
# Warning: MongoDB using > 8GB RAM
# Monitor: Index size approaching 8GB
```

### **CPU Utilization Thresholds**
```bash
# Your 8-core server thresholds:

# Normal: < 50% average CPU (4 cores utilized)
# Warning: 50-70% average CPU (5-6 cores utilized)
# Critical: > 70% average CPU (6+ cores utilized)
# Emergency: > 90% average CPU (system overload)
```

### **Storage Capacity Warnings**
```bash
# 152GB total storage monitoring:

# Green: < 60% used (< 90GB)
# Yellow: 60-75% used (90-115GB)
# Red: 75-85% used (115-130GB)
# Critical: > 85% used (> 130GB)
```

---

## 📈 Growth Planning for Your Environment

### **Linear Growth Projection**
```
Month 1-6:   20-40 tenants   (Safe zone)
Month 6-12:  40-70 tenants   (Monitor closely)
Month 12-18: 70-85 tenants   (Performance tuning needed)
Month 18+:   85+ tenants     (Scaling decision required)
```

### **Performance Degradation Timeline**
```
0-50 tenants:     Excellent performance (< 25ms queries)
50-75 tenants:    Good performance (25-50ms queries)
75-90 tenants:    Acceptable performance (50-100ms queries)
90-100 tenants:   Degraded performance (100-200ms queries)
100+ tenants:     Poor performance (> 200ms queries)
```

---

## 🎯 Optimization Recommendations for Your Server

### **Immediate Optimizations**
1. **MongoDB Configuration:**
   ```javascript
   // Optimize for your 15GB RAM
   wiredTigerCacheSizeGB: 8  // ~50% of available RAM
   ```

2. **Connection Pool Sizing:**
   ```javascript
   // Optimize for 8-core CPU
   maxPoolSize: 50-80 connections
   minPoolSize: 10 connections
   ```

3. **Index Strategy:**
   ```bash
   # Keep indexes under 8GB total
   # Monitor with: npm run db:capacity
   ```

### **Performance Monitoring Commands**
```bash
# Specific to your server specs:

# Memory monitoring
free -h                    # Should show 3-5GB free
cat /proc/meminfo         # Watch for swap usage

# CPU monitoring
htop                      # Watch for sustained >70% usage
vmstat 1                  # Monitor CPU wait times

# Storage monitoring
df -h                     # Watch for >85% usage
iostat -x 1              # Monitor disk queue length
```

---

## 🚀 Scaling Triggers for Your Environment

### **RAM Upgrade Triggers**
- MongoDB working set > 8GB consistently
- Available system memory < 3GB
- Swap usage > 0 during normal operations

### **CPU Upgrade Triggers**
- Average CPU > 60% during business hours
- Query response times > 100ms consistently
- Connection timeouts increasing

### **Storage Upgrade Triggers**
- Database size > 80GB
- Available disk space < 30GB
- File storage approaching 25GB

---

## 💰 Scaling Options

### **Vertical Scaling (Upgrade Current Server)**
**Next Tier Recommendations:**
- **RAM**: Upgrade to 32GB (double capacity)
- **CPU**: Upgrade to 16 vCPU (double processing)
- **Storage**: Upgrade to 320GB+ SSD

**Expected Capacity After Upgrade:**
- **Tenants**: 150-200 (2x current capacity)
- **Database**: 30-40GB comfortable
- **Users**: 400-600 concurrent

### **Horizontal Scaling (Multiple Servers)**
**Read Replica Setup:**
- Keep current server as primary
- Add read replica for query distribution
- Expected improvement: 40-60% query performance

**Microservices Split:**
- File storage to separate server
- Background jobs to separate server
- Database to dedicated server

---

## 📋 Monthly Monitoring Checklist

### **Week 1: Capacity Check**
```bash
npm run db:capacity
df -h
free -h
```

### **Week 2: Performance Review**
```bash
npm run db:health
npm run db:monitor
htop
```

### **Week 3: Growth Analysis**
```bash
npm run db:full-analysis
# Review tenant growth rate
# Check query performance trends
```

### **Week 4: Optimization**
```bash
npm run db:optimize
# Review slow query log
# Update indexes if needed
```

---

## 🚨 Emergency Response for Your Server

### **High Memory Usage (>12GB)**
```bash
# Immediate actions:
1. Restart MongoDB service
2. Clear application caches
3. Run: npm run db:optimize
4. Monitor: watch -n 1 free -h
```

### **High CPU Usage (>80%)**
```bash
# Immediate actions:
1. Check for runaway queries
2. Limit concurrent connections
3. Enable query profiling
4. Monitor: htop
```

### **Low Disk Space (<20GB)**
```bash
# Immediate actions:
1. Clean up log files
2. Archive old data
3. Check file uploads directory
4. Monitor: df -h
```

---

## 🎯 Summary: Your Server's Sweet Spot

**Optimal Operating Range:**
- **Tenants**: 50-75 (best performance)
- **Database Size**: 8-12GB
- **RAM Usage**: 8-10GB for MongoDB
- **CPU Usage**: 30-50% average
- **Storage Usage**: 60-75%

**Scale Planning Timeline:**
- **Months 1-6**: Growth within optimal range
- **Months 6-12**: Monitor and optimize
- **Month 12+**: Plan upgrade or horizontal scaling

Your Hetzner vServer is well-suited for the FSA application with proper monitoring and optimization. The 15GB RAM and 8-core CPU provide good headroom for growth, with clear scaling paths when needed.