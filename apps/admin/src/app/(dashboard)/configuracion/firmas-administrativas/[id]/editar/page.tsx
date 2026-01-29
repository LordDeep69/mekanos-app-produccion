/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Editar Firma Administrativa
 */

'use client';

import { useFirmaAdministrativa } from '@/features/firmas-administrativas';
import { FirmaAdministrativaForm } from '@/features/firmas-administrativas/components/firma-administrativa-form';
import { Loader2 } from 'lucide-react';
import { use } from 'react';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EditarFirmaAdministrativaPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const id = parseInt(resolvedParams.id, 10);

    const { data: firma, isLoading, error } = useFirmaAdministrativa(id);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !firma) {
        return (
            <div className="text-center py-20 text-destructive">
                Error al cargar la firma administrativa
            </div>
        );
    }

    return <FirmaAdministrativaForm firma={firma} isEditing />;
}
