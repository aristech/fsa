import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WorkOrderCreateForm } from 'src/sections/fsa/work-order/create/work-order-create-form';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: `Edit Work Order - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <WorkOrderCreateForm id={id} />;
}
