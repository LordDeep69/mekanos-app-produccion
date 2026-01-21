/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Catálogo de Actividades
 * 
 * Backend: @Controller('catalogo-actividades')
 */

import { apiClient } from '@/lib/api/client';

const BASE = '/catalogo-actividades';

// Tipo de actividad (desde backend ENUM)
export type TipoActividad =
    | 'INSPECCION'
    | 'MEDICION'
    | 'LIMPIEZA'
    | 'LUBRICACION'
    | 'AJUSTE'
    | 'CAMBIO'
    | 'PRUEBA'
    | 'VERIFICACION';

export const TIPOS_ACTIVIDAD: { value: TipoActividad; label: string; color: string; icon: string }[] = [
    { value: 'INSPECCION', label: 'Inspección', color: 'bg-blue-100 text-blue-800', icon: 'eye' },
    { value: 'MEDICION', label: 'Medición', color: 'bg-purple-100 text-purple-800', icon: 'gauge' },
    { value: 'LIMPIEZA', label: 'Limpieza', color: 'bg-cyan-100 text-cyan-800', icon: 'sparkles' },
    { value: 'LUBRICACION', label: 'Lubricación', color: 'bg-yellow-100 text-yellow-800', icon: 'droplet' },
    { value: 'AJUSTE', label: 'Ajuste', color: 'bg-orange-100 text-orange-800', icon: 'wrench' },
    { value: 'CAMBIO', label: 'Cambio', color: 'bg-red-100 text-red-800', icon: 'repeat' },
    { value: 'PRUEBA', label: 'Prueba', color: 'bg-green-100 text-green-800', icon: 'play' },
    { value: 'VERIFICACION', label: 'Verificación', color: 'bg-indigo-100 text-indigo-800', icon: 'check-circle' },
];

export interface CatalogoActividad {
    // Snake_case (legacy)
    id_actividad_catalogo?: number;
    codigo_actividad?: string;
    descripcion_actividad?: string;
    id_tipo_servicio?: number;
    id_sistema?: number;
    tipo_actividad?: TipoActividad;
    orden_ejecucion?: number;
    es_obligatoria?: boolean;
    tiempo_estimado_minutos?: number;
    id_parametro_medicion?: number;
    id_tipo_componente?: number;
    instrucciones?: string;
    precauciones?: string;
    activo?: boolean;
    observaciones?: string;
    fecha_creacion?: string;
    // CamelCase (CQRS backend)
    idActividadCatalogo?: number;
    codigoActividad?: string;
    descripcionActividad?: string;
    idTipoServicio?: number;
    idSistema?: number;
    tipoActividad?: TipoActividad;
    ordenEjecucion?: number;
    esObligatoria?: boolean;
    tiempoEstimadoMinutos?: number;
    idParametroMedicion?: number;
    idTipoComponente?: number;
    creadoPor?: number;
    fechaCreacion?: string;
    modificadoPor?: number;
    fechaModificacion?: string;
    // Relaciones snake_case
    tipos_servicio?: {
        id_tipo_servicio: number;
        codigo_tipo: string;
        nombre_tipo: string;
    };
    catalogo_sistemas?: {
        id_sistema: number;
        codigo_sistema: string;
        nombre_sistema: string;
    };
    parametros_medicion?: {
        id_parametro_medicion: number;
        codigo_parametro: string;
        nombre_parametro: string;
        unidad_medida: string;
    };
    // Relaciones camelCase (CQRS)
    tipoServicio?: {
        idTipoServicio: number;
        codigoTipoServicio: string;
        nombreTipoServicio: string;
    };
    sistema?: {
        idSistema: number;
        codigoSistema: string;
        nombreSistema: string;
    };
}

export interface CatalogoActividadesResponse {
    success: boolean;
    message: string;
    data: CatalogoActividad[];
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CatalogoActividadesQueryParams {
    page?: number;
    limit?: number;
    tipoServicioId?: number;
    sistemaId?: number;
    tipoActividad?: TipoActividad;
    activo?: boolean;
}

export interface CreateCatalogoActividadDto {
    codigoActividad: string;
    descripcionActividad: string;
    idTipoServicio: number;
    idSistema?: number;
    tipoActividad: TipoActividad;
    ordenEjecucion: number;
    esObligatoria?: boolean;
    tiempoEstimadoMinutos?: number;
    idParametroMedicion?: number;
    idTipoComponente?: number;
    instrucciones?: string;
    precauciones?: string;
    activo?: boolean;
    observaciones?: string;
}

export interface UpdateCatalogoActividadDto extends Partial<CreateCatalogoActividadDto> { }

/**
 * Obtener lista de actividades del catálogo
 */
export async function getCatalogoActividades(
    params?: CatalogoActividadesQueryParams
): Promise<CatalogoActividadesResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params?.tipoServicioId !== undefined) queryParams.append('tipoServicioId', String(params.tipoServicioId));
    if (params?.sistemaId !== undefined) queryParams.append('sistemaId', String(params.sistemaId));
    if (params?.tipoActividad) queryParams.append('tipoActividad', params.tipoActividad);
    if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));

    const url = queryParams.toString() ? `${BASE}?${queryParams.toString()}` : BASE;
    const response = await apiClient.get<CatalogoActividadesResponse>(url);
    return response.data;
}

/**
 * Obtener actividad por ID
 */
export async function getCatalogoActividad(id: number): Promise<{ success: boolean; data: CatalogoActividad }> {
    const response = await apiClient.get<{ success: boolean; data: CatalogoActividad }>(`${BASE}/${id}`);
    return response.data;
}

/**
 * Crear nueva actividad en el catálogo
 */
export async function createCatalogoActividad(
    data: CreateCatalogoActividadDto
): Promise<{ success: boolean; message: string; data: CatalogoActividad }> {
    const response = await apiClient.post<{ success: boolean; message: string; data: CatalogoActividad }>(
        BASE,
        data
    );
    return response.data;
}

/**
 * Actualizar actividad del catálogo
 */
export async function updateCatalogoActividad(
    id: number,
    data: UpdateCatalogoActividadDto
): Promise<{ success: boolean; message: string; data: CatalogoActividad }> {
    const response = await apiClient.put<{ success: boolean; message: string; data: CatalogoActividad }>(
        `${BASE}/${id}`,
        data
    );
    return response.data;
}

/**
 * Eliminar (soft delete) actividad del catálogo
 */
export async function deleteCatalogoActividad(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE}/${id}`);
    return response.data;
}
