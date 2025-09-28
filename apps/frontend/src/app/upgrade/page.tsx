import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SubscriptionBillingView } from 'src/sections/subscription/billing-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Upgrade Plan - ${CONFIG.appName}` };

export default function Page() {
  return <SubscriptionBillingView />;
}
