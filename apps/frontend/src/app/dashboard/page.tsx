import { DynamicTitle } from 'src/components/dynamic-title';

import { FsaDashboardView } from 'src/sections/fsa/dashboard/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <DynamicTitle title="Dashboard" />
      <FsaDashboardView />
    </>
  );
}
