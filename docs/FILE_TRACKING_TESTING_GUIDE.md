# File Tracking Implementation - Testing Guide

**Date**: 2025-10-10
**Status**: Ready for Testing
**Estimated Testing Time**: 45-60 minutes

---

## Overview

This guide provides step-by-step testing procedures for all file tracking fixes implemented across:
- ✅ **Phase 1**: Subtasks (upload/delete tracking + tenant-scoped paths)
- ✅ **Phase 2**: Work Orders (attachment removal tracking)
- ✅ **Phase 3**: Branding (old logo cleanup)
- ✅ **Phase 4**: Reports (investigation complete)

---

## Pre-Testing Setup

### 1. Backup Your Data
```bash
# Backup MongoDB database
mongodump --uri="mongodb://localhost:27017/fsa" --out=/tmp/fsa_backup_$(date +%Y%m%d)

# Backup uploads directory
tar -czf /tmp/uploads_backup_$(date +%Y%m%d).tar.gz /home/aris/Projects/fsa/apps/backend/uploads
```

### 2. Get Baseline Usage Data
```bash
# Connect to MongoDB
mongosh fsa

# Get your tenant's current usage (replace TENANT_ID with your tenant ID)
db.tenants.findOne(
  { _id: ObjectId("TENANT_ID") },
  {
    name: 1,
    "subscription.usage.storageUsedGB": 1,
    "subscription.usage.totalFiles": 1,
    "fileMetadata": 1
  }
)

# Save this output for comparison
```

### 3. Note Current File Count
```bash
# Count files in uploads directory
cd /home/aris/Projects/fsa/apps/backend
find uploads -type f | wc -l

# List subtask attachments in old location (if exists)
ls -lah uploads/subtask-attachments/ 2>/dev/null || echo "Old subtask directory doesn't exist"
```

---

## Phase 1: Subtasks Testing

### Test 1.1: Subtask File Upload Tracking

**Goal**: Verify that uploading a file to a subtask increases usage counters.

#### Steps:
1. **Get baseline usage**:
   ```javascript
   // In mongosh
   const tenant = db.tenants.findOne({ _id: ObjectId("TENANT_ID") });
   const beforeFiles = tenant.subscription.usage.totalFiles;
   const beforeStorage = tenant.subscription.usage.storageUsedGB;
   print(`Before: Files=${beforeFiles}, Storage=${beforeStorage}GB`);
   ```

2. **Upload a file via API**:
   - Navigate to a task in your frontend
   - Add a subtask if needed
   - Upload a file (e.g., a 1MB test image) to the subtask
   - Note the filename and size

3. **Verify usage increased**:
   ```javascript
   // Wait 2 seconds, then check again
   const tenant2 = db.tenants.findOne({ _id: ObjectId("TENANT_ID") });
   const afterFiles = tenant2.subscription.usage.totalFiles;
   const afterStorage = tenant2.subscription.usage.storageUsedGB;
   print(`After: Files=${afterFiles}, Storage=${afterStorage}GB`);
   print(`Change: Files=+${afterFiles - beforeFiles}, Storage=+${(afterStorage - beforeStorage).toFixed(6)}GB`);
   ```

4. **Verify file location**:
   ```bash
   # Find the subtask in database to get IDs
   mongosh fsa --eval 'db.subtasks.findOne({}, {_id:1, tenantId:1, attachments:1})'

   # Check file exists in NEW tenant-scoped path
   # Format: uploads/{tenantId}/subtasks/{subtaskId}/{filename}
   ls -lah uploads/TENANT_ID/subtasks/SUBTASK_ID/
   ```

5. **Verify file metadata tracked**:
   ```javascript
   // Check fileMetadata array
   db.tenants.findOne(
     { _id: ObjectId("TENANT_ID") },
     { fileMetadata: 1 }
   ).fileMetadata.slice(-5)  // Show last 5 files
   ```

**Expected Results**:
- ✅ `totalFiles` increased by 1
- ✅ `storageUsedGB` increased by file size in GB
- ✅ File exists at `/uploads/{tenantId}/subtasks/{subtaskId}/{filename}`
- ✅ File tracked in `fileMetadata` array
- ✅ Backend log shows: "✅ Subtask file upload tracked successfully"

---

### Test 1.2: Subtask File Delete Tracking

**Goal**: Verify that deleting a file from a subtask decreases usage counters.

#### Steps:
1. **Get baseline usage** (same as Test 1.1 step 1)

