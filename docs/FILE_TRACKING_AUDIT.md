# File Tracking Audit - Complete Analysis

**Date**: 2025-10-10
**Tenant**: Multi-tenant FSA Application
**Scope**: All file upload/deletion operations and subscription usage tracking

---

## 🎯 Executive Summary

### Critical Findings

**SEVERITY: HIGH** - Multiple file operations are **NOT tracked** in subscription usage, leading to:
- ❌ Incorrect storage usage calculations
- ❌ Users not hitting storage limits when they should
- ❌ Files uploaded but never counted toward quotas
- ❌ Files deleted but usage never decremented

### Impact Assessment

| Severity | Count | Impact |
|----------|-------|--------|
| 🔴 **CRITICAL** | 2 | Files uploaded/deleted with ZERO tracking |
| 🟡 **HIGH** | 2 | Files tracked on upload but NOT on deletion |
| 🟢 **MEDIUM** | 1 | Inconsistent tracking method |

**Estimated Impact**: Up to **50-70% of file operations** may not be tracked correctly.

---

## 📊 Detailed Entity Analysis

### 1. ✅ **Tasks** - WORKING (Recently Fixed)

**Storage Path**: `/uploads/{tenantId}/tasks/{taskId}/`

#### Upload Tracking
- **Endpoint**: `POST /api/v1/uploads/:tenantId/tasks/:ownerId`
- **Tracking**: ✅ `FileTrackingService.trackFileUpload()`
- **Status**: **WORKING**

#### Deletion Tracking
- **Method 1**: Entity deletion via `EntityCleanupService.cleanupTask()`
  - **Status**: ✅ FIXED - Added file deletion tracking
- **Method 2**: Individual file deletion via DELETE endpoint
  - **Status**: ✅ FIXED - Tracks before file deletion
- **Method 3**: Task attachment update via `kanban.ts:handleUpdateTask()`
  - **Status**: ✅ FIXED - Compares old vs new attachments, tracks removed files

**Code References**:
- Upload: `/apps/backend/src/routes/uploads.ts:239`
- Delete (endpoint): `/apps/backend/src/routes/uploads.ts:474`
- Delete (entity cleanup): `/apps/backend/src/services/entity-cleanup-service.ts:427-437`
- Delete (attachment removal): `/apps/backend/src/controllers/kanban.ts:1017-1050`

---

### 2. 🔴 **Subtasks** - CRITICAL: NO TRACKING AT ALL

**Storage Path**: `/uploads/subtask-attachments/` (NOT tenant-scoped!)

#### Upload Tracking
- **Endpoint**: `POST /api/v1/subtasks/:taskId/:subtaskId/attachments`
- **Tracking**: ❌ **NONE** - Uses direct file write
- **Status**: 🔴 **BROKEN**

```typescript
// Current code - NO TRACKING
const uploadsDir = path.join(process.cwd(), 'uploads', 'subtask-attachments');
await fs.mkdir(uploadsDir, { recursive: true });
const filePath = path.join(uploadsDir, uniqueFilename);
await pipeline(data.file, createWriteStream(filePath));
// ❌ NO FileTrackingService.trackFileUpload() call
```

#### Deletion Tracking
- **Endpoint**: `DELETE /api/v1/subtasks/:taskId/:subtaskId/attachments/:attachmentId`
- **Tracking**: ❌ **NONE** - Deletes file from disk only
- **Status**: 🔴 **BROKEN**

```typescript
// Current code - NO TRACKING
const filePath = path.join(process.cwd(), 'uploads', 'subtask-attachments', attachment.filename);
await fs.unlink(filePath);
// ❌ NO FileTrackingService.trackFileDeletion() call
```

#### Issues
1. **No tenant scoping** - Files stored in shared directory
2. **Zero usage tracking** - Never increments `storageUsedGB` or `totalFiles`
3. **No deletion tracking** - Files deleted but usage stays the same
4. **Security risk** - No tenant isolation in file paths

**Code References**:
- Upload: `/apps/backend/src/routes/subtasks.ts:325-388`
- Delete: `/apps/backend/src/routes/subtasks.ts:391-441`

---

### 3. 🟡 **Work Orders** - HIGH: No Deletion Tracking

