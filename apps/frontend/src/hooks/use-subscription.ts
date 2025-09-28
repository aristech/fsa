import type {
  BillingCycle,
  ISubscription,
  ISubscriptionPlan,
  ISubscriptionUsage,
} from 'src/types/subscription';

import { useState, useEffect, useCallback } from 'react';

import { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export function useSubscription() {
  const [subscription, setSubscription] = useState<ISubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await endpoints.subscription.status();
      setSubscription(response.data.data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsage = useCallback(async (): Promise<ISubscriptionUsage | null> => {
    try {
      const response = await endpoints.subscription.usage();
      return response.data.data;
    } catch (err) {
      console.error('Failed to fetch usage:', err);
      return null;
    }
  }, []);

  const changePlan = useCallback(
    async (planId: string, billingCycle: BillingCycle): Promise<boolean> => {
      try {
        const response = await endpoints.subscription.changePlan({
          planId,
          billingCycle,
        });

        if (response.data.success) {
          await fetchSubscription();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to change plan:', err);
        return false;
      }
    },
    [fetchSubscription]
  );

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const response = await endpoints.subscription.cancel();

      if (response.data.success) {
        await fetchSubscription();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      return false;
    }
  }, [fetchSubscription]);

  const resumeSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const response = await endpoints.subscription.resume();

      if (response.data.success) {
        await fetchSubscription();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to resume subscription:', err);
      return false;
    }
  }, [fetchSubscription]);

  // Don't auto-fetch subscription data - let components decide when to fetch
  // useEffect(() => {
  //   fetchSubscription();
  // }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    fetchSubscription,
    fetchUsage,
    changePlan,
    cancelSubscription,
    resumeSubscription,
  };
}

// ----------------------------------------------------------------------

export function usePlans() {
  const [plans, setPlans] = useState<ISubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await endpoints.subscription.plans();
      setPlans(response.data.data.plans);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, error, fetchPlans };
}

// ----------------------------------------------------------------------

export function useSubscriptionContext() {
  const [subscription, setSubscription] = useState<ISubscription | null>(null);
  const [usage, setUsage] = useState<ISubscriptionUsage | null>(null);

  const checkLimit = useCallback(
    (resource: keyof ISubscriptionUsage) => {
      if (!usage) return { allowed: true, warning: false };

      const resourceUsage = usage[resource];
      if (!resourceUsage || resourceUsage.unlimited) {
        return { allowed: true, warning: false };
      }

      const percentage = resourceUsage.percentage;
      return {
        allowed: percentage < 100,
        warning: percentage >= 80,
        percentage,
      };
    },
    [usage]
  );

  const refreshUsage = useCallback(async () => {
    try {
      const response = await endpoints.subscription.usage();
      setUsage(response.data.data);
    } catch (err) {
      console.error('Failed to refresh usage:', err);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const response = await endpoints.subscription.status();
      setSubscription(response.data.data);
    } catch (err) {
      console.error('Failed to refresh subscription:', err);
    }
  }, []);

  return {
    subscription,
    usage,
    checkLimit,
    refreshUsage,
    refreshSubscription,
  };
}
