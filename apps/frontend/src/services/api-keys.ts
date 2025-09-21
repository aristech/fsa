import { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface ApiKey {
  _id: string;
  name: string;
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  personnelId?: {
    _id: string;
    user: {
      _id: string;
      name: string;
      email: string;
    };
    role?: {
      _id: string;
      name: string;
      permissions: string[];
    };
    employeeId: string;
  };
  permissions: string[];
  lastUsedAt?: string;
  usageCount: number;
  rateLimitPerHour: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyFormData {
  name: string;
  personnelId: string; // Required - personnel to create key for
  expiresAt?: string;
  rateLimitPerHour?: number;
}

export interface ApiKeyUsageStats {
  totalUsage: number;
  lastUsedAt?: string;
  rateLimitPerHour: number;
  createdAt: string;
  daysSinceCreation: number;
  avgUsagePerDay: number;
}

export interface ApiKeyStatus {
  valid: boolean;
  active: boolean;
  expired: boolean;
  permissions: string[];
  rateLimitPerHour: number;
  expiresAt?: string;
}

// ----------------------------------------------------------------------

export const apiKeysApi = {
  // Get all API keys
  getApiKeys: async (): Promise<{ success: boolean; data: ApiKey[] }> => {
    const response = await endpoints.apiKey.list();
    return response.data;
  },

  // Get a specific API key
  getApiKey: async (id: string): Promise<{ success: boolean; data: ApiKey }> => {
    const response = await endpoints.apiKey.details(id);
    return response.data;
  },

  // Create a new API key
  createApiKey: async (
    data: ApiKeyFormData
  ): Promise<{
    success: boolean;
    data: ApiKey;
    apiKey: string;
    message: string;
  }> => {
    const response = await endpoints.apiKey.create(data);
    return response.data;
  },

  // Update an API key
  updateApiKey: async (
    id: string,
    data: Partial<ApiKeyFormData>
  ): Promise<{
    success: boolean;
    data: ApiKey;
  }> => {
    const response = await endpoints.apiKey.update(id, data);
    return response.data;
  },

  // Delete an API key
  deleteApiKey: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await endpoints.apiKey.delete(id);
    return response.data;
  },

  // Get available permissions
  getPermissions: async (): Promise<{ success: boolean; data: string[] }> => {
    const response = await endpoints.apiKey.permissions();
    return response.data;
  },

  // Get API key usage statistics
  getUsageStats: async (id: string): Promise<{ success: boolean; data: ApiKeyUsageStats }> => {
    const response = await endpoints.apiKey.usage(id);
    return response.data;
  },

  // Test API key
  testApiKey: async (id: string): Promise<{ success: boolean; data: ApiKeyStatus }> => {
    const response = await endpoints.apiKey.test(id);
    return response.data;
  },
};
