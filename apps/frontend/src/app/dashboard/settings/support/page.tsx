import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { SupportView } from 'src/sections/settings/support/support-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Support & Feedback | Settings - ${CONFIG.appName}` };

export default function SupportPage() {
  return <SupportView />;
}