# PM2 Setup Guide for ProgressNet FSA

## ✅ **Current Setup:**
- Server: 91.98.79.35 (Ubuntu aarch64)
- PM2: Already installed and configured
- Frontend: progressnet.io → localhost:4004
- Backend: fsa.progressnet.io → localhost:4005

## 🚀 **GitHub Secrets to Add:**

Go to GitHub Repository → **Settings** → **Secrets and variables** → **Actions**

### **1. ENV_BACK** (Backend environment)
```
NODE_ENV=production
PORT=4005
MONGODB_URI=mongodb://localhost:27017/fsa
JWT_SECRET=your_32_character_secret_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@domain.com
EMAIL_PASS=your_app_password
```

### **2. ENV_FRONT** (Frontend environment)
```
NODE_ENV=production
PORT=4004
NEXT_PUBLIC_API_URL=https://fsa.progressnet.io
NEXT_PUBLIC_APP_URL=https://progressnet.io
```

### **3. SSH_PRIVATE_KEY**
```
-----BEGIN OPENSSH PRIVATE KEY-----
[Your complete private key content]
-----END OPENSSH PRIVATE KEY-----
```

### **4. SERVER_HOST**
```
91.98.79.35
```

### **5. SERVER_USER**
```
your_username
```

## 🔧 **How Deployment Works:**

1. **GitHub Actions** triggers on push to main
2. **Builds** frontend and backend
3. **Creates** `.env` files from secrets
4. **Deploys** to `/var/www/progressnet.io`
5. **PM2 reloads** both processes:
   - `progressnet-backend` (port 4005)
   - `progressnet-frontend` (port 4004)
6. **Health checks** both services
7. **Rolls back** automatically if anything fails

## 📋 **PM2 Commands (for manual management):**

```bash
# Check status
pm2 status

# View logs
pm2 logs progressnet-backend
pm2 logs progressnet-frontend

# Restart specific process
pm2 restart progressnet-backend
pm2 restart progressnet-frontend

# Reload all processes
pm2 reload ecosystem.config.js

# Stop processes
pm2 stop progressnet-backend
pm2 stop progressnet-frontend

# Monitor in real-time
pm2 monit
```

## 🎯 **Ready to Deploy:**

1. ✅ Add the 5 GitHub secrets above
2. ✅ Push to main branch
3. ✅ Watch GitHub Actions deploy automatically
4. ✅ Check your sites:
   - Frontend: https://progressnet.io
   - Backend: https://fsa.progressnet.io

## 🔍 **Troubleshooting:**

### **Check PM2 Status:**
```bash
pm2 status
pm2 logs --lines 50
```

### **Manual Deployment Test:**
```bash
cd /var/www/progressnet.io
pm2 reload ecosystem.config.js --update-env
```

### **Check Ports:**
```bash
netstat -tulpn | grep :4004
netstat -tulpn | grep :4005
```

### **Test Health Endpoints:**
```bash
curl http://localhost:4004
curl http://localhost:4005/health
```

No server scripts needed - just PM2 managing your apps! 🚀