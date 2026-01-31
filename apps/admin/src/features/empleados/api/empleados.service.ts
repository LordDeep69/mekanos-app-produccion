/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Empleados
 *
 * Backend: @Controller('empleados') en empleados.controller.ts
 */

import { apiClient } from '@/lib/api/client';
import type {
    CreateEmpleadoDto,
    Empleado,
    EmpleadoConPersona,
    EmpleadosQueryParams,
    EmpleadosResponse,
    UpdateEmpleadoDto,
} from '@/types/empleados';

const EMPLEADOS_BASE = '/empleados';

/**
 * Obtener lista de empleados con filtros y paginación
 */
export async function getEmpleados(
    params?: EmpleadosQueryParams
): Promise<EmpleadosResponse> {
    const queryParams = new URLSearchParams();

    if (params?.es_tecnico !== undefined) {
        queryParams.append('es_tecnico', String(params.es_tecnico));
    }
    if (params?.es_asesor !== undefined) {
        queryParams.append('es_asesor', String(params.es_asesor));
    }
    if (params?.empleado_activo !== undefined) {
        queryParams.append('empleado_activo', String(params.empleado_activo));
    }
    if (params?.skip !== undefined) {
        queryParams.append('skip', String(params.skip));
    }
    if (params?.take !== undefined) {
        queryParams.append('take', String(params.take));
    }

    const url = queryParams.toString()
        ? `${EMPLEADOS_BASE}?${queryParams.toString()}`
        : EMPLEADOS_BASE;

    const response = await apiClient.get<EmpleadosResponse | EmpleadoConPersona[]>(url);

    // Normalizar respuesta (puede venir array o objeto paginado)
    if (Array.isArray(response.data)) {
        return {
            data: response.data,
            total: response.data.length,
        };
    }

    return response.data;
}

/**
 * Obtener un empleado por ID
 */
export async function getEmpleado(id: number): Promise<EmpleadoConPersona> {
    const response = await apiClient.get<EmpleadoConPersona>(`${EMPLEADOS_BASE}/${id}`);
    return response.data;
}

/**
 * Crear nuevo empleado
 */
export async function createEmpleado(data: CreateEmpleadoDto): Promise<Empleado> {
    const response = await apiClient.post<Empleado>(EMPLEADOS_BASE, data);
    return response.data;
}

/**
 * Actualizar empleado existente
 */
export async function updateEmpleado(
    id: number,
    data: UpdateEmpleadoDto
): Promise<Empleado> {
    const response = await apiClient.put<Empleado>(`${EMPLEADOS_BASE}/${id}`, data);
    return response.data;
}

/**
 * Eliminar empleado
 */
export async function deleteEmpleado(id: number): Promise<void> {
    await apiClient.delete(`${EMPLEADOS_BASE}/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GESTIÓN COMPLETA (Transacción Atómica)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crear empleado completo (Persona + Empleado + Usuario opcional)
 * Backend: POST /usuarios/gestion-completa
 */
export interface CreateEmpleadoCompletoPayload {
    datosPersona: {
        tipo_identificacion: string;
        numero_identificacion: string;
        tipo_persona: 'NATURAL' | 'JURIDICA';
        primer_nombre?: string;
        segundo_nombre?: string;
        primer_apellido?: string;
        segundo_apellido?: string;
        email_principal?: string;
        celular?: string;
        direccion_principal?: string;
        ciudad?: string;
    };
    datosUsuario: {
        username: string;
        email?: string;
        password?: string;
        enviar_email_bienvenida?: boolean;
        estado?: string;
    };
    datosEmpleado: {
        cargo: string;
        tipo_contrato?: string;
        fecha_ingreso: string;
        departamento?: string;
        contacto_emergencia: string;
        telefono_emergencia: string;
        es_tecnico?: boolean;
        es_asesor?: boolean;
        nivel_academico?: string;
        titulo_obtenido?: string;
    };
    rolesIds?: number[];
}

export interface CreateEmpleadoCompletoResponse {
    success: boolean;
    message: string;
    data: {
        id_usuario: number;
        id_persona: number;
        id_empleado?: number;
        username: string;
        email: string;
        estado: string;
        roles: Array<{ id_rol: number; codigo_rol: string; nombre_rol: string }>;
        persona: {
            nombre_completo: string;
            tipo_identificacion: string;
            numero_identificacion: string;
        };
        password_temporal?: string;
        persona_reutilizada: boolean;
    };
}

export async function crearEmpleadoCompleto(
    payload: CreateEmpleadoCompletoPayload
): Promise<CreateEmpleadoCompletoResponse> {
    const response = await apiClient.post<CreateEmpleadoCompletoResponse>(
        '/usuarios/gestion-completa',
        payload
    );
    return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ MULTI-ASESOR: Selector de Asesores
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tipo para el selector de asesores (datos mínimos)
 */
export interface AsesorSelectorItem {
    id_empleado: number;
    nombre_completo: string;
    cargo: string;
}

export interface AsesoresSelectorResponse {
    success: boolean;
    data: AsesorSelectorItem[];
    total: number;
}

/**
 * Obtener lista de asesores para selectores (datos mínimos)
 * Backend: GET /empleados/selector/asesores
 */
export async function getAsesoresSelector(): Promise<AsesoresSelectorResponse> {
    const response = await apiClient.get<AsesoresSelectorResponse>(
        `${EMPLEADOS_BASE}/selector/asesores`
    );
    return response.data;
}
