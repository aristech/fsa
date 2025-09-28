import type { BoxProps } from '@mui/material/Box';
import type { BillingCycle } from 'src/types/subscription';

import { useState, useEffect } from 'react';
import { useTabs } from 'minimal-shared/hooks';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { usePlans, useSubscription } from 'src/hooks/use-subscription';
import { useSubscriptionTranslations } from 'src/hooks/use-subscription-translations';

import { endpoints } from 'src/lib/axios';

import { MotionViewport } from 'src/components/animate';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { FloatLine } from './components/svg-elements';
import { SectionTitle } from './components/section-title';
import { SubscriptionPlanCard } from './components/subscription-plan-card';

// ----------------------------------------------------------------------

export function HomeSubscriptionPricing({ sx, ...other }: BoxProps) {
  const tabs = useTabs('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const { subscription } = useSubscription();
  const { authenticated, tenant } = useAuthContext();
  const t = useSubscriptionTranslations();

  // Ensure the tab value matches an available plan
  useEffect(() => {
    if (plans.length > 0) {
      const availablePlanNames = plans.map((plan) => plan.name);
      // Set the first plan as default if no tab is selected or if current tab is invalid
      if (!tabs.value || !availablePlanNames.includes(tabs.value)) {
        tabs.onChange({} as React.SyntheticEvent, plans[0].name);
      }
    }
  }, [plans, tabs]);

  const handleBillingCycleChange = (
    _: React.MouseEvent<HTMLElement>,
    newCycle: BillingCycle | null
  ) => {
    if (newCycle !== null) {
      setBillingCycle(newCycle);
    }
  };

  const handleSelectPlan = async (planId: string, cycle: BillingCycle) => {
    console.log('handleSelectPlan called:', {
      planId,
      cycle,
      authenticated,
      tenant: tenant?.subscription?.plan,
    });
    setLoading(planId);
    setError(null); // Clear any previous errors
    try {
      // Route based on authentication status
      if (!authenticated) {
        await handleUnauthenticatedPlanSelection(planId, cycle);
      } else {
        await handleAuthenticatedPlanChange(planId, cycle);
      }
    } catch (err) {
      console.error('Failed to select plan:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to process plan selection. Please try again.'
      );
    } finally {
      setLoading(null);
    }
  };

  const handleUnauthenticatedPlanSelection = async (planId: string, cycle: BillingCycle) => {
    console.log('handleUnauthenticatedPlanSelection:', { planId, cycle });
    if (planId === 'enterprise') {
      // Enterprise plan - redirect to contact sales
      console.log('Redirecting to contact sales for enterprise');
      window.open('/contact-sales?plan=enterprise', '_blank');
      return;
    }

    if (planId === 'free') {
      // Free plan - redirect to sign-up for account creation
      console.log('Redirecting to sign-up for free plan');
      window.location.href = `/auth/jwt/sign-up?plan=free&cycle=${cycle}`;
      return;
    }

    // Paid plans - redirect to sign-up with trial
    console.log('Redirecting to sign-up with trial for paid plan');
    window.location.href = `/auth/jwt/sign-up?plan=${planId}&cycle=${cycle}&trial=true`;
  };

  const handleAuthenticatedPlanChange = async (planId: string, cycle: BillingCycle) => {
    const currentPlan = tenant?.subscription?.plan;
    console.log('handleAuthenticatedPlanChange:', { planId, cycle, currentPlan });

    if (currentPlan === planId) {
      // Already on this plan
      console.log('Already on this plan, no action needed');
      return;
    }

    if (planId === 'enterprise') {
      // Enterprise plan - redirect to contact sales
      console.log('Redirecting to contact sales for enterprise upgrade');
      window.open('/contact-sales?plan=enterprise&current=' + currentPlan, '_blank');
      return;
    }

    // Create Stripe Checkout session for plan change
    console.log('Creating Stripe Checkout session...');
    try {
      const response = await endpoints.subscription.createCheckoutSession({
        planId,
        billingCycle: cycle,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/?canceled=true`,
      });

      console.log('Checkout session response:', response.data);

      if (response.data.success && response.data.data?.url) {
        console.log('Stripe Checkout session created, redirecting to:', response.data.data.url);
        // Redirect to Stripe-hosted checkout page
        window.location.href = response.data.data.url;
      } else {
        console.error('Checkout session creation failed:', response.data);
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Stripe Checkout creation failed:', err);
      // Throw error to be caught by handleSelectPlan for proper error display
      throw new Error(
        'Unable to create checkout session. Please try again or contact support if the issue persists.'
      );
    }
  };

  const renderDescription = () => (
    <SectionTitle
      caption={t.sectionSubtitle}
      title={t.sectionTitle}
      txtGradient="pricing"
      description={t.sectionDescription}
      sx={{ mb: 8, textAlign: 'center' }}
    />
  );

  const renderBillingToggle = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
      <ToggleButtonGroup
        value={billingCycle}
        exclusive
        onChange={handleBillingCycleChange}
        sx={{
          '& .MuiToggleButton-root': {
            px: 3,
            py: 1,
            borderRadius: 2,
          },
        }}
      >
        <ToggleButton value="monthly">{t.monthly}</ToggleButton>
        <ToggleButton value="yearly">
          {t.yearly}
          <Chip label={t.savings} size="small" color="success" sx={{ ml: 1 }} />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );

  const renderContentDesktop = () => (
    <Box
      sx={{
        display: { xs: 'none', md: 'grid' },
        gridTemplateColumns: {
          md: 'repeat(2, 0.8fr)',
          lg: 'repeat(3, 0.8fr)',
          xl: 'repeat(4, 0.8fr)',
        },
        gap: 2,
        width: '100%',
        justifyContent: 'center',
      }}
    >
      {plans.map((plan) => (
        <SubscriptionPlanCard
          key={plan.planId}
          plan={plan}
          billingCycle={billingCycle}
          currentPlan={subscription?.plan}
          onSelectPlan={handleSelectPlan}
          loading={loading === plan.planId}
          sx={(theme) => ({
            ...(plan.popular && {
              [theme.breakpoints.down(1440)]: {
                borderLeft: `dashed 1px ${varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.2)}`,
                borderRight: `dashed 1px ${varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.2)}`,
              },
            }),
          })}
        />
      ))}
    </Box>
  );

  const renderContentMobile = () => (
    <Stack spacing={3} alignItems="center" sx={{ display: { md: 'none' }, width: '100%' }}>
      <Tabs
        value={tabs.value || (plans.length > 0 ? plans[0].name : '')}
        onChange={tabs.onChange}
        sx={[
          (theme) => ({
            boxShadow: `0px -2px 0px 0px ${varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.08)} inset`,
            width: '100%',
          }),
        ]}
      >
        {plans.map((plan) => (
          <Tab key={plan.planId} value={plan.name} label={plan.name} />
        ))}
      </Tabs>

      <Box
        sx={[
          (theme) => ({
            width: 1,
            borderRadius: 2,
            border: `dashed 1px ${varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.2)}`,
          }),
        ]}
      >
        {plans
          .filter((plan) => plan.name === (tabs.value || (plans.length > 0 ? plans[0].name : '')))
          .map((plan) => (
            <SubscriptionPlanCard
              key={plan.planId}
              plan={plan}
              billingCycle={billingCycle}
              currentPlan={subscription?.plan}
              onSelectPlan={handleSelectPlan}
              loading={loading === plan.planId}
            />
          ))}
      </Box>
    </Stack>
  );

  if (plansLoading) {
    return (
      <Box
        component="section"
        sx={[{ py: 5, position: 'relative' }, ...(Array.isArray(sx) ? sx : [sx])]}
        {...other}
      >
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6">{t.loading}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (plansError || plans.length === 0) {
    return (
      <Box
        component="section"
        sx={[{ py: 5, position: 'relative' }, ...(Array.isArray(sx) ? sx : [sx])]}
        {...other}
      >
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6" color="error">
              {plansError || t.error}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component="section"
      sx={[{ py: 5, position: 'relative' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <MotionViewport>
        <FloatLine vertical sx={{ top: 0, left: 80 }} />

        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>{renderDescription()}</Box>

        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>{renderBillingToggle()}</Box>

        {error && (
          <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mb: 4 }}>
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              {error}
            </Alert>
          </Box>
        )}

        <Box
          sx={(theme) => ({
            position: 'relative',
            '&::before, &::after': {
              width: 64,
              height: 64,
              content: "''",
              [theme.breakpoints.up(1440)]: { display: 'block' },
            },
          })}
        >
          <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>{renderContentDesktop()}</Box>

          <FloatLine sx={{ top: 64, left: 0 }} />
          <FloatLine sx={{ bottom: 64, left: 0 }} />
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>{renderContentMobile()}</Box>
      </MotionViewport>
    </Box>
  );
}
