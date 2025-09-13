'use client';

import { EnvironmentGuard } from '@/components/environment-guard';
import { FieldLayout } from '@/layouts/field/field-layout';

export default function FieldLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EnvironmentGuard requiredAccess="field" fallbackPath="/dashboard">
      <FieldLayout>{children}</FieldLayout>
    </EnvironmentGuard>
  );
}
