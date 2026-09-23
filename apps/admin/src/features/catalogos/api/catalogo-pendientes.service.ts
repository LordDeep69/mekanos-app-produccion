/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Catálogo Maestro de Pendientes Técnicos
 * 
 * Backend: @Controller('ordenes') -> /api/ordenes/catalogo-pendientes
 */

import { apiClient } from '@/lib/api/client';

const BASE = '/ordenes/catalogo-pendientes';

export interface CatalogoPendiente {
  id_pendiente_catalogo: number;
  codigo?: string | null;
  descripcion: string;
  categoria?: string | null;
  id_tipo_equipo?: number | null;
  activo: boolean;
  orden_visual?: number | null;
  fecha_creacion?: string;
  tipos_equipo?: {
    id_tipo_equipo: number;
    nombre_tipo: string;
  } | null;
  _count?: {
    ordenes_pendientes: number;
  };
}

export interface CreateCatalogoPendienteDto {
  descripcion: string;
  codigo?: string;
  categoria?: string;
  idTipoEquipo?: number | null;
  ordenVisual?: number;
  activo?: boolean;
}

export interface UpdateCatalogoPendienteDto extends Partial<CreateCatalogoPendienteDto> {}

export interface CatalogoPendientesQueryParams {
  idTipoEquipo?: number;
  categoria?: string;
  incluirInactivos?: boolean;
  busqueda?: string;
}

/**
 * Obtener lista de pendientes del catálogo maestro
 */
export async function getCatalogoPendientes(
  params?: CatalogoPendientesQueryParams
): Promise<{ success: boolean; data: CatalogoPendiente[] }> {
  const queryParams = new URLSearchParams();

  if (params?.idTipoEquipo !== undefined) {
    queryParams.append('idTipoEquipo', String(params.idTipoEquipo));
  }
  if (params?.categoria && params.categoria !== 'TODAS') {
    queryParams.append('categoria', params.categoria);
  }
  if (params?.incluirInactivos) {
    queryParams.append('incluirInactivos', 'true');
  }
  if (params?.busqueda?.trim()) {
    queryParams.append('busqueda', params.busqueda.trim());
  }

  const url = queryParams.toString() ? `${BASE}?${queryParams.toString()}` : BASE;
  const response = await apiClient.get<{ success: boolean; data: CatalogoPendiente[] }>(url);
  return response.data;
}

/**
 * Crear nuevo ítem en el catálogo
 */
export async function createCatalogoPendiente(
  data: CreateCatalogoPendienteDto
): Promise<{ success: boolean; data: CatalogoPendiente }> {
  const response = await apiClient.post<{ success: boolean; data: CatalogoPendiente }>(BASE, data);
  return response.data;
}

/**
 * Actualizar ítem del catálogo
 */
export async function updateCatalogoPendiente(
  id: number,
  data: UpdateCatalogoPendienteDto
): Promise<{ success: boolean; data: CatalogoPendiente }> {
  const response = await apiClient.put<{ success: boolean; data: CatalogoPendiente }>(`${BASE}/${id}`, data);
  return response.data;
}

/**
 * Eliminar o desactivar ítem del catálogo
 */
export async function deleteCatalogoPendiente(
  id: number,
  hard: boolean = false
): Promise<{ success: boolean; message: string; desactivado?: boolean; eliminado?: boolean }> {
  const url = hard ? `${BASE}/${id}?hard=true` : `${BASE}/${id}`;
  const response = await apiClient.delete<{ success: boolean; message: string; desactivado?: boolean; eliminado?: boolean }>(url);
  return response.data;
}

/**
 * Alternar estado activo / inactivo
 */
export async function toggleActivoCatalogoPendiente(
  id: number,
  activo: boolean
): Promise<{ success: boolean; data: CatalogoPendiente }> {
  return updateCatalogoPendiente(id, { activo });
}
