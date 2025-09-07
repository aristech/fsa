import type { Metadata } from 'next';

import { PersonnelUsersAdapterView } from 'src/sections/fsa/personnel/view/personnel-users-adapter-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Personnel Management',
  description: 'Manage your field service personnel, roles, and assignments',
};

export default function PersonnelListPage() {
  return <PersonnelUsersAdapterView />;
}
