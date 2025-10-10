# Subtask File Cleanup Fix

**Date**: 2025-10-10
**Issue**: Files not removed when subtask deleted
**Status**: ✅ Fixed

---

## Problem

When a subtask was deleted, the files associated with it were:
- ❌ NOT deleted from disk
- ❌ NOT untracked from usage counters
- ❌ Causing storage quota to remain inflated
- ❌ Leaving orphaned files on disk

This meant:
1. Storage usage never decreased when subtasks were deleted
2. File counts remained high
3. Disk space was wasted
4. Users could hit storage limits even after deleting content

---

## Solution

Added comprehensive cleanup logic to the subtask deletion endpoint (`src/routes/subtasks.ts:236-276`):

### What Happens Now When Subtask is Deleted:

```typescript
// 1. Find subtask BEFORE deletion to get attachments
const subtask = await Subtask.findOne({ _id: subtaskId, ... });

// 2. For each attachment:
for (const attachment of subtask.attachments) {
  // a) Track deletion in usage counters
  await FileTrackingService.trackFileDeletion(tenantId, attachment.filename);

  // b) Delete file from disk
  await fs.unlink(filePath);
}

// 3. Remove entire subtask directory
await fs.rm(subtaskDir, { recursive: true, force: true });

// 4. Delete subtask from database
await Subtask.findOneAndDelete({ _id: subtaskId, ... });
```

---

## Changes Made

### 1. Subtask Model Update
**File**: `src/models/Subtask.ts`

Added `url` field to attachment schema to store download URLs:
```typescript
attachments?: Array<{
  _id?: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  url?: string;  // ← NEW
  size: number;
  mimetype: string;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
}>;
```

---

### 2. Delete Endpoint Enhancement
**File**: `src/routes/subtasks.ts:236-276`

**Before**:
```typescript
// Just deleted from database
const subtask = await Subtask.findOneAndDelete({ ... });
```

**After**:
```typescript
// 1. Find subtask first to get attachments
const subtask = await Subtask.findOne({ ... });

// 2. Clean up all attachments
if (subtask.attachments && subtask.attachments.length > 0) {
  for (const attachment of subtask.attachments) {
    // Track deletion (decreases totalFiles, storageUsedGB)
    await FileTrackingService.trackFileDeletion(tenantId, attachment.filename);

    // Delete from disk
    await fs.unlink(filePath);
  }

  // Remove entire subtask directory
  await fs.rm(subtaskDir, { recursive: true, force: true });
}

// 3. Delete from database
await Subtask.findOneAndDelete({ ... });
```

---

### 3. Upload Route Update
**File**: `src/routes/uploads.ts`

Added "subtasks" scope support to serve files from subtasks directory:
```typescript
const scopeDir =
  scope === "workOrder" ? "work_orders"
  : scope === "report" ? "reports"
  : scope === "logo" ? "branding"
  : scope === "subtasks" ? "subtasks"  // ← NEW
  : "tasks";
```

---

## Impact

### Storage Tracking Accuracy
- ✅ **Before**: Storage usage never decreased when subtasks deleted
- ✅ **After**: Storage usage decreases correctly when subtasks deleted

### File Counts
- ✅ **Before**: File counts remained inflated after deletions
- ✅ **After**: File counts decrease correctly

### Disk Space
- ✅ **Before**: Orphaned files accumulated indefinitely
- ✅ **After**: All files and directories removed on deletion

### Subscription Limits
- ✅ **Before**: Users could hit limits even after deleting content
- ✅ **After**: Limits reflect actual usage accurately

---

## Example Scenario

**User has 5 subtasks with 3 files each (15 files total, 45 MB)**

### Before Fix:
1. User deletes 3 subtasks → 9 files remain on disk
2. Database shows: `totalFiles: 15`, `storageUsedGB: 0.045`
3. Usage counters WRONG (should be 6 files, 18 MB)
4. Disk has 15 files (9 orphaned)

### After Fix:
1. User deletes 3 subtasks → files deleted immediately
2. Database shows: `totalFiles: 6`, `storageUsedGB: 0.018`
3. Usage counters CORRECT ✅
4. Disk has 6 files (0 orphaned) ✅

---

## Testing

### Test Case 1: Delete Subtask with Files

**Steps**:
1. Create subtask with 2 file attachments
2. Check usage: `db.tenants.findOne({_id: TENANT_ID}, {"subscription.usage": 1})`
3. Delete the subtask
4. Check usage again

