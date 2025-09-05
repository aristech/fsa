import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { CustomerCreateView } from 'src/sections/fsa/customer/create/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `New Customer - ${CONFIG.appName}` };

export default function Page() {
  return <CustomerCreateView />;
}
