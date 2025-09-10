import type { ReactNode } from 'react';

import { usePermissionService } from 'src/hooks/use-permission-service';

// ----------------------------------------------------------------------

export interface PermissionServiceGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  resource?: string;
  action?: string;
  fallback?: ReactNode;
  showError?: boolean;
}

// ----------------------------------------------------------------------

export function PermissionServiceGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  fallback = null,
  showError = false,
}: PermissionServiceGuardProps) {
  const {
    checkPermissionCached,
    checkAnyPermissionCached,
    checkAllPermissionsCached,
    isLoading,
    error,
  } = usePermissionService();

  // Show loading state
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Show error state if requested
  if (error && showError) {
    return <div style={{ color: 'red', padding: '8px' }}>Permission Error: {error}</div>;
  }

  let hasAccess = false;

  // Check single permission
  if (permission) {
    hasAccess = checkPermissionCached(permission);
  }
  // Check multiple permissions
  else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? checkAllPermissionsCached(permissions)
      : checkAnyPermissionCached(permissions);
  }
  // Check resource-action access
  else if (resource && action) {
    // For resource-action checks, we need to make an API call
    // For now, we'll use a simplified check based on the permission pattern
    const permissionPattern = `${resource}.${action}`;
    hasAccess = checkPermissionCached(permissionPattern);
  }
  // Default: allow access (no permission requirements)
  else {
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// ----------------------------------------------------------------------

export default PermissionServiceGuard;
