/**
 * MEKANOS S.A.S - Portal Admin
 * Página: Nueva Firma Administrativa
 */

import { FirmaAdministrativaForm } from '@/features/firmas-administrativas/components/firma-administrativa-form';

export const metadata = {
    title: 'Nueva Firma Administrativa | MEKANOS Admin',
    description: 'Crear nueva firma administrativa',
};

export default function NuevaFirmaAdministrativaPage() {
    return <FirmaAdministrativaForm />;
}
