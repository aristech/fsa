import { useMemo } from 'react';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export interface UserPermissions {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccess: (requiredPermissions: string | string[]) => boolean;
}

// ----------------------------------------------------------------------

export function usePermissions(): UserPermissions {
  const { user } = useAuthContext();

  const permissions = useMemo(() => {
    // If user is tenant owner, grant all permissions
    if (user?.isTenantOwner) {
      return Object.values(PERMISSIONS);
    }

    // If user has permissions, use them
    if (user?.permissions) {
      return user.permissions;
    }

    // For admin role, grant all permissions
    if (user?.role === 'admin') {
      return Object.values(PERMISSIONS);
    }

    // Otherwise, return empty array
    return [];
  }, [user]);

  const hasPermission = useMemo(
    () => (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const hasAnyPermission = useMemo(
    () => (requiredPermissions: string[]) =>
      requiredPermissions.some((permission) => permissions.includes(permission)),
    [permissions]
  );

  const hasAllPermissions = useMemo(
    () => (requiredPermissions: string[]) =>
      requiredPermissions.every((permission) => permissions.includes(permission)),
    [permissions]
  );

  const canAccess = useMemo(
    () => (requiredPermissions: string | string[]) => {
      const perms = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];
      return hasAnyPermission(perms);
    },
    [hasAnyPermission]
  );

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
  };
}

// ----------------------------------------------------------------------

// Permission constants for easy reference
export const PERMISSIONS = {
  // Work Orders
  WORK_ORDERS_VIEW: 'work_orders.view',
  WORK_ORDERS_CREATE: 'work_orders.create',
  WORK_ORDERS_EDIT: 'work_orders.edit',
  WORK_ORDERS_DELETE: 'work_orders.delete',
  WORK_ORDERS_ASSIGN: 'work_orders.assign',
  WORK_ORDERS_VIEW_OWN: 'work_orders.view_own',
  WORK_ORDERS_EDIT_OWN: 'work_orders.edit_own',

  // Projects
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_EDIT: 'projects.edit',
  PROJECTS_DELETE: 'projects.delete',

  // Tasks
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_EDIT: 'tasks.edit',
  TASKS_DELETE: 'tasks.delete',
  TASKS_VIEW_OWN: 'tasks.view_own',
  TASKS_EDIT_OWN: 'tasks.edit_own',

  // Clients
  CLIENTS_VIEW: 'clients.view',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_EDIT: 'clients.edit',
  CLIENTS_DELETE: 'clients.delete',

  // Personnel
  PERSONNEL_VIEW: 'personnel.view',
  PERSONNEL_CREATE: 'personnel.create',
  PERSONNEL_EDIT: 'personnel.edit',
  PERSONNEL_DELETE: 'personnel.delete',

  // Calendar
  CALENDAR_VIEW: 'calendar.view',
  CALENDAR_EDIT: 'calendar.edit',
  CALENDAR_VIEW_OWN: 'calendar.view_own',
  CALENDAR_EDIT_OWN: 'calendar.edit_own',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // System Management
  ROLES_MANAGE: 'roles.manage',
  STATUSES_MANAGE: 'statuses.manage',
  SETTINGS_MANAGE: 'settings.manage',
  TENANT_MANAGE: 'tenant.manage',

  // Admin
  ADMIN_ACCESS: 'admin.access',
} as const;
