'use client';

import { FieldLayout } from 'src/layouts/field/field-layout';

import { EnvironmentGuard } from '../../components/environment-guard';

export default function FieldLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EnvironmentGuard requiredAccess="field" fallbackPath="/dashboard">
      <FieldLayout>{children}</FieldLayout>
    </EnvironmentGuard>
  );
}
