/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para Firmas Administrativas
 * Entidad aislada con datos de representante legal internos
 */

import type { Persona } from './clientes';

/**
 * Firma Administrativa - Entidad aislada
 */
export interface FirmaAdministrativa {
    id_firma_administrativa: number;
    nombre_de_firma: string | null;
    representante_legal: string | null;
    contacto_de_representante_legal: string | null;
    email_representante_legal: string | null;
    id_empleado_asignado?: number | null;
    firma_activa: boolean;
    observaciones?: string | null;
    requisitos_operativos?: string | null;
    creado_por: number;
    fecha_creacion: string;
    modificado_por?: number | null;
    fecha_modificacion?: string | null;
}

/**
 * Firma Administrativa con clientes asociados
 */
export interface FirmaAdministrativaConClientes extends FirmaAdministrativa {
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
    data: FirmaAdministrativa[];
    total: number;
}

/**
 * DTO para crear firma administrativa
 */
export interface CreateFirmaAdministrativaDto {
    nombre_de_firma: string;
    representante_legal?: string;
    contacto_de_representante_legal?: string;
    email_representante_legal?: string;
    id_empleado_asignado?: number;
    firma_activa?: boolean;
    observaciones?: string;
    requisitos_operativos?: string;
}

/**
 * DTO para actualizar firma administrativa
 */
export interface UpdateFirmaAdministrativaDto {
    nombre_de_firma?: string;
    representante_legal?: string;
    contacto_de_representante_legal?: string;
    email_representante_legal?: string;
    id_empleado_asignado?: number;
    firma_activa?: boolean;
    observaciones?: string;
    requisitos_operativos?: string;
}
