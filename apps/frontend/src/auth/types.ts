export type TenantType = {
  _id: string;
  name: string;
  slug: string;
  email: string;
  isActive: boolean;
} | null;

export type UserType = {
  _id: string;
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