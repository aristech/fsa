'use client';

import Stack from '@mui/material/Stack';

import { ScrollProgress, useScrollProgress } from 'src/components/animate/scroll-progress';

import { HomeSubscriptionPricing } from '../home/home-subscription-pricing';

// ----------------------------------------------------------------------

export function SubscriptionBillingView() {
  const pageProgress = useScrollProgress();

  return (
    <>
      <ScrollProgress
        variant="linear"
        progress={pageProgress.scrollYProgress}
        sx={[(theme) => ({ position: 'fixed', zIndex: theme.zIndex.appBar + 1 })]}
      />

      <Stack sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <HomeSubscriptionPricing />
      </Stack>
    </>
  );
}
