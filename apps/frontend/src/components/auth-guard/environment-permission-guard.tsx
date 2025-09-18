'use client';

import { Box, Alert, Button, Typography } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useEnvironmentAccess } from '../../hooks/use-environment-access';

// ----------------------------------------------------------------------

interface EnvironmentPermissionGuardProps {
  children: React.ReactNode;
  requiresEnvironment?: 'field' | 'dashboard' | 'all';
  fallback?: React.ReactNode;
}

export function EnvironmentPermissionGuard({
  children,
  requiresEnvironment,
  fallback,
}: EnvironmentPermissionGuardProps) {
  const router = useRouter();
  const { canAccessField, canAccessDashboard, environmentAccess } = useEnvironmentAccess();

  const hasAccess = () => {
    if (!requiresEnvironment) return true;

    switch (requiresEnvironment) {
      case 'field':
        return canAccessField;
      case 'dashboard':
        return canAccessDashboard;
      case 'all':
        return environmentAccess === 'all';
      default:
        return true;
    }
  };

  const getDefaultRoute = () => {
    if (!environmentAccess) return '/dashboard';
    if (environmentAccess === 'field') return '/field';
    return '/dashboard';
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" p={3}>
      <Box textAlign="center" maxWidth={480}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don&apos;t have permission to access this area. Your account is configured for{' '}
            {environmentAccess === 'field'
              ? 'field operations only'
              : environmentAccess === 'dashboard'
                ? 'dashboard access only'
                : 'limited access'}
            .
          </Typography>
        </Alert>

        <Button variant="contained" onClick={() => router.replace(getDefaultRoute())}>
          Go to {environmentAccess === 'field' ? 'Field' : 'Dashboard'}
        </Button>
      </Box>
    </Box>
  );
}