2. **Delete the file via API**:
   - Navigate to the subtask with the file
   - Click the delete/remove button on the attachment
   - Confirm deletion

3. **Verify usage decreased**:
   ```javascript
   const tenant3 = db.tenants.findOne({ _id: ObjectId("TENANT_ID") });
   const finalFiles = tenant3.subscription.usage.totalFiles;
   const finalStorage = tenant3.subscription.usage.storageUsedGB;
   print(`Final: Files=${finalFiles}, Storage=${finalStorage}GB`);
   print(`Net change from start: Files=${finalFiles - beforeFiles}, Storage=${(finalStorage - beforeStorage).toFixed(6)}GB`);
   ```

4. **Verify file removed from disk**:
   ```bash
   ls -lah uploads/TENANT_ID/subtasks/SUBTASK_ID/
   # Should NOT show the deleted file
   ```

5. **Verify fileMetadata updated**:
   ```javascript
   // The file should be removed from fileMetadata
   db.tenants.findOne(
     { _id: ObjectId("TENANT_ID"), "fileMetadata.filename": "DELETED_FILENAME" }
   )
   // Should return null or tenant without that file
   ```

**Expected Results**:
- ✅ `totalFiles` decreased by 1 (back to original or lower)
- ✅ `storageUsedGB` decreased by file size
- ✅ File removed from disk
- ✅ File removed from `fileMetadata` array
- ✅ Backend log shows: "✅ Subtask file deletion tracked successfully"

---

### Test 1.3: Backward Compatibility

**Goal**: Verify that old subtask files (in `/uploads/subtask-attachments/`) can still be deleted.

#### Prerequisites:
This test only works if you have old subtask files that haven't been migrated yet.

#### Steps:
1. **Check for old files**:
   ```bash
   ls -lah uploads/subtask-attachments/ 2>/dev/null
   ```

2. **Find a subtask with old-path attachment**:
   ```javascript
   // Find subtasks with attachments
   db.subtasks.findOne({
     "attachments.0": { $exists: true }
   }, {
     _id: 1,
     tenantId: 1,
     attachments: 1
   })
   ```

3. **Try to delete the attachment via API**

4. **Check both paths**:
   ```bash
   # Should be deleted from old path
   ls uploads/subtask-attachments/FILENAME

   # Shouldn't exist in new path (wasn't there to begin with)
   ls uploads/TENANT_ID/subtasks/SUBTASK_ID/FILENAME
   ```

**Expected Results**:
- ✅ File deleted from old path
- ✅ Backend log shows: "File deleted from old path (migration needed)"
- ✅ Usage counters decreased correctly

---

## Phase 2: Work Orders Testing

### Test 2.1: Work Order Attachment Removal Tracking

**Goal**: Verify that removing an attachment from a work order decreases usage counters.

#### Steps:
1. **Create work order with attachment**:
   - Create or edit a work order
   - Upload an attachment (this will be tracked by general upload endpoint)
   - Save the work order
   - Note the attachment filename from the database

2. **Get baseline usage**:
   ```javascript
   const tenant = db.tenants.findOne({ _id: ObjectId("TENANT_ID") });
   const beforeFiles = tenant.subscription.usage.totalFiles;
   const beforeStorage = tenant.subscription.usage.storageUsedGB;
   print(`Before removal: Files=${beforeFiles}, Storage=${beforeStorage}GB`);
   ```

3. **Remove attachment from work order**:
   - Edit the same work order
   - Remove the attachment (click X or remove button)
   - Save the work order
   - **Important**: Don't upload a new file, just remove the existing one

4. **Verify usage decreased**:
   ```javascript
   const tenant2 = db.tenants.findOne({ _id: ObjectId("TENANT_ID") });
   const afterFiles = tenant2.subscription.usage.totalFiles;
   const afterStorage = tenant2.subscription.usage.storageUsedGB;
   print(`After removal: Files=${afterFiles}, Storage=${afterStorage}GB`);
   print(`Change: Files=${afterFiles - beforeFiles}, Storage=${(afterStorage - beforeStorage).toFixed(6)}GB`);
   ```

5. **Check backend logs**:
   ```bash
   # Look for deletion tracking logs
   tail -f logs/app.log | grep "Tracked deletion"
   ```

**Expected Results**:
- ✅ `totalFiles` decreased by 1
- ✅ `storageUsedGB` decreased by file size
- ✅ Backend log shows: "✅ Tracked deletion of work order file: {filename}"
- ✅ Backend log shows: "🗑️ Tracked N file deletion(s) from work order {id}"

