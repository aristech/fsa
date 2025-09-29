import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WebhooksView } from 'src/sections/settings/webhooks/webhooks-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Webhooks | Dashboard - ${CONFIG.appName}` };

export default function WebhooksPage() {
  return <WebhooksView />;
}
