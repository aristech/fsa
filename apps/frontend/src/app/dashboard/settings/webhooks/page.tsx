import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { WebhooksView } from 'src/sections/settings/webhooks/webhooks-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Webhooks | Dashboard - ${CONFIG.appName}` };

export default function WebhooksPage() {
  return (
    <>
      <CustomBreadcrumbs
        heading="Webhooks"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Settings', href: paths.dashboard.settings.root },
          { name: 'Webhooks' },
        ]}
        sx={{ mb: 3 }}
      />

      <WebhooksView />
    </>
  );
}
