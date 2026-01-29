/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Firmas Administrativas
 */

import { FirmasAdministrativasTable } from '@/features/firmas-administrativas';
import { Building2 } from 'lucide-react';

export const metadata = {
    title: 'Firmas Administrativas | MEKANOS Admin',
    description: 'Gestión de firmas administrativas',
};

export default function FirmasAdministrativasPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Firmas Administrativas
                    </h1>
                    <p className="text-muted-foreground">
                        Gestiona las firmas administrativas que agrupan múltiples clientes
                    </p>
                </div>
            </div>

            {/* Tabla */}
            <FirmasAdministrativasTable />
        </div>
    );
}
