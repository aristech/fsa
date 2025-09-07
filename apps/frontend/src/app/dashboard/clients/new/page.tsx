import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ClientCreateView } from 'src/sections/fsa/client/create/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `New Client - ${CONFIG.appName}` };

export default function Page() {
  return <ClientCreateView />;
}
