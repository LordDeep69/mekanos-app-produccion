/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Catálogo de Actividades y Banco Universal (Fase 5.9)
 *
 * Backend: @Controller('catalogo-actividades')
 */

import { apiClient } from '@/lib/api/client';
import type { ConfigInputDeclarativo } from '../components/ModoRespuestaSelector';

const BASE = '/catalogo-actividades';

export type TipoActividad =
  | 'INSPECCION'
  | 'MEDICION'
  | 'LIMPIEZA'
  | 'LUBRICACION'
  | 'AJUSTE'
  | 'CAMBIO'
  | 'PRUEBA'
  | 'VERIFICACION';

export const TIPOS_ACTIVIDAD: {
  value: TipoActividad;
  label: string;
  color: string;
  icon: string;
}[] = [
  { value: 'INSPECCION', label: 'Inspección', color: 'bg-blue-100 text-blue-800', icon: 'eye' },
  { value: 'MEDICION', label: 'Medición', color: 'bg-purple-100 text-purple-800', icon: 'gauge' },
  { value: 'LIMPIEZA', label: 'Limpieza', color: 'bg-cyan-100 text-cyan-800', icon: 'sparkles' },
  {
    value: 'LUBRICACION',
    label: 'Lubricación',
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'droplet',
  },
  { value: 'AJUSTE', label: 'Ajuste', color: 'bg-orange-100 text-orange-800', icon: 'wrench' },
  { value: 'CAMBIO', label: 'Cambio', color: 'bg-red-100 text-red-800', icon: 'repeat' },
  { value: 'PRUEBA', label: 'Prueba', color: 'bg-green-100 text-green-800', icon: 'play' },
  {
    value: 'VERIFICACION',
    label: 'Verificación',
    color: 'bg-indigo-100 text-indigo-800',
    icon: 'check-circle',
  },
];

export interface CatalogoActividad {
  // Snake_case (legacy)
  id_actividad_catalogo?: number;
  codigo_actividad?: string;
  descripcion_actividad?: string;
  id_tipo_servicio?: number | null;
  id_sistema?: number | null;
  id_tipo_equipo?: number | null;
  id_plantilla_origen?: number | null;
  tipo_actividad?: TipoActividad;
  orden_ejecucion?: number;
  es_obligatoria?: boolean;
  tiempo_estimado_minutos?: number | null;
  id_parametro_medicion?: number | null;
  id_tipo_componente?: number | null;
  instrucciones?: string | null;
  precauciones?: string | null;
  activo?: boolean;
  observaciones?: string | null;
  fecha_creacion?: string;
  // CamelCase (CQRS backend)
  idActividadCatalogo?: number;
  codigoActividad?: string;
  descripcionActividad?: string;
  idTipoServicio?: number | null;
  idSistema?: number | null;
  idTipoEquipo?: number | null;
  idPlantillaOrigen?: number | null;
  tipoActividad?: TipoActividad;
  ordenEjecucion?: number;
  esObligatoria?: boolean;
  tiempoEstimadoMinutos?: number | null;
  idParametroMedicion?: number | null;
  idTipoComponente?: number | null;
  creadoPor?: number | null;
  fechaCreacion?: string;
  modificadoPor?: number | null;
  fechaModificacion?: string;
  // Motor declarativo de inputs (camelCase + snake_case)
  naturalezaPersonalizada?: string | null;
  tipoControlInput?: string | null;
  configInputJson?: ConfigInputDeclarativo | null;
  rolSemantico?: string | null;
  naturaleza_personalizada?: string | null;
  tipo_control_input?: string | null;
  config_input_json?: ConfigInputDeclarativo | null;
  rol_semantico?: string | null;
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
    aplicaA?: string[] | null;
    idTipoEquipo?: number | null;
    categoria?: string | null;
  };
  tipoEquipo?: {
    idTipoEquipo: number;
    codigoTipo: string;
    nombreTipo: string;
  };
  sistema?: {
    idSistema: number;
    codigoSistema: string;
    nombreSistema: string;
    aplicaA?: string[] | null;
  };
  parametroMedicion?: {
    idParametroMedicion: number;
    codigoParametro: string;
    nombreParametro: string;
    unidadMedida?: string | null;
    valorMinimoNormal?: number | null;
    valorMaximoNormal?: number | null;
    valorMinimoCritico?: number | null;
    valorMaximoCritico?: number | null;
    valorIdeal?: number | null;
    idTipoEquipo?: number | null;
  };
}

export interface CatalogoActividadesResponse {
  success?: boolean;
  message?: string;
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
  tipoEquipoId?: number;
  sistemaId?: number;
  soloPlantillas?: boolean;
  tipoActividad?: TipoActividad;
  search?: string;
  activo?: boolean | 'all';
}