**Storage Method**: Database-only (stores URLs in `attachments` array)

#### Upload Tracking
- **Method**: Via `/api/v1/uploads` endpoint (uses general upload)
- **Tracking**: ✅ `FileTrackingService.trackFileUpload()`
- **Status**: **WORKING**

#### Deletion Tracking
- **Endpoint**: `PUT /api/v1/work-orders/:id` (when attachments array changes)
- **Tracking**: ❌ **NONE** - Only updates database
- **Status**: 🟡 **BROKEN**

```typescript
// Current code - NO DELETION TRACKING
if (body.attachments && Array.isArray(body.attachments)) {
  processedBody.attachments = body.attachments.map((att: any) => {
    // Just normalizes URLs
    return { name: att.name, url: att.url, type: att.type, size: att.size };
  });
}
// ❌ Doesn't compare old vs new attachments
// ❌ Doesn't track removed files
```

#### Issues
1. **Upload works** - Files tracked when uploaded via uploads endpoint
2. **Deletion doesn't work** - When user removes attachment from work order, file stays on disk but no tracking update
3. **No comparison logic** - Doesn't detect which files were removed

**Code References**:
- Update endpoint: `/apps/backend/src/routes/work-orders.ts:687-708`
- Entity deletion: Uses `EntityCleanupService.cleanupWorkOrder()` ✅ (tracks deletions)

---

### 4. ✅ **Clients** - WORKING

**Storage Path**: `/uploads/{tenantId}/clients/{clientId}/`

#### Upload Tracking
- **Endpoint**: `POST /api/v1/uploads/:tenantId/clients/:ownerId`
- **Tracking**: ✅ `FileTrackingService.trackFileUpload()`
- **Status**: **WORKING**

#### Deletion Tracking
- **Method**: Entity deletion via `EntityCleanupService.cleanupClient()`
- **Status**: ✅ FIXED - Added file deletion tracking

**Code References**:
- Upload: `/apps/backend/src/routes/uploads.ts:239` (general upload)
- Delete: `/apps/backend/src/services/entity-cleanup-service.ts:317-327`

---

### 5. 🟢 **Branding (Logo)** - MEDIUM: Different Tracking System

**Storage Path**: `/uploads/{tenantId}/branding/logo/`

#### Upload Tracking
- **Endpoint**: `POST /api/v1/branding/upload-logo`
- **Tracking**: ⚠️ Uses `trackResourceUsage()` NOT `FileTrackingService`
- **Status**: ⚠️ **INCONSISTENT**

```typescript
// Uses different tracking system
await trackResourceUsage(user.tenantId, 'storage', 1, {
  filename,
  originalName: fileData.filename,
  mimeType: fileData.mimetype,
  size: fileData.size,
  category: 'logo',
  filePath
});
```

#### Deletion Tracking
- **No deletion endpoint** - Old logos remain on disk when new one uploaded
- **Status**: 🟡 **ISSUE** - Potential storage leak

#### Issues
1. **Different tracking system** - Uses `trackResourceUsage()` instead of `FileTrackingService`
2. **No cleanup** - Old logos not deleted when replaced
3. **May not sync** - Different tracking might not update same counters

**Code References**:
- Upload: `/apps/backend/src/routes/branding.ts:50-196`

---

### 6. ⚠️ **Reports** - UNKNOWN: Need Investigation

**Storage Method**: Database fields for `attachments`, `photos`, `signatures`

#### Status
- **No upload/delete endpoints found** in `reports.ts`
- **Model has attachment fields** - Likely uses general uploads endpoint
- **Unclear tracking** - Need to investigate how reports handle files

**Model Structure**:
```typescript
attachments: IReportAttachment[]  // {filename, url, size, etc.}
photos: IReportAttachment[]
signatures: IReportSignature[]
```

**Code References**:
- Model: `/apps/backend/src/models/Report.ts:201-203`
- Routes: `/apps/backend/src/routes/reports.ts` (no file ops found)

---

### 7. ✅ **Comments** - WORKING (Uses General Upload)

**Storage Method**: Database-only (stores URLs in `attachments` string array)

