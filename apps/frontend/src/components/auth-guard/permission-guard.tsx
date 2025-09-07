import type { ReactNode } from 'react';

import { usePermissions } from 'src/hooks/use-permissions';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

interface PermissionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  permissions: string | string[];
  requireAll?: boolean;
}

export function PermissionGuard({
  children,
  fallback = null,
  permissions,
  requireAll = false,
}: PermissionGuardProps) {
  const { canAccess, hasAllPermissions, hasAnyPermission } = usePermissions();

  const hasAccess = requireAll
    ? hasAllPermissions(Array.isArray(permissions) ? permissions : [permissions])
    : canAccess(permissions);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// ----------------------------------------------------------------------

interface RoleGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  roles: string | string[];
}

export function RoleGuard({ children, fallback = null, roles }: RoleGuardProps) {
  const { user } = useAuthContext();

  const userRole = user?.role;
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  const hasAccess = userRole && allowedRoles.includes(userRole);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
