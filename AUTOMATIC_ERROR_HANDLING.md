# Automatic Error Handling with Toast Messages

This document explains how to use the automatic error handling system that displays user-friendly toast messages for all API errors.

## Overview

The axios interceptor now automatically shows toast messages for API errors, providing consistent UX across the entire application. Users will see human-readable error messages instead of technical error codes.

## How It Works

### Automatic Error Detection
- All API requests made through the configured axios instance will automatically show error toasts
- Error messages are extracted from backend responses and formatted for users
- HTTP status codes are mapped to user-friendly messages
- Specific error codes (like `TENANT_OWNER_REQUIRED`) have custom messages

### Error Code Mapping
The system maps backend error codes to user-friendly messages:

```javascript
{
  "TENANT_OWNER_REQUIRED": "Only the company owner can update company information",
  "INSUFFICIENT_PERMISSIONS": "You don't have permission to perform this action",
  "VALIDATION_ERROR": "Please check your input and try again",
  // ... and more
}
```

### Example Error Response
Backend response:
```json
{
    "error": "Only tenant owners can update company information",
    "code": "TENANT_OWNER_REQUIRED",
    "debug": {
        "userId": "68dadef2d6f86b5de9f32195",
        "userRole": "technician_68d9a3fcce0b46ac3b3a90bf",
        "isTenantOwner": false,
        "endpoint": "PUT /api/v1/company-info"
    }
}
```

User sees: Toast message with "Only the company owner can update company information"

## Usage Examples

### 1. Automatic Error Handling (Recommended)
```typescript
import { apiCall } from 'src/lib/axios';

// Errors will automatically show toast messages
const updateCompany = async (data) => {
  try {
    await apiCall.put('/api/v1/company-info', data);
    toast.success('Company updated successfully!');
  } catch (error) {
    // Toast error message already shown automatically
    // Handle any additional UI state here
    console.error('Update failed:', error);
  }
};
```

### 2. Silent Error Handling (Manual Control)
```typescript
import { apiCallSilent } from 'src/lib/axios';

// No automatic error toasts - handle manually
const loadCompanyData = async () => {
  try {
    const response = await apiCallSilent.get('/api/v1/company-info');
    return response.data;
  } catch (error) {
    // Handle error manually
    if (error.message.includes('permission')) {
      showCustomPermissionDialog();
    } else {
      toast.error('Failed to load data');
    }
  }
};
```

### 3. Opt-out for Specific Requests
```typescript
import axiosInstance from 'src/lib/axios';

// Disable automatic error toast for this specific request
const response = await axiosInstance.get('/api/v1/data', {
  skipErrorToast: true
});
```

## Available Helper Functions

### `apiCall` - With Automatic Error Toasts
```typescript
import { apiCall } from 'src/lib/axios';

apiCall.get(url, config)
apiCall.post(url, data, config)
apiCall.put(url, data, config)
apiCall.patch(url, data, config)
apiCall.delete(url, config)
```

### `apiCallSilent` - Without Automatic Error Toasts
```typescript
import { apiCallSilent } from 'src/lib/axios';

apiCallSilent.get(url, config)
apiCallSilent.post(url, data, config)
apiCallSilent.put(url, data, config)
apiCallSilent.patch(url, data, config)
apiCallSilent.delete(url, config)
```

## When to Use Each Approach

### Use `apiCall` (Automatic) When:
- User-initiated actions (save, update, delete)
- Form submissions
- Button clicks that change data
- Operations where users need immediate feedback

### Use `apiCallSilent` (Manual) When:
- Loading initial data
- Background polling/refresh
- Authentication checks
- Custom error handling flows
- When you want to show specific error messages

## Error Types and Toast Styles

- **400-499 (Client Errors)**: Red error toast
- **500-599 (Server Errors)**: Red error toast
- **Network Errors**: Red error toast

## Authentication Handling

- **401 (Unauthorized)**: No toast shown (handled by auth flow)
- **HTML responses**: No toast shown (system errors)

## Customizing Error Messages

### Adding New Error Codes
Add translations to `src/locales/langs/en/common.json`:

```json
{
  "errors": {
    "YOUR_NEW_ERROR_CODE": "User-friendly message here"
  }
}
```

Update the error handler in `src/lib/axios.ts`:

```typescript
case 'YOUR_NEW_ERROR_CODE':
  return 'User-friendly message here';
```

## Migration Guide

### From Manual Error Handling
```typescript
// Before
try {
  await axiosInstance.put('/api/v1/data', data);
  toast.success('Updated!');
} catch (error) {
  toast.error('Failed to update');
}

// After
try {
  await apiCall.put('/api/v1/data', data);
  toast.success('Updated!');
} catch (error) {
  // Error toast already shown automatically
  // Only handle UI state if needed
}
```

### From Custom Error Logic
```typescript
// Before
try {
  await axiosInstance.put('/api/v1/data', data);
} catch (error) {
  if (error.response?.status === 403) {
    toast.error('Permission denied');
  } else {
    toast.error('Something went wrong');
  }
}

// After - let automatic handling show the right message
try {
  await apiCall.put('/api/v1/data', data);
} catch (error) {
  // Automatic handling shows: "You don't have permission to perform this action"
  // or other appropriate message based on error code
}
```

## Best Practices

1. **Use `apiCall` for user actions** - Let users know what went wrong
2. **Use `apiCallSilent` for background operations** - Avoid notification spam
3. **Keep success messages** - Only error handling is automatic
4. **Add specific error codes** - For better user experience
5. **Test error scenarios** - Ensure messages are helpful

## Debugging

Check browser console for detailed error information:
```javascript
// Console output includes:
{
  message: "Only the company owner can update company information",
  url: "/api/v1/company-info",
  method: "PUT",
  status: 403,
  code: "TENANT_OWNER_REQUIRED",
  debug: { /* backend debug info */ }
}
```