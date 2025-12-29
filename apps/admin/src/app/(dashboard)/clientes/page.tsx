/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Listado de Clientes
 */

import { ClientesTable } from '@/features/clientes/components/clientes-table';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Clientes | MEKANOS Admin',
  description: 'Gestión de clientes',
};

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona la información de los clientes de MEKANOS
          </p>
        </div>
      </div>

      {/* Tabla de clientes */}
      <ClientesTable />
    </div>
  );
}
