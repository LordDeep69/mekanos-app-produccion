'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addItemComponenteCotizacion,
  addItemServicioCotizacion,
  aplicarPlantillaACotizacion,
  aprobarCotizacionCliente,
  convertirCotizacionAOrden,
  convertirPropuestaAOrden,
  createCotizacion,
  createPlantillaCotizacion,
  createPropuestaCorrectivo,
  createTipoOfertaCotizacion,
  deleteItemComponenteCotizacion,
  deleteItemServicioCotizacion,
  deletePlantillaCotizacion,
  deleteTipoOfertaCotizacion,
  duplicarCotizacion,
  eliminarFirmaCotizacion,
  enviarCotizacion,
  escalarPropuestaACotizacion,
  getAprobacionesPendientes,
  getCotizacionDetalle,
  getCotizaciones,
  getFirmasHistorialEmpleado,
  getMotivosRechazo,
  getPlantillasCotizacion,
  getPropuestasPendientes,
  getSugerenciasCpq,
  getTiposComponente,
  getTiposOfertaCotizacion,
  guardarCotizacionComoPlantilla,
  guardarFirmaCotizacion,
  guardarStudioCotizacion,
  importarBomACotizacion,
  procesarAprobacion,
  reabrirBorradorCotizacion,
  recalcularCotizacion,
  rechazarCotizacionCliente,
  solicitarAprobacionCotizacion,
  updatePlantillaCotizacion,
  updateTipoOfertaCotizacion,
  type AddItemComponentePayload,
  type AddItemServicioPayload,
  type CreateCotizacionPayload,
  type CreatePropuestaPayload,
  type GuardarStudioPayload,
  type PlantillaCotizacionRecord,
} from '../api/comercial.service';

export const COMERCIAL_KEYS = {
  cotizaciones: ['comercial', 'cotizaciones'] as const,
  cotizacion: (id: number) => ['comercial', 'cotizacion', id] as const,
  aprobaciones: ['comercial', 'aprobaciones'] as const,
  plantillas: ['comercial', 'plantillas'] as const,
  tiposOferta: ['comercial', 'tipos-oferta'] as const,
  sugerencias: (equiposIds: number[], tipo?: string) =>
    ['comercial', 'sugerencias', equiposIds.join(','), tipo || ''] as const,
  propuestas: ['comercial', 'propuestas'] as const,
  tiposComponente: ['comercial', 'tipos-componente'] as const,
  motivosRechazo: ['comercial', 'motivos-rechazo'] as const,
};

function formatFriendlyApiError(raw: string): string {
  // Limpia prefijos técnicos tipo "observaciones_solicitante: Mensaje..." para mostrar texto claro al usuario
  return raw.replace(/^[a-z][a-z0-9_]*:\s*/i, '').trim();
}

function getErr(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) {
    const cleaned = msg.map((item) => formatFriendlyApiError(String(item))).filter(Boolean);
    return cleaned.length > 0 ? cleaned.join(' · ') : fallback;
  }
  if (typeof msg === 'string' && msg.trim()) {
    return formatFriendlyApiError(msg) || fallback;
  }
  return fallback;
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

export function usePlantillasCotizacion(params?: {
  search?: string;
  tipo_cotizacion?: string;
  id_tipo_equipo?: number;
  incluir_inactivas?: boolean;
}) {
  return useQuery({
    queryKey: [...COMERCIAL_KEYS.plantillas, params],
    queryFn: () => getPlantillasCotizacion(params),
  });
}

export function useTiposOfertaCotizacion() {
  return useQuery({
    queryKey: COMERCIAL_KEYS.tiposOferta,
    queryFn: getTiposOfertaCotizacion,
    staleTime: 60_000,
  });
}

