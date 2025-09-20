import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { SettingsView } from 'src/sections/settings/view/settings-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Settings | Dashboard - ${CONFIG.appName}` };

export default function SettingsLandingPage() {
  return (
    <>
      <CustomBreadcrumbs
        heading="Settings"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Settings' }]}
        sx={{ mb: 3 }}
      />

      <SettingsView
        webhooksHref={paths.dashboard.settings.webhooks}
        apiKeysHref={paths.dashboard.settings.apiKeys}
      />
    </>
  );
}
