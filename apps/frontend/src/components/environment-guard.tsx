'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useEnvironmentAccess } from '@/hooks/use-environment-access';
import { LoadingScreen } from '@/components/loading-screen';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface EnvironmentGuardProps {
  children: React.ReactNode;
  requiredAccess: 'field' | 'office' | 'both';
  fallbackPath?: string;
}

export function EnvironmentGuard({
  children,
  requiredAccess,
  fallbackPath,
}: EnvironmentGuardProps) {
  const router = useRouter();
  const { canAccessField, canAccessOffice, isFieldOperator, isOfficeUser } = useEnvironmentAccess();

  const hasAccess = (() => {
    switch (requiredAccess) {
      case 'field':
        return canAccessField;
      case 'office':
        return canAccessOffice;
      case 'both':
        return canAccessField && canAccessOffice;
      default:
        return false;
    }
  })();

  useEffect(() => {
    if (!hasAccess) {
      // Redirect to appropriate environment based on user's access
      if (isFieldOperator && fallbackPath !== '/field') {
        router.push('/field');
      } else if (isOfficeUser && fallbackPath !== '/dashboard') {
        router.push('/dashboard');
      } else if (fallbackPath) {
        router.push(fallbackPath);
      } else {
        router.push('/dashboard');
      }
    }
  }, [hasAccess, isFieldOperator, isOfficeUser, fallbackPath, router]);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <div className="space-y-3">
              <p>
                You don't have access to this environment.
                {isFieldOperator && ' Redirecting to field environment...'}
                {isOfficeUser && ' Redirecting to office environment...'}
              </p>
              <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm">
                Go to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
