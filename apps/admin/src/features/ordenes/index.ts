/**
 * MEKANOS S.A.S - Portal Admin
 * Feature: Órdenes de Servicio - Barrel Export
 */

// API Services
export * from './api/catalogos.service';
export * from './api/ordenes.service';

// Hooks
export * from './hooks/use-catalogos';
export * from './hooks/use-ordenes';

// Types (re-export from types folder)
export type {
    CambiarEstadoDto,
    CreateOrdenDto,
    Orden,
    OrdenesQueryParams,
    OrdenesResponse
} from '@/types/ordenes';

export {
    getClienteNombre,
    getEstadoColor,
    getPrioridadColor, getTecnicoLabel, getTecnicoNombre
} from '@/types/ordenes';

