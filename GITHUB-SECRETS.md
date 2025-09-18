# 🔐 GitHub Secrets Setup

Add these **5 secrets** to your GitHub repository:

**Repository → Settings → Secrets and variables → Actions → New repository secret**

## 📋 **Required Secrets:**

### **1. ENV_BACK**
```
PORT=4005
NODE_ENV=production
MONGODB_URI=mongodb://root:75U0v7pA6TXg4YyOUqR0xv@91.98.79.35:27017/fsa?authSource=admin&readPreference=primary&ssl=false
CORS_ORIGIN=https://progressnet.io
API_PREFIX=/api/v1
MAX_FILE_SIZE_MB=10
MAX_FILES_PER_REQUEST=10
SMTP_HOST=email-smtp.eu-north-1.amazonaws.com
SMTP_PORT=465
SMTP_USER=AKIAQVJFOWN5CGZ7MVV3
SMTP_PASS=BDkSRRCrrhg8W916AYnYTCycJkVSqKoJC6yNuonVUWma
SMTP_FROM=noreply@progressnet.io
SUPERADMINS=[{"name":"Super Admin","email":"info@progressnet.dev","password":"ProNet$!123"}]
JWT_SECRET=Bdo5bHZIIpGrV2IGAM1aL1Tb7jZsM3ToJ
```

### **2. ENV_FRONT**
```
NODE_ENV=production
PORT=4004
NEXT_PUBLIC_API_URL=https://fsa.progressnet.io
NEXT_PUBLIC_APP_URL=https://progressnet.io
NEXT_PUBLIC_ASSETS_DIR=""
MAX_FILE_SIZE_MB=10
MAX_FILES_PER_REQUEST=10
NEXT_PUBLIC_APP_NAME=FSA - Field Service Application
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### **3. SSH_PRIVATE_KEY**
```
[Your complete SSH private key content]
```

### **4. SERVER_HOST**
```
91.98.79.35
```

### **5. SERVER_USER**
```
[Your server username]
```

## 🚀 **After Adding Secrets:**

1. **Push to main branch** → Triggers automatic deployment
2. **Check GitHub Actions** → Monitor deployment progress
3. **Visit your sites:**
   - Frontend: https://progressnet.io
   - Backend: https://fsa.progressnet.io

## 🎯 **Clean Repository:**
- ✅ No environment files committed
- ✅ No Docker files (using PM2)
- ✅ No manual deployment scripts
- ✅ Simple PM2 ecosystem configuration
- ✅ Automated CI/CD with GitHub Actions
- ✅ Tests simplified (no MongoDB dependency)

## 🔄 **CI/CD Pipeline:**
1. **Lint & Type Check** - Code quality validation
2. **Build** - Compile both apps
3. **Tests** - Unit tests (when added)
4. **Security Scan** - npm audit + Snyk (optional)
5. **Deploy** - PM2 deployment with health checks
6. **Rollback** - Automatic on failure

Ready to deploy! 🚀