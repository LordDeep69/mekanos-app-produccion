import { apiClient } from '@/lib/api/client';

export interface ContratoMantenimiento {
  id_contrato: number;
  codigo_contrato: string;
  id_cliente: number;
  id_asesor_responsable: number;
  tipo_contrato?: 'PREVENTIVO_RECURRENTE' | 'INTEGRAL' | 'ESPECIAL' | string;
  periodicidad_default?:
    | 'SEMANAL'
    | 'QUINCENAL'
    | 'MENSUAL'
    | 'BIMESTRAL'
    | 'TRIMESTRAL'
    | 'SEMESTRAL'
    | 'ANUAL'
    | string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  estado_contrato?: 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO' | 'RENOVACION_PENDIENTE' | string;
  genera_automaticamente?: boolean;
  dias_anticipacion_generacion?: number | null;
  observaciones?: string | null;
  fecha_creacion?: string;
}

export interface CreateContratoPayload {
  id_cliente: number;
  id_asesor_responsable: number;
  tipo_contrato?: 'PREVENTIVO_RECURRENTE' | 'INTEGRAL' | 'ESPECIAL';
  periodicidad_default?:
    | 'SEMANAL'
    | 'QUINCENAL'
    | 'MENSUAL'
    | 'BIMESTRAL'
    | 'TRIMESTRAL'
    | 'SEMESTRAL'
    | 'ANUAL';
  fecha_inicio: string;
  fecha_fin?: string;
  estado_contrato?: 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO' | 'RENOVACION_PENDIENTE';
  genera_automaticamente?: boolean;
  dias_anticipacion_generacion?: number;
  observaciones?: string;
}

export interface EquipoContrato {
  id_equipo_contrato: number;
  id_contrato: number;
  id_equipo: number;
  tipo_servicio_default: number;
  criterio_intervalo?: 'DIAS' | 'HORAS' | 'LO_QUE_OCURRA_PRIMERO' | string;
  intervalo_dias?: number | null;
  intervalo_horas?: number | null;
  activo_en_contrato?: boolean;
  fecha_inclusion?: string | null;
  fecha_exclusion?: string | null;
}

export interface CreateEquipoContratoPayload {
  id_contrato: number;
  id_equipo: number;
  tipo_servicio_default: number;
  criterio_intervalo?: 'DIAS' | 'HORAS' | 'LO_QUE_OCURRA_PRIMERO';
  intervalo_dias?: number;
  intervalo_horas?: number;
  activo_en_contrato?: boolean;
  fecha_inclusion?: string;
}

export interface CronogramaServicio {
  id_cronograma: number;
  id_contrato: number;
  id_equipo: number;
  id_equipo_contrato: number;
  tipo_servicio_programado: number;
  fecha_prevista: string;
  fecha_inicio_ventana?: string | null;
  fecha_fin_ventana?: string | null;
  fecha_base_calculo?: string | null;
  estado_cronograma?: 'PENDIENTE' | 'PROGRAMADA' | 'COMPLETADA' | 'VENCIDA' | 'CANCELADA' | string;
  id_orden_servicio_generada?: number | null;
  fecha_generacion_os?: string | null;
  fecha_completado?: string | null;
  prioridad?: 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA' | string;
  observaciones_programacion?: string | null;
}

export interface CreateCronogramaPayload {
  id_contrato: number;
  id_equipo: number;
  id_equipo_contrato: number;
  tipo_servicio_programado: number;
  fecha_prevista: string;
  fecha_inicio_ventana?: string;
  fecha_fin_ventana?: string;
  estado_cronograma?: 'PENDIENTE' | 'PROGRAMADA' | 'COMPLETADA' | 'VENCIDA' | 'CANCELADA';
  prioridad?: 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA';
  observaciones_programacion?: string;
}

export type UpdateCronogramaPayload = Partial<CreateCronogramaPayload> & {
  id_orden_servicio_generada?: number;
  fecha_generacion_os?: string;
  fecha_completado?: string;
};

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getContratos(page = 1, limit = 100): Promise<PaginatedResult<ContratoMantenimiento>> {
  const res = await apiClient.get<PaginatedResult<ContratoMantenimiento>>('/contratos-mantenimiento', {
    params: { page, limit },
  });
  return res.data;
}

export async function createContrato(payload: CreateContratoPayload): Promise<ContratoMantenimiento> {
  const res = await apiClient.post<ContratoMantenimiento>('/contratos-mantenimiento', payload);
  return res.data;
}

export async function updateContrato(
  id: number,
  payload: Partial<CreateContratoPayload>,
): Promise<ContratoMantenimiento> {
  const res = await apiClient.put<ContratoMantenimiento>(`/contratos-mantenimiento/${id}`, payload);
  return res.data;
}

export async function getEquiposContrato(page = 1, limit = 200): Promise<PaginatedResult<EquipoContrato>> {
  const res = await apiClient.get<PaginatedResult<EquipoContrato>>('/equipos-contrato', {
    params: { page, limit },
  });
  return res.data;
}

export async function createEquipoContrato(payload: CreateEquipoContratoPayload): Promise<EquipoContrato> {
  const res = await apiClient.post<EquipoContrato>('/equipos-contrato', payload);
  return res.data;
}

export async function deleteEquipoContrato(id: number): Promise<void> {
  await apiClient.delete(`/equipos-contrato/${id}`);
}

export async function getCronogramas(page = 1, limit = 200): Promise<PaginatedResult<CronogramaServicio>> {
  const res = await apiClient.get<PaginatedResult<CronogramaServicio>>('/cronogramas-servicio', {
    params: { page, limit },
  });
  return res.data;
}

export async function createCronograma(payload: CreateCronogramaPayload): Promise<CronogramaServicio> {
  const res = await apiClient.post<CronogramaServicio>('/cronogramas-servicio', payload);
  return res.data;
}

export async function updateCronograma(
  id: number,
  payload: UpdateCronogramaPayload,
): Promise<CronogramaServicio> {
  const res = await apiClient.put<CronogramaServicio>(`/cronogramas-servicio/${id}`, payload);
  return res.data;
}