export interface CreateCatalogoActividadDto {
  codigoActividad?: string;
  descripcionActividad: string;
  idTipoServicio?: number | null;
  idSistema?: number | null;
  idTipoEquipo?: number | null;
  idPlantillaOrigen?: number | null;
  tipoActividad: TipoActividad;
  ordenEjecucion?: number;
  esObligatoria?: boolean;
  tiempoEstimadoMinutos?: number | null;
  idParametroMedicion?: number | null;
  idTipoComponente?: number | null;
  instrucciones?: string | null;
  precauciones?: string | null;
  activo?: boolean;
  observaciones?: string | null;
  naturalezaPersonalizada?: string | null;
  tipoControlInput?: string;
  configInputJson?: ConfigInputDeclarativo | null;
  rolSemantico?: string | null;
  creadoPor?: number;
}

export interface UpdateCatalogoActividadDto extends Partial<CreateCatalogoActividadDto> {
  modificadoPor?: number;
}

export interface VincularActividadesLotePayload {
  actividadIds: number[];
  tipoServicioIds: number[];
  overrideSistemaId?: number | null;
  creadoPor?: number;
}

export interface ReordenarActividadesLotePayload {
  items: {
    idActividadCatalogo: number;
    ordenEjecucion: number;
    idSistema?: number | null;
  }[];
  modificadoPor?: number;
}

export interface PropagarActividadBancoPayload {
  idActividadOrigen: number;
  descripcionActividad?: string;
  tipoActividad?: TipoActividad;
  idSistema?: number | null;
  idTipoEquipo?: number | null;
  idParametroMedicion?: number | null;
  esObligatoria?: boolean;
  tiempoEstimadoMinutos?: number | null;
  instrucciones?: string | null;
  precauciones?: string | null;
  observaciones?: string | null;
  naturalezaPersonalizada?: string | null;
  tipoControlInput?: string;
  configInputJson?: ConfigInputDeclarativo | null;
  rolSemantico?: string | null;
  activo?: boolean;
  propagarAHijas?: boolean;
  propagarLegacyPorNombre?: boolean;
  modificadoPor?: number;
}

export async function getCatalogoActividades(
  params?: CatalogoActividadesQueryParams,
): Promise<CatalogoActividadesResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page !== undefined) queryParams.append('page', String(params.page));
  queryParams.append('limit', String(params?.limit ?? 500));
  if (params?.tipoServicioId !== undefined)
    queryParams.append('tipoServicioId', String(params.tipoServicioId));
  if (params?.tipoEquipoId !== undefined)
    queryParams.append('tipoEquipoId', String(params.tipoEquipoId));
  if (params?.sistemaId !== undefined) queryParams.append('sistemaId', String(params.sistemaId));
  if (params?.soloPlantillas) queryParams.append('soloPlantillas', 'true');
  if (params?.tipoActividad) queryParams.append('tipoActividad', params.tipoActividad);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.activo !== undefined) queryParams.append('activo', String(params.activo));

  const url = queryParams.toString() ? `${BASE}?${queryParams.toString()}` : BASE;
  const response = await apiClient.get<CatalogoActividadesResponse>(url);
  return response.data;
}

export async function getCatalogoActividad(
  id: number,
): Promise<{ success: boolean; data: CatalogoActividad }> {
  const response = await apiClient.get<{ success: boolean; data: CatalogoActividad }>(
    `${BASE}/${id}`,
  );
  return response.data;
}

export async function createCatalogoActividad(
  data: CreateCatalogoActividadDto,
): Promise<{ success?: boolean; message?: string; data?: CatalogoActividad } & CatalogoActividad> {
  const response = await apiClient.post<
    { success?: boolean; message?: string; data?: CatalogoActividad } & CatalogoActividad
  >(BASE, data);
  return response.data;
}

export async function updateCatalogoActividad(
  id: number,
  data: UpdateCatalogoActividadDto,
): Promise<{ success?: boolean; message?: string; data?: CatalogoActividad } & CatalogoActividad> {
  const response = await apiClient.put<
    { success?: boolean; message?: string; data?: CatalogoActividad } & CatalogoActividad
  >(`${BASE}/${id}`, data);
  return response.data;
}

export async function deleteCatalogoActividad(
  id: number,
): Promise<{ success?: boolean; message?: string }> {
  const response = await apiClient.delete<{ success?: boolean; message?: string }>(`${BASE}/${id}`);
  return response.data;
}

export async function vincularActividadesLote(
  payload: VincularActividadesLotePayload,
): Promise<{ createdCount: number; skippedCount: number; created: CatalogoActividad[] }> {
  const response = await apiClient.post<{
    createdCount: number;
    skippedCount: number;
    created: CatalogoActividad[];
  }>(`${BASE}/vincular-lote`, payload);
  return response.data;
}

export async function reordenarActividadesLote(
  payload: ReordenarActividadesLotePayload,
): Promise<{ updatedCount: number }> {
  const response = await apiClient.put<{ updatedCount: number }>(`${BASE}/reordenar-lote`, payload);
  return response.data;
}

export async function propagarActividadBanco(
  payload: PropagarActividadBancoPayload,
): Promise<{ origin: CatalogoActividad; propagatedCount: number; affectedServiceIds: number[] }> {
  const response = await apiClient.put<{
    origin: CatalogoActividad;
    propagatedCount: number;
    affectedServiceIds: number[];
  }>(`${BASE}/banco/propagar`, payload);
  return response.data;
}
