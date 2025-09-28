import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { usePlans } from 'src/hooks/use-subscription';
import { useSubscriptionTranslations } from 'src/hooks/use-subscription-translations';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

export function SubscriptionPlanSelector({ sx, ...other }: BoxProps) {
  const { tenant } = useAuthContext();
  const { plans, loading } = usePlans();
  const t = useSubscriptionTranslations();

  const currentPlan = tenant?.subscription?.plan || 'free';
  const currentBillingCycle = tenant?.subscription?.billingCycle || 'monthly';

  const handlePlanChange = async (planId: string) => {
    if (planId === currentPlan) return;

    if (planId === 'enterprise') {
      window.open('/contact-sales?plan=enterprise&current=' + currentPlan, '_blank');
      return;
    }

    // Handle plan change directly with Stripe
    await handleStripeCheckout(planId, currentBillingCycle as 'monthly' | 'yearly');
  };

  const handleBillingCycleChange = async (cycle: 'monthly' | 'yearly') => {
    if (cycle === currentBillingCycle) return;

    // Handle billing cycle change directly with Stripe
    await handleStripeCheckout(currentPlan, cycle);
  };

  const handleStripeCheckout = async (planId: string, cycle: 'monthly' | 'yearly') => {
    try {
      console.log('Creating Stripe Checkout session for:', { planId, cycle });

      // Import endpoints dynamically to avoid circular dependencies
      const { endpoints } = await import('src/lib/axios');

      const response = await endpoints.subscription.createCheckoutSession({
        planId,
        billingCycle: cycle,
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      });

      if (response.data.success && response.data.data?.url) {
        console.log('Redirecting to Stripe Checkout:', response.data.data.url);
        // Redirect to Stripe-hosted checkout page
        window.location.href = response.data.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Stripe Checkout failed:', error);
      // Fallback: redirect to billing portal
      window.location.href = '/billing/portal';
    }
  };

  if (loading) {
    return (
      <Box sx={sx} {...other}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Change Plan
        </Typography>
        <Typography>Loading available plans...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={sx} {...other}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Change Plan
      </Typography>

      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={currentBillingCycle}
            onChange={(_, newCycle) => newCycle && handleBillingCycleChange(newCycle)}
            exclusive
            size="small"
            sx={{
              p: 0.5,
              borderRadius: 2,
              bgcolor: 'background.neutral',
              '& .MuiToggleButton-root': {
                px: 2,
                py: 1,
                borderRadius: 2,
              },
            }}
          >
            <ToggleButton value="monthly">{t.monthly}</ToggleButton>
            <ToggleButton value="yearly">
              {t.yearly}
              <Box sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'success.main', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'white' }}>
                  {t.savings}
                </Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Stack spacing={2}>
          {plans.map((plan) => {
            const isCurrentPlan = plan.planId === currentPlan;
            const isPopular = plan.popular;
            const price = plan.price[currentBillingCycle as 'monthly' | 'yearly'];

            return (
              <Box
                key={plan.planId}
                sx={[
                  (theme) => ({
                    p: 3,
                    borderRadius: 2,
                    border: `1px solid ${theme.vars?.palette.divider}`,
                    transition: theme.transitions.create(['border-color', 'box-shadow']),
                    cursor: isCurrentPlan ? 'default' : 'pointer',
                    ...(isCurrentPlan && {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.lighter',
                    }),
                    ...(isPopular &&
                      !isCurrentPlan && {
                        borderColor: 'secondary.main',
                        boxShadow: `0 0 0 1px ${theme.vars?.palette.secondary.main}`,
                      }),
                    '&:hover': !isCurrentPlan
                      ? {
                          borderColor: 'primary.main',
                          boxShadow: `0 0 0 1px ${theme.vars?.palette.primary.main}`,
                        }
                      : {},
                  }),
                ]}
                onClick={() => !isCurrentPlan && handlePlanChange(plan.planId)}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="h6">{t.getPlanName(plan.planId)}</Typography>
                      {isPopular && (
                        <Box sx={{ px: 1, py: 0.5, bgcolor: 'secondary.main', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ color: 'white' }}>
                            {t.mostPopular}
                          </Typography>
                        </Box>
                      )}
                      {isCurrentPlan && (
                        <Box sx={{ px: 1, py: 0.5, bgcolor: 'primary.main', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ color: 'white' }}>
                            {t.currentPlan}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t.getPlanDescription(plan.planId)}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h5">{price === 0 ? 'Free' : `$${price}`}</Typography>
                    {price > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        /{currentBillingCycle === 'yearly' ? 'year' : 'month'}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                {!isCurrentPlan && (
                  <Button
                    variant={isPopular ? 'contained' : 'outlined'}
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanChange(plan.planId);
                    }}
                  >
                    {plan.planId === 'enterprise' ? t.contactSales : t.upgrade}
                  </Button>
                )}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
