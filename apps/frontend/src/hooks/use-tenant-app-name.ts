'use client';

import { safeDisplayText } from 'src/utils/html-utils';

import { CONFIG } from 'src/global-config';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

/**
 * Hook to get dynamic app name based on tenant branding
 * Falls back to default app name if no tenant company name is available
 */
export function useTenantAppName(): string {
  const { tenant } = useAuthContext();

  // Use tenant company name if available, otherwise fall back to default app name
  return safeDisplayText(tenant?.name) || CONFIG.appName;
}

/**
 * Hook to get tenant branding information
 */
export function useTenantBranding() {
  const { tenant } = useAuthContext();

  return {
    appName: safeDisplayText(tenant?.name) || CONFIG.appName,
    logoUrl: tenant?.branding?.logoUrl,
    hasCustomLogo: Boolean(tenant?.branding?.logoUrl),
    companyInfo: tenant?.branding?.companyInfo,
    tenant,
  };
}