export function useTiposOfertaActions() {
  const qc = useQueryClient();
  const invAll = () => {
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.tiposOferta });
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.plantillas });
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
  };

  const crear = useMutation({
    mutationFn: (payload: {
      nombre: string;
      codigo?: string;
      descripcion?: string;
      badge?: string;
    }) => createTipoOfertaCotizacion(payload),
    onSuccess: (created) => {
      invAll();
      toast.success(`Tipo de oferta "${created.nombre}" agregado al catálogo`);
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo crear el tipo de oferta')),
  });

  const actualizar = useMutation({
    mutationFn: ({
      codigo,
      payload,
    }: {
      codigo: string;
      payload: { nombre?: string; descripcion?: string | null; badge?: string };
    }) => updateTipoOfertaCotizacion(codigo, payload),
    onSuccess: (updated) => {
      invAll();
      toast.success(`Tipo de oferta "${updated.nombre}" actualizado`);
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo actualizar el tipo de oferta')),
  });

  const eliminar = useMutation({
    mutationFn: (codigo: string) => deleteTipoOfertaCotizacion(codigo),
    onSuccess: () => {
      invAll();
      toast.success('Tipo de oferta eliminado del catálogo');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo eliminar el tipo de oferta')),
  });

  return { crear, actualizar, eliminar };
}

export function useSugerenciasCpq(equiposIds: number[], tipoCotizacion?: string, enabled = true) {
  return useQuery({
    queryKey: COMERCIAL_KEYS.sugerencias(equiposIds, tipoCotizacion),
    queryFn: () => getSugerenciasCpq({ equiposIds, tipoCotizacion }),
    enabled,
    staleTime: 30_000,
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
    onSuccess: (_created, vars) => {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.tiposOferta });
      if (vars.id_plantilla_origen) {
        qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.plantillas });
      }
      toast.success('Cotización creada en BORRADOR');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al crear cotización')),
  });
}

export function useGuardarStudioCotizacion(idCotizacion: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarStudioPayload) => guardarStudioCotizacion(idCotizacion!, payload),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.tiposOferta });
      if (vars.id_plantilla_origen) {
        qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.plantillas });
      }
      if (idCotizacion) {
        qc.setQueryData(COMERCIAL_KEYS.cotizacion(idCotizacion), updated);
      }
      toast.success('Cotización guardada y recalculada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al guardar la cotización')),
  });
}

export function usePlantillasActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.plantillas });
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.tiposOferta });
  };

  const crear = useMutation({
    mutationFn: (payload: Partial<PlantillaCotizacionRecord>) => createPlantillaCotizacion(payload),
    onSuccess: () => {
      inv();
      toast.success('Plantilla CPQ creada exitosamente');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al crear plantilla')),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PlantillaCotizacionRecord> }) =>
      updatePlantillaCotizacion(id, payload),
    onSuccess: () => {
      inv();
      toast.success('Plantilla actualizada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al actualizar plantilla')),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => deletePlantillaCotizacion(id),
    onSuccess: () => {
      inv();
      toast.success('Plantilla desactivada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al desactivar plantilla')),
  });

  return { crear, actualizar, eliminar };
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
      toast.success('Repuesto agregado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al agregar repuesto')),
  });

  const removeComponente = useMutation({
    mutationFn: (idItem: number) => deleteItemComponenteCotizacion(idCotizacion!, idItem),
    onSuccess: () => {
      invalidate();
      toast.success('Repuesto eliminado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al eliminar repuesto')),
  });

  const recalcular = useMutation({
    mutationFn: () => recalcularCotizacion(idCotizacion!),
    onSuccess: () => {
      invalidate();
      toast.success('Totales recalculados');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al recalcular')),
  });

  const aplicarPlantilla = useMutation({
    mutationFn: ({
      idPlantilla,
      reemplazar_items,
      multiplicador_equipos,
    }: {
      idPlantilla: number;
      reemplazar_items?: boolean;
      multiplicador_equipos?: number;
    }) =>
      aplicarPlantillaACotizacion(idCotizacion!, idPlantilla, {
        reemplazar_items,
        multiplicador_equipos,
      }),
    onSuccess: (res) => {
      invalidate();
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.plantillas });
      toast.success(res.message || 'Plantilla aplicada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al aplicar plantilla')),
  });

  const importarBom = useMutation({
    mutationFn: ({
      idModelo,
      multiplicador_equipos,
    }: {
      idModelo: number;
      multiplicador_equipos?: number;
    }) => importarBomACotizacion(idCotizacion!, idModelo, { multiplicador_equipos }),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message || 'Kit BOM OEM importado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al importar BOM OEM')),
  });

  const guardarComoPlantilla = useMutation({
    mutationFn: (payload: {
      nombre: string;
      codigo_plantilla?: string;
      descripcion?: string;
      normalizar_por_equipo?: boolean;
    }) => guardarCotizacionComoPlantilla(idCotizacion!, payload),
    onSuccess: (pl) => {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.plantillas });
      toast.success(`Plantilla "${pl.nombre}" guardada en el Hub de Plantillas`);
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al guardar plantilla')),
  });

  return {
    addServicio,
    removeServicio,
    addComponente,
    removeComponente,
    recalcular,
    aplicarPlantilla,
    importarBom,
    guardarComoPlantilla,
  };
}

