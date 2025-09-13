import { useAuth } from '@/auth/context/auth-provider';

export interface EnvironmentAccess {
  canAccessField: boolean;
  canAccessOffice: boolean;
  isFieldOperator: boolean;
  isOfficeUser: boolean;
  hasBothAccess: boolean;
}

export function useEnvironmentAccess(): EnvironmentAccess {
  const { user, personnel } = useAuth();

  const canAccessField =
    personnel?.environmentAccess === 'field' || personnel?.environmentAccess === 'both';

  const canAccessOffice =
    personnel?.environmentAccess === 'office' || personnel?.environmentAccess === 'both';

  const isFieldOperator = personnel?.environmentAccess === 'field';
  const isOfficeUser = personnel?.environmentAccess === 'office';
  const hasBothAccess = personnel?.environmentAccess === 'both';

  return {
    canAccessField,
    canAccessOffice,
    isFieldOperator,
    isOfficeUser,
    hasBothAccess,
  };
}