---

### Test 2.2: Multiple Attachments Removal

**Goal**: Verify removing multiple attachments works correctly.

#### Steps:
1. **Create work order with 3 attachments**
2. **Get baseline usage**
3. **Remove 2 out of 3 attachments** (keep 1)
4. **Verify usage decreased by exactly 2 files**

**Expected Results**:
- ✅ `totalFiles` decreased by 2
- ✅ `storageUsedGB` decreased by sum of 2 file sizes
- ✅ Backend log shows: "🗑️ Tracked 2 file deletion(s) from work order {id}"

---

## Phase 3: Branding Testing

### Test 3.1: Logo Upload with Old Logo Cleanup

**Goal**: Verify that uploading a new logo deletes and untracks the old logo.

#### Steps:
1. **Upload initial logo**:
   - Go to Settings > Branding
   - Upload a logo (e.g., logo1.png)
   - Save and note the filename

2. **Get baseline usage**:
   ```javascript
   const tenant = db.tenants.findOne({ _id: ObjectId("TENANT_ID") });
   const beforeFiles = tenant.subscription.usage.totalFiles;
   const beforeStorage = tenant.subscription.usage.storageUsedGB;
   const oldLogoUrl = tenant.branding?.logoUrl;
   print(`Before: Files=${beforeFiles}, Storage=${beforeStorage}GB`);
   print(`Old logo: ${oldLogoUrl}`);
   ```

3. **Upload new logo** (e.g., logo2.png):
   - Go to Settings > Branding
   - Upload a different logo
   - Save

4. **Verify old logo cleaned up**:
   ```javascript
   const tenant2 = db.tenants.findOne({ _id: ObjectId("TENANT_ID") });
   const newLogoUrl = tenant2.branding?.logoUrl;
   print(`New logo: ${newLogoUrl}`);

   // Usage should stay same (1 file removed, 1 file added = net 0)
   const afterFiles = tenant2.subscription.usage.totalFiles;
   const afterStorage = tenant2.subscription.usage.storageUsedGB;
   print(`After: Files=${afterFiles}, Storage=${afterStorage}GB`);
   ```

5. **Verify old logo file deleted from disk**:
   ```bash
   # Extract old filename from oldLogoUrl and check
   ls uploads/TENANT_ID/branding/logo/OLD_FILENAME
   # Should show "No such file or directory"

   # New logo should exist
   ls uploads/TENANT_ID/branding/logo/NEW_FILENAME
   ```

6. **Check backend logs**:
   ```bash
   tail -f logs/app.log | grep -E "(Old logo deleted|Logo uploaded)"
   ```

**Expected Results**:
- ✅ `totalFiles` stays same (net 0) or increases by size difference
- ✅ `storageUsedGB` reflects size difference between old and new logo
- ✅ Old logo file deleted from disk
- ✅ New logo file exists on disk
- ✅ `branding.logoUrl` updated to new logo URL
- ✅ Backend log shows: "Old logo deleted successfully"
- ✅ Backend log shows: "Logo uploaded, branding updated, and usage tracked"

---

## Subtask Migration Script Testing

### Test 4.1: Dry Run Migration

**Goal**: Test the migration script without making changes.

#### Steps:
1. **Check for old subtask files**:
   ```bash
   ls -lah uploads/subtask-attachments/ 2>/dev/null
   ```

2. **Run migration in dry-run mode**:
   ```bash
   cd /home/aris/Projects/fsa/apps/backend
   node scripts/migrate_subtask_files.js --dry-run --verbose
   ```

3. **Review output**:
   - Check "MIGRATION SUMMARY" section
   - Note files that would be moved
   - Check for any errors

**Expected Results**:
- ✅ Summary shows files that would be processed
- ✅ No actual files moved (verify with `ls`)
- ✅ No database changes
- ✅ Message: "⚠️ This was a DRY RUN. Run without --dry-run to apply changes."

---

### Test 4.2: Execute Migration

**Goal**: Actually migrate old subtask files to new tenant-scoped paths.

#### Prerequisites:
- Dry run completed successfully
- Database backup created
- Uploads directory backup created

#### Steps:
1. **Get baseline counts**:
   ```bash
   # Count old files
   find uploads/subtask-attachments -type f 2>/dev/null | wc -l

   # Count total usage
   mongosh fsa --eval 'db.tenants.aggregate([
     {$project: {
       name: 1,
       totalFiles: "$subscription.usage.totalFiles",
       storageGB: "$subscription.usage.storageUsedGB"
     }}
   ]).toArray()'
   ```

