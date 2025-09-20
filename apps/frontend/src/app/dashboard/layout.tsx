import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { FloatingChat } from 'src/components/floating-chat';
import { EnvironmentGuard } from 'src/components/environment-guard';

import { EnvironmentAuthGuard } from 'src/auth/guard/environment-auth-guard';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  if (CONFIG.auth.skip) {
    return (
      <DashboardLayout>
        {children}
        <FloatingChat />
      </DashboardLayout>
    );
  }

  return (
    <EnvironmentAuthGuard>
      <EnvironmentGuard requiredAccess="dashboard" fallbackPath="/field">
        <DashboardLayout>
          {children}
          <FloatingChat />
        </DashboardLayout>
      </EnvironmentGuard>
    </EnvironmentAuthGuard>
  );
}