export function useCotizacionWorkflowActions() {
  const qc = useQueryClient();
  const invalidateAll = (id?: number) => {
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.aprobaciones });
    if (id) qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizacion(id) });
    qc.removeQueries({ queryKey: ['cotizacion-pdf-preview'] });
  };

  const solicitarAprobacion = useMutation({
    mutationFn: ({ id, observaciones }: { id: number; observaciones?: string }) =>
      solicitarAprobacionCotizacion(id, observaciones),
    onSuccess: (res, vars) => {
      invalidateAll(vars.id);
      toast.success(res.message || 'Aprobación registrada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo procesar la aprobación')),
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
    onSuccess: (_r, vars) => {
      invalidateAll(vars.id);
      toast.success('Cotización enviada por correo al cliente');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al enviar cotización')),
  });

  const aprobarCliente = useMutation({
    mutationFn: ({
      id,
      observaciones,
      orden_compra_cliente,
    }: {
      id: number;
      observaciones?: string;
      orden_compra_cliente?: string;
    }) => aprobarCotizacionCliente(id, observaciones, orden_compra_cliente),
    onSuccess: (_r, vars) => {
      invalidateAll(vars.id);
      toast.success('Cotización aprobada por el cliente');
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
    onSuccess: (_r, vars) => {
      invalidateAll(vars.id);
      toast.success('Rechazo registrado');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al rechazar cotización')),
  });

  const duplicar = useMutation({
    mutationFn: (id: number) => duplicarCotizacion(id),
    onSuccess: (nueva) => {
      invalidateAll();
      toast.success(`Cotización duplicada: ${nueva.numero_cotizacion}`);
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al duplicar cotización')),
  });

  const reabrirBorrador = useMutation({
    mutationFn: ({ id, motivo_cambio }: { id: number; motivo_cambio?: string }) =>
      reabrirBorradorCotizacion(id, motivo_cambio),
    onSuccess: (res, vars) => {
      if (res?.cotizacion) {
        qc.setQueryData(COMERCIAL_KEYS.cotizacion(vars.id), res.cotizacion);
      }
      invalidateAll(vars.id);
      toast.success(res.message || 'Cotización reabierta en BORRADOR');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo reabrir la cotización')),
  });

  const convertirAOrden = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        id_tipo_servicio?: number;
        fecha_programada?: string;
        id_tecnico_asignado?: number;
        prioridad?: string;
        observaciones?: string;
      };
    }) => convertirCotizacionAOrden(id, payload),
    onSuccess: (res, vars) => {
      invalidateAll(vars.id);
      qc.invalidateQueries({ queryKey: ['ordenes'] });
      toast.success(res.message || 'Orden de Servicio generada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al convertir en Orden de Servicio')),
  });

  return {
    solicitarAprobacion,
    procesar,
    enviar,
    aprobarCliente,
    rechazarCliente,
    duplicar,
    reabrirBorrador,
    convertirAOrden,
  };
}

export function useFirmasHistorialEmpleado(
  idEmpleado?: number | null,
  excludeFirmaId?: number | null,
) {
  return useQuery({
    queryKey: ['cotizaciones', 'firmas-historial-empleado', idEmpleado ?? 0, excludeFirmaId ?? 0],
    queryFn: () => getFirmasHistorialEmpleado(idEmpleado!, excludeFirmaId ?? undefined),
    enabled: Boolean(idEmpleado && idEmpleado > 0),
    staleTime: 60_000,
  });
}

export function useCotizacionFirmaActions(idCotizacion: number | null) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
    if (idCotizacion) {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizacion(idCotizacion) });
    }
    qc.removeQueries({ queryKey: ['cotizacion-pdf-preview'] });
  };

  const guardarFirma = useMutation({
    mutationFn: ({
      tipo,
      payload,
    }: {
      tipo: 'ASESOR' | 'CLIENTE';
      payload: {
        firma_base64?: string;
        id_firma_digital?: number;
        atencion_a_nombre?: string;
        atencion_a_cargo?: string;
      };
    }) => guardarFirmaCotizacion(idCotizacion!, tipo, payload),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message || 'Firma guardada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo guardar la firma digital')),
  });

  const eliminarFirma = useMutation({
    mutationFn: (tipo: 'ASESOR' | 'CLIENTE') => eliminarFirmaCotizacion(idCotizacion!, tipo),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message || 'Firma eliminada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'No se pudo desvincular la firma digital')),
  });

  return { guardarFirma, eliminarFirma };
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
      toast.success('Propuesta correctivo creada');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al crear propuesta')),
  });
}

export function useEscalarPropuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => escalarPropuestaACotizacion(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.propuestas });
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
      toast.success(res.message || 'Cotización comercial creada desde propuesta');
    },
    onError: (e: unknown) => toast.error(getErr(e, 'Error al escalar propuesta a cotización')),
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
