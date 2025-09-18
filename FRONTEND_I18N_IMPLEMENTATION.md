# Frontend Internationalization Implementation

This document explains how the frontend now correctly accepts and handles internationalized messages from the backend API.

## 🚀 Quick Start

### For New Components

```typescript
import { useApiHelpers } from 'src/utils/api-helpers';
import { ApiClient } from 'src/lib/api-client';

export function MyComponent() {
  const { callApi } = useApiHelpers();

  const handleSubmit = async (data: any) => {
    await callApi(
      () => ApiClient.post('/api/endpoint', data),
      { showSuccessToast: true, showErrorToast: true }
    );
  };
}
```

### For Existing Components (Quick Migration)

```typescript
// Replace this:
import axiosInstance from 'src/lib/axios';
import { toast } from 'src/components/snackbar';

try {
  const response = await axiosInstance.post('/api/endpoint', data);
  toast.success('Success message');
} catch (error) {
  toast.error(error.response?.data?.message || 'Error');
}

// With this:
import { ApiClient } from 'src/lib/api-client';
import { useApiHelpers } from 'src/utils/api-helpers';

const { callApi } = useApiHelpers();

try {
  await callApi(
    () => ApiClient.post('/api/endpoint', data),
    { showSuccessToast: true }
  );
} catch (error) {
  // Errors automatically handled and shown as internationalized toasts
}
```

## 📁 Files Added/Modified

### Core Implementation Files

1. **`/src/hooks/useApiError.ts`** - React hook for API error handling with i18n
2. **`/src/lib/api-client.ts`** - Enhanced API client wrapping axios
3. **`/src/utils/api-helpers.ts`** - Helper utilities for seamless integration
4. **`/src/utils/api-toast.ts`** - Snackbar utilities for API responses
5. **`/src/locales/langs/en/api.json`** - English translations for API messages
6. **`/src/locales/langs/el/api.json`** - Greek translations for API messages

### Configuration Updates

7. **`/src/locales/locales-config.ts`** - Added 'api' namespace to available namespaces

### Example Files

8. **`/src/examples/work-order-form-with-i18n.tsx`** - Complete integration example
9. **`/src/examples/work-order-form-migrated.tsx`** - Practical migration example
10. **`/src/examples/migration-example.tsx`** - Before/after comparison

## 🔧 How It Works

### 1. Backend Response Format

The backend now sends responses in this standardized format:

```typescript
// Success Response
{
  "success": true,
  "message": "Work order created",      // Fallback message
  "messageKey": "success.created",     // i18n key
  "data": { ... }
}

// Error Response
{
  "success": false,
  "message": "Invalid credentials",          // Fallback message
  "messageKey": "auth.invalid_credentials", // i18n key
  "errors": { ... }                        // Validation details (optional)
}
```

### 2. Frontend Processing

1. **API Client** (`ApiClient`) makes requests and normalizes errors
2. **Error Hook** (`useApiError`) translates message keys to user language
3. **Helper Utilities** (`useApiHelpers`) provide convenient wrapper functions
4. **Snackbar System** automatically shows translated messages

### 3. Translation Flow

```
Backend sends: { messageKey: "auth.invalid_credentials", message: "Invalid credentials" }
                                   ↓
Frontend checks: /locales/langs/en/api.json for "auth.invalid_credentials"
                                   ↓
Found translation: "Invalid email or password"
                                   ↓
User sees: "Invalid email or password" (English) or "Λανθασμένο email ή κωδικός πρόσβασης" (Greek)
```

If translation not found → Falls back to backend's `message` field

## 🎯 Integration Patterns

### Pattern 1: Simple API Calls

```typescript
import { useApiHelpers } from 'src/utils/api-helpers';
import { ApiClient } from 'src/lib/api-client';

export function SimpleExample() {
  const { callApi } = useApiHelpers();

  const createItem = async (data: any) => {
    return await callApi(
      () => ApiClient.post('/api/items', data),
      {
        showSuccessToast: true,  // Show success message
        showErrorToast: true,    // Show error message
      }
    );
  };
}
```

### Pattern 2: Custom Error Handling

```typescript
import { useApiError } from 'src/hooks/useApiError';
import { ApiClient, isApiClientError } from 'src/lib/api-client';
import { toast } from 'src/components/snackbar';

export function CustomHandlingExample() {
  const { getErrorMessage, getSuccessMessage } = useApiError();

  const handleSubmit = async (data: any) => {
    try {
      const response = await ApiClient.post('/api/endpoint', data);

      // Custom success handling
      const successMsg = getSuccessMessage(response.data);
      toast.success(successMsg);

    } catch (error) {
      if (isApiClientError(error)) {
        // Custom error handling with i18n
        const errorMsg = getErrorMessage(error.toApiErrorResponse());
        toast.error(errorMsg);

        // Handle specific error types
        if (error.isValidationError()) {
          setValidationErrors(error.errors);
        }
      }
    }
  };
}
```

### Pattern 3: Data Fetching

```typescript
import { useApiError } from 'src/hooks/useApiError';
import { ApiClient } from 'src/lib/api-client';

export function DataFetchingExample() {
  const { extractErrorMessage } = useApiError();
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await ApiClient.get('/api/data');
      setData(response.data.data);
      setError(null);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setError(errorMessage);
      // Note: Don't show toast for data fetching failures
    }
  };
}
```

