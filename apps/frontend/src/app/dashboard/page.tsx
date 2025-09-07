import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { FsaDashboardView } from 'src/sections/fsa/dashboard/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <FsaDashboardView />;
}
