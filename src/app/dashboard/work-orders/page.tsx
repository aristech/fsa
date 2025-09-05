import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WorkOrderListView } from 'src/sections/fsa/work-order/list/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Work Orders - ${CONFIG.appName}` };

export default function Page() {
  return <WorkOrderListView />;
}
