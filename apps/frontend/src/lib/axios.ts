import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/global-config';

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
    const message = error?.response?.data?.message || error?.message || 'Something went wrong!';

    // Don't log 401 errors as they're expected for authentication checks
    if (error?.response?.status !== 401) {
      console.error('Axios error:', message);
    }

    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;

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
} as const;
