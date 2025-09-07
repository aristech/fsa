import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WorkOrderCreateForm } from 'src/sections/fsa/work-order/create/work-order-create-form';

// ----------------------------------------------------------------------

type Props = {
  params: { id: string };
};

export const metadata: Metadata = { title: `Edit Work Order - ${CONFIG.appName}` };

export default function Page({ params }: Props) {
  return <WorkOrderCreateForm id={params.id} />;
}
