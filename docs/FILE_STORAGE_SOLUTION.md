# File Storage Solution for Production Deployments

## Problem

Files uploaded by users were being deleted during deployments because:

1. **Local Storage**: Files were stored in `apps/backend/uploads/` within the application directory
2. **CI/CD Overwrite**: The deployment process copies only Git repository contents, excluding the `uploads/` directory
3. **No Persistence**: Each deployment created a fresh application directory, losing all uploaded files

## Solution

### 🔒 Persistent Storage with Symbolic Links

We've implemented a production-grade solution that separates user data from application code:

```
/var/lib/fsa-uploads/                    # Persistent storage (survives deployments)
    ├── tenant1/
    │   ├── work_orders/
    │   ├── reports/
    │   └── branding/
    └── tenant2/
        └── ...

/var/www/progressnet.io-app/apps/backend/uploads  # Symlink to persistent storage
```

### 🛠️ Implementation Components

#### 1. **Updated CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)

- **Backup Strategy**: Creates timestamped backups before each deployment
- **Migration Logic**: Automatically migrates existing uploads to persistent storage
- **Symlink Creation**: Creates symbolic link from app directory to persistent storage
- **Rollback Safety**: Preserves uploads even during failed deployments

#### 2. **Setup Script** (`scripts/setup-persistent-storage.sh`)

Run this **once** on your production server to set up persistent storage:

```bash
# On your production server
sudo ./scripts/setup-persistent-storage.sh
```

This script:
- Creates `/var/lib/fsa-uploads` with proper permissions
- Migrates existing uploads to persistent storage
- Sets up symbolic links
- Adds maintenance scripts and cron jobs

#### 3. **Maintenance Features**

- **Weekly Cleanup**: Automatic cron job for file maintenance
- **Permission Management**: Ensures correct file permissions
- **Backup Retention**: Keeps 5 most recent deployment backups

## 🚀 Deployment Instructions

### Step 1: Initial Setup (One-time)

On your production server, run:

```bash
# Navigate to your application directory
cd /var/www/progressnet.io-app

# Run the setup script
sudo ./scripts/setup-persistent-storage.sh
```

### Step 2: Deploy Updated CI/CD

Your updated CI/CD pipeline will automatically:

1. ✅ Create backups of current uploads
2. ✅ Set up persistent storage directory
3. ✅ Migrate any existing files
4. ✅ Create symbolic links in the new deployment
5. ✅ Preserve files across all future deployments

### Step 3: Verify Setup

After deployment, verify the setup:

```bash
# Check that uploads directory is a symlink
ls -la /var/www/progressnet.io-app/apps/backend/uploads
# Should show: uploads -> /var/lib/fsa-uploads

# Check persistent storage
ls -la /var/lib/fsa-uploads
# Should show your uploaded files organized by tenant

# Test file upload through your application
# Files should appear in /var/lib/fsa-uploads/
```

## 🔍 Benefits

### ✅ **File Persistence**
- Files survive all deployments and server restarts
- No more data loss during CI/CD operations

### ✅ **Backup Safety**
- Automatic backups before each deployment
- Multiple recovery points available

### ✅ **Performance**
- No file copying during deployments (just symlink creation)
- Faster deployment times

### ✅ **Maintenance**
- Automated cleanup and permission management
- Clear separation of code and data

### ✅ **Scalability Ready**
- Easy to migrate to object storage (S3, etc.) later
- Centralized file management

## 🛡️ Security & Permissions

```bash
# Persistent storage ownership
chown -R $USER:www-data /var/lib/fsa-uploads

# Directory permissions (755 = read/write/execute for owner, read/execute for group)
chmod -R 755 /var/lib/fsa-uploads

# File permissions (644 = read/write for owner, read for group)
find /var/lib/fsa-uploads -type f -exec chmod 644 {} \;
```

## 🔄 Recovery Procedures

### If Files Are Missing After Deployment

1. **Check Symlink**:
   ```bash
   ls -la /var/www/progressnet.io-app/apps/backend/uploads
   ```

2. **Check Persistent Storage**:
   ```bash
   ls -la /var/lib/fsa-uploads
   ```

3. **Restore from Backup**:
   ```bash
   # Find latest backup
   sudo find /var/backups -name "fsa-*" -type d | sort -r | head -1

   # Restore uploads
   BACKUP_DIR="[path_from_above]"
   sudo cp -r "$BACKUP_DIR/uploads-only"/* /var/lib/fsa-uploads/
   ```

### If Deployment Fails

The CI/CD pipeline includes automatic rollback that preserves uploads:

1. Restores previous application version
2. Maintains uploads symlink
3. Falls back to backup if needed

## 🎯 Future Enhancements

Consider these improvements for even better file management:

1. **Object Storage Migration**: Move to AWS S3 or similar for better scalability
2. **CDN Integration**: Add CloudFront for faster file delivery
3. **File Cleanup**: Implement database-driven orphaned file cleanup
4. **Monitoring**: Add file storage monitoring and alerts
5. **Encryption**: Add at-rest encryption for sensitive files

## 📊 Monitoring

Monitor your file storage health:

```bash
# Check disk usage
df -h /var/lib/fsa-uploads

# Check recent file activity
find /var/lib/fsa-uploads -type f -mtime -7 -exec ls -la {} \;

# View maintenance logs
tail -f /var/log/fsa-file-maintenance.log
```

---

**Result**: Your uploaded files will now persist across all deployments, with automatic backups and recovery procedures in place! 🎉