'use client';

import { FieldLayout } from 'src/layouts/field/field-layout';
import { ClientProvider } from 'src/contexts/client-context';

import { EnvironmentAuthGuard } from 'src/auth/guard/environment-auth-guard';

import { EnvironmentGuard } from '../../components/environment-guard';

export default function FieldLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EnvironmentAuthGuard>
      <EnvironmentGuard requiredAccess="field" fallbackPath="/dashboard">
        <ClientProvider>
          <FieldLayout>{children}</FieldLayout>
        </ClientProvider>
      </EnvironmentGuard>
    </EnvironmentAuthGuard>
  );
}
