import { ClientEditView } from 'src/sections/fsa/client/edit/view/client-edit-view';

// ----------------------------------------------------------------------

export const metadata: { title: string } = {
  title: 'Edit Client',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <ClientEditView id={id} />;
}
