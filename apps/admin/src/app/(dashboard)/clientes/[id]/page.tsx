/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Detalle de Cliente
 */

import { ClienteDetail } from '@/features/clientes/components/cliente-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Cliente #${id} | MEKANOS Admin`,
    description: 'Detalle del cliente',
  };
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;
  const clienteId = parseInt(id, 10);

  return <ClienteDetail clienteId={clienteId} />;
}
