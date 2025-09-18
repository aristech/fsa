import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'ProgressNet FSA: The starting point for your next project',
  description: 'The starting point for your next project with ProgressNet FSA.',
};

export default function Page() {
  return <HomeView />;
}
