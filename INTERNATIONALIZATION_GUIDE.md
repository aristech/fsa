# Backend Error/Message Internationalization Implementation Guide

This guide outlines the complete implementation of internationalized error and success messages between the backend API and frontend application.

## Overview

The system provides:
- **Standardized error/message keys** for consistent internationalization
- **Fallback message support** for better user experience
- **Type-safe message handling** with TypeScript
- **Automatic translation** of backend responses in the frontend
- **Comprehensive error categorization** (auth, validation, business logic, etc.)

## Architecture

```
Backend (API)                     Frontend (React)
├── error-messages.ts            ├── /locales/langs/en/api.json
├── error-handler.ts             ├── /locales/langs/el/api.json
└── routes/*.ts                  ├── useApiError.ts
    (updated to use keys)        ├── api-toast.ts
                                 └── components/*.tsx
                                     (updated error handling)
```

## Backend Implementation

### 1. Message Constants (`/apps/backend/src/constants/error-messages.ts`)

All backend messages are now defined with internationalization keys:

```typescript
export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'auth.invalid_credentials',
  NO_TOKEN_PROVIDED: 'auth.no_token_provided',
  // ... more auth messages
} as const;

export const BUSINESS_MESSAGES = {
  USER_ALREADY_EXISTS: 'business.user_already_exists',
  DUPLICATE_SKU: 'business.duplicate_sku',
  // ... more business logic messages
} as const;
```

### 2. Enhanced Error Handler (`/apps/backend/src/utils/error-handler.ts`)

New utilities for consistent API responses:

```typescript
// Send error with i18n key
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  messageKey: MessageKey,
  fallbackMessage: string
): void

// Send success with i18n key
export function sendSuccess(
  reply: FastifyReply,
  statusCode: number,
  messageKey: MessageKey,
  fallbackMessage: string,
  data?: any
): void
```

### 3. Updated API Response Format

All API responses now include `messageKey` for internationalization:

```typescript
// Error Response
{
  "success": false,
  "message": "Invalid credentials",           // Fallback message
  "messageKey": "auth.invalid_credentials",   // I18n key
  "errors": {...}                            // Validation details (if any)
}

// Success Response
{
  "success": true,
  "message": "Work order created",
  "messageKey": "success.created",
  "data": {...}
}
```

## Frontend Implementation

### 1. Translation Files

**English (`/apps/frontend/src/locales/langs/en/api.json`)**:
```json
{
  "auth": {
    "invalid_credentials": "Invalid email or password",
    "no_token_provided": "Authentication token is required"
  },
  "validation": {
    "general_error": "Please check your input and try again"
  },
  "success": {
    "created": "Successfully created",
    "updated": "Successfully updated"
  }
}
```

**Greek (`/apps/frontend/src/locales/langs/el/api.json`)**:
```json
{
  "auth": {
    "invalid_credentials": "Λανθασμένο email ή κωδικός πρόσβασης",
    "no_token_provided": "Απαιτείται κωδικός πιστοποίησης"
  }
}
```

### 2. API Error Hook (`/apps/frontend/src/hooks/useApiError.ts`)

Centralized hook for handling API responses:

```typescript
export function useApiError() {
  const { t } = useTranslation('api');

  const getErrorMessage = (error: ApiErrorResponse): string => {
    if (error.messageKey) {
      const translatedMessage = t(error.messageKey, { defaultValue: '' });
      if (translatedMessage) return translatedMessage;
    }
    return error.message || t('server.internal_error');
  };

  const extractErrorMessage = (error: unknown): string => {
    // Handles Axios errors, API errors, Error objects, strings
  };

  return { getErrorMessage, extractErrorMessage };
}
```

### 3. Snackbar Utilities (`/apps/frontend/src/utils/api-toast.ts`)

Convenient functions for showing notifications using the project's Sonner-based snackbar:

```typescript
// Show error toast with internationalization
export const showApiErrorToast = (
  error: ApiErrorResponse | string,
  getErrorMessage: (error: ApiErrorResponse) => string
): void

// Show success toast with internationalization
export const showApiSuccessToast = (
  response: ApiSuccessResponse | string,
  getSuccessMessage: (response: ApiSuccessResponse) => string
): void
```

## Usage Examples

### Basic Component Integration

```typescript
import { useApiError } from '../hooks/useApiError';
import { handleUnknownErrorToast, showApiSuccessToast } from '../utils/api-toast';

export function MyComponent() {
  const { getErrorMessage, getSuccessMessage, extractErrorMessage } = useApiError();

  const handleSubmit = async (data: any) => {
    try {
      const response = await axiosInstance.post('/api/v1/endpoint', data);

      // Show success message (automatically translated)
      showApiSuccessToast(response.data, getSuccessMessage);

    } catch (error) {
      // Show error message (automatically translated)
      handleUnknownErrorToast(error, extractErrorMessage);
    }
  };
}
```

