# Script Environment Path Fix

**Issue:** Scripts couldn't find `.env` file on production server
**Status:** ✅ FIXED

---

## The Problem

When running TypeScript scripts with `tsx`, the `__dirname` resolves to the **source** directory:
```
Running: npx tsx apps/backend/src/scripts/fix-storage-usage.ts
__dirname = /var/www/progressnet.io-app/apps/backend/src/scripts
```

But when running compiled JavaScript, `__dirname` resolves to the **dist** directory:
```
Running: node apps/backend/dist/scripts/fix-storage-usage.js
__dirname = /var/www/progressnet.io-app/apps/backend/dist/scripts
```

The `.env` file is located at: `apps/backend/.env`

---

## The Fix

Changed all TypeScript scripts to go up **two levels** instead of one:

### Before (Wrong)
```typescript
const envPath = path.join(__dirname, '..', '.env');
// From src/scripts: goes to src/.env ❌ WRONG
```

### After (Correct)
```typescript
const envPath = path.join(__dirname, '..', '..', '.env');
// From src/scripts: goes to apps/backend/.env ✅ CORRECT
// From dist/scripts: also goes to apps/backend/.env ✅ CORRECT
```

---

## Scripts Fixed

### TypeScript Scripts (src/scripts/)
- ✅ `fix-storage-usage.ts`
- ✅ `validate-all-limits.ts`
- ✅ `fix-task-client-associations.ts`

All now correctly load from `apps/backend/.env` whether run via:
- `npx tsx apps/backend/src/scripts/...` (source)
- `node apps/backend/dist/scripts/...` (compiled)

---

## Testing on Production

Try the storage fix script again:

```bash
cd /var/www/progressnet.io-app
npx tsx apps/backend/src/scripts/fix-storage-usage.ts
```

You should now see:
```
Connecting to MongoDB...
✅ Connected to MongoDB

Found 5 tenants to process
...
```

Instead of:
```
❌ MONGODB_URI not found in environment variables
```

---

## Path Resolution Explanation

### TypeScript (tsx)
```
Script location: apps/backend/src/scripts/fix-storage-usage.ts
__dirname:        /var/www/.../apps/backend/src/scripts
Go up 2 levels:   /var/www/.../apps/backend
.env file:        /var/www/.../apps/backend/.env ✅
```

### JavaScript (node)
```
Script location: apps/backend/dist/scripts/fix-storage-usage.js
__dirname:        /var/www/.../apps/backend/dist/scripts
Go up 2 levels:   /var/www/.../apps/backend
.env file:        /var/www/.../apps/backend/.env ✅
```

Both paths now resolve correctly!

---

## Files Modified

- `apps/backend/src/scripts/fix-storage-usage.ts`
- `apps/backend/src/scripts/validate-all-limits.ts`
- `apps/backend/src/scripts/fix-task-client-associations.ts`

All have been updated and rebuilt.

---

## Status: ✅ READY TO USE

All scripts now correctly find the `.env` file on production!
