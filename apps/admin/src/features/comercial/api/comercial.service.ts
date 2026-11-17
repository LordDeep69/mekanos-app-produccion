import { apiClient } from '@/lib/api/client';

export interface CotizacionEstado {
  id_estado: number;
  nombre_estado: string;
}

export interface CotizacionItemServicio {
  id_item_servicio?: number;
  id_servicio: number;
  cantidad: number | string;
  unidad?: string | null;
  precio_unitario: number | string;
  descuento_porcentaje?: number | string | null;
  subtotal?: number | string | null;
  descripcion_personalizada?: string | null;
  observaciones?: string | null;
  catalogo_servicios?: {
    codigo_servicio?: string;
    nombre_servicio?: string;
  } | null;
}

export interface CotizacionItemComponente {
  id_item_componente?: number;
  id_componente?: number | null;
  id_tipo_componente: number;
  descripcion: string;
  referencia_manual?: string | null;
  marca_manual?: string | null;
  cantidad: number | string;
  unidad?: string | null;
  precio_unitario: number | string;
  descuento_porcentaje?: number | string | null;
  subtotal?: number | string | null;
  garantia_meses?: number | null;
}

export interface CotizacionRecord {
  id_cotizacion: number;
  numero_cotizacion: string;
  id_cliente: number;
  id_sede?: number | null;
  id_equipo?: number | null;
  fecha_cotizacion: string;
  fecha_vencimiento: string;
  id_estado: number;
  asunto: string;
  descripcion_general?: string | null;
  alcance_trabajo?: string | null;
  exclusiones?: string | null;
  subtotal_servicios?: number | string;
  subtotal_componentes?: number | string;
  subtotal_general?: number | string;
  descuento_porcentaje?: number | string;
  descuento_valor?: number | string;
  subtotal_con_descuento?: number | string;
  iva_porcentaje?: number | string;
  iva_valor?: number | string;
  total_cotizacion?: number | string;
  forma_pago?: string | null;
  terminos_condiciones?: string | null;
  meses_garantia?: number | null;
  tiempo_estimado_dias?: number | null;
  elaborada_por?: number;
  estado?: CotizacionEstado;
  estados_cotizacion?: CotizacionEstado;
  cliente?: {
    id_cliente?: number;
    persona?: {
      razon_social?: string | null;
      nombre_comercial?: string | null;
      nombre_completo?: string | null;
      email_principal?: string | null;
    } | null;
  } | null;
  equipo?: {
    id_equipo?: number;
    codigo_equipo?: string;
    nombre_equipo?: string | null;
  } | null;
  items_servicios?: CotizacionItemServicio[];
  items_componentes?: CotizacionItemComponente[];
}

export interface CreateCotizacionPayload {
  id_cliente: number;
  id_sede?: number;
  id_equipo?: number;
  fecha_cotizacion: string;
  fecha_vencimiento: string;
  asunto: string;
  descripcion_general?: string;
  alcance_trabajo?: string;
  exclusiones?: string;
  descuento_porcentaje?: number;
  iva_porcentaje?: number;
  tiempo_estimado_dias?: number;
  forma_pago?: string;
  terminos_condiciones?: string;
  meses_garantia?: number;
  observaciones_garantia?: string;
  elaborada_por: number;
}

export interface AddItemServicioPayload {
  id_servicio: number;
  cantidad?: number;
  unidad?: string;
  precio_unitario: number;
  descuento_porcentaje?: number;
  descripcion_personalizada?: string;
  observaciones?: string;
}

export interface AddItemComponentePayload {
  id_componente?: number;
  id_tipo_componente: number;
  descripcion: string;
  referencia_manual?: string;
  marca_manual?: string;
  cantidad?: number;
  unidad?: string;
  precio_unitario: number;
  descuento_porcentaje?: number;
  garantia_meses?: number;
}

export interface AprobacionPendiente {
  id_aprobacion: number;
  id_cotizacion: number;
  nivel_aprobacion?: string;
  estado_aprobacion: string;
  observaciones_solicitante?: string | null;
  fecha_solicitud?: string;
  cotizaciones?: {
    id_cotizacion: number;
    numero_cotizacion: string;
    asunto?: string;
    total_cotizacion?: number | string;
  };
}

export interface PropuestaCorrectivoItem {
  id_propuesta: number;
  numero_propuesta: string;
  categoria?: string;
  tipo_propuesta?: string;
  urgencia_propuesta?: string;
  descripcion_problema?: string;
  solucion_propuesta?: string;
  prioridad?: number;
  fecha_propuesta?: string;
  fecha_vencimiento?: string | null;
  subtotal_servicios?: number | string;
  subtotal_componentes?: number | string;
  total_propuesta?: number | string;
  estado?: string;
  orden_servicio?: {
    id_orden_servicio: number;
    numero_orden: string;
  } | null;
  clientes?: {
    persona?: {
      razon_social?: string | null;
      primer_nombre?: string | null;
      primer_apellido?: string | null;
    } | null;
  } | null;
  equipos?: {
    id_equipo: number;
    nombre_equipo?: string | null;
  } | null;
}

export interface CreatePropuestaPayload {
  id_orden_servicio: number;
  tipo_propuesta: 'CORRECTIVO' | 'MEJORA' | 'REEMPLAZO';
  descripcion_hallazgo: string;
  descripcion_solucion: string;
  urgencia_propuesta: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  prioridad: number;
  tiempo_estimado_ejecucion: number;
  creada_por: number;
}