2. **Run migration**:
   ```bash
   cd /home/aris/Projects/fsa/apps/backend
   node scripts/migrate_subtask_files.js --verbose
   ```

3. **Review migration output**:
   - Check files moved count
   - Check files tracked count
   - Check for errors
   - Verify summary

4. **Verify files moved**:
   ```bash
   # Old directory should be empty or have fewer files
   ls -lah uploads/subtask-attachments/ 2>/dev/null

   # New tenant-scoped directories should have files
   find uploads/*/subtasks -type f 2>/dev/null | head -10
   ```

5. **Verify database updated**:
   ```javascript
   // Check that usage increased (files that weren't tracked before)
   db.tenants.findOne(
     { _id: ObjectId("TENANT_ID") },
     {
       "subscription.usage.totalFiles": 1,
       "subscription.usage.storageUsedGB": 1
     }
   )
   ```

**Expected Results**:
- ✅ All subtask files moved to `/uploads/{tenantId}/subtasks/{subtaskId}/`
- ✅ Previously untracked files now in `fileMetadata`
- ✅ Usage counters increased accordingly
- ✅ Message: "✅ Migration complete!"
- ✅ No errors in summary

---

## Database Verification Queries

### Query 1: Check Total Usage Across All Tenants
```javascript
db.tenants.aggregate([
  {
    $project: {
      name: 1,
      plan: "$subscription.plan",
      totalFiles: "$subscription.usage.totalFiles",
      storageGB: "$subscription.usage.storageUsedGB",
      trackedFiles: { $size: { $ifNull: ["$fileMetadata", []] } }
    }
  },
  {
    $addFields: {
      mismatch: { $ne: ["$totalFiles", "$trackedFiles"] }
    }
  }
])
```

**What to look for**:
- `totalFiles` should equal `trackedFiles` (tracked file count)
- If mismatch is true, investigate

---

### Query 2: Find Files Without Metadata
```javascript
db.tenants.aggregate([
  {
    $project: {
      name: 1,
      totalFiles: "$subscription.usage.totalFiles",
      trackedCount: { $size: { $ifNull: ["$fileMetadata", []] } }
    }
  },
  {
    $match: {
      $expr: { $ne: ["$totalFiles", "$trackedCount"] }
    }
  }
])
```

---

### Query 3: Check Subtask Files Tracking
```javascript
// Count subtasks with attachments
const subtaskFileCount = db.subtasks.aggregate([
  { $unwind: "$attachments" },
  { $group: { _id: "$tenantId", count: { $sum: 1 } } }
]).toArray();

print("Subtask files per tenant:", JSON.stringify(subtaskFileCount, null, 2));

// Compare with tenant tracking
subtaskFileCount.forEach(s => {
  const tenant = db.tenants.findOne({ _id: s._id });
  const trackedSubtaskFiles = tenant.fileMetadata?.filter(f =>
    f.filename?.includes('subtask') || f.category === 'subtask'
  ).length || 0;

  print(`Tenant ${tenant.name}: ${s.count} subtask files, ${trackedSubtaskFiles} tracked`);
});
```

---

## File System Verification

### Check 1: Verify File Counts Match Database
```bash
#!/bin/bash
cd /home/aris/Projects/fsa/apps/backend

# Count all files in uploads
DISK_COUNT=$(find uploads -type f | wc -l)
echo "Files on disk: $DISK_COUNT"

# Get database count
DB_COUNT=$(mongosh fsa --quiet --eval '
  db.tenants.aggregate([
    {$group: {_id: null, total: {$sum: "$subscription.usage.totalFiles"}}}
  ]).toArray()[0].total
')
echo "Files in database: $DB_COUNT"

if [ "$DISK_COUNT" -eq "$DB_COUNT" ]; then
  echo "✅ Counts match!"
else
  echo "⚠️ Mismatch: Disk=$DISK_COUNT, DB=$DB_COUNT (diff=$(($DISK_COUNT - $DB_COUNT)))"
fi
```

---

