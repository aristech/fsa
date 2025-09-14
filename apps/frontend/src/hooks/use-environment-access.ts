import { useAuthContext } from '../auth/hooks/use-auth-context';

export interface EnvironmentAccess {
  canAccessField: boolean;
  canAccessDashboard: boolean;
  isFieldOnly: boolean;
  isDashboardOnly: boolean;
  hasAllAccess: boolean;
  environmentAccess: 'dashboard' | 'field' | 'all' | null;
}

export function useEnvironmentAccess(): EnvironmentAccess {
  const { user } = useAuthContext();

  const environmentAccess = user?.environmentAccess || null;

  const canAccessField = environmentAccess === 'field' || environmentAccess === 'all';
  const canAccessDashboard = environmentAccess === 'dashboard' || environmentAccess === 'all' || environmentAccess === null;

  const isFieldOnly = environmentAccess === 'field';
  const isDashboardOnly = environmentAccess === 'dashboard';
  const hasAllAccess = environmentAccess === 'all';

  return {
    canAccessField,
    canAccessDashboard,
    isFieldOnly,
    isDashboardOnly,
    hasAllAccess,
    environmentAccess,
  };
}
