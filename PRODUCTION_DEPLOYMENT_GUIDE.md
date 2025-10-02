# Production Deployment Guide

## Running Scripts on Production Server

All scripts now properly load environment variables from your `.env` or `.env.production.local` files.

### Scripts Fixed
- ✅ `apps/backend/src/scripts/fix-storage-usage.ts` (TypeScript)
- ✅ `apps/backend/src/scripts/validate-all-limits.ts` (TypeScript)
- ✅ `apps/backend/scripts/seed-demo-tenants.js` (JavaScript)
- ✅ `apps/backend/scripts/setup-stripe-products.js` (JavaScript)
- ✅ `apps/backend/scripts/update-tenant-schemas.js` (JavaScript)

---

## Method 1: Run Scripts (Recommended)

The scripts will automatically find and load your `.env` file from `apps/backend/.env`:

```bash
# Navigate to app directory
cd /var/www/progressnet.io-app

# Fix storage usage (TypeScript)
npx tsx apps/backend/src/scripts/fix-storage-usage.ts

# Validate all limits (TypeScript)
npx tsx apps/backend/src/scripts/validate-all-limits.ts

# Seed demo tenants (JavaScript)
node apps/backend/scripts/seed-demo-tenants.js

# Setup Stripe products (JavaScript)
node apps/backend/scripts/setup-stripe-products.js

# Update tenant schemas (JavaScript)
node apps/backend/scripts/update-tenant-schemas.js
```

---

## Method 2: Run from Compiled JavaScript

If you prefer to run from compiled code:

```bash
cd /var/www/progressnet.io-app

# Build the backend first (if not already built)
cd apps/backend
npm run build
cd ../..

# Run from compiled dist directory
node apps/backend/dist/scripts/fix-storage-usage.js
node apps/backend/dist/scripts/validate-all-limits.js
```

---

## Method 3: Manually Specify Environment File

If the automatic loading doesn't work, you can specify the env file:

```bash
cd /var/www/progressnet.io-app/apps/backend

# Run with explicit environment
npx tsx --env-file=.env src/scripts/fix-storage-usage.ts
```

---

## Expected Output

### fix-storage-usage.ts

```
Connecting to MongoDB...
✅ Connected to MongoDB

Found 5 tenants to process

✅ Fixed tenant: Demo Company (507f1f77bcf86cd799439011)
   Files: 12
   Incorrect storage: 0.024567 GB
   Correct storage:   0.012284 GB
   Difference:        0.012283 GB

✓ Tenant Other Company already correct (0.005123 GB)

============================================================
Summary:
Total tenants processed: 5
Tenants fixed: 1
Errors: 0
============================================================
```

### validate-all-limits.ts

```
============================================================
Subscription Limits Validation
============================================================

Connecting to MongoDB...
✅ Connected to MongoDB

1️⃣  Validating Environment Configuration
------------------------------------------------------------
✅ All environment variables are properly configured

2️⃣  Validating Plan Loading
------------------------------------------------------------
✅ FREE plan loaded successfully
   Users: 2
   Clients: 10
   Work Orders/month: 50
   SMS/month: 0
   Storage: 1GB
   Price: $0/month
✅ BASIC plan loaded successfully
   ...

3️⃣  Validating Limit Checking Logic
------------------------------------------------------------
✅ User Creation:
   Allowed: true
   Current: 3 / 20
...

4️⃣  Validating Storage Calculations
------------------------------------------------------------
✅ Demo Company: 12 files, 0.012284GB
✅ Other Company: 5 files, 0.005123GB
...

============================================================
Summary
============================================================
✅ Environment Variables: PASSED
✅ Plan Loading: PASSED
✅ Limit Checking: PASSED
✅ Storage Calculation: PASSED

Total Issues: 0
Overall Status: ✅ ALL CHECKS PASSED
============================================================
```

---

## Troubleshooting

### Error: "MONGODB_URI not found in environment variables"

The script can't find your `.env` file. Try:

1. **Check file exists:**
   ```bash
   ls -la /var/www/progressnet.io-app/apps/backend/.env
   ```

2. **Check file permissions:**
   ```bash
   cat /var/www/progressnet.io-app/apps/backend/.env | grep MONGODB_URI
   ```

3. **Run from correct directory:**
   ```bash
   cd /var/www/progressnet.io-app
   npx tsx apps/backend/src/scripts/fix-storage-usage.ts
   ```

4. **Manually set environment variable:**
   ```bash
   export MONGODB_URI="mongodb://root:password@host:27017/fsa?authSource=admin"
   npx tsx apps/backend/src/scripts/fix-storage-usage.ts
   ```

---

### Error: "command find requires authentication"

Your MongoDB connection string is missing authentication. Check your `.env` file:

```bash
# Should look like:
MONGODB_URI=mongodb://username:password@host:27017/dbname?authSource=admin
```

---

### Error: "Module not found"

You need to install dependencies:

```bash
cd /var/www/progressnet.io-app
yarn install
```

---

## After Running Scripts

1. **Verify storage was fixed:**
   ```bash
   # Connect to MongoDB and check a tenant
   mongo --eval "db.tenants.findOne({}, {'subscription.usage.storageUsedGB': 1})"
   ```

2. **Test file upload:**
   - Go to your application
   - Try uploading a file
   - Should work without "Storage limit exceeded" error

3. **Monitor deployment:**
   - Watch the deployment logs for "📊 Persistent storage contains X files"
   - File count should match what you see in the scripts

---

## Production Deployment Checklist

- [ ] Run `fix-storage-usage.ts` to fix corrupted storage values
- [ ] Run `validate-all-limits.ts` to verify everything is correct
- [ ] Test file upload in the application
- [ ] Commit and push all changes
- [ ] Wait for deployment to complete
- [ ] Verify uploads persist after deployment
- [ ] Check deployment logs for file count reporting
- [ ] Test file upload again after deployment

---

## Need Help?

If you encounter any issues:

1. Check the full error message
2. Verify your `.env` file is correct
3. Ensure MongoDB connection string has authentication
4. Make sure you're running from the correct directory
5. Check file permissions on `.env` file

The scripts are designed to be safe - they won't modify data unless explicitly calculating correct values from the fileMetadata array.
