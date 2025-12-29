/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Editar Cliente
 */

import { ClienteForm } from '@/features/clientes/components/cliente-form';
import { Pencil } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Editar Cliente #${id} | MEKANOS Admin`,
    description: 'Editar información del cliente',
  };
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params;
  const clienteId = parseInt(id, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Pencil className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Cliente</h1>
          <p className="text-muted-foreground">
            Modifica la información del cliente #{id}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <ClienteForm mode="editar" clienteId={clienteId} />
    </div>
  );
}
