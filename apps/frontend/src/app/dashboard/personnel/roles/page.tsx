import type { Metadata } from 'next';

import { RolesList } from 'src/sections/fsa/personnel/roles/roles-list';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Roles Management | Field Service Automation',
};

export default function RolesPage() {
  return <RolesList />;
}
