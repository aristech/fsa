import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ApiKeysView } from 'src/sections/settings/api-keys/apikeys-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `API Keys | Dashboard - ${CONFIG.appName}` };

export default function ApiKeysPage() {
  return <ApiKeysView />;
}
