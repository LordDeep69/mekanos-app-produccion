/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Tipos de Servicio
 * 
 * Backend: @Controller('tipos-servicio')
 */

import { apiClient } from '@/lib/api/client';

const BASE = '/tipos-servicio';

// Categorías de servicio (desde backend ENUM)
export type CategoriaServicio =
    | 'PREVENTIVO'
    | 'CORRECTIVO'
    | 'EMERGENCIA'
    | 'INSPECCION'
    | 'ESPECIALIZADO'
    | 'DIAGNOSTICO';

export const CATEGORIAS_SERVICIO: { value: CategoriaServicio; label: string; color: string }[] = [
    { value: 'PREVENTIVO', label: 'Preventivo', color: 'bg-green-100 text-green-800' },
    { value: 'CORRECTIVO', label: 'Correctivo', color: 'bg-orange-100 text-orange-800' },
    { value: 'EMERGENCIA', label: 'Emergencia', color: 'bg-red-100 text-red-800' },
    { value: 'INSPECCION', label: 'Inspección', color: 'bg-blue-100 text-blue-800' },
    { value: 'ESPECIALIZADO', label: 'Especializado', color: 'bg-purple-100 text-purple-800' },
    { value: 'DIAGNOSTICO', label: 'Diagnóstico', color: 'bg-cyan-100 text-cyan-800' },
];

export interface TipoServicio {
    id_tipo_servicio: number;
    codigo_tipo: string;
    nombre_tipo: string;
    descripcion?: string;
    categoria: CategoriaServicio;
    id_tipo_equipo?: number;
    tiene_checklist: boolean;
    tiene_plantilla_informe: boolean;
    requiere_mediciones: boolean;
    duracion_estimada_horas?: number;
    orden_visualizacion?: number;
    icono?: string;
    color_hex?: string;
    activo: boolean;
    observaciones?: string;
    fecha_creacion?: string;
    tipos_equipo?: {
        id_tipo_equipo: number;
        codigo_tipo: string;
        nombre_tipo: string;
    };
}

export interface TiposServicioResponse {
    success: boolean;
    message: string;
    data: TipoServicio[];
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface TiposServicioQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    categoria?: CategoriaServicio;
    tipoEquipoId?: number;
    activo?: boolean;
}

export interface CreateTipoServicioDto {
    codigoTipo: string;
    nombreTipo: string;
    descripcion?: string;
    categoria: CategoriaServicio;
    tipoEquipoId?: number;
    tieneChecklist?: boolean;
    tienePlantillaInforme?: boolean;
    requiereMediciones?: boolean;
    duracionEstimadaHoras?: number;
    ordenVisualizacion?: number;
    icono?: string;
    colorHex?: string;
    activo?: boolean;
    observaciones?: string;
}

export interface UpdateTipoServicioDto extends Partial<CreateTipoServicioDto> { }

/**
 * Obtener lista de tipos de servicio
 */
export async function getTiposServicio(
    params?: TiposServicioQueryParams
): Promise<TiposServicioResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.categoria) queryParams.append('categoria', params.categoria);
    if (params?.tipoEquipoId !== undefined) queryParams.append('tipoEquipoId', String(params.tipoEquipoId));
    if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));

    const url = queryParams.toString() ? `${BASE}?${queryParams.toString()}` : BASE;
    const response = await apiClient.get<TiposServicioResponse>(url);
    return response.data;
}

/**
 * Obtener tipo de servicio por ID
 */
export async function getTipoServicio(id: number): Promise<{ success: boolean; data: TipoServicio }> {
    const response = await apiClient.get<{ success: boolean; data: TipoServicio }>(`${BASE}/${id}`);
    return response.data;
}

/**
 * Crear nuevo tipo de servicio
 */
export async function createTipoServicio(
    data: CreateTipoServicioDto
): Promise<{ success: boolean; message: string; data: TipoServicio }> {
    const response = await apiClient.post<{ success: boolean; message: string; data: TipoServicio }>(
        BASE,
        data
    );
    return response.data;
}

/**
 * Actualizar tipo de servicio
 */
export async function updateTipoServicio(
    id: number,
    data: UpdateTipoServicioDto
): Promise<{ success: boolean; message: string; data: TipoServicio }> {
    const response = await apiClient.put<{ success: boolean; message: string; data: TipoServicio }>(
        `${BASE}/${id}`,
        data
    );
    return response.data;
}

/**
 * Eliminar (soft delete) tipo de servicio
 */
export async function deleteTipoServicio(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE}/${id}`);
    return response.data;
}

/**
 * Obtener tipos de servicio por categoría
 */
export async function getTiposServicioByCategoria(
    categoria: CategoriaServicio,
    soloActivos: boolean = true
): Promise<{ success: boolean; data: TipoServicio[] }> {
    const response = await apiClient.get<{ success: boolean; data: TipoServicio[] }>(
        `${BASE}/categoria/${categoria}?soloActivos=${soloActivos}`
    );
    return response.data;
}

// ============================================================================
// DETALLE COMPLETO (Master-Detail View)
// ============================================================================

export interface ActividadDetalle {
    id_actividad_catalogo: number;
    codigo_actividad: string;
    descripcion_actividad: string;
    tipo_actividad: string;
    es_obligatoria: boolean;
    tiempo_estimado_minutos?: number;
    parametro_medicion?: {
        id: number;
        nombre: string;
        unidad: string;
        rango_min?: number;
        rango_max?: number;
    } | null;
}

export interface SistemaConActividades {
    id_sistema: number | null;
    nombre_sistema: string;
    codigo_sistema: string;
    actividades: ActividadDetalle[];
    total_actividades: number;
}

export interface TipoServicioDetalleCompleto {
    id_tipo_servicio: number;
    codigo_tipo: string;
    nombre_tipo: string;
    descripcion?: string;
    categoria: CategoriaServicio;
    color_hex?: string;
    icono?: string;
    tiene_checklist: boolean;
    duracion_estimada_horas?: number;
    tipo_equipo?: {
        id: number;
        nombre: string;
    } | null;
    estadisticas: {
        total_actividades: number;
        total_ordenes_historicas: number;
        total_sistemas: number;
    };
    sistemas_con_actividades: SistemaConActividades[];
}

/**
 * Obtener detalle completo del tipo de servicio con actividades agrupadas por sistema
 */
export async function getTipoServicioDetalleCompleto(
    id: number
): Promise<{ success: boolean; data: TipoServicioDetalleCompleto }> {
    const response = await apiClient.get<{ success: boolean; data: TipoServicioDetalleCompleto }>(
        `${BASE}/${id}/detalle-completo`
    );
    return response.data;
}
