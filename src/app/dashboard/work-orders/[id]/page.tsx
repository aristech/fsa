import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WorkOrderDetailsView } from 'src/sections/fsa/work-order/details/view';

// ----------------------------------------------------------------------

type Props = {
  params: { id: string };
};

export const metadata: Metadata = { title: `Work Order Details - ${CONFIG.appName}` };

export default function Page({ params }: Props) {
  return <WorkOrderDetailsView id={params.id} />;
}
