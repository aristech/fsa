# Uploads Directory Deletion Fix

**Issue:** File uploads being deleted on every deployment
**Status:** ✅ FIXED
**Date:** 2025-10-02

---

## Problem Analysis

### Root Causes

1. **Deployment Script Flaw (Primary Issue)**
   - Location: `.github/workflows/ci-cd.yml:187-215`
   - The deployment script was copying the repo to a new directory, which could include an empty `uploads` folder
   - The symlink was created AFTER the copy, potentially overwriting existing data
   - Migration logic only checked the OLD deployment, not properly handling the persistent storage

2. **Gitignore Pattern**
   - `.gitignore:39` has `**/*uploads/*` which correctly ignores uploads content
   - However, the pattern allows the empty directory to be created during development

3. **Missing Safeguards**
   - No verification that the symlink was created successfully
   - No file count reporting to track upload persistence
   - Unclear migration path from directory → symlink

---

## Solution Implemented

### Changes to CI/CD Pipeline

**File:** `.github/workflows/ci-cd.yml`

#### 1. Improved Persistent Storage Setup (Lines 193-229)

**Before:**
```bash
# Created symlink but didn't properly handle existing uploads
ln -sf "$PERSISTENT_STORAGE" /var/www/progressnet.io-app-new/apps/backend/uploads
```

**After:**
```bash
# 🔒 SETUP PERSISTENT FILE STORAGE
PERSISTENT_STORAGE="/var/lib/fsa-uploads"

# Ensure persistent storage directory exists with proper permissions
sudo mkdir -p "$PERSISTENT_STORAGE"
sudo chown -R $USER:www-data "$PERSISTENT_STORAGE"
sudo chmod -R 775 "$PERSISTENT_STORAGE"  # Changed from 755 to 775 for write access

# ONE-TIME MIGRATION: Move uploads from old deployment to persistent storage
if [ -d "/var/www/progressnet.io-app/apps/backend/uploads" ] && [ ! -L "/var/www/progressnet.io-app/apps/backend/uploads" ]; then
  echo "🔄 Found old uploads directory (not a symlink) - migrating to persistent storage..."
  sudo cp -rn /var/www/progressnet.io-app/apps/backend/uploads/* "$PERSISTENT_STORAGE/" 2>/dev/null || true
  echo "✅ Old uploads migrated to persistent storage"
fi

# Count files in persistent storage for verification
UPLOAD_COUNT=$(sudo find "$PERSISTENT_STORAGE" -type f 2>/dev/null | wc -l)
echo "📊 Persistent storage contains $UPLOAD_COUNT files"

# Remove any uploads directory that was copied from git repo
rm -rf /var/www/progressnet.io-app-new/apps/backend/uploads

# Create symlink in new deployment to persistent storage
mkdir -p /var/www/progressnet.io-app-new/apps/backend
ln -sf "$PERSISTENT_STORAGE" /var/www/progressnet.io-app-new/apps/backend/uploads
echo "✅ Uploads symlinked: /var/www/progressnet.io-app-new/apps/backend/uploads -> $PERSISTENT_STORAGE"

# Verify symlink
if [ -L "/var/www/progressnet.io-app-new/apps/backend/uploads" ]; then
  echo "✅ Symlink verified successfully"
  ls -lah /var/www/progressnet.io-app-new/apps/backend/uploads
else
  echo "❌ ERROR: Symlink creation failed!"
  exit 1
fi
```

**Key Improvements:**
- ✅ Removes any uploads directory copied from git BEFORE creating symlink
- ✅ Verifies symlink creation and fails deployment if it fails
- ✅ Reports file count for monitoring
- ✅ Proper permissions (775 instead of 755) for write access
- ✅ One-time migration from old directory structure

#### 2. Updated Rollback Logic (Lines 368-389)

**Before:**
```bash
# Tried to restore uploads from backup to app directory
sudo mkdir -p /var/www/progressnet.io-app/apps/backend/uploads
sudo cp -r $LATEST_BACKUP/uploads-only/* /var/www/progressnet.io-app/apps/backend/uploads/
```