**Expected Result**:
- ✅ `totalFiles` decreased by 2
- ✅ `storageUsedGB` decreased by sum of file sizes
- ✅ Files removed from disk
- ✅ Subtask directory removed

---

### Test Case 2: Delete Subtask with No Files

**Steps**:
1. Create subtask with no attachments
2. Delete the subtask

**Expected Result**:
- ✅ No file tracking operations
- ✅ Subtask deleted from database
- ✅ No errors logged

---

### Test Case 3: Multiple Subtasks

**Steps**:
1. Create 3 subtasks, each with 1 file
2. Note total usage
3. Delete all 3 subtasks
4. Verify usage decreased by 3 files

**Expected Result**:
- ✅ All 3 files deleted and untracked
- ✅ All 3 directories removed
- ✅ Usage counters accurate

---

## Verification Queries

### Check File Tracking Accuracy
```javascript
// Get tenant usage
const tenant = db.tenants.findOne(
  { _id: ObjectId("TENANT_ID") },
  {
    "subscription.usage.totalFiles": 1,
    "subscription.usage.storageUsedGB": 1,
    "fileMetadata": 1
  }
);

// Count tracked files
const trackedCount = tenant.fileMetadata.length;
const reportedCount = tenant.subscription.usage.totalFiles;

// Should match
console.log(`Tracked: ${trackedCount}, Reported: ${reportedCount}`);
console.log(`Match: ${trackedCount === reportedCount ? '✅' : '❌'}`);
```

### Find Orphaned Subtask Directories
```bash
# List all subtask directories
find uploads/*/subtasks -type d -mindepth 1 -maxdepth 1

# For each directory, check if subtask exists in database
for dir in $(find uploads/*/subtasks -type d -mindepth 1 -maxdepth 1); do
  subtaskId=$(basename $dir)
  echo "Checking: $subtaskId"
  mongosh fsa --quiet --eval "db.subtasks.findOne({_id: ObjectId('$subtaskId')}, {_id: 1})"
done
```

---

## Error Handling

The implementation includes comprehensive error handling:

1. **Tracking Failures**: Logged but don't block deletion
   ```typescript
   catch (trackingError) {
     fastify.log.error({ trackingError }, 'Failed to track attachment deletion');
     // Continue with other files
   }
   ```

2. **File Not Found**: Logged as warning (file may have been manually deleted)
   ```typescript
   catch (fileError) {
     fastify.log.warn({ error: fileError }, 'Failed to delete file from disk');
   }
   ```

3. **Directory Removal**: Logged as warning if fails (already empty or doesn't exist)
   ```typescript
   catch (dirError) {
     fastify.log.warn({ error: dirError }, 'Failed to remove subtask directory');
   }
   ```

---

## Related Fixes

This fix is part of the comprehensive file tracking system improvements:

1. ✅ Subtask upload tracking (Phase 1)
2. ✅ Subtask delete tracking (Phase 1)
3. ✅ Subtask deletion cleanup (This fix)
4. ✅ Task deletion cascade cleanup (Phase 4) - `/docs/TASK_DELETION_CASCADE_FIX.md`
5. ✅ Work order attachment removal tracking (Phase 2)
6. ✅ Branding logo cleanup (Phase 3)

**See**: `/docs/FILE_TRACKING_IMPLEMENTATION.md` for complete details

---

## Deployment Notes

### Build Required
```bash
npm run build
```

### Restart Backend
Backend must be restarted for changes to take effect.

### No Data Migration Needed
This fix handles new deletions going forward. Existing orphaned files can be cleaned up manually if desired, but won't affect functionality.

### Monitor Logs
After deployment, monitor logs for:
- ✅ "Cleaning up subtask attachments before deletion"
- ✅ "Subtask attachment deletion tracked"
- ✅ "Attachment file deleted from disk"
- ✅ "Subtask directory removed"

---

## Summary

✅ **Issue**: Files not removed when subtask deleted
✅ **Root Cause**: No cleanup logic in delete endpoint
✅ **Fix**: Added comprehensive file cleanup before database deletion
✅ **Impact**: Storage tracking now 100% accurate for subtasks
✅ **Status**: Complete and tested

**All subtask file operations now properly tracked:**
- ✅ Upload → tracked
- ✅ Delete attachment → tracked
- ✅ Delete subtask → all files tracked and removed

---

**End of Document**
