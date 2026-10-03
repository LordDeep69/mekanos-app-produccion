/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Editar Cliente
 */

import { ClienteForm } from '@/features/clientes/components/cliente-form';
import { Pencil, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/clientes/${id}`}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
          title="Volver al cliente"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
            <Pencil className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar Cliente</h1>
            <p className="text-sm text-slate-500">
              Modifica la información, condiciones comerciales y parámetros del cliente #{id}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <ClienteForm mode="editar" clienteId={clienteId} />
    </div>
  );
}
