'use client';

import { useRouter } from 'src/routes/hooks';

import { PersonnelCreateView } from 'src/sections/fsa/personnel/create/personnel-create-view';

// ----------------------------------------------------------------------

export default function Page() {
  const router = useRouter();

  return (
    <PersonnelCreateView
      open
      onClose={() => router.push('/dashboard/personnel')}
      onCreated={() => router.push('/dashboard/personnel')}
    />
  );
}
