# CLAUDE.md - FSA Codebase Guide

This file provides essential information for Claude Code instances working on the FSA (Field Service Application) project.

## 🚀 Quick Start Commands

```bash
# Start development servers
npm run dev        # Start all services (frontend + backend)
npm run dev:front  # Frontend only (Next.js)
npm run dev:back   # Backend only (Fastify)

# Testing & Code Quality
npm run test       # Run all tests
npm run lint       # Lint all code
npm run type-check # TypeScript type checking
npm run build      # Build for production
```

## 🏗️ Project Architecture

**Monorepo Structure (Turborepo):**
- `apps/frontend/` - Next.js application with TypeScript
- `apps/backend/` - Fastify API server with TypeScript
- `packages/` - Shared utilities and configurations

**Key Technologies:**
- Frontend: Next.js 14, Material-UI, TypeScript, React Hook Form, Zod validation
- Backend: Fastify, MongoDB with Mongoose, JWT authentication, TypeScript
- Infrastructure: Docker, Stripe integration, SMS services

## 🎯 Core Domain Concepts

**Multi-Tenant SaaS Application:**
- Each tenant has subscription plans: Free → Basic → Premium → Enterprise
- Resource limits enforced per plan (users, clients, work orders, SMS, storage)
- Usage tracking and enforcement middleware prevents resource abuse

**Main Entities:**
- **Tenants**: Organizations using the system
- **Users**: People within tenants with role-based permissions
- **Clients**: Customer records managed by tenants
- **Work Orders**: Service tickets/jobs with tasks, materials, time tracking
- **Personnel**: Field service workers assigned to work orders

## 🔐 Authentication & Authorization

**JWT-based Authentication:**
- `apps/backend/src/middleware/auth.ts` - Main auth middleware
- `apps/backend/src/middleware/permission-guard.ts` - Role-based access control
- Token includes user, tenant, and permission information

**Key Permissions Structure:**
- Tenant owners have full access
- Role-based permissions for different features
- Subscription plan enforcement at middleware level

## 📊 Usage Tracking & Limits (Critical System)

**Files to understand:**
- `apps/backend/src/middleware/usage-tracking.ts` - Core enforcement middleware
- `apps/backend/src/services/usage-monitoring-service.ts` - Reporting and alerts
- `apps/backend/src/services/file-tracking-service.ts` - File storage tracking

**Implementation Pattern:**
1. **Pre-check limits** using middleware before operations
2. **Track usage** after successful operations
3. **Never track** if operation fails

```typescript
// Example implementation pattern:
fastify.post('/endpoint', {
  preHandler: [
    authenticate,
    resourceLimitMiddleware.checkClientCreation(1) // Pre-check
  ]
}, async (request, reply) => {
  // Perform operation
  const result = await performOperation();

  // Track usage AFTER success
  await trackResourceUsage(tenantId, 'clients', 1);

  return reply.send(result);
});
```

## 🗂️ Database Models

**Location:** `apps/backend/src/models/`

**Key Models:**
- `Tenant.ts` - Organization with subscription and usage tracking
- `User.ts` - User accounts with roles and permissions
- `Client.ts` - Customer records
- `WorkOrder.ts` - Service jobs with comprehensive task management
- `FileMetadata.ts` - File tracking for storage limits

**Tenant Schema Highlights:**
- `subscription.limits.*` - Resource limits per plan
- `subscription.usage.*` - Current usage counters
- `fileMetadata[]` - Tracked uploaded files with metadata

## 🛣️ API Routes Structure

**Location:** `apps/backend/src/routes/`

**Route Registration:** `apps/backend/src/routes/index.ts`

**Key Route Groups:**
- `/api/v1/auth` - Authentication endpoints
- `/api/v1/tenants` - Tenant management
- `/api/v1/clients` - Client CRUD with limits
- `/api/v1/work-orders` - Work order management
- `/api/v1/usage` - Usage monitoring and alerts (authenticated)
- `/api/v1/subscription` - Subscription management
- `/api/v1/branding` - Company branding (logo upload, company info)

## 🎨 Frontend Architecture

**Location:** `apps/frontend/src/`

**Key Directories:**
- `components/` - Reusable UI components
- `sections/` - Page-specific components
- `auth/` - Authentication context and components
- `hooks/` - Custom React hooks
- `utils/` - Utility functions
- `types/` - TypeScript type definitions

**Material-UI Theme:**
- Custom theme with primary colors and component overrides
- Responsive design patterns
- Consistent spacing and typography

## 💡 Development Patterns

**Backend Patterns:**
1. Always use authentication middleware for protected routes
2. Apply resource limit checks before operations
3. Track usage after successful operations
4. Use proper error handling with standardized responses
5. Log important operations for monitoring

**Frontend Patterns:**
1. **ALWAYS use `const { user, tenant } = useAuthContext();`** - Access both user and tenant (with subscription info)
2. **ALWAYS use `axiosInstance` instead of `fetch`** - Proper auth headers and error handling
3. Use React Hook Form with Zod validation
4. Implement loading states and error handling
5. Use Material-UI components consistently
6. Handle authentication state globally
7. Show subscription upgrade prompts when limits reached
8. Check subscription plans using `tenant?.subscription?.plan`

## 🔍 Important Files for Common Tasks

**Adding New Resource Type:**
1. Update `apps/backend/src/middleware/usage-tracking.ts`
2. Add limits to tenant subscription schema
3. Create tracking functions in relevant services
4. Add usage reporting in monitoring service

**File Upload Implementation:**
- Use `apps/backend/src/middleware/usage-tracking.ts` file upload middleware
- Reference `apps/backend/src/routes/branding.ts` for complete example
- Always track file metadata for storage limits

**Subscription Enforcement:**
- Use `resourceLimitMiddleware.*` functions for pre-checks
- Reference `apps/backend/src/examples/usage-enforcement-example.ts`
- Handle limit exceeded errors with upgrade prompts

## 🚨 Critical Implementation Notes

**Resource Abuse Prevention:**
- NEVER skip usage tracking after successful operations
- ALWAYS use middleware for limit enforcement
- Track file uploads/deletions for accurate storage usage
- Implement proper cleanup for failed operations

**Multi-tenant Isolation:**
- All data queries MUST include tenantId filtering
- File uploads go to tenant-specific directories
- JWT tokens contain tenant context

**Error Handling:**
- Use standardized error responses
- Provide clear upgrade messages when limits exceeded
- Log errors for monitoring and debugging

## 🔧 Environment & Configuration

**Environment Files:**
- `.env.local` - Local development
- `.env.example` - Template for environment variables

**Key Variables:**
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Token signing secret
- `STRIPE_*` - Payment processing
- `SMS_*` - SMS service configuration

## 📈 Monitoring & Observability

**Usage Monitoring:**
- Real-time usage tracking per tenant
- Automated alert generation for approaching limits
- Upgrade recommendations based on usage patterns
- Admin monitoring for all tenants

**Logging:**
- Fastify built-in logging
- Important operations logged with context
- Error tracking for debugging

This guide should help future Claude instances quickly understand the codebase structure and implement features following established patterns.