import type { Metadata } from 'next';

import { MaterialsListView } from 'src/sections/fsa/materials/list/view/materials-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Materials Management',
  description: 'Manage your inventory, materials, and supplies',
};

export default function MaterialsListPage() {
  return <MaterialsListView />;
}