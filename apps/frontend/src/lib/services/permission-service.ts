import axiosInstance from '../axios';

// ----------------------------------------------------------------------

export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
  userRole?: string;
  userPermissions?: string[];
}

export interface UserPermissionContext {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  isTenantOwner: boolean;
}

export interface PermissionCheckRequest {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  resource?: string;
  action?: string;
}

export interface PermissionsByCategory {
  [category: string]: string[];
}

// ----------------------------------------------------------------------

export const permissionService = {
  // Get all available permissions
  async getAllPermissions(): Promise<{
    permissions: string[];
    permissionsByCategory: PermissionsByCategory;
  }> {
    const response = await axiosInstance.get('/api/v1/permissions');
    return response.data.data;
  },

  // Get current user's permissions
  async getCurrentUserPermissions(): Promise<UserPermissionContext> {
    const response = await axiosInstance.get('/api/v1/permissions/me');
    return response.data.data;
  },

  // Get specific user's permissions (admin only)
  async getUserPermissions(userId: string): Promise<UserPermissionContext> {
    const response = await axiosInstance.get(`/api/v1/permissions/user/${userId}`);
    return response.data.data;
  },

  // Check if current user has specific permission(s)
  async checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    const response = await axiosInstance.post('/api/v1/permissions/check', request);
    return response.data.data;
  },

  // Check if user has a specific permission
  async hasPermission(permission: string): Promise<boolean> {
    const result = await this.checkPermission({ permission });
    return result.hasPermission;
  },

  // Check if user has any of the specified permissions
  async hasAnyPermission(permissions: string[]): Promise<boolean> {
    const result = await this.checkPermission({ permissions, requireAll: false });
    return result.hasPermission;
  },

  // Check if user has all of the specified permissions
  async hasAllPermissions(permissions: string[]): Promise<boolean> {
    const result = await this.checkPermission({ permissions, requireAll: true });
    return result.hasPermission;
  },

  // Check if user can access a specific resource
  async canAccessResource(resource: string, action: string): Promise<boolean> {
    const result = await this.checkPermission({ resource, action });
    return result.hasPermission;
  },

  // Validate permission format
  async validatePermission(permission: string): Promise<boolean> {
    const response = await axiosInstance.post('/api/v1/permissions/validate', { permission });
    return response.data.data.isValid;
  },

  // Get permissions by category
  async getPermissionsByCategory(): Promise<PermissionsByCategory> {
    const { permissionsByCategory } = await this.getAllPermissions();
    return permissionsByCategory;
  },
};

// ----------------------------------------------------------------------

export default permissionService;
