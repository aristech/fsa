# Attachment URL Migration Guide

## Overview

This guide explains how to migrate existing attachment URLs from the old JWT token-based format to the new secure signed URL system.

## Migration Strategy

We use a **two-phase hybrid approach**:
1. **Phase 1 (Immediate)**: On-the-fly conversion in frontend
2. **Phase 2 (Optional)**: Database migration script

## Phase 1: On-The-Fly Conversion ✅ DEPLOYED

### What It Does
- Automatically detects old token-based URLs (`?token=xxx`)
- Converts them to signed URLs on-the-fly
- Works immediately without database changes
- Zero downtime

### Implementation
The following components automatically convert old URLs:

**Frontend Components:**
- `SubtaskAttachments` - Automatically converts URLs on render
- `KanbanDetailsAttachments` - Handles task attachments
- Utility: `src/utils/file-url-converter.ts`

### How It Works

```typescript
// Old URL (insecure)
/api/v1/uploads/tenant123/subtasks/sub456/file.jpg?token=eyJhbGc...

// Automatically converted to signed URL
/api/v1/files/secure/eyJmaWxlbmFtZSI6ImZpbGUuanBnIiwic2NvcGUi...
```

### Benefits
- ✅ No database changes needed
- ✅ Works immediately after deployment
- ✅ Zero downtime
- ✅ Backward compatible
- ✅ Old URLs remain functional

### Testing

1. **Check Old Attachments:**
   - Open a subtask with existing attachments
   - Verify images show as thumbnails
   - Check console for conversion logs

2. **Check New Attachments:**
   - Upload a new file
   - Verify it uses signed URL immediately

## Phase 2: Database Migration (Optional)

### Why Run This?
- Permanently remove JWT tokens from database
- Cleaner database state
- Slightly better performance (no conversion needed)
- Remove security risk completely

### When To Run
- During maintenance window
- Off-peak hours
- After verifying Phase 1 works

### How To Run

#### 1. Dry Run (Preview Changes)

```bash
cd apps/backend
npx tsx scripts/migrate-attachment-urls-to-signed.ts --dry-run
```

**Output Example:**
```
╔══════════════════════════════════════════════════════════════╗
║   ATTACHMENT URL MIGRATION: Token-Based → Signed URLs       ║
╚══════════════════════════════════════════════════════════════╝

🔍 DRY RUN MODE - No changes will be saved

📦 Migrating subtask attachments...

  Converting: screenshot.png
    Old: /api/v1/uploads/tenant123/subtasks/sub456/file.jpg?token=eyJ...
    New: /api/v1/uploads/tenant123/subtasks/sub456/file.jpg

  Progress: 10 subtasks processed...

╔══════════════════════════════════════════════════════════════╗
║                    MIGRATION SUMMARY                         ║
╚══════════════════════════════════════════════════════════════╝

  Subtasks processed:      150
  Subtasks updated:        45
  Attachments converted:   87
  Errors:                  0

🔍 This was a dry run. No changes were saved.
   Run without --dry-run to apply changes.
```

#### 2. Run Migration (Live Mode)

```bash
cd apps/backend
npx tsx scripts/migrate-attachment-urls-to-signed.ts
```

#### 3. Run With Custom Batch Size

```bash
npx tsx scripts/migrate-attachment-urls-to-signed.ts --batch-size=50
```

### What Gets Migrated

**Subtask Attachments:**
- Collection: `subtasks`
- Field: `attachments[].url`
- Format: Object with `url` property

**Task Attachments:**
- Collection: `tasks`
- Field: `attachments[]`
- Format: Array of URL strings

### Rollback Plan

If issues occur:

1. **Stop the migration** (Ctrl+C)
2. **Restore from backup** (if needed)
3. **Check logs** for errors
4. **Frontend still works** (uses on-the-fly conversion)

### Post-Migration Verification