### Check 2: Find Orphaned Files
```bash
# This script checks for files on disk not tracked in database
cd /home/aris/Projects/fsa/apps/backend

# Get all filenames from disk
find uploads -type f -exec basename {} \; | sort > /tmp/disk_files.txt

# Get all tracked filenames from database
mongosh fsa --quiet --eval '
  db.tenants.aggregate([
    {$unwind: "$fileMetadata"},
    {$project: {filename: "$fileMetadata.filename"}},
    {$group: {_id: "$filename"}}
  ]).forEach(f => print(f._id))
' | sort > /tmp/db_files.txt

# Find difference
comm -23 /tmp/disk_files.txt /tmp/db_files.txt > /tmp/orphaned_files.txt

ORPHAN_COUNT=$(wc -l < /tmp/orphaned_files.txt)
echo "Orphaned files (on disk but not tracked): $ORPHAN_COUNT"

if [ $ORPHAN_COUNT -gt 0 ]; then
  echo "First 10 orphaned files:"
  head -10 /tmp/orphaned_files.txt
fi
```

---

## Rollback Procedures

### Rollback 1: Restore Database
```bash
# If something goes wrong, restore from backup
mongorestore --uri="mongodb://localhost:27017" --drop /tmp/fsa_backup_YYYYMMDD/fsa
```

---

### Rollback 2: Restore Files
```bash
# Restore uploads directory
cd /home/aris/Projects/fsa/apps/backend
rm -rf uploads
tar -xzf /tmp/uploads_backup_YYYYMMDD.tar.gz -C /
```

---

### Rollback 3: Revert Code Changes

If you need to revert the code changes:

1. **Subtasks** (`src/routes/subtasks.ts`):
   - Remove FileTrackingService import
   - Change upload path back to `/uploads/subtask-attachments/`
   - Remove tracking calls

2. **Work Orders** (`src/routes/work-orders.ts`):
   - Remove attachment comparison logic (lines 723-762)
   - Remove FileTrackingService import

3. **Branding** (`src/routes/branding.ts`):
   - Remove old logo cleanup logic (lines 147-176)

---

## Success Criteria

All tests are considered successful if:

1. ✅ **Subtask uploads** increase usage counters
2. ✅ **Subtask deletes** decrease usage counters
3. ✅ **Subtask files** stored in tenant-scoped paths
4. ✅ **Work order attachment removal** decreases usage counters
5. ✅ **Logo replacement** deletes old logo and maintains correct usage
6. ✅ **Database counts** match disk file counts
7. ✅ **No orphaned files** on disk
8. ✅ **Migration script** successfully moves old files
9. ✅ **Backend logs** show tracking confirmations
10. ✅ **No errors** in application logs

---

## Troubleshooting

### Issue: Usage counters don't change
**Possible causes**:
- FileTrackingService not being called (check logs)
- Database connection issue
- Race condition (unlikely, protection exists)

**Debug steps**:
```javascript
// Check if FileTrackingService is working
db.system.profile.find().sort({ts: -1}).limit(5)

// Check tenant update operations
db.tenants.find().sort({updatedAt: -1}).limit(1)
```

---

### Issue: Files not in expected location
**Possible causes**:
- Code not updated correctly
- Server not restarted after code changes

**Debug steps**:
```bash
# Check file locations
find uploads -name "FILENAME"

# Check tenant ID matches
mongosh fsa --eval 'db.subtasks.findOne({}, {tenantId: 1})'
```

---

### Issue: Migration script errors
**Possible causes**:
- MongoDB connection failed
- File permissions issue
- Old directory doesn't exist

**Debug steps**:
```bash
# Test MongoDB connection
mongosh "$MONGO_URI" --eval 'db.runCommand({ping: 1})'

# Check file permissions
ls -la uploads/

# Run with verbose logging
node /tmp/migrate_subtask_files.js --dry-run --verbose
```

---

## Post-Testing Checklist

After completing all tests:

- [ ] All usage counters accurate
- [ ] Files in correct tenant-scoped locations
- [ ] Old subtask files migrated (if applicable)
- [ ] No orphaned files on disk
- [ ] Database backup created and verified
- [ ] Backend logs show no errors
- [ ] Frontend file operations work correctly
- [ ] Subscription limits enforced correctly

---

## Notes

- **Testing Time**: Allocate 45-60 minutes for complete testing
- **Best Practice**: Test on staging environment first if available
- **Backup**: Always backup before running migration script
- **Monitoring**: Watch backend logs during testing for real-time feedback
- **Documentation**: Keep notes of any unexpected behavior

---

## Next Steps

After successful testing:

1. Monitor production logs for first 24-48 hours
2. Run verification queries daily for first week
3. Set up automated reconciliation script (optional)
4. Update API documentation with new file paths
5. Consider implementing Phase 4 (Reports cleanup) if needed

---

**End of Testing Guide**