### Manual Error Handling

```typescript
const handleSubmit = async (data: any) => {
  try {
    const response = await axiosInstance.post('/api/v1/endpoint', data);

    if (response.data.success) {
      const message = getSuccessMessage(response.data);
      toast.success(message);
    }

  } catch (error: any) {
    if (error.response?.data) {
      const message = getErrorMessage(error.response.data);
      toast.error(message);
    } else {
      const message = extractErrorMessage(error);
      toast.error(message);
    }
  }
};
```

## Migration Steps

### Step 1: Update Backend Routes

Replace hardcoded error responses:

**Before:**
```typescript
return reply.status(401).send({
  success: false,
  message: "Invalid credentials"
});
```

**After:**
```typescript
import { sendUnauthorized } from '../utils/error-handler';
import { AUTH_MESSAGES } from '../constants/error-messages';

return sendUnauthorized(
  reply,
  AUTH_MESSAGES.INVALID_CREDENTIALS,
  "Invalid credentials"
);
```

### Step 2: Update Frontend Components

Replace manual error handling:

**Before:**
```typescript
catch (error) {
  const message = error.response?.data?.message || 'Something went wrong';
  toast.error(message);
}
```

**After:**
```typescript
import { useApiError } from '../hooks/useApiError';
import { handleUnknownErrorToast } from '../utils/api-toast';

const { extractErrorMessage } = useApiError();

catch (error) {
  handleUnknownErrorToast(error, extractErrorMessage);
}
```

### Step 3: Add New Translation Keys

When adding new error messages:

1. **Add to backend constants:**
   ```typescript
   export const NEW_MESSAGES = {
     CUSTOM_ERROR: 'new_category.custom_error',
   } as const;
   ```

2. **Add to frontend translations:**
   ```json
   {
     "new_category": {
       "custom_error": "Your custom error message"
     }
   }
   ```

3. **Use in backend routes:**
   ```typescript
   sendError(reply, 400, NEW_MESSAGES.CUSTOM_ERROR, "Fallback message");
   ```

## Message Categories

### Authentication (`auth.*`)
- `invalid_credentials` - Wrong email/password
- `no_token_provided` - Missing auth token
- `invalid_token` - Expired/invalid token
- `account_inactive` - User account disabled

### Validation (`validation.*`)
- `general_error` - Generic validation failure
- `password_requirements` - Password complexity requirements
- `field_required` - Required field missing
- `positive_number_required` - Invalid number format

### Business Logic (`business.*`)
- `user_already_exists` - Duplicate user registration
- `duplicate_sku` - SKU already exists
- `assignment_required` - User not assigned to resource
- `already_checked_in` - Time tracking conflict

### Permissions (`permissions.*`)
- `insufficient_permissions` - Access denied
- `own_resource_only` - Can only access own data
- `superuser_only` - Admin-only action

### Resource Not Found (`not_found.*`)
- `tenant` - Organization not found
- `user` - User account not found
- `work_order` - Work order not found
- `task` - Task not found

### Success Messages (`success.*`)
- `created` - Resource created successfully
- `updated` - Resource updated successfully
- `deleted` - Resource deleted successfully
- `checked_in` - Time tracking started

### Server Errors (`server.*`)
- `internal_error` - Generic server error
- `database_error` - Database operation failed
- `service_unavailable` - Service temporarily down

## Benefits

1. **Consistency**: All error messages follow the same format and translation system
2. **Maintainability**: Messages are centralized and easy to update
3. **User Experience**: Users see messages in their preferred language
4. **Developer Experience**: Type-safe message keys prevent typos
5. **Fallback Support**: If translations are missing, fallback messages are shown
6. **Extensibility**: Easy to add new message categories and languages

## Testing

### Backend Testing

Test that routes return correct message keys:

```typescript
test('should return auth.invalid_credentials for wrong password', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signin',
    payload: { email: 'test@test.com', password: 'wrong' }
  });

  expect(response.json().messageKey).toBe('auth.invalid_credentials');
});
```

### Frontend Testing

Test that components handle internationalized messages:

```typescript
test('should display translated error message', () => {
  // Mock API response with messageKey
  const errorResponse = {
    success: false,
    messageKey: 'auth.invalid_credentials'
  };

  // Test that component shows translated message
});
```

## Future Enhancements

1. **Dynamic Message Parameters**: Support for parameterized messages
   ```typescript
   messageKey: 'validation.field_too_long',
   messageParams: { fieldName: 'Title', maxLength: 100 }
   ```

2. **Regional Formatting**: Support for locale-specific number, date, currency formatting in messages

3. **Message Analytics**: Track which error messages are most common to improve UX

4. **Automated Translation**: Integration with translation services for new languages

5. **Message Versioning**: Support for different message versions based on API version