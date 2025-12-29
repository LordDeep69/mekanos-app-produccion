/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Nuevo Cliente
 */

import { ClienteForm } from '@/features/clientes/components/cliente-form';
import { UserPlus } from 'lucide-react';

export const metadata = {
  title: 'Nuevo Cliente | MEKANOS Admin',
  description: 'Registrar nuevo cliente',
};

export default function NuevoClientePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-muted-foreground">
            Registra un nuevo cliente en el sistema
          </p>
        </div>
      </div>

      {/* Formulario */}
      <ClienteForm mode="crear" />
    </div>
  );
}