**After:**
```bash
# NOTE: Uploads are in persistent storage (/var/lib/fsa-uploads) and are not affected by deployment
# They should already be intact, but verify they're accessible
PERSISTENT_STORAGE="/var/lib/fsa-uploads"
if [ -d "$PERSISTENT_STORAGE" ]; then
  UPLOAD_COUNT=$(sudo find "$PERSISTENT_STORAGE" -type f 2>/dev/null | wc -l)
  echo "✅ Persistent uploads storage intact with $UPLOAD_COUNT files"
else
  echo "⚠️ Persistent storage not found - attempting restore from backup"
  # Restore to persistent storage (not app directory)
  sudo mkdir -p "$PERSISTENT_STORAGE"
  sudo cp -r $LATEST_BACKUP/uploads-only/* "$PERSISTENT_STORAGE/"
  sudo chown -R $USER:www-data "$PERSISTENT_STORAGE"
  sudo chmod -R 775 "$PERSISTENT_STORAGE"
fi
```

**Key Improvements:**
- ✅ Verifies persistent storage is intact during rollback
- ✅ Restores to persistent storage location if needed
- ✅ Reports file count for monitoring

---

### New Setup Script

**File:** `scripts/setup-persistent-uploads.sh`

A comprehensive script to set up or verify persistent uploads storage:

**Features:**
- ✅ Checks current uploads configuration
- ✅ Migrates from directory to symlink automatically
- ✅ Creates backups before migration
- ✅ Sets proper permissions
- ✅ Verifies symlink creation
- ✅ Reports file counts and sizes
- ✅ Provides detailed status output

**Usage:**
```bash
sudo bash scripts/setup-persistent-uploads.sh
```

---

## How It Works

### Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Production Server                                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ /var/www/progressnet.io-app/                       │    │
│  │                                                     │    │
│  │  apps/backend/uploads/ ─────────────────┐          │    │
│  │                         (symlink)        │          │    │
│  └──────────────────────────────────────────┼──────────┘    │
│                                             │               │
│                                             ▼               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ /var/lib/fsa-uploads/                              │    │
│  │ (Persistent Storage - Survives Deployments)        │    │
│  │                                                     │    │
│  │  ├── <tenantId>/                                   │    │
│  │  │   ├── tasks/                                    │    │
│  │  │   ├── work_orders/                              │    │
│  │  │   ├── reports/                                  │    │
│  │  │   └── branding/                                 │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Flow

1. **Create New Deployment Directory**
   ```bash
   /var/www/progressnet.io-app-new/
   ```

2. **Copy Application Code**
   - Copies all code from GitHub repo
   - Removes any uploads directory that was copied

3. **Setup Persistent Storage**
   - Ensures `/var/lib/fsa-uploads/` exists
   - Migrates any old uploads (one-time)
   - Counts files for verification

4. **Create Symlink**
   ```bash
   apps/backend/uploads -> /var/lib/fsa-uploads/
   ```

5. **Verify Symlink**
   - Checks symlink was created successfully
   - Lists contents for verification
   - Fails deployment if symlink is wrong

6. **Atomic Switch**
   ```bash
   /var/www/progressnet.io-app-old  ← move old deployment
   /var/www/progressnet.io-app      ← move new deployment
   ```

7. **Uploads Persist**
   - New deployment uses same persistent storage
   - No data loss
   - No migration needed

---

## Verification Steps

### On Production Server

1. **Check current status:**
   ```bash
   # Check if uploads is a symlink
   ls -lah /var/www/progressnet.io-app/apps/backend/uploads

   # Should show something like:
   # lrwxrwxrwx 1 runner www-data 21 Oct  2 12:00 uploads -> /var/lib/fsa-uploads
   ```

2. **Check persistent storage:**
   ```bash
   # Count files
   sudo find /var/lib/fsa-uploads -type f | wc -l

   # Check size
   sudo du -sh /var/lib/fsa-uploads

   # Check permissions
   ls -lah /var/lib/fsa-uploads
   ```

3. **Run setup script (if needed):**
   ```bash
   sudo bash scripts/setup-persistent-uploads.sh
   ```

