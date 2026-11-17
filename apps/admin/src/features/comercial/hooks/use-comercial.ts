'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addItemComponenteCotizacion,
  addItemServicioCotizacion,
  aprobarCotizacionCliente,
  convertirPropuestaAOrden,
  createCotizacion,
  createPropuestaCorrectivo,
  deleteItemComponenteCotizacion,
  deleteItemServicioCotizacion,
  enviarCotizacion,
  getAprobacionesPendientes,
  getCotizacionDetalle,
  getCotizaciones,
  getMotivosRechazo,
  getPropuestasPendientes,
  getTiposComponente,
  procesarAprobacion,
  recalcularCotizacion,
  rechazarCotizacionCliente,
  solicitarAprobacionCotizacion,
  type AddItemComponentePayload,
  type AddItemServicioPayload,
  type CreateCotizacionPayload,
  type CreatePropuestaPayload,
} from '../api/comercial.service';

export const COMERCIAL_KEYS = {
  cotizaciones: ['comercial', 'cotizaciones'] as const,
  cotizacion: (id: number) => ['comercial', 'cotizacion', id] as const,
  aprobaciones: ['comercial', 'aprobaciones'] as const,
  propuestas: ['comercial', 'propuestas'] as const,
  tiposComponente: ['comercial', 'tipos-componente'] as const,
  motivosRechazo: ['comercial', 'motivos-rechazo'] as const,
};

function getErr(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
}

export function useCotizaciones(params?: {
  clienteId?: number;
  estadoId?: number;
  skip?: number;
  take?: number;
}) {
  return useQuery({
    queryKey: [...COMERCIAL_KEYS.cotizaciones, params],
    queryFn: () => getCotizaciones(params),
  });
}

export function useCotizacionDetalle(id: number | null) {
  return useQuery({
    queryKey: COMERCIAL_KEYS.cotizacion(id || 0),
    queryFn: () => getCotizacionDetalle(id!),
    enabled: Boolean(id),
  });
}

export function useAprobacionesPendientes() {
  return useQuery({
    queryKey: COMERCIAL_KEYS.aprobaciones,
    queryFn: getAprobacionesPendientes,
  });
}

export function useTiposComponente() {
  return useQuery({
    queryKey: COMERCIAL_KEYS.tiposComponente,
    queryFn: getTiposComponente,
    staleTime: 10 * 60_000,
  });
}

export function useMotivosRechazo() {
  return useQuery({
    queryKey: COMERCIAL_KEYS.motivosRechazo,
    queryFn: getMotivosRechazo,
    staleTime: 10 * 60_000,
  });
}

export function useCreateCotizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCotizacionPayload) => createCotizacion(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
      toast.success('Cotización creada en estado BORRADOR');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al crear cotización')),
  });
}

export function useCotizacionItemActions(idCotizacion: number | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
    if (idCotizacion) qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizacion(idCotizacion) });
  };

  const addServicio = useMutation({
    mutationFn: (payload: AddItemServicioPayload) =>
      addItemServicioCotizacion(idCotizacion!, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Servicio agregado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al agregar servicio')),
  });

  const removeServicio = useMutation({
    mutationFn: (idItem: number) => deleteItemServicioCotizacion(idCotizacion!, idItem),
    onSuccess: () => {
      invalidate();
      toast.success('Servicio eliminado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al eliminar servicio')),
  });

  const addComponente = useMutation({
    mutationFn: (payload: AddItemComponentePayload) =>
      addItemComponenteCotizacion(idCotizacion!, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Componente agregado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al agregar componente')),
  });

  const removeComponente = useMutation({
    mutationFn: (idItem: number) => deleteItemComponenteCotizacion(idCotizacion!, idItem),
    onSuccess: () => {
      invalidate();
      toast.success('Componente eliminado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al eliminar componente')),
  });

  const recalcular = useMutation({
    mutationFn: () => recalcularCotizacion(idCotizacion!),
    onSuccess: () => {
      invalidate();
      toast.success('Totales recalculados');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al recalcular')),
  });

  return { addServicio, removeServicio, addComponente, removeComponente, recalcular };
}

export function useCotizacionWorkflowActions() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.aprobaciones });
  };

  const solicitarAprobacion = useMutation({
    mutationFn: ({ id, observaciones }: { id: number; observaciones: string }) =>
      solicitarAprobacionCotizacion(id, observaciones),
    onSuccess: () => {
      invalidateAll();
      toast.success('Solicitud de aprobación enviada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al solicitar aprobación')),
  });

  const procesar = useMutation({
    mutationFn: ({
      idAprobacion,
      decision,
      observaciones,
    }: {
      idAprobacion: number;
      decision: 'APROBADA' | 'RECHAZADA';
      observaciones: string;
    }) => procesarAprobacion(idAprobacion, decision, observaciones),
    onSuccess: () => {
      invalidateAll();
      toast.success('Decisión de aprobación registrada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al procesar aprobación')),
  });

  const enviar = useMutation({
    mutationFn: ({
      id,
      destinatario_email,
      destinatario_nombre,
      emails_copia,
    }: {
      id: number;
      destinatario_email: string;
      destinatario_nombre: string;
      emails_copia?: string[];
    }) => enviarCotizacion(id, { destinatario_email, destinatario_nombre, emails_copia }),
    onSuccess: () => {
      invalidateAll();
      toast.success('Cotización enviada por correo al cliente');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al enviar cotización')),
  });

  const aprobarCliente = useMutation({
    mutationFn: ({ id, observaciones }: { id: number; observaciones?: string }) =>
      aprobarCotizacionCliente(id, observaciones),
    onSuccess: () => {
      invalidateAll();
      toast.success('Cotización marcada como aprobada por el cliente');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al aprobar cotización')),
  });

  const rechazarCliente = useMutation({
    mutationFn: ({
      id,
      id_motivo_rechazo,
      observaciones_rechazo,
    }: {
      id: number;
      id_motivo_rechazo: number;
      observaciones_rechazo: string;
    }) => rechazarCotizacionCliente(id, { id_motivo_rechazo, observaciones_rechazo }),
    onSuccess: () => {
      invalidateAll();
      toast.success('Rechazo registrado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al rechazar cotización')),
  });

  return { solicitarAprobacion, procesar, enviar, aprobarCliente, rechazarCliente };
}

export function usePropuestasPendientes(params?: {
  tipoPropuesta?: string;
  urgencia?: string;
  skip?: number;
  take?: number;
}) {
  return useQuery({
    queryKey: [...COMERCIAL_KEYS.propuestas, params],
    queryFn: () => getPropuestasPendientes(params),
  });
}

export function useCreatePropuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePropuestaPayload) => createPropuestaCorrectivo(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.propuestas });
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
      toast.success('Propuesta correctivo creada y cotización generada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al crear propuesta')),
  });
}

export function useConvertirPropuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, convertida_por }: { id: number; convertida_por: number }) =>
      convertirPropuestaAOrden(id, convertida_por),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.propuestas });
      qc.invalidateQueries({ queryKey: ['ordenes'] });
      toast.success('Propuesta convertida en Orden de Servicio');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo convertir la propuesta')),
  });
}
