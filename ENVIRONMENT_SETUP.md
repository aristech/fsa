# Field Service Automation - Environment Setup

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Server Configuration
NEXT_PUBLIC_SERVER_URL=http://localhost:8082
NEXT_PUBLIC_ASSETS_DIR=/assets
BUILD_STATIC_EXPORT=false

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/field-service-automation

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-make-it-long-and-random
JWT_EXPIRES_IN=7d

# Authentication Configuration
AUTH_METHOD=jwt
```

## Default Credentials for Testing

### Tenant Setup

- **Tenant Name**: ACME Field Services
- **Tenant Slug**: acme-field-services
- **Admin Email**: admin@acme.com
- **Admin Password**: password123

### Test Customer

- **Name**: TechCorp Solutions
- **Email**: contact@techcorp.com
- **Phone**: +1-555-0456

## API Endpoints

### Authentication

- **Sign In**: `POST /api/v1/auth/sign-in`
- **Sign Up**: `POST /api/v1/auth/sign-up`
- **Tenant Setup**: `POST /api/v1/tenants/setup`

### Work Orders

- **List**: `GET /api/v1/work-orders`
- **Create**: `POST /api/v1/work-orders`
- **Details**: `GET /api/v1/work-orders/{id}`
- **Update**: `PUT /api/v1/work-orders/{id}`
- **Delete**: `DELETE /api/v1/work-orders/{id}`

### Customers

- **List**: `GET /api/v1/customers`
- **Create**: `POST /api/v1/customers`
- **Details**: `GET /api/v1/customers/{id}`
- **Update**: `PUT /api/v1/customers/{id}`
- **Delete**: `DELETE /api/v1/customers/{id}`

## Frontend Routes

### Dashboard

- **FSA Dashboard**: `/dashboard/fsa`
- **Work Orders**: `/dashboard/fsa/work-orders`
- **Customers**: `/dashboard/fsa/customers`
- **Technicians**: `/dashboard/fsa/technicians`
- **Scheduling**: `/dashboard/fsa/scheduling`
- **Reports**: `/dashboard/fsa/reports`

## Getting Started

1. **Set up environment variables** by creating `.env.local` file
2. **Start MongoDB** locally on port 27017
3. **Install dependencies**: `yarn install`
4. **Start development server**: `yarn dev`
5. **Access the application**: http://localhost:8082
6. **Set up your first tenant** using the tenant setup API
7. **Sign in** and start using the FSA system

## Security Notes

- Change the JWT_SECRET to a strong, random string in production
- Use environment-specific MongoDB URIs
- Implement proper CORS settings for production
- Use HTTPS in production environments
