'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useEnvironmentAccess } from 'src/hooks/use-environment-access';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const { authenticated, loading } = useAuthContext();
  const { environmentAccess, isFieldOnly } = useEnvironmentAccess();

  useEffect(() => {
    if (loading) return;

    if (!authenticated) {
      router.replace('/auth/jwt/sign-in');
      return;
    }

    // Redirect based on environment access
    const defaultRoute = (() => {
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
    })();

    router.replace(defaultRoute);
  }, [authenticated, loading, environmentAccess, isFieldOnly, router]);

  return <SplashScreen />;
}