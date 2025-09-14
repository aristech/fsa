import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ReportsView } from 'src/sections/fsa/reports/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `Reports | Analytics - ${CONFIG.appName}`,
};

export default function Page() {
  return <ReportsView />;
}