export interface TipoComponenteItem {
  id_tipo_componente: number;
  codigo_tipo?: string;
  nombre_componente: string;
  categoria?: string;
}

export interface MotivoRechazoItem {
  id_motivo_rechazo: number;
  codigo_motivo?: string;
  nombre_motivo?: string;
  descripcion?: string;
}

export async function getCotizaciones(params?: {
  clienteId?: number;
  estadoId?: number;
  skip?: number;
  take?: number;
}): Promise<{ total: number; page: number; perPage: number; cotizaciones: CotizacionRecord[] }> {
  const res = await apiClient.get<{
    total: number;
    page: number;
    perPage: number;
    cotizaciones: CotizacionRecord[];
  }>('/cotizaciones', { params });
  return res.data;
}

export async function getCotizacionDetalle(id: number): Promise<CotizacionRecord> {
  const res = await apiClient.get<CotizacionRecord>(`/cotizaciones/${id}`, {
    params: { includeCliente: 'true', includeItems: 'true' },
  });
  return res.data;
}

export async function createCotizacion(payload: CreateCotizacionPayload): Promise<CotizacionRecord> {
  const res = await apiClient.post<CotizacionRecord>('/cotizaciones', payload);
  return res.data;
}

export async function addItemServicioCotizacion(
  idCotizacion: number,
  payload: AddItemServicioPayload,
): Promise<unknown> {
  const res = await apiClient.post(`/cotizaciones/${idCotizacion}/servicios`, payload);
  return res.data;
}

export async function deleteItemServicioCotizacion(
  idCotizacion: number,
  idItem: number,
): Promise<void> {
  await apiClient.delete(`/cotizaciones/${idCotizacion}/servicios/${idItem}`);
}

export async function addItemComponenteCotizacion(
  idCotizacion: number,
  payload: AddItemComponentePayload,
): Promise<unknown> {
  const res = await apiClient.post(`/cotizaciones/${idCotizacion}/componentes`, payload);
  return res.data;
}

export async function deleteItemComponenteCotizacion(
  idCotizacion: number,
  idItem: number,
): Promise<void> {
  await apiClient.delete(`/cotizaciones/${idCotizacion}/componentes/${idItem}`);
}

export async function recalcularCotizacion(id: number): Promise<unknown> {
  const res = await apiClient.post(`/cotizaciones/${id}/recalcular`, {});
  return res.data;
}

export async function solicitarAprobacionCotizacion(
  id: number,
  observaciones_solicitante: string,
): Promise<unknown> {
  const res = await apiClient.post(`/cotizaciones/${id}/solicitar-aprobacion`, {
    observaciones_solicitante,
  });
  return res.data;
}

export async function getAprobacionesPendientes(): Promise<{
  aprobaciones?: AprobacionPendiente[];
  data?: AprobacionPendiente[];
}> {
  const res = await apiClient.get('/cotizaciones/aprobaciones/pendientes');
  return res.data;
}

export async function procesarAprobacion(
  idAprobacion: number,
  decision: 'APROBADA' | 'RECHAZADA',
  observaciones_aprobador: string,
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/aprobaciones/${idAprobacion}`, {
    decision,
    observaciones_aprobador,
  });
  return res.data;
}

export async function enviarCotizacion(
  id: number,
  payload: { destinatario_email: string; destinatario_nombre: string; emails_copia?: string[] },
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/${id}/enviar`, payload);
  return res.data;
}

export async function aprobarCotizacionCliente(
  id: number,
  observaciones?: string,
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/${id}/aprobar`, { observaciones });
  return res.data;
}

export async function rechazarCotizacionCliente(
  id: number,
  payload: { id_motivo_rechazo: number; observaciones_rechazo: string },
): Promise<unknown> {
  const res = await apiClient.put(`/cotizaciones/${id}/rechazar`, payload);
  return res.data;
}

export async function downloadCotizacionPdf(id: number, numeroCotizacion?: string): Promise<void> {
  const res = await apiClient.get<Blob>(`/cotizaciones/${id}/pdf`, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${numeroCotizacion || `COTIZACION-${id}`}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export async function getTiposComponente(): Promise<TipoComponenteItem[]> {
  const res = await apiClient.get<TipoComponenteItem[] | { data?: TipoComponenteItem[]; items?: TipoComponenteItem[] }>(
    '/tipos-componente',
    { params: { limit: 100 } },
  );
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data || res.data?.items || [];
}

export async function getMotivosRechazo(): Promise<MotivoRechazoItem[]> {
  const res = await apiClient.get<MotivoRechazoItem[] | { data?: MotivoRechazoItem[] }>(
    '/motivos-rechazo',
    { params: { limit: 100 } },
  );
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data || [];
}

export async function getPropuestasPendientes(params?: {
  tipoPropuesta?: string;
  urgencia?: string;
  skip?: number;
  take?: number;
}): Promise<{ propuestas: PropuestaCorrectivoItem[]; total: number }> {
  const res = await apiClient.get<{ propuestas: PropuestaCorrectivoItem[]; total: number }>(
    '/propuestas-correctivo/pendientes',
    { params },
  );
  return res.data;
}

export async function createPropuestaCorrectivo(payload: CreatePropuestaPayload): Promise<unknown> {
  const res = await apiClient.post('/propuestas-correctivo', payload);
  return res.data;
}

export async function convertirPropuestaAOrden(
  id: number,
  convertida_por: number,
): Promise<unknown> {
  const res = await apiClient.post(`/propuestas-correctivo/${id}/convertir-orden`, {
    convertida_por,
  });
  return res.data;
}
