# Field Service Automation - Setup Guide

## Quick Start (Fresh Installation)

For a new developer or fresh installation, simply run:

```bash
# 1. Install dependencies
yarn install

# 2. Start the development server (in one terminal)
yarn dev

# 3. Run the complete setup script (in another terminal)
node setup-initial-data.js
```

That's it! The setup script will handle everything automatically.

## What the Setup Script Does

The `setup-initial-data.js` script performs a complete initialization:

1. **Environment Setup** - Creates `.env.local` with proper configuration
2. **Tenant Creation** - Creates the demo tenant and admin user
3. **Data Seeding** - Populates the database with:
   - Default statuses (Created, Assigned, In Progress, Completed)
   - Default roles (Supervisor, Technician, Customer)
   - Sample data (5 customers, 5 technicians, 5 projects, 5 work orders, 5 tasks)

## Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** running on `localhost:27017`
- **Yarn** package manager

## Login Credentials

After setup, you can login with:

- **URL**: http://localhost:8082
- **Email**: admin@fsa-demo.com
- **Password**: admin123
- **Tenant Slug**: fsa-demo

## Manual Setup (If Needed)

If you prefer to run individual steps:

```bash
# Environment setup
node setup-env.sh

# Create tenant and admin
curl -X POST http://localhost:8082/api/v1/tenants/setup/ \
  -H "Content-Type: application/json" \
  -d '{"tenantName": "FSA Demo Company", "tenantSlug": "fsa-demo", "adminFirstName": "Admin", "adminLastName": "User", "adminEmail": "admin@fsa-demo.com", "adminPassword": "admin123"}'

# Seed data
npx tsx src/scripts/seed-default-statuses.ts
npx tsx src/scripts/seed-default-roles.ts
npx tsx src/scripts/seed-fsa-data.ts
```

## Troubleshooting

### Server Not Running
Make sure the development server is running on port 8082:
```bash
yarn dev
```

### MongoDB Connection Issues
Ensure MongoDB is running on the default port:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Or start manually
mongod --dbpath /usr/local/var/mongodb
```

### Port Already in Use
If port 8082 is busy, you can change it in `.env.local`:
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

Then restart the development server.

## Migration Scripts

For existing installations that need data migration:

- `migrate-statuses.js` - Migrates old status data to new format
- `migrate-personnel.js` - Migrates technicians to personnel system

These are only needed for existing installations, not fresh setups.

## Development

After setup, you can:

- View the **Projects & Tasks** kanban board
- Manage **Customers** and **Technicians**
- Create and assign **Work Orders**
- Track **Project Progress**
- Use the **Calendar** for scheduling

Happy coding! 🚀
