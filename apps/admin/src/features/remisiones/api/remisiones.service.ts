import { apiClient } from '@/lib/api/client';

export interface RemisionItemInput {
  id_componente: number;
  cantidad: number;
  id_ubicacion?: number;
  observaciones?: string;
}

export interface CreateRemisionPayload {
  id_orden_servicio?: number;
  id_tecnico_receptor: number;
  observaciones?: string;
  items: RemisionItemInput[];
}

export interface RemisionDetalleItem {
  id_detalle?: number;
  id_remision?: number;
  id_componente?: number;
  descripcion_item?: string;
  cantidad_entregada: number | string;
  observaciones?: string | null;
  catalogo_componentes?: {
    codigo_interno?: string;
    descripcion_corta?: string;
  } | null;
}

export interface RemisionItem {
  id_remision: number;
  numero_remision: string;
  fecha_remision: string;
  tipo_destino?: string;
  id_destino?: number;
  nombre_destinatario?: string | null;
  tipo_remision?: string;
  id_orden_servicio?: number | null;
  estado_remision?: 'ABIERTA' | 'ENTREGADA' | 'CANCELADA' | string;
  fecha_entrega?: string | null;
  fecha_cierre?: string | null;
  ordenes_servicio?: { numero_orden?: string } | null;
  remisiones_detalle?: RemisionDetalleItem[];
}

export interface RemisionesListResponse {
  success: boolean;
  data: RemisionItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getRemisiones(params?: {
  estado?: string;
  id_tecnico_receptor?: number;
  id_orden_servicio?: number;
  page?: number;
  limit?: number;
}): Promise<RemisionesListResponse> {
  const res = await apiClient.get<RemisionesListResponse>('/remisiones', { params });
  return res.data;
}

export async function getRemisionById(id: number): Promise<{ success: boolean; data: RemisionItem }> {
  const res = await apiClient.get<{ success: boolean; data: RemisionItem }>(`/remisiones/${id}`);
  return res.data;
}

export async function createRemision(
  payload: CreateRemisionPayload,
): Promise<{ success: boolean; message: string; data: RemisionItem }> {
  const res = await apiClient.post<{ success: boolean; message: string; data: RemisionItem }>(
    '/remisiones',
    payload,
  );
  return res.data;
}

export async function entregarRemision(
  id: number,
): Promise<{ success: boolean; message: string; data: RemisionItem }> {
  const res = await apiClient.put<{ success: boolean; message: string; data: RemisionItem }>(
    `/remisiones/${id}/entregar`,
    {},
  );
  return res.data;
}

export async function cancelarRemision(
  id: number,
  motivo_cancelacion: string,
): Promise<{ success: boolean; message: string; data: RemisionItem }> {
  const res = await apiClient.put<{ success: boolean; message: string; data: RemisionItem }>(
    `/remisiones/${id}/cancelar`,
    { motivo_cancelacion },
  );
  return res.data;
}