### Pattern 4: Form Validation

```typescript
import { useApiError } from 'src/hooks/useApiError';
import { ApiClient, isApiClientError } from 'src/lib/api-client';

export function FormValidationExample() {
  const { getErrorMessage } = useApiError();
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (data: any) => {
    try {
      setFieldErrors({}); // Clear previous errors

      const response = await ApiClient.post('/api/form', data);
      // Handle success...

    } catch (error) {
      if (isApiClientError(error) && error.isValidationError()) {
        // Handle field-specific validation errors
        setFieldErrors(error.errors || {});

        // Show general error message
        const message = getErrorMessage(error.toApiErrorResponse());
        toast.error(message);
      }
    }
  };
}
```

## 🔄 Migration Guide

### Step 1: Replace Imports

```typescript
// OLD
import axiosInstance from 'src/lib/axios';
import { toast } from 'src/components/snackbar';

// NEW
import { ApiClient } from 'src/lib/api-client';
import { useApiHelpers } from 'src/utils/api-helpers';
```

### Step 2: Add Hook

```typescript
export function MyComponent() {
  // NEW: Add this hook
  const { callApi, showError, showSuccess } = useApiHelpers();

  // ... rest of component
}
```

### Step 3: Replace API Calls

```typescript
// OLD
try {
  const response = await axiosInstance.post('/api/endpoint', data);
  if (response.data.success) {
    toast.success('Success message');
  }
} catch (error) {
  toast.error(error.response?.data?.message || 'Error');
}

// NEW
try {
  await callApi(
    () => ApiClient.post('/api/endpoint', data),
    { showSuccessToast: true }
  );
} catch (error) {
  // Errors automatically handled
}
```

### Step 4: Update Data Fetching (SWR)

```typescript
// OLD
const axiosFetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

// NEW
const axiosFetcher = (url: string) => ApiClient.get(url).then((res) => res.data);
```

## 🌍 Translation Management

### Adding New Error Messages

1. **Backend**: Add message key to `/apps/backend/src/constants/error-messages.ts`
2. **Frontend**: Add translations to language files:

```json
// /src/locales/langs/en/api.json
{
  "business": {
    "new_error": "Your new error message in English"
  }
}

// /src/locales/langs/el/api.json
{
  "business": {
    "new_error": "Το νέο μήνυμα σφάλματος στα ελληνικά"
  }
}
```

### Translation File Structure

```json
{
  "auth": {
    "invalid_credentials": "Invalid email or password",
    "no_token_provided": "Authentication token is required"
  },
  "validation": {
    "general_error": "Please check your input and try again",
    "password_requirements": "Password must contain..."
  },
  "business": {
    "user_already_exists": "An account with this email already exists",
    "duplicate_sku": "A material with this SKU already exists"
  },
  "success": {
    "created": "Successfully created",
    "updated": "Successfully updated"
  },
  "server": {
    "internal_error": "Something went wrong. Please try again later"
  }
}
```

## 🛠️ API Client Features

### Enhanced Error Types

```typescript
import { ApiClient, isApiClientError } from 'src/lib/api-client';

try {
  await ApiClient.post('/api/endpoint', data);
} catch (error) {
  if (isApiClientError(error)) {
    // Check specific error types
    if (error.isAuthError()) {
      // Handle authentication errors (401)
    } else if (error.isPermissionError()) {
      // Handle permission errors (403)
    } else if (error.isValidationError()) {
      // Handle validation errors (400 with validation details)
    } else if (error.isNotFoundError()) {
      // Handle not found errors (404)
    } else if (error.isServerError()) {
      // Handle server errors (500+)
    }
  }
}
```

### Response Types

```typescript
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from 'src/hooks/useApiError';

// All API responses follow this structure
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  messageKey?: string;
  data?: T;        // Only in success responses
  errors?: any;    // Only in error responses
  meta?: any;      // Optional metadata
}
```

## 🧪 Testing

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'src/locales/i18n-provider';

// Mock the API client
jest.mock('src/lib/api-client', () => ({
  ApiClient: {
    post: jest.fn(),
  },
}));

test('shows translated error message', async () => {
  // Mock API error response
  const mockError = {
    response: {
      data: {
        success: false,
        messageKey: 'auth.invalid_credentials',
        message: 'Invalid credentials'
      }
    }
  };

  ApiClient.post.mockRejectedValue(mockError);

  render(
    <I18nProvider lang="en">
      <MyComponent />
    </I18nProvider>
  );

  // Test that translated message appears
  await waitFor(() => {
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });
});
```

## 🎉 Benefits

1. **Consistent UX**: All error/success messages follow the same pattern
2. **Automatic i18n**: No need to manually handle translations for API messages
3. **Fallback Support**: Always shows a message even if translation is missing
4. **Type Safety**: TypeScript ensures correct API response handling
5. **Reduced Boilerplate**: Less code needed for error handling
6. **Centralized Management**: All API messages managed in one place
7. **Better Error Handling**: Specific error types for different scenarios
8. **Developer Friendly**: Easy to migrate existing components

## 🔮 Future Enhancements

1. **Parameterized Messages**: Support for dynamic message parameters
2. **Message Caching**: Cache translations for better performance
3. **Offline Support**: Handle offline scenarios gracefully
4. **Analytics**: Track which error messages are most common
5. **Auto-translation**: Integrate with translation services for new languages