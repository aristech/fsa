import type { AxiosRequestConfig } from 'axios';

// Extend AxiosRequestConfig to include our custom skipErrorToast option
declare module 'axios' {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

import axios from 'axios';

import { CONFIG } from 'src/global-config';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

/**
 * Extracts and formats error message for user display
 */
function getErrorMessage(error: any): string {
  // Check for structured error response from backend
  if (error?.response?.data) {
    const errorData = error.response.data;

    // If backend provides a user-friendly message, use it
    if (errorData.message) {
      return errorData.message;
    }

    // If backend provides an error code, we could translate it
    if (errorData.code) {
      // For now, convert error codes to human-readable messages
      switch (errorData.code) {
        case 'TENANT_OWNER_REQUIRED':
          return 'Only the company owner can update company information';
        case 'INSUFFICIENT_PERMISSIONS':
          return 'You don\'t have permission to perform this action';
        case 'VALIDATION_ERROR':
          return 'Please check your input and try again';
        case 'RESOURCE_NOT_FOUND':
          return 'The requested resource was not found';
        case 'DUPLICATE_ENTRY':
          return 'This entry already exists';
        case 'PAYMENT_REQUIRED':
          return 'Payment required to access this feature';
        case 'QUOTA_EXCEEDED':
          return 'You have exceeded your quota for this resource';
        case 'INVALID_CREDENTIALS':
          return 'Invalid username or password';
        case 'ACCOUNT_LOCKED':
          return 'Your account has been temporarily locked';
        case 'EMAIL_NOT_VERIFIED':
          return 'Please verify your email address first';
        case 'TOKEN_EXPIRED':
          return 'Your session has expired. Please log in again.';
        case 'MAINTENANCE_MODE':
          return 'System is under maintenance. Please try again later.';
        case 'FEATURE_DISABLED':
          return 'This feature is currently disabled';
        default:
          return errorData.code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase());
      }
    }

    // Fallback to generic error message
    if (errorData.error) {
      return errorData.error;
    }
  }

  // Handle HTTP status codes
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You need to log in to access this resource.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'The data you provided could not be processed.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error occurred. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again.';
      case 503:
        return 'Service is currently down for maintenance.';
      default:
        return `Request failed with status ${error.response.status}`;
    }
  }

  // Handle network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return 'Network error. Please check your internet connection.';
  }

  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Fallback to error message or generic message
  return error?.message || 'An unexpected error occurred. Please try again.';
}

// ----------------------------------------------------------------------

const axiosInstance = axios.create({
  baseURL: CONFIG.serverUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (if using auth)
axiosInstance.interceptors.request.use((config) => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const token =
      sessionStorage.getItem('jwt_access_token') || localStorage.getItem('jwt_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Get user-friendly error message
    const userMessage = getErrorMessage(error);

    // Check if we got HTML instead of JSON (common when server returns error page)
    if (
      error?.response?.data &&
      typeof error.response.data === 'string' &&
      error.response.data.includes('<!DOCTYPE')
    ) {
      console.error('🚨 HTML Response Error:', {
        url: error?.config?.url,
        method: error?.config?.method,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseType: typeof error?.response?.data,
        responseSnippet: error?.response?.data?.substring(0, 200),
      });
    }

    // Don't log 401 errors as they're expected for authentication checks
    if (error?.response?.status !== 401) {
      // Don't log Socket.IO transport negotiation errors as they're normal
      if (userMessage === 'Transport unknown' || userMessage?.includes('Transport unknown')) {
        console.debug('🔌 Socket.IO transport negotiation in progress...');
      } else {
        console.error('Axios error:', {
          message: userMessage,
          url: error?.config?.url,
          method: error?.config?.method,
          status: error?.response?.status,
          code: error?.response?.data?.code,
          debug: error?.response?.data?.debug,
        });
      }
    }

    // Show toast notification for errors (except auth-related ones)
    // Skip showing toast for 401 (unauthorized) as these are handled by auth flow
    // Skip showing toast for HTML responses as they indicate system errors
    // Allow components to opt-out of automatic error toasts by setting skipErrorToast: true in request config
    const shouldShowToast =
      error?.response?.status !== 401 &&
      !(error?.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE')) &&
      !userMessage?.includes('Transport unknown') &&
      !error?.config?.skipErrorToast;

    if (shouldShowToast && typeof window !== 'undefined') {
      // Determine toast type based on status code
      const status = error?.response?.status;
      if (status >= 400 && status < 500) {
        // Client errors (validation, permissions, etc.) - show as warning
        toast.error(userMessage);
      } else if (status >= 500) {
        // Server errors - show as error
        toast.error(userMessage);
      } else {
        // Network or other errors - show as error
        toast.error(userMessage);
      }
    }

    return Promise.reject(new Error(userMessage));
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

/**
 * Helper function to make API calls with automatic error toast handling
 * Use this when you want to automatically show error toasts to users
 */
export const apiCall = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<T>(url, config),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.post<T>(url, data, config),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.put<T>(url, data, config),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.patch<T>(url, data, config),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<T>(url, config),
};

/**
 * Helper function to make API calls WITHOUT automatic error toast handling
 * Use this when you want to handle errors manually in your component
 */
export const apiCallSilent = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<T>(url, { ...config, skipErrorToast: true }),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.post<T>(url, data, { ...config, skipErrorToast: true }),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.put<T>(url, data, { ...config, skipErrorToast: true }),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.patch<T>(url, data, { ...config, skipErrorToast: true }),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<T>(url, { ...config, skipErrorToast: true }),
};

// ----------------------------------------------------------------------

export const fetcher = async <T = unknown>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args, {}];

    const res = await axiosInstance.get<T>(url, config);

    return res.data;
  } catch (error) {
    console.error('Fetcher failed:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  chat: '/api/chat',
  kanban: '/api/v1/kanban',
  calendar: '/api/v1/calendar',
  auth: {
    me: '/api/v1/auth/verify',
    signIn: '/api/v1/auth/sign-in',
    signUp: '/api/v1/auth/sign-up',
    signOut: '/api/v1/auth/sign-out',
    google: '/api/v1/auth/google',
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
  // User management endpoints
  users: {
    online: '/api/v1/users/online',
    heartbeat: '/api/v1/users/heartbeat',
  },
  // Field Service Automation API endpoints
  fsa: {
    timeEntries: {
      list: '/api/v1/time-entries',
      create: '/api/v1/time-entries',
      update: (id: string) => `/api/v1/time-entries/${id}`,
      delete: (id: string) => `/api/v1/time-entries/${id}`,
      checkin: '/api/v1/time-entries/checkin',
      checkout: '/api/v1/time-entries/checkout',
      heartbeat: '/api/v1/time-entries/heartbeat',
      activeSessions: '/api/v1/time-entries/sessions/all-active',
      emergencyCheckout: '/api/v1/time-entries/emergency-checkout',
      cleanupStaleSessions: '/api/v1/time-entries/cleanup-stale-sessions',
    },
    workOrders: {
      list: '/api/v1/work-orders',
      create: '/api/v1/work-orders',
      details: (id: string) => `/api/v1/work-orders/${id}`,
      summary: (id: string) => `/api/v1/work-orders/${id}/summary`,
    },
    clients: {
      list: '/api/v1/clients',
      details: (id: string) => `/api/v1/clients/${id}`,
    },
    technicians: {
      list: '/api/v1/technicians',
      details: (id: string) => `/api/v1/technicians/${id}`,
    },
    personnel: {
      list: '/api/v1/personnel',
      details: (id: string) => `/api/v1/personnel/${id}`,
    },
    materials: {
      list: '/api/v1/materials',
      details: (id: string) => `/api/v1/materials/${id}`,
      categories: '/api/v1/materials/categories',
      deleteCategory: (categoryName: string) =>
        `/api/v1/materials/categories/${encodeURIComponent(categoryName)}`,
      bulkImport: '/api/v1/materials/bulk-import',
      toggleActive: (id: string) => `/api/v1/materials/${id}/toggle-active`,
    },
    roles: {
      list: '/api/v1/roles',
      details: (id: string) => `/api/v1/roles/${id}`,
    },
    projects: {
      list: '/api/v1/projects',
      details: (id: string) => `/api/v1/projects/${id}`,
    },
    tasks: {
      list: '/api/v1/tasks',
      details: (id: string) => `/api/v1/tasks/${id}`,
      materials: {
        list: (taskId: string) => `/api/v1/tasks/${taskId}/materials`,
        add: (taskId: string) => `/api/v1/tasks/${taskId}/materials`,
        update: (taskId: string, materialId: string) =>
          `/api/v1/tasks/${taskId}/materials/${materialId}`,
        remove: (taskId: string, materialId: string) =>
          `/api/v1/tasks/${taskId}/materials/${materialId}`,
        stats: (taskId: string) => `/api/v1/tasks/${taskId}/materials/stats`,
      },
    },
    assignments: {
      list: '/api/v1/assignments',
      details: (id: string) => `/api/v1/assignments/${id}`,
    },
    statuses: {
      list: '/api/v1/statuses',
      details: (id: string) => `/api/v1/statuses/${id}`,
    },
    tenants: {
      list: '/api/v1/tenants',
      details: (id: string) => `/api/v1/tenants/${id}`,
      setup: '/api/v1/tenants/setup/',
    },
    reports: {
      list: '/api/v1/reports',
      details: (id: string) => `/api/v1/reports/${id}`,
      submit: (id: string) => `/api/v1/reports/${id}/submit`,
      approve: (id: string) => `/api/v1/reports/${id}/approve`,
      reject: (id: string) => `/api/v1/reports/${id}/reject`,
      materials: (id: string) => `/api/v1/reports/${id}/materials`,
      timeEntries: (id: string) => `/api/v1/reports/${id}/time-entries`,
      attachments: (id: string) => `/api/v1/reports/${id}/attachments`,
      photos: (id: string) => `/api/v1/reports/${id}/photos`,
      signatures: (id: string) => `/api/v1/reports/${id}/signatures`,
      dashboardStats: '/api/v1/reports/dashboard/stats',
      clientReports: (clientId: string) => `/api/v1/reports/client/${clientId}`,
      export: (id: string) => `/api/v1/reports/${id}/export`,
      templates: '/api/v1/reports/templates',
      fromTemplate: (templateId: string) => `/api/v1/reports/templates/${templateId}`,
      generateFromTask: (taskId: string) => `/api/v1/reports/generate/task/${taskId}`,
      generateFromWorkOrder: (workOrderId: string) =>
        `/api/v1/reports/generate/work-order/${workOrderId}`,
      bulkUpdate: '/api/v1/reports/bulk/update',
      bulkExport: '/api/v1/reports/bulk/export',
    },
  },
  notifications: {
    list: '/api/v1/notifications',
    counts: '/api/v1/notifications/counts',
    markRead: '/api/v1/notifications/mark-read',
    archive: '/api/v1/notifications/archive',
  },
  webhook: {
    list: () => axiosInstance.get('/api/v1/webhooks'),
    details: (id: string) => axiosInstance.get(`/api/v1/webhooks/${id}`),
    create: (data: any) => axiosInstance.post('/api/v1/webhooks', data),
    update: (id: string, data: any) => axiosInstance.put(`/api/v1/webhooks/${id}`, data),
    delete: (id: string) => axiosInstance.delete(`/api/v1/webhooks/${id}`),
    test: (id: string) => axiosInstance.post(`/api/v1/webhooks/${id}/test`),
    logs: (id: string, params: any) => axiosInstance.get(`/api/v1/webhooks/${id}/logs`, { params }),
    topics: () => axiosInstance.get('/api/v1/webhooks/topics'),
    regenerateSecret: (id: string) =>
      axiosInstance.post(`/api/v1/webhooks/${id}/regenerate-secret`),
  },
  smsReminders: {
    status: '/api/v1/sms-reminders/status',
    activate: '/api/v1/sms-reminders/activate',
    deactivate: '/api/v1/sms-reminders/deactivate',
    presets: '/api/v1/sms-reminders/presets',
    sendTest: '/api/v1/sms-reminders/send-test',
    test: '/api/v1/sms-reminders/test',
  },
  apiKey: {
    list: () => axiosInstance.get('/api/v1/api-keys'),
    details: (id: string) => axiosInstance.get(`/api/v1/api-keys/${id}`),
    create: (data: any) => axiosInstance.post('/api/v1/api-keys', data),
    update: (id: string, data: any) => axiosInstance.put(`/api/v1/api-keys/${id}`, data),
    delete: (id: string) => axiosInstance.delete(`/api/v1/api-keys/${id}`),
    permissions: () => axiosInstance.get('/api/v1/api-keys/permissions'),
    usage: (id: string) => axiosInstance.get(`/api/v1/api-keys/${id}/usage`),
    test: (id: string) => axiosInstance.post(`/api/v1/api-keys/${id}/test`),
  },
  subscription: {
    status: () => axiosInstance.get('/api/v1/subscription/status'),
    usage: () => axiosInstance.get('/api/v1/subscription/usage'),
    plans: () => axiosInstance.get('/api/v1/subscription/plans'),
    changePlan: (data: { planId: string; billingCycle: string }) =>
      axiosInstance.post('/api/v1/subscription/change-plan', data),
    cancel: () => axiosInstance.post('/api/v1/subscription/cancel'),
    resume: () => axiosInstance.post('/api/v1/subscription/resume'),
    invoices: () => axiosInstance.get('/api/v1/subscription/invoices'),
    paymentMethods: () => axiosInstance.get('/api/v1/subscription/payment-methods'),
    createCheckoutSession: (data: {
      planId: string;
      billingCycle: string;
      successUrl?: string;
      cancelUrl?: string;
      trialPeriodDays?: number;
    }) => axiosInstance.post('/api/v1/subscription/checkout-session', data),
    createPortalSession: () => axiosInstance.post('/api/v1/subscription/billing-portal'),
    checkoutSuccess: (sessionId: string) =>
      axiosInstance.get(`/api/v1/subscription/checkout/success?session_id=${sessionId}`),
    checkoutCancel: (sessionId?: string) =>
      axiosInstance.get(
        `/api/v1/subscription/checkout/cancel${sessionId ? `?session_id=${sessionId}` : ''}`
      ),
  },
} as const;
