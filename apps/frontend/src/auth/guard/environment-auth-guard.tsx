'use client';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';
import { useEnvironmentAccess } from '../../hooks/use-environment-access';

// ----------------------------------------------------------------------

type EnvironmentAuthGuardProps = {
  children: React.ReactNode;
};

const signInPaths = {
  jwt: paths.auth.jwt.signIn,
};

export function EnvironmentAuthGuard({ children }: EnvironmentAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { authenticated, loading } = useAuthContext();
  const { environmentAccess, isFieldOnly, canAccessDashboard, canAccessField } = useEnvironmentAccess();

  const [isChecking, setIsChecking] = useState(true);

  const createRedirectPath = (currentPath: string) => {
    const queryString = new URLSearchParams({ returnTo: pathname }).toString();
    return `${currentPath}?${queryString}`;
  };

  const getDefaultRoute = () => {
    // If field is not set or null, users can go to dashboard (backward compatibility)
    if (!environmentAccess) {
      return '/dashboard';
    }

    // Field-only users should always go to field
    if (isFieldOnly) {
      return '/field';
    }

    // Dashboard users and "all" users go to dashboard
    return '/dashboard';
  };

  const checkEnvironmentAccess = () => {
    const isFieldPath = pathname.startsWith('/field');
    const isDashboardPath = pathname.startsWith('/dashboard');

    // Allow auth pages, static assets, and API calls
    if (
      pathname.startsWith('/auth') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname === '/'
    ) {
      return true;
    }

    // Check field access
    if (isFieldPath && !canAccessField) {
      return false;
    }

    // Check dashboard access
    if (isDashboardPath && !canAccessDashboard) {
      return false;
    }

    return true;
  };

  const checkPermissions = async (): Promise<void> => {
    if (loading) {
      return;
    }

    if (!authenticated) {
      const { method } = CONFIG.auth;
      const signInPath = signInPaths[method];
      const redirectPath = createRedirectPath(signInPath);
      router.replace(redirectPath);
      return;
    }

    // Check if user has access to current path
    if (!checkEnvironmentAccess()) {
      // Redirect to appropriate default route
      const defaultRoute = getDefaultRoute();
      router.replace(defaultRoute);
      return;
    }

    // If user is on root path, redirect to their default environment
    if (pathname === '/') {
      const defaultRoute = getDefaultRoute();
      router.replace(defaultRoute);
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading, environmentAccess, pathname]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}