import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { JwtVerifyAccountView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Verify | ${CONFIG.appName}` };

export default function Page() {
  return <JwtVerifyAccountView />;
}
