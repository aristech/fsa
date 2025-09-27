import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { KanbanView } from 'src/sections/kanban/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Kanban | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <KanbanView taskId={id} />;
}
