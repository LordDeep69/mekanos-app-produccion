/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Estados de Orden
 * 
 * Backend: @Controller('estados-orden')
 */

import { apiClient } from '@/lib/api/client';

const BASE = '/estados-orden';

export interface EstadoOrden {
    id_estado: number;
    codigo_estado: string;
    nombre_estado: string;
    descripcion?: string;
    permite_edicion: boolean;
    permite_eliminacion: boolean;
    es_estado_final: boolean;
    color_hex?: string;
    icono?: string;
    orden_visualizacion?: number;
    activo: boolean;
    fecha_creacion?: string;
}

export interface EstadosOrdenResponse {
    success: boolean;
    message: string;
    data: EstadoOrden[];
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface EstadosOrdenQueryParams {
    page?: number;
    limit?: number;
    activo?: boolean;
    esEstadoFinal?: boolean;
    permiteEdicion?: boolean;
}

export interface CreateEstadoOrdenDto {
    codigoEstado: string;
    nombreEstado: string;
    descripcion?: string;
    permiteEdicion?: boolean;
    permiteEliminacion?: boolean;
    esEstadoFinal?: boolean;
    colorHex?: string;
    icono?: string;
    ordenVisualizacion?: number;
    activo?: boolean;
}

export interface UpdateEstadoOrdenDto extends Partial<CreateEstadoOrdenDto> { }

/**
 * Obtener lista de estados de orden
 */
export async function getEstadosOrden(
    params?: EstadosOrdenQueryParams
): Promise<EstadosOrdenResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));
    if (params?.esEstadoFinal !== undefined) queryParams.append('esEstadoFinal', String(params.esEstadoFinal));
    if (params?.permiteEdicion !== undefined) queryParams.append('permiteEdicion', String(params.permiteEdicion));

    const url = queryParams.toString() ? `${BASE}?${queryParams.toString()}` : BASE;
    const response = await apiClient.get<EstadosOrdenResponse>(url);
    return response.data;
}

/**
 * Obtener estados activos (ordenados por visualización)
 */
export async function getEstadosOrdenActivos(): Promise<{ success: boolean; data: EstadoOrden[] }> {
    const response = await apiClient.get<{ success: boolean; data: EstadoOrden[] }>(`${BASE}/activos`);
    return response.data;
}

/**
 * Obtener estado de orden por ID
 */
export async function getEstadoOrden(id: number): Promise<{ success: boolean; data: EstadoOrden }> {
    const response = await apiClient.get<{ success: boolean; data: EstadoOrden }>(`${BASE}/${id}`);
    return response.data;
}

/**
 * Buscar estado por código
 */
export async function getEstadoOrdenByCodigo(codigo: string): Promise<{ success: boolean; data: EstadoOrden }> {
    const response = await apiClient.get<{ success: boolean; data: EstadoOrden }>(`${BASE}/codigo/${codigo}`);
    return response.data;
}

/**
 * Crear nuevo estado de orden
 */
export async function createEstadoOrden(
    data: CreateEstadoOrdenDto
): Promise<{ success: boolean; message: string; data: EstadoOrden }> {
    const response = await apiClient.post<{ success: boolean; message: string; data: EstadoOrden }>(
        BASE,
        data
    );
    return response.data;
}

/**
 * Actualizar estado de orden
 */
export async function updateEstadoOrden(
    id: number,
    data: UpdateEstadoOrdenDto
): Promise<{ success: boolean; message: string; data: EstadoOrden }> {
    const response = await apiClient.put<{ success: boolean; message: string; data: EstadoOrden }>(
        `${BASE}/${id}`,
        data
    );
    return response.data;
}

/**
 * Eliminar (soft delete) estado de orden
 */
export async function deleteEstadoOrden(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE}/${id}`);
    return response.data;
}
