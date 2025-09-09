import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export interface Role {
  _id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListResponse {
  success: boolean;
  data: Role[];
}

export interface RoleResponse {
  success: boolean;
  data: Role;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

// ----------------------------------------------------------------------

export const roleService = {
  // Get roles list
  getRoles: async (params?: {
    page?: number;
    limit?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }): Promise<RoleListResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.roles.list, { params });
    return response.data;
  },

  // Get role by ID
  getRole: async (id: string): Promise<RoleResponse> => {
    const response = await axiosInstance.get(endpoints.fsa.roles.details(id));
    return response.data;
  },

  // Create role
  createRole: async (data: CreateRoleRequest): Promise<RoleResponse> => {
    const response = await axiosInstance.post(endpoints.fsa.roles.list, data);
    return response.data;
  },

  // Update role
  updateRole: async (id: string, data: UpdateRoleRequest): Promise<RoleResponse> => {
    const response = await axiosInstance.put(endpoints.fsa.roles.details(id), data);
    return response.data;
  },

  // Delete role
  deleteRole: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(endpoints.fsa.roles.details(id));
    return response.data;
  },
};
