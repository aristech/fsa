import { CONFIG } from 'src/global-config';

import { JwtVerifyAccountView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata = { title: `Verify account | JWT - ${CONFIG.appName}` };

export default function Page() {
  return <JwtVerifyAccountView />;
}
