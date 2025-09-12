import { useState, useEffect, useCallback } from 'react';

import { permissionService, type UserPermissionContext } from 'src/lib/services/permission-service';

// ----------------------------------------------------------------------

export interface UsePermissionServiceReturn {
  // User context
  userContext: UserPermissionContext | null;
  isLoading: boolean;
  error: string | null;

  // Permission checking functions
  hasPermission: (permission: string) => Promise<boolean>;
  hasAnyPermission: (permissions: string[]) => Promise<boolean>;
  hasAllPermissions: (permissions: string[]) => Promise<boolean>;
  canAccessResource: (resource: string, action: string) => Promise<boolean>;

  // Cached permission checks (for UI components)
  checkPermissionCached: (permission: string) => boolean;
  checkAnyPermissionCached: (permissions: string[]) => boolean;
  checkAllPermissionsCached: (permissions: string[]) => boolean;

  // Utility functions
  refreshPermissions: () => Promise<void>;
  isTenantOwner: boolean;
  userRole: string | null;
}

// ----------------------------------------------------------------------

export function usePermissionService(): UsePermissionServiceReturn {
  const [userContext, setUserContext] = useState<UserPermissionContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user permissions on mount
  const loadUserPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const context = await permissionService.getCurrentUserPermissions();
      setUserContext(context);
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  // Permission checking functions
  const hasPermission = useCallback(async (permission: string): Promise<boolean> => {
    try {
      return await permissionService.hasPermission(permission);
    } catch (err) {
      console.error('Permission check failed:', err);
      return false;
    }
  }, []);

  const hasAnyPermission = useCallback(async (permissions: string[]): Promise<boolean> => {
    try {
      return await permissionService.hasAnyPermission(permissions);
    } catch (err) {
      console.error('Permission check failed:', err);
      return false;
    }
  }, []);

  const hasAllPermissions = useCallback(async (permissions: string[]): Promise<boolean> => {
    try {
      return await permissionService.hasAllPermissions(permissions);
    } catch (err) {
      console.error('Permission check failed:', err);
      return false;
    }
  }, []);

  const canAccessResource = useCallback(
    async (resource: string, action: string): Promise<boolean> => {
      try {
        return await permissionService.canAccessResource(resource, action);
      } catch (err) {
        console.error('Resource access check failed:', err);
        return false;
      }
    },
    []
  );

  // Cached permission checks (for UI components that need immediate results)
  const checkPermissionCached = useCallback(
    (permission: string): boolean => {
      if (!userContext) return false;
      if (userContext.isTenantOwner) return true;
      return userContext.permissions.includes(permission);
    },
    [userContext]
  );

  const checkAnyPermissionCached = useCallback(
    (permissions: string[]): boolean => {
      if (!userContext) return false;
      if (userContext.isTenantOwner) return true;
      return permissions.some((permission) => userContext.permissions.includes(permission));
    },
    [userContext]
  );

  const checkAllPermissionsCached = useCallback(
    (permissions: string[]): boolean => {
      if (!userContext) return false;
      if (userContext.isTenantOwner) return true;
      return permissions.every((permission) => userContext.permissions.includes(permission));
    },
    [userContext]
  );

  // Utility functions
  const refreshPermissions = useCallback(async () => {
    await loadUserPermissions();
  }, [loadUserPermissions]);

  return {
    // User context
    userContext,
    isLoading,
    error,

    // Permission checking functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,

    // Cached permission checks
    checkPermissionCached,
    checkAnyPermissionCached,
    checkAllPermissionsCached,

    // Utility functions
    refreshPermissions,
    isTenantOwner: userContext?.isTenantOwner || false,
    userRole: userContext?.role || null,
  };
}

// ----------------------------------------------------------------------

export default usePermissionService;