```bash
# Check for remaining old URLs in subtasks
db.subtasks.find({
  "attachments.url": { $regex: "\\?token=" }
}).count()

# Should return 0 after migration

# Check for remaining old URLs in tasks
db.tasks.find({
  "attachments": { $regex: "\\?token=" }
}).count()

# Should return 0 after migration
```

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Run dry-run to preview changes
- [ ] Review dry-run output for errors
- [ ] Schedule maintenance window (optional)
- [ ] Notify users (optional)

### During Migration
- [ ] Monitor migration progress
- [ ] Check error logs
- [ ] Verify sample records

### Post-Migration
- [ ] Run verification queries
- [ ] Test file access in UI
- [ ] Check server logs for errors
- [ ] Confirm image thumbnails work
- [ ] Test file downloads

## Troubleshooting

### Issue: "Failed to extract metadata from URL"

**Cause:** URL format doesn't match expected pattern

**Solution:** Check URL format. Should be:
```
/api/v1/uploads/{tenantId}/{scope}/{ownerId}/{filename}?token=xxx
```

### Issue: Migration Hangs

**Cause:** Large dataset or slow database connection

**Solutions:**
- Reduce batch size: `--batch-size=10`
- Run during off-peak hours
- Check database performance

### Issue: Some Files Still Show Generic Icons

**Cause:**
- Missing mimetype in database
- File extension not recognized

**Solution:**
- Check `mimetype` field in attachment
- Verify file extension in `FILE_FORMATS` (utils.ts)
- Update `getFileMeta` function if needed

## Technical Details

### Old URL Format
```
Protocol: http/https
Path: /api/v1/uploads/{tenantId}/{scope}/{ownerId}/{filename}
Query: ?token={jwt_token}

Example:
https://app.example.com/api/v1/uploads/tenant123/subtasks/sub456/image.jpg?token=eyJhbGc...
```

**Problems:**
- ❌ Exposes user JWT token in URL
- ❌ Token in browser history
- ❌ Token in server logs
- ❌ Can access all user's files with single token
- ❌ Long-lived (7 days)

### New URL Format
```
Protocol: http/https
Path: /api/v1/files/secure/{signed_token}

Example:
https://app.example.com/api/v1/files/secure/eyJmaWxlbmFtZSI6ImltYWdlLmpwZyI...
```

**Benefits:**
- ✅ No user token exposure
- ✅ File-specific access only
- ✅ Time-limited (15 min - 24 hours)
- ✅ Tamper-proof signature
- ✅ Safe to share

### Database Schema Changes

**Before:**
```javascript
{
  attachments: [
    {
      url: "/api/v1/uploads/tenant/subtasks/sub/file.jpg?token=eyJ...",
      filename: "file.jpg",
      // ...
    }
  ]
}
```

**After:**
```javascript
{
  attachments: [
    {
      url: "/api/v1/uploads/tenant/subtasks/sub/file.jpg",
      filename: "file.jpg",
      // ...
    }
  ]
}
```

Note: Frontend generates signed URL on-the-fly from clean URL

## Performance Impact

### Phase 1 (On-The-Fly)
- **Initial Load**: +50-100ms per file (one-time)
- **Cached**: 0ms (subsequent loads)
- **Network**: 1 API call per old URL (first time only)

### Phase 2 (Post-Migration)
- **Initial Load**: 0ms (URLs already clean)
- **Cached**: 0ms
- **Network**: 0 extra calls

## Security Improvements

### Before Migration
- User tokens exposed in URLs
- Tokens in browser history
- Tokens in server access logs
- 7-day token validity
- Token grants access to all files

### After Migration
- File-specific signed URLs
- No tokens in history/logs
- 15-60 minute validity
- Tamper-proof signatures
- Single-file access only

## Support

For issues or questions:
1. Check this documentation
2. Review `/docs/SECURE_FILE_HANDLING.md`
3. Check migration script logs
4. Contact development team

---

**Last Updated:** 2025-10-11
**Status:** ✅ Phase 1 Deployed | Phase 2 Ready
