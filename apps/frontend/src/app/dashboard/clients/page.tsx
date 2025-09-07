import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ClientListView } from 'src/sections/fsa/client/list/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Clients - ${CONFIG.appName}` };

export default function Page() {
  return <ClientListView />;
}
