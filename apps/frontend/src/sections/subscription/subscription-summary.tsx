import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

export function SubscriptionSummary({ sx, ...other }: BoxProps) {
  const { tenant } = useAuthContext();

  const subscription = tenant?.subscription;
  const currentPlan = subscription?.plan || 'free';
  const billingCycle = subscription?.billingCycle || 'monthly';
  const status = subscription?.status || 'active';

  const renderPrice = () => {
    const planPrices: Record<string, { monthly: number; yearly: number }> = {
      free: { monthly: 0, yearly: 0 },
      basic: { monthly: 29, yearly: 290 },
      premium: { monthly: 79, yearly: 790 },
      enterprise: { monthly: 199, yearly: 1990 },
    };

    const price = planPrices[currentPlan]?.[billingCycle as 'monthly' | 'yearly'] || 0;
    const isYearly = billingCycle === 'yearly';

    if (price === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="h2" color="success.main">
            Free
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Typography variant="h4">$</Typography>
        <Typography variant="h2">{price}</Typography>
        <Typography
          component="span"
          sx={{
            ml: 1,
            alignSelf: 'center',
            typography: 'body2',
            color: 'text.disabled',
          }}
        >
          / {isYearly ? 'year' : 'month'}
        </Typography>
      </Box>
    );
  };

  const getPlanLabel = () => {
    const planLabels: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      free: { label: 'FREE', color: 'default' },
      basic: { label: 'BASIC', color: 'primary' },
      premium: { label: 'PREMIUM', color: 'secondary' },
      enterprise: { label: 'ENTERPRISE', color: 'error' },
    };

    return planLabels[currentPlan] || { label: 'UNKNOWN', color: 'default' };
  };

  const planInfo = getPlanLabel();

  const handleManageBilling = async () => {
    try {
      console.log('Opening Stripe billing portal');

      // Import endpoints dynamically
      const { endpoints } = await import('src/lib/axios');

      const response = await endpoints.subscription.createPortalSession();

      if (response.data.success && response.data.data?.url) {
        console.log('Redirecting to Stripe billing portal:', response.data.data.url);
        window.location.href = response.data.data.url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Billing portal creation failed:', error);
      // Fallback: show error message
      alert('Unable to open billing portal. Please try again later.');
    }
  };

  return (
    <Box
      sx={[
        () => ({
          p: 5,
          borderRadius: 2,
          bgcolor: 'background.neutral',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Typography variant="h6" sx={{ mb: 5 }}>
        Current Plan
      </Typography>

      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Plan
          </Typography>
          <Label color={planInfo.color}>{planInfo.label}</Label>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Status
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: status === 'active' ? 'success.main' : 'error.main',
              textTransform: 'capitalize',
            }}
          >
            {status}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Billing
          </Typography>
          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
            {billingCycle}
          </Typography>
        </Box>

        {renderPrice()}

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1">Total billed</Typography>
          <Typography variant="subtitle1">
            {currentPlan === 'free' ? 'Free' : `$${subscription?.plan === 'free' ? 0 : 'N/A'}`}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />
      </Stack>

      {currentPlan !== 'free' && (
        <Button
          fullWidth
          size="large"
          variant="outlined"
          sx={{ mt: 5, mb: 3 }}
          onClick={handleManageBilling}
        >
          Manage Billing
        </Button>
      )}

      <Stack alignItems="center" spacing={1}>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          <Iconify icon="solar:shield-check-bold" sx={{ color: 'success.main' }} />
          <Typography variant="subtitle2">Secure payment processing</Typography>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
          Powered by Stripe - 256-bit SSL encrypted
        </Typography>
      </Stack>
    </Box>
  );
}
