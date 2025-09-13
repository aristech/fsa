// import { useAuthContext } from '../auth/hooks/use-auth-context'; // TODO: Use when needed

export interface EnvironmentAccess {
  canAccessField: boolean;
  canAccessOffice: boolean;
  isFieldOperator: boolean;
  isOfficeUser: boolean;
  hasBothAccess: boolean;
}

export function useEnvironmentAccess(): EnvironmentAccess {
  // const { user } = useAuthContext(); // TODO: Use user data when needed

  // For now, we'll use mock data since personnel is not in the auth context
  // TODO: Add personnel to auth context or fetch separately
  const mockPersonnel: { environmentAccess: 'office' | 'field' | 'both' } = {
    environmentAccess: 'both', // Default to both for testing
  };

  const canAccessField =
    mockPersonnel?.environmentAccess === 'field' || mockPersonnel?.environmentAccess === 'both';

  const canAccessOffice =
    mockPersonnel?.environmentAccess === 'office' || mockPersonnel?.environmentAccess === 'both';

  const isFieldOperator = mockPersonnel?.environmentAccess === 'field';
  const isOfficeUser = mockPersonnel?.environmentAccess === 'office';
  const hasBothAccess = mockPersonnel?.environmentAccess === 'both';

  return {
    canAccessField,
    canAccessOffice,
    isFieldOperator,
    isOfficeUser,
    hasBothAccess,
  };
}
