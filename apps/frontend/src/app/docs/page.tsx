import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { DocsView } from 'src/sections/docs/docs-view';

export const metadata: Metadata = { title: `Documentation | ${CONFIG.appName}` };

export default function DocsPage() {
  return <DocsView />;
}
