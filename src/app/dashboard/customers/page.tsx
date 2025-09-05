import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { CustomerListView } from 'src/sections/fsa/customer/list/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Customers - ${CONFIG.appName}` };

export default function Page() {
  return <CustomerListView />;
}
