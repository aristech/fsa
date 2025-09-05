'use client';

import { useCallback } from 'react';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function useTenant() {
  const { user, tenant } = useAuthContext();

  return {
    tenant,
    tenantId: tenant?._id || user?.tenantId || null,
    tenantSlug: tenant?.slug || null,
    tenantName: tenant?.name || null,
    isAuthenticated: !!user,
    user,
  };
}

// ----------------------------------------------------------------------

/**
 * Hook to get tenant-scoped API URLs
 */
export function useTenantAPI() {
  const { tenantId, tenantSlug } = useTenant();

  const getURL = useCallback(
    (path: string, useSlug = false) => {
      const identifier = useSlug ? tenantSlug : tenantId;
      if (!identifier) return path;

      const separator = path.includes('?') ? '&' : '?';
      const param = useSlug ? 'tenantSlug' : 'tenantId';
      return `${path}${separator}${param}=${identifier}`;
    },
    [tenantId, tenantSlug]
  );

  return {
    getURL,
    tenantId,
    tenantSlug,
  };
}
