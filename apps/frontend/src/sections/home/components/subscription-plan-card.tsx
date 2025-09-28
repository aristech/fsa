import type { BoxProps } from '@mui/material/Box';
import type { BillingCycle, ISubscriptionPlan } from 'src/types/subscription';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useSubscriptionTranslations } from 'src/hooks/use-subscription-translations';

import { Iconify } from 'src/components/iconify';
import { varFade, varScale, MotionViewport } from 'src/components/animate';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

type SubscriptionPlanCardProps = BoxProps & {
  plan: ISubscriptionPlan;
  billingCycle: BillingCycle;
  currentPlan?: string;
  onSelectPlan: (planId: string, billingCycle: BillingCycle) => void;
  loading?: boolean;
};

// ----------------------------------------------------------------------

const renderLines = () => (
  <>
    <Box
      sx={{
        position: 'absolute',
        top: -64,
        left: 0,
        right: 0,
        height: 1,
        borderTop: 'dashed 1px',
        borderColor: 'divider',
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        bottom: -64,
        left: 0,
        right: 0,
        height: 1,
        borderTop: 'dashed 1px',
        borderColor: 'divider',
      }}
    />
  </>
);

export function SubscriptionPlanCard({
  plan,
  billingCycle,
  currentPlan,
  onSelectPlan,
  loading = false,
  sx,
  ...other
}: SubscriptionPlanCardProps) {
  const t = useSubscriptionTranslations();
  const { authenticated, tenant } = useAuthContext();
  console.log(tenant);
  const isCurrentPlan = tenant?.subscription?.plan === plan.planId;
  const isPopular = plan.popular;
  const price = plan.price[billingCycle];
  const yearlyDiscount = billingCycle === 'yearly' ? 17 : 0;

  // Get tenant subscription info for better conditional rendering
  const tenantSubscription = tenant?.subscription;
  const isPlanActive = tenantSubscription?.status === 'active';

  const handleSelectPlan = () => {
    console.log('Plan card clicked:', {
      planId: plan.planId,
      billingCycle,
      authenticated,
      isCurrentPlan,
      isPlanActive,
    });
    onSelectPlan(plan.planId, billingCycle);
  };

  return (
    <MotionViewport>
      <Box
        sx={[
          (theme) => ({
            px: 3,
            py: 4,
            gap: 3,
            display: 'flex',
            position: 'relative',
            flexDirection: 'column',
            border: isPopular ? 2 : 1,
            borderColor: isPopular ? 'primary.main' : 'divider',
            borderRadius: 2,
            ...(isPopular && {
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -10,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: `10px solid ${theme.palette.primary.main}`,
              },
            }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {isPopular && renderLines()}

        {isPopular && (
          <Chip
            label={t.mostPopular}
            color="primary"
            size="small"
            sx={{
              position: 'absolute',
              top: -34,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1,
            }}
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 auto' }}>
            <m.div variants={varFade('inLeft', { distance: 24 })}>
              <Typography variant="h4" component="h6">
                {t.getPlanName(plan.planId)}
              </Typography>
            </m.div>

            <m.div variants={varScale('inX')}>
              <Box
                sx={{
                  width: 32,
                  height: 6,
                  opacity: 0.24,
                  borderRadius: 1,
                  bgcolor: isPopular ? 'primary.main' : 'secondary.main',
                }}
              />
            </m.div>
          </Box>

          <m.div variants={varFade('inLeft', { distance: 24 })}>
            <Box sx={{ textAlign: 'right' }}>
              <Box component="span" sx={{ typography: 'h3' }}>
                €{price}
              </Box>
              <Typography variant="body2" color="text.secondary">
                /{billingCycle === 'monthly' ? 'month' : 'year'}
              </Typography>
              {yearlyDiscount > 0 && (
                <Chip
                  label={`Save ${yearlyDiscount}%`}
                  size="small"
                  color="success"
                  sx={{ ml: 1, fontSize: '0.75rem' }}
                />
              )}
            </Box>
          </m.div>
        </Box>

        <m.div variants={varFade('in')}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t.getPlanDescription(plan.planId)}
          </Typography>
        </m.div>

        <Stack spacing={1.5}>
          {plan.highlights.map((highlight, index) => (
            <Box
              key={highlight}
              component={m.div}
              variants={varFade('in')}
              sx={{
                gap: 1.5,
                display: 'flex',
                typography: 'body2',
                alignItems: 'center',
              }}
            >
              <Iconify width={16} icon="eva:checkmark-fill" color="success.main" />
              {t.getPlanHighlight(plan.planId, index)}
            </Box>
          ))}

          {plan.trialDays > 0 && (
            <>
              <m.div variants={varFade('inLeft', { distance: 24 })}>
                <Divider sx={{ borderStyle: 'dashed' }} />
              </m.div>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconify width={16} icon="eva:clock-fill" color="primary.main" />
                <Typography variant="body2" color="primary.main">
                  {plan.trialDays} {t.trialDays}
                </Typography>
              </Box>
            </>
          )}
        </Stack>

        <m.div variants={varFade('inUp', { distance: 24 })}>
          {authenticated && tenant ? (
            // Authenticated user - show appropriate action based on plan status
            <Button
              fullWidth
              variant={isCurrentPlan ? 'contained' : (isPopular ? 'contained' : 'outlined')}
              color={isCurrentPlan ? 'primary' : 'inherit'}
              size="large"
              disabled={isCurrentPlan || loading}
              onClick={!isCurrentPlan ? handleSelectPlan : undefined}
              loading={loading}
            >
              {isCurrentPlan ? t.currentPlan : (isPlanActive ? t.upgrade : t.getStarted)}
            </Button>
          ) : (
            // Unauthenticated user - show get started button
            <Button
              fullWidth
              variant={isPopular ? 'contained' : 'outlined'}
              color="inherit"
              size="large"
              disabled={loading}
              onClick={handleSelectPlan}
              loading={loading}
            >
              {t.getStarted}
            </Button>
          )}
        </m.div>
      </Box>
    </MotionViewport>
  );
}
