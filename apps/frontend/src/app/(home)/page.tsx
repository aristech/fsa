import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'ProgressNet FSA: Complete Field Service Management Platform',
  description: 'Streamline your field service operations with ProgressNet FSA. Track work orders, manage personnel, and deliver exceptional service.',
};

export default function Page() {
  return <HomeView />;
}
