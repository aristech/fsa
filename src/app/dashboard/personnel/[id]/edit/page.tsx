'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'src/routes/hooks';

import { PersonnelCreateView } from 'src/sections/fsa/personnel/create/personnel-create-view';

// ----------------------------------------------------------------------

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || '');

  const [open, setOpen] = useState(true);

  useEffect(() => setOpen(true), [id]);

  return (
    <PersonnelCreateView
      open={open}
      onClose={() => router.push('/dashboard/personnel')}
      onCreated={() => router.push('/dashboard/personnel')}
    />
  );
}
