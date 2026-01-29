/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para Firmas Administrativas
 */

import type { Persona } from './clientes';

/**
 * Firma Administrativa base
 */
export interface FirmaAdministrativa {
    id_firma_administrativa: number;
    id_persona: number;
    firma_activa: boolean;
    observaciones?: string | null;
    requisitos_operativos?: string | null;
    creado_por: number;
    fecha_creacion: string;
    modificado_por?: number | null;
    fecha_modificacion?: string | null;
}

/**
 * Firma Administrativa con datos de persona
 */
export interface FirmaAdministrativaConPersona extends FirmaAdministrativa {
    persona: Persona;
}

/**
 * Firma Administrativa con clientes asociados
 */
export interface FirmaAdministrativaCompleta extends FirmaAdministrativaConPersona {
    clientes?: Array<{
        id_cliente: number;
        codigo_cliente: string;
        persona: Persona;
    }>;
}

/**
 * Parámetros de query para listar firmas
 */
export interface FirmasAdministrativasQueryParams {
    firma_activa?: boolean;
    skip?: number;
    take?: number;
    includeClientes?: boolean;
}

/**
 * Respuesta paginada de firmas
 */
export interface FirmasAdministrativasResponse {
    data: FirmaAdministrativaConPersona[];
    total: number;
}

/**
 * DTO para crear firma administrativa
 */
export interface CreateFirmaAdministrativaDto {
    id_persona: number;
    firma_activa?: boolean;
    observaciones?: string;
    requisitos_operativos?: string;
}

/**
 * DTO para actualizar firma administrativa
 */
export interface UpdateFirmaAdministrativaDto {
    firma_activa?: boolean;
    observaciones?: string;
    requisitos_operativos?: string;
}
