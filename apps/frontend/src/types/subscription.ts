import type { IDateValue } from './common';

// ----------------------------------------------------------------------

export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';

export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'trial' | 'past_due';

export type BillingCycle = 'monthly' | 'yearly';

// ----------------------------------------------------------------------

export interface ISubscriptionPlan {
  planId: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  price: {
    monthly: number;
    yearly: number;
  };
  highlights: string[];
  highlightKeys: string[];
  trialDays: number;
  popular: boolean;
  translationKeys: {
    name: string;
    description: string;
    highlights: string[];
    selectPlan: string;
    currentPlan: string;
    mostPopular: string;
    freeTrial: string;
    trialDays: string;
    monthly: string;
    yearly: string;
    perMonth: string;
    perYear: string;
    savings: string;
    features: string;
    getStarted: string;
    upgrade: string;
    contactSales: string;
  };
  stripePriceId?: {
    monthly: string;
    yearly: string;
  };
}

export interface ISubscriptionUsage {
  users: {
    current: number;
    limit: number;
    percentage: number;
    unlimited: boolean;
  };
  clients: {
    current: number;
    limit: number;
    percentage: number;
    unlimited: boolean;
  };
  workOrders: {
    current: number;
    limit: number;
    percentage: number;
    unlimited: boolean;
  };
  sms: {
    current: number;
    limit: number;
    percentage: number;
    unlimited: boolean;
    available: boolean;
  };
  storage: {
    current: number;
    limit: number;
    percentage: number;
    unlimited: boolean;
  };
}

export interface ISubscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialEndDate?: IDateValue;
  nextBillingDate?: IDateValue;
  currentPeriodStart: IDateValue;
  currentPeriodEnd: IDateValue;
  cancelAtPeriodEnd: boolean;
  usage: ISubscriptionUsage;
}

export interface IInvoice {
  id: string;
  date: IDateValue;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
  invoiceUrl?: string;
}

export interface IPaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

export interface ITenantBranding {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  companyInfo: {
    website?: string;
    description?: string;
    industry?: string;
  };
}

// ----------------------------------------------------------------------

export interface ISubscriptionContext {
  subscription: ISubscription | null;
  usage: ISubscriptionUsage | null;
  checkLimit: (resource: keyof ISubscriptionUsage) => {
    allowed: boolean;
    warning: boolean;
    percentage?: number;
  };
  refreshUsage: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

// ----------------------------------------------------------------------

export interface IPlanComparisonProps {
  open: boolean;
  onClose: () => void;
  plans: ISubscriptionPlan[];
  currentPlan: string;
  onSelectPlan: (planId: string, billingCycle: BillingCycle) => void;
}

export interface ICurrentPlanCardProps {
  subscription: ISubscription;
  onChangePlan: () => void;
  onManageBilling: () => void;
}

export interface IUsageOverviewCardProps {
  usage: ISubscriptionUsage;
}

export interface IBillingHistoryCardProps {
  invoices: IInvoice[];
}

export interface IPlanUpgradeCardProps {
  currentPlan: string;
  onUpgrade: () => void;
}

export interface IPaymentMethodCardProps {
  paymentMethods: IPaymentMethod[];
  onAddPaymentMethod: () => void;
  onSetDefault: (id: string) => void;
}
