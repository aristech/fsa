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
 * Hook to get API URLs (backend automatically resolves tenant)
 */
export function useTenantAPI() {
  const { tenantId, tenantSlug } = useTenant();

  const getURL = useCallback((path: string) => 
    // Backend automatically resolves tenant from database, no need to append parameters
     path
  , []);

  return {
    getURL,
    tenantId,
    tenantSlug,
  };
}