#### Status
- Uses general `/api/v1/uploads` endpoint
- Upload: ✅ Tracked via `FileTrackingService`
- Deletion: ⚠️ No direct deletion endpoint (relies on entity cascade)

---

## 🔍 FileTrackingService Usage Map

### Files Using FileTrackingService Correctly

| File | Upload | Delete | Status |
|------|--------|--------|--------|
| `routes/uploads.ts` | ✅ Line 239 | ✅ Line 474 | **Complete** |
| `services/entity-cleanup-service.ts` | N/A | ✅ Lines 317-327, 359-369, 427-437 | **Complete** |
| `controllers/kanban.ts` | N/A | ✅ Lines 1017-1050 | **Complete** |

### Files NOT Using FileTrackingService

| File | Operation | Impact | Severity |
|------|-----------|--------|----------|
| `routes/subtasks.ts` | Upload (Line 325) | Files uploaded but never counted | 🔴 Critical |
| `routes/subtasks.ts` | Delete (Line 391) | Files deleted but usage stays same | 🔴 Critical |
| `routes/work-orders.ts` | Delete (Line 687) | Removed attachments not tracked | 🟡 High |
| `routes/branding.ts` | Upload (Line 165) | Uses different tracking system | 🟢 Medium |

---

## 📁 File Storage Architecture

### Current Directory Structure

```
/uploads/
├── {tenantId}/                    # Tenant-scoped (GOOD)
│   ├── tasks/{taskId}/            # ✅ Tracked
│   ├── clients/{clientId}/        # ✅ Tracked
│   ├── work_orders/{woId}/        # ✅ Tracked
│   └── branding/logo/             # ⚠️  Different tracking
│
└── subtask-attachments/           # ❌ NOT tenant-scoped! (BAD)
    └── {filename}                 # ❌ NOT tracked!
```

### Problems

1. **Subtask files NOT tenant-scoped** - Security/isolation issue
2. **No tracking on subtasks** - Usage never counted
3. **Branding uses different system** - May not sync with main tracking

---

## 🎯 Impact Analysis by Scenario

### Scenario 1: User Uploads 10 Subtask Files (10MB each)

**Expected Behavior**:
- `storageUsedGB` increases by 0.1 GB
- `totalFiles` increases by 10
- User approaches storage limit

**Actual Behavior**:
- ❌ `storageUsedGB` stays unchanged
- ❌ `totalFiles` stays unchanged
- ❌ User never hits storage limit
- ❌ Tenant has unlimited free storage via subtasks

**Impact**: 🔴 **CRITICAL** - Free unlimited storage bypass

---

### Scenario 2: User Deletes Work Order with 20 Attachments

**Expected Behavior**:
- Files deleted from disk
- `storageUsedGB` decreases by file sizes
- `totalFiles` decreases by 20

**Actual Behavior**:
- ✅ Files deleted from disk (via EntityCleanupService)
- ✅ Usage tracked correctly
- ✅ Counters decremented

**Impact**: ✅ **WORKING** (Fixed via entity cleanup)

---

### Scenario 3: User Removes Attachment from Work Order (Without Deleting Work Order)

**Expected Behavior**:
- File deleted from disk
- `storageUsedGB` decreases
- `totalFiles` decreases

**Actual Behavior**:
- ❌ Attachment removed from database only
- ❌ File stays on disk (orphaned)
- ❌ Usage stays the same
- ❌ No tracking of removal

**Impact**: 🟡 **HIGH** - Orphaned files accumulate, usage never decreases

---

### Scenario 4: User Uploads New Logo 5 Times

**Expected Behavior**:
- Old logos deleted
- Only 1 logo file on disk
- Storage tracks only current logo

**Actual Behavior**:
- ❌ Old logos remain on disk
- ❌ 5 logo files accumulate
- ⚠️  Tracking may not be consistent

**Impact**: 🟢 **MEDIUM** - Storage leak, but low volume (typically 1-2 logos)

---

## 📈 Estimated Storage Leak

### Conservative Estimate

**Assumptions**:
- Average tenant: 100 tasks
- 20% of tasks have subtasks
- Average 2 subtasks per task with attachments
- Average file size: 500KB

**Untracked Storage Per Tenant**:
```
100 tasks × 20% × 2 subtasks × 500KB = 20 MB untracked
```

