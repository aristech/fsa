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
  // Field Service Automation API endpoints
  fsa: {
    timeEntries: {
      list: '/api/v1/time-entries',
      create: '/api/v1/time-entries',
      update: (id: string) => `/api/v1/time-entries/${id}`,
      delete: (id: string) => `/api/v1/time-entries/${id}`,
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
      deleteCategory: (categoryName: string) => `/api/v1/materials/categories/${encodeURIComponent(categoryName)}`,
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
  },
  notifications: {
    list: '/api/v1/notifications',
    counts: '/api/v1/notifications/counts',
    markRead: '/api/v1/notifications/mark-read',
    archive: '/api/v1/notifications/archive',
  },
} as const;
