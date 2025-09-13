'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Box, Alert, Button, AlertTitle, Typography } from '@mui/material';

import { Iconify } from './iconify';
import { useEnvironmentAccess } from '../hooks/use-environment-access';

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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 4,
        }}
      >
        <Alert severity="warning" sx={{ maxWidth: 'md' }}>
          <Iconify icon="eva:alert-triangle-fill" width={24} />
          <AlertTitle>Access Denied</AlertTitle>
          <Typography variant="body2" sx={{ mt: 2 }}>
            You don&apos;t have access to this environment.
            {isFieldOperator && ' Redirecting to field environment...'}
            {isOfficeUser && ' Redirecting to office environment...'}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button onClick={() => router.push('/dashboard')} variant="outlined" size="small">
              Go to Dashboard
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}