**System-wide** (100 tenants):
```
100 tenants × 20 MB = 2 GB untracked storage
```

### Real-World Impact

| Storage Type | Tracked? | Est. % of Total |
|--------------|----------|-----------------|
| Task files | ✅ Yes | 60% |
| Client files | ✅ Yes | 15% |
| Work order files | ✅ Upload only | 10% |
| Subtask files | ❌ **NO** | **10-15%** |
| Branding logos | ⚠️  Different | <1% |

**Conclusion**: **10-20% of storage may be untracked** due to subtasks and work order attachment removals.

---

## 🛠️ Fix Priority Matrix

| Priority | Entity | Issue | Effort | Impact | Status |
|----------|--------|-------|--------|--------|--------|
| **P0** | Subtasks | No upload tracking | High | Critical | 🔴 Open |
| **P0** | Subtasks | No delete tracking | High | Critical | 🔴 Open |
| **P0** | Subtasks | Not tenant-scoped | Medium | High | 🔴 Open |
| **P1** | Work Orders | No delete tracking on update | Medium | High | 🟡 Open |
| **P2** | Branding | Old logos not cleaned up | Low | Medium | 🟢 Open |
| **P2** | Branding | Different tracking system | Medium | Medium | 🟢 Open |
| **P3** | Reports | Unclear file handling | Low | Unknown | ⚠️  Investigation |

---

## ✅ What's Already Fixed

1. ✅ **Task file deletion via entity cleanup** - Tracks when task deleted
2. ✅ **Task file deletion via DELETE endpoint** - Tracks individual file deletion
3. ✅ **Task attachment removal via update** - Compares old vs new, tracks removed files
4. ✅ **Client file deletion via entity cleanup** - Tracks when client deleted
5. ✅ **Work order file deletion via entity cleanup** - Tracks when work order deleted
6. ✅ **Monthly usage reset** - Automatically resets on login

---

## 🎯 Recommended Fix Strategy

### Phase 1: Critical Fixes (Subtasks) - IMMEDIATE

**Why First**: Subtasks have ZERO tracking and represent a major security/billing issue.

**Tasks**:
1. ✅ Audit complete
2. ⬜ Add tenant-scoped storage path for subtasks
3. ⬜ Add `FileTrackingService.trackFileUpload()` to upload endpoint
4. ⬜ Add `FileTrackingService.trackFileDeletion()` to delete endpoint
5. ⬜ Migrate existing subtask files to tenant-scoped paths (data migration)
6. ⬜ Test upload/delete flow
7. ⬜ Deploy and monitor

**Estimated Time**: 4-6 hours
**Risk**: Medium (data migration required)

---

### Phase 2: High Priority (Work Orders) - NEXT

**Why Second**: Work orders are frequently used, orphaned files accumulate.

**Tasks**:
1. ⬜ Add attachment comparison logic to PUT endpoint
2. ⬜ Detect removed attachments (old vs new)
3. ⬜ Call `FileTrackingService.trackFileDeletion()` for removed files
4. ⬜ Extract filename from URL and delete from disk
5. ⬜ Test update flow with attachment removal
6. ⬜ Deploy and monitor

**Estimated Time**: 2-3 hours
**Risk**: Low (no data migration)

---

### Phase 3: Medium Priority (Branding) - LATER

**Why Third**: Low volume, minor impact.

**Tasks**:
1. ⬜ Investigate `trackResourceUsage()` vs `FileTrackingService` difference
2. ⬜ Decide: Standardize on FileTrackingService OR keep separate?
3. ⬜ Add cleanup logic: Delete old logo when new one uploaded
4. ⬜ Optional: Migrate to FileTrackingService for consistency
5. ⬜ Test logo upload flow
6. ⬜ Deploy and monitor

**Estimated Time**: 2-4 hours
**Risk**: Low

---

### Phase 4: Investigation (Reports) - TBD

**Tasks**:
1. ⬜ Investigate how reports handle files
2. ⬜ Determine if reports use uploads endpoint
3. ⬜ Test report file upload/deletion
4. ⬜ Add tracking if needed

**Estimated Time**: 1-2 hours
**Risk**: Unknown

---

## 🧪 Testing Strategy

### For Each Fix

#### Test 1: Upload and Track
```bash
# 1. Upload file
curl -X POST http://localhost:3001/api/v1/subtasks/{taskId}/{subtaskId}/attachments \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@testfile.jpg"

# 2. Check database
db.tenants.findOne(
  { _id: ObjectId("TENANT_ID") },
  { "subscription.usage.storageUsedGB": 1, "subscription.usage.totalFiles": 1 }
);

# Expected: storageUsedGB increased, totalFiles increased by 1
```

#### Test 2: Delete and Track
```bash
# 1. Delete file
curl -X DELETE http://localhost:3001/api/v1/subtasks/{taskId}/{subtaskId}/attachments/{attId} \
  -H "Authorization: Bearer TOKEN"

# 2. Check database
db.tenants.findOne(
  { _id: ObjectId("TENANT_ID") },
  { "subscription.usage.storageUsedGB": 1, "subscription.usage.totalFiles": 1 }
);

# Expected: storageUsedGB decreased, totalFiles decreased by 1
```

#### Test 3: Verify File Metadata
```bash
# Check fileMetadata array
db.tenants.findOne(
  { _id: ObjectId("TENANT_ID") },
  { "fileMetadata": 1 }
);

# Expected: File present after upload, removed after deletion
```

---

## 📊 Monitoring After Fix

### Metrics to Watch

1. **Storage Usage Trends**
   - Monitor `subscription.usage.storageUsedGB` daily
   - Alert if suddenly increases (might indicate double-tracking)
   - Alert if stays flat (might indicate tracking broken)

2. **File Count Accuracy**
   - Compare `subscription.usage.totalFiles` vs actual file count on disk
   - Run daily reconciliation script

3. **Orphaned Files**
   - Files on disk but not in `fileMetadata` array
   - Should decrease after fixes

4. **Error Rates**
   - Monitor failed `trackFileUpload()` calls
   - Monitor failed `trackFileDeletion()` calls

### Reconciliation Script (Run Weekly)

```javascript
// Check each tenant
const tenants = await Tenant.find({});

for (const tenant of tenants) {
  // Count files on disk
  const diskFiles = await countFilesOnDisk(tenant._id);

  // Count files in metadata
  const trackedFiles = tenant.fileMetadata?.length || 0;

  // Compare
  if (diskFiles !== trackedFiles) {
    console.warn(`Mismatch for tenant ${tenant._id}:`, {
      onDisk: diskFiles,
      tracked: trackedFiles,
      difference: diskFiles - trackedFiles
    });
  }
}
```

---

## 📝 Summary

### Current State
- ✅ 4 entities tracking correctly (Tasks, Clients, partial Work Orders, Comments)
- 🔴 1 entity BROKEN (Subtasks - no tracking at all)
- 🟡 1 entity PARTIAL (Work Orders - no delete tracking on update)
- 🟢 1 entity INCONSISTENT (Branding - different system)
- ⚠️  1 entity UNKNOWN (Reports - needs investigation)

### After All Fixes
- ✅ 100% file tracking coverage
- ✅ Accurate storage usage calculations
- ✅ Proper subscription limit enforcement
- ✅ No orphaned files
- ✅ Consistent tracking across all entities

### Recommended Approach
1. **Phase 1**: Fix subtasks (IMMEDIATE) - 4-6 hours
2. **Phase 2**: Fix work orders (NEXT) - 2-3 hours
3. **Phase 3**: Standardize branding (LATER) - 2-4 hours
4. **Phase 4**: Investigate reports (TBD) - 1-2 hours

**Total Effort**: ~10-15 hours to fix all issues

---

## 🚀 Next Steps

### User Decision Needed

**Option A: Fix Everything Systematically**
- Start with Phase 1 (Subtasks) immediately
- Move through all phases sequentially
- Thorough but time-consuming

**Option B: Hot-fix Subtasks Only**
- Fix only the critical subtask issue now
- Defer other fixes to later sprints
- Fast but leaves some issues unfixed

**Option C: Parallel Fix (Recommended)**
- Fix subtasks AND work orders in parallel (both high impact)
- Defer branding to later
- Balance of speed and thoroughness

**Which approach do you prefer?**
