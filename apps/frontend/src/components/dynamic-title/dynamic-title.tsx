'use client';

import { useEffect } from 'react';

import { useTenantAppName } from 'src/hooks/use-tenant-app-name';

// ----------------------------------------------------------------------

type DynamicTitleProps = {
  title?: string;
  suffix?: boolean;
};

export function DynamicTitle({ title, suffix = true }: DynamicTitleProps) {
  const appName = useTenantAppName();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const documentTitle = title
        ? (suffix ? `${title} - ${appName}` : title)
        : appName;

      document.title = documentTitle;
    }
  }, [title, appName, suffix]);

  return null; // This component doesn't render anything visual
}

export default DynamicTitle;