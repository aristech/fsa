export type TenantType = {
  _id: string;
  name: string;
  slug: string;
  email: string;
  isActive: boolean;
  subscription?: {
    plan: string;
    status: string;
    billingCycle: string;
    limits?: {
      maxUsers: number;
      maxClients: number;
      maxWorkOrdersPerMonth: number;
      maxSmsPerMonth: number;
      maxStorageGB: number;
    };
    usage?: {
      currentUsers: number;
      currentClients: number;
      workOrdersThisMonth: number;
      smsThisMonth: number;
      storageUsedGB: number;
    };
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyInfo?: {
      website?: string;
      description?: string;
      industry?: string;
    };
  };
} | null;

export type UserType = {
  id?: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenant?: TenantType;
  accessToken?: string;
  permissions?: string[];
  isTenantOwner?: boolean;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
  environmentAccess?: 'dashboard' | 'field' | 'all';
} | null;

export type AuthState = {
  user: UserType;
  loading: boolean;
};

export type AuthContextValue = {
  user: UserType;
  tenant: TenantType;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  checkUserSession?: () => Promise<void>;
};
