import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WorkOrderDetailsView } from 'src/sections/fsa/work-order/details/view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: `Work Order Details - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <WorkOrderDetailsView id={id} />;
}
