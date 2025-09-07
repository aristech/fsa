'use client';

import type { NavItemProps } from './types';

import { useMemo } from 'react';

import { usePermissions } from 'src/hooks/use-permissions';

// ----------------------------------------------------------------------

interface NavSectionPermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string | string[];
  allowedRoles?: string[];
}

export function NavSectionPermissionGuard({
  children,
  requiredPermissions,
  allowedRoles,
}: NavSectionPermissionGuardProps) {
  const { hasPermission, canAccess } = usePermissions();

  const canShow = useMemo(() => {
    // If no restrictions, show the item
    if (!requiredPermissions && !allowedRoles) {
      return true;
    }

    // Check permissions if specified
    if (requiredPermissions) {
      const hasRequiredPermissions = canAccess(requiredPermissions);
      if (!hasRequiredPermissions) {
        return false;
      }
    }

    // Check roles if specified
    if (allowedRoles && allowedRoles.length > 0) {
      // This would need to be implemented based on your role system
      // For now, we'll assume all users can see items with role restrictions
      // You can implement role checking here if needed
    }

    return true;
  }, [requiredPermissions, allowedRoles, hasPermission, canAccess]);

  if (!canShow) {
    return null;
  }

  return <>{children}</>;
}

// ----------------------------------------------------------------------

interface NavItemPermissionGuardProps {
  item: NavItemProps;
  children: React.ReactNode;
}

export function NavItemPermissionGuard({ item, children }: NavItemPermissionGuardProps) {
  const { hasPermission, canAccess } = usePermissions();

  const canShow = useMemo(() => {
    // If no restrictions, show the item
    if (!item.requiredPermissions && !item.allowedRoles) {
      return true;
    }

    // Check permissions if specified
    if (item.requiredPermissions) {
      const hasRequiredPermissions = canAccess(item.requiredPermissions);
      if (!hasRequiredPermissions) {
        return false;
      }
    }

    // Check roles if specified
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      // This would need to be implemented based on your role system
      // For now, we'll assume all users can see items with role restrictions
      // You can implement role checking here if needed
    }

    return true;
  }, [item.requiredPermissions, item.allowedRoles, hasPermission, canAccess]);

  if (!canShow) {
    return null;
  }

  return <>{children}</>;
}
