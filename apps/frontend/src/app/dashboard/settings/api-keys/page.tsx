import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ApiKeysView } from 'src/sections/settings/api-keys/apikeys-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `API Keys | Dashboard - ${CONFIG.appName}` };

export default function ApiKeysPage() {
  return (
    <>
      <CustomBreadcrumbs
        heading="API Keys"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Settings', href: paths.dashboard.settings.root },
          { name: 'API Keys' },
        ]}
        sx={{ mb: 3 }}
      />

      <ApiKeysView />
    </>
  );
}