### After Deployment

1. **Check deployment logs:**
   - Look for "📊 Persistent storage contains X files"
   - Should show the same file count before and after deployment

2. **Test file upload:**
   - Upload a file via the application
   - Verify it appears in `/var/lib/fsa-uploads/<tenantId>/...`
   - Verify it's accessible via the application

3. **Deploy again and verify:**
   - Run another deployment
   - Files should still be present
   - File count should be unchanged or increased (not decreased)

---

## Migration Path

### For Existing Production Server

If your production server currently has uploads in the app directory:

1. **Run the setup script:**
   ```bash
   sudo bash scripts/setup-persistent-uploads.sh
   ```

   This will:
   - Create persistent storage directory
   - Migrate existing uploads
   - Create backup
   - Setup symlink
   - Verify everything

2. **Or wait for next deployment:**
   - The CI/CD pipeline will automatically migrate on the next deploy
   - One-time migration logic will copy files to persistent storage
   - Symlink will be created automatically

### For New Installations

Nothing special needed - the CI/CD pipeline will:
- Create persistent storage directory
- Setup symlink correctly
- Everything works from the first deployment

---

## Rollback Safety

If a deployment fails:

1. **Uploads are safe:** They're in `/var/lib/fsa-uploads/`, not in the deployment directory
2. **Rollback preserves uploads:** Old deployment also uses the same persistent storage
3. **Backup available:** Backup created before deployment in `/var/backups/fsa-*/uploads-only`

---

## Monitoring

The deployment logs will now show:

```
📁 Setting up persistent uploads storage...
📊 Persistent storage contains 1234 files
✅ Uploads symlinked: /var/www/progressnet.io-app-new/apps/backend/uploads -> /var/lib/fsa-uploads
✅ Symlink verified successfully
```

**What to watch for:**
- File count should never decrease (unless files are deleted intentionally)
- "Symlink verified successfully" should always appear
- If migration happens, it should only happen ONCE

---

## Troubleshooting

### Uploads still disappearing after deployment

1. **Check if symlink exists:**
   ```bash
   ls -lah /var/www/progressnet.io-app/apps/backend/uploads
   ```

2. **Run setup script:**
   ```bash
   sudo bash scripts/setup-persistent-uploads.sh
   ```

3. **Check deployment logs:**
   - Look for symlink verification message
   - Check for any errors in deployment logs

### Can't write to uploads directory

1. **Check permissions:**
   ```bash
   ls -lah /var/lib/fsa-uploads
   ```
   Should be: `drwxrwxr-x runner www-data`

2. **Fix permissions:**
   ```bash
   sudo chown -R runner:www-data /var/lib/fsa-uploads
   sudo chmod -R 775 /var/lib/fsa-uploads
   ```

### Need to restore from backup

```bash
# Find latest backup
LATEST_BACKUP=$(sudo find /var/backups -name "fsa-*" -type d | sort -r | head -n 1)
echo "Latest backup: $LATEST_BACKUP"

# Restore to persistent storage
sudo cp -r $LATEST_BACKUP/uploads-only/* /var/lib/fsa-uploads/
sudo chown -R runner:www-data /var/lib/fsa-uploads
sudo chmod -R 775 /var/lib/fsa-uploads
```

---

## Summary

**What was fixed:**
- ✅ Deployment script properly handles persistent storage
- ✅ Symlink is verified before deployment completes
- ✅ File counts are reported for monitoring
- ✅ One-time migration from old structure
- ✅ Proper permissions (775 for write access)
- ✅ Rollback safety maintained

**What you need to do:**
1. **Commit and push the changes** (CI/CD workflow updated)
2. **On production server, run:** `sudo bash scripts/setup-persistent-uploads.sh`
   - Or just wait for next deployment (automatic migration)
3. **Verify** after next deployment that uploads persist

**Result:**
- 📁 Uploads will survive all future deployments
- 🔒 Files stored in `/var/lib/fsa-uploads/` (persistent)
- 🔗 Application accesses via symlink
- 📊 File counts reported in deployment logs
- ✅ No manual intervention needed after initial setup
