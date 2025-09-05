import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WorkOrderCreateView } from 'src/sections/fsa/work-order/create/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `New Work Order - ${CONFIG.appName}` };

export default function Page() {
  return <WorkOrderCreateView />;
}
