/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Parámetros de Medición
 * 
 * Backend: @Controller('parametros-medicion')
 */

import { apiClient } from '@/lib/api/client';

const BASE = '/parametros-medicion';

export type CategoriaParametro = 'ELECTRICO' | 'MECANICO' | 'TERMICO' | 'PRESION' | 'FLUJO' | 'NIVEL' | 'VIBRACION' | 'OTRO';
export type TipoDato = 'NUMERICO' | 'BOOLEANO' | 'TEXTO' | 'RANGO';

export const CATEGORIAS_PARAMETRO: { value: CategoriaParametro; label: string; color: string }[] = [
    { value: 'ELECTRICO', label: 'Eléctrico', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'MECANICO', label: 'Mecánico', color: 'bg-gray-100 text-gray-800' },
    { value: 'TERMICO', label: 'Térmico', color: 'bg-red-100 text-red-800' },
    { value: 'PRESION', label: 'Presión', color: 'bg-blue-100 text-blue-800' },
    { value: 'FLUJO', label: 'Flujo', color: 'bg-cyan-100 text-cyan-800' },
    { value: 'NIVEL', label: 'Nivel', color: 'bg-purple-100 text-purple-800' },
    { value: 'VIBRACION', label: 'Vibración', color: 'bg-orange-100 text-orange-800' },
    { value: 'OTRO', label: 'Otro', color: 'bg-gray-100 text-gray-800' },
];

export const TIPOS_DATO: { value: TipoDato; label: string }[] = [
    { value: 'NUMERICO', label: 'Numérico' },
    { value: 'BOOLEANO', label: 'Sí/No' },
    { value: 'TEXTO', label: 'Texto' },
    { value: 'RANGO', label: 'Rango' },
];

export interface ParametroMedicion {
    id_parametro_medicion: number;
    codigo_parametro: string;
    nombre_parametro: string;
    unidad_medida: string;
    categoria?: CategoriaParametro;
    descripcion?: string;
    tipo_dato?: TipoDato;
    valor_minimo_normal?: number;
    valor_maximo_normal?: number;
    valor_minimo_critico?: number;
    valor_maximo_critico?: number;
    valor_ideal?: number;
    tipo_equipo_id?: number;
    es_critico_seguridad: boolean;
    es_obligatorio: boolean;
    decimales_precision?: number;
    activo: boolean;
    observaciones?: string;
    fecha_creacion?: string;
}

export interface ParametrosMedicionResponse {
    success: boolean;
    message: string;
    data: ParametroMedicion[];
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ParametrosMedicionQueryParams {
    page?: number;
    limit?: number;
    activo?: boolean;
    categoria?: CategoriaParametro;
    tipoEquipoId?: number;
    esCriticoSeguridad?: boolean;
    esObligatorio?: boolean;
}

export interface CreateParametroMedicionDto {
    codigoParametro: string;
    nombreParametro: string;
    unidadMedida: string;
    categoria?: CategoriaParametro;
    descripcion?: string;
    tipoDato?: TipoDato;
    valorMinimoNormal?: number;
    valorMaximoNormal?: number;
    valorMinimoCritico?: number;
    valorMaximoCritico?: number;
    valorIdeal?: number;
    tipoEquipoId?: number;
    esCriticoSeguridad?: boolean;
    esObligatorio?: boolean;
    decimalesPrecision?: number;
    activo?: boolean;
    observaciones?: string;
}

export interface UpdateParametroMedicionDto extends Partial<CreateParametroMedicionDto> { }

/**
 * Obtener lista paginada de parámetros
 */
export async function getParametrosMedicion(
    params?: ParametrosMedicionQueryParams
): Promise<ParametrosMedicionResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));
    if (params?.categoria) queryParams.append('categoria', params.categoria);
    if (params?.tipoEquipoId !== undefined) queryParams.append('tipoEquipoId', String(params.tipoEquipoId));
    if (params?.esCriticoSeguridad !== undefined) queryParams.append('esCriticoSeguridad', String(params.esCriticoSeguridad));
    if (params?.esObligatorio !== undefined) queryParams.append('esObligatorio', String(params.esObligatorio));

    const url = queryParams.toString() ? `${BASE}?${queryParams.toString()}` : BASE;
    const response = await apiClient.get<ParametrosMedicionResponse>(url);
    return response.data;
}

/**
 * Obtener parámetros activos (sin paginación)
 */
export async function getParametrosMedicionActivos(): Promise<{ success: boolean; data: ParametroMedicion[] }> {
    const response = await apiClient.get<{ success: boolean; data: ParametroMedicion[] }>(`${BASE}/activos`);
    return response.data;
}

/**
 * Obtener parámetro por ID
 */
export async function getParametroMedicion(id: number): Promise<{ success: boolean; data: ParametroMedicion }> {
    const response = await apiClient.get<{ success: boolean; data: ParametroMedicion }>(`${BASE}/${id}`);
    return response.data;
}

/**
 * Crear nuevo parámetro
 */
export async function createParametroMedicion(
    data: CreateParametroMedicionDto
): Promise<{ success: boolean; message: string; data: ParametroMedicion }> {
    const response = await apiClient.post<{ success: boolean; message: string; data: ParametroMedicion }>(
        BASE,
        data
    );
    return response.data;
}

/**
 * Actualizar parámetro
 */
export async function updateParametroMedicion(
    id: number,
    data: UpdateParametroMedicionDto
): Promise<{ success: boolean; message: string; data: ParametroMedicion }> {
    const response = await apiClient.put<{ success: boolean; message: string; data: ParametroMedicion }>(
        `${BASE}/${id}`,
        data
    );
    return response.data;
}

/**
 * Eliminar (soft delete) parámetro
 */
export async function deleteParametroMedicion(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE}/${id}`);
    return response.data;
}
