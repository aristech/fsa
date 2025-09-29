import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SettingsView } from 'src/sections/settings/view/settings-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Settings | Dashboard - ${CONFIG.appName}` };

export default function SettingsLandingPage() {
  return (
    <SettingsView
      webhooksHref={paths.dashboard.settings.webhooks}
      apiKeysHref={paths.dashboard.settings.apiKeys}
      smsRemindersHref={paths.dashboard.settings.smsReminders}
      companyHref={paths.dashboard.settings.company}
    />
  );
}
