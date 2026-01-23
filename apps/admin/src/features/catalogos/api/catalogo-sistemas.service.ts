/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Catálogo de Sistemas
 * 
 * Backend: @Controller('catalogo-sistemas')
 * NOTA: Backend retorna camelCase, frontend usa snake_case
 */

import { apiClient } from '@/lib/api/client';

const BASE = '/catalogo-sistemas';

export type AplicaA = 'GENERADOR' | 'BOMBA' | 'AMBOS' | 'OTRO';

export const APLICA_A_OPTIONS: { value: AplicaA; label: string }[] = [
    { value: 'GENERADOR', label: 'Generador' },
    { value: 'BOMBA', label: 'Bomba' },
    { value: 'AMBOS', label: 'Ambos' },
    { value: 'OTRO', label: 'Otro' },
];

// Interfaz interna del frontend (snake_case)
export interface CatalogoSistema {
    id_sistema: number;
    codigo_sistema: string;
    nombre_sistema: string;
    descripcion?: string;
    aplica_a?: AplicaA | string[];
    orden_visualizacion: number;
    icono?: string;
    color_hex?: string;
    activo: boolean;
    observaciones?: string;
    fecha_creacion?: string;
}

// Interfaz del backend (camelCase) - para tipado interno
interface CatalogoSistemaBackend {
    idSistema: number;
    codigoSistema: string;
    nombreSistema: string;
    descripcion?: string;
    aplicaA?: string[];
    ordenVisualizacion: number;
    icono?: string;
    colorHex?: string;
    activo: boolean;
    observaciones?: string;
    fechaCreacion?: string;
}

/**
 * Transforma respuesta del backend (camelCase) a formato frontend (snake_case)
 */
function transformToSnakeCase(item: CatalogoSistemaBackend): CatalogoSistema {
    return {
        id_sistema: item.idSistema,
        codigo_sistema: item.codigoSistema,
        nombre_sistema: item.nombreSistema,
        descripcion: item.descripcion,
        aplica_a: Array.isArray(item.aplicaA) && item.aplicaA.length > 0
            ? item.aplicaA[0] as AplicaA
            : undefined,
        orden_visualizacion: item.ordenVisualizacion,
        icono: item.icono,
        color_hex: item.colorHex,
        activo: item.activo,
        observaciones: item.observaciones,
        fecha_creacion: item.fechaCreacion,
    };
}

export interface CatalogoSistemasResponse {
    data: CatalogoSistema[];
    meta?: {
        total: number;
        page: number;
        limit: number;
    };
}

export interface CatalogoSistemasQueryParams {
    page?: number;
    limit?: number;
    activo?: boolean;
}

export interface CreateCatalogoSistemaDto {
    codigoSistema: string;
    nombreSistema: string;
    descripcion?: string;
    aplicaA?: AplicaA;
    ordenVisualizacion?: number;
    icono?: string;
    colorHex?: string;
    activo?: boolean;
    observaciones?: string;
}

export interface UpdateCatalogoSistemaDto extends Partial<CreateCatalogoSistemaDto> { }

/**
 * Obtener lista paginada de sistemas
 */
export async function getCatalogoSistemas(
    params?: CatalogoSistemasQueryParams
): Promise<CatalogoSistemasResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));

    const url = queryParams.toString() ? `${BASE}?${queryParams.toString()}` : BASE;
    const response = await apiClient.get<{ data: CatalogoSistemaBackend[]; meta?: any }>(url);

    // Transformar camelCase → snake_case
    return {
        data: response.data.data.map(transformToSnakeCase),
        meta: response.data.meta,
    };
}

/**
 * Obtener sistemas activos (sin paginación)
 */
export async function getCatalogoSistemasActivos(): Promise<{ data: CatalogoSistema[] }> {
    const response = await apiClient.get<CatalogoSistemaBackend[]>(`${BASE}/activos`);
    return { data: response.data.map(transformToSnakeCase) };
}

/**
 * Obtener sistema por ID
 */
export async function getCatalogoSistema(id: number): Promise<{ data: CatalogoSistema }> {
    const response = await apiClient.get<CatalogoSistemaBackend>(`${BASE}/${id}`);
    return { data: transformToSnakeCase(response.data) };
}

/**
 * Crear nuevo sistema
 */
export async function createCatalogoSistema(
    data: CreateCatalogoSistemaDto
): Promise<{ data: CatalogoSistema }> {
    const response = await apiClient.post<CatalogoSistemaBackend>(BASE, data);
    return { data: transformToSnakeCase(response.data) };
}

/**
 * Actualizar sistema
 */
export async function updateCatalogoSistema(
    id: number,
    data: UpdateCatalogoSistemaDto
): Promise<{ data: CatalogoSistema }> {
    const response = await apiClient.put<CatalogoSistemaBackend>(`${BASE}/${id}`, data);
    return { data: transformToSnakeCase(response.data) };
}

/**
 * Eliminar (soft delete) sistema
 */
export async function deleteCatalogoSistema(id: number): Promise<{ data: CatalogoSistema }> {
    const response = await apiClient.delete<CatalogoSistemaBackend>(`${BASE}/${id}`);
    return { data: transformToSnakeCase(response.data) };
}

// ============================================
// NUEVO: Sistemas con Indicadores de Uso
// ============================================

export type NivelUso = 'alto' | 'medio' | 'bajo' | 'sin_uso';

export interface CatalogoSistemaConUso extends CatalogoSistema {
    total_actividades: number;
    tiene_actividades: boolean;
    nivel_uso: NivelUso;
}

export interface CatalogoSistemasConUsoResponse {
    data: CatalogoSistemaConUso[];
    meta?: {
        total: number;
        page: number;
        limit: number;
    };
}

/**
 * Obtener sistemas con indicadores de uso (conteo de actividades)
 */
export async function getCatalogoSistemasConUso(
    params?: CatalogoSistemasQueryParams
): Promise<CatalogoSistemasConUsoResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));

    const url = queryParams.toString() ? `${BASE}/con-uso?${queryParams.toString()}` : `${BASE}/con-uso`;
    const response = await apiClient.get<{ data: any[]; meta?: any }>(url);

    // Transformar y agregar campos de uso
    const transformedData: CatalogoSistemaConUso[] = response.data.data.map(item => ({
        id_sistema: item.idSistema ?? item.id_sistema,
        codigo_sistema: item.codigoSistema ?? item.codigo_sistema,
        nombre_sistema: item.nombreSistema ?? item.nombre_sistema,
        descripcion: item.descripcion,
        aplica_a: item.aplicaA ?? item.aplica_a,
        orden_visualizacion: item.ordenVisualizacion ?? item.orden_visualizacion,
        icono: item.icono,
        color_hex: item.colorHex ?? item.color_hex,
        activo: item.activo,
        observaciones: item.observaciones,
        fecha_creacion: item.fechaCreacion ?? item.fecha_creacion,
        total_actividades: item.total_actividades ?? 0,
        tiene_actividades: item.tiene_actividades ?? false,
        nivel_uso: item.nivel_uso ?? 'sin_uso',
    }));

    return {
        data: transformedData,
        meta: response.data.meta,
    };
}
