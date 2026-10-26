'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  CornerDownRight,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn, formatDateSafe } from '@/lib/utils';
import { getPendienteEstadoColor, getPrioridadColor } from '@/types/ordenes';

interface EquipoPendientesTabProps {
  idEquipo: number;
  codigoEquipo?: string;
}

export function EquipoPendientesTab({
  idEquipo,
  codigoEquipo,
}: EquipoPendientesTabProps) {
  const [data, setData] = useState<{
    total: number;
    activosCount: number;
    resueltosCount: number;
    canceladosCount: number;
    items: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'TODOS' | 'ACTIVOS' | 'RESUELTOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Modal Nuevo Pendiente Directo (sin OT previa)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA'>('NORMAL');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cargarPendientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/equipos/${idEquipo}/pendientes`);
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Error cargando pendientes');
      }
    } catch (err: any) {
      console.error('Error cargando pendientes del equipo:', err);
      setError(err.message || 'No se pudo cargar el historial de pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPendientes();
  }, [idEquipo]);

  const handleCrearPendienteDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post('/ordenes/pendientes-directos', {
        idEquipo,
        alcance: 'EQUIPO',
        descripcion: descripcion.trim(),
        prioridad,
        observaciones: observaciones.trim() || undefined,
      });
      if (res.data?.success) {
        setIsAddOpen(false);
        setDescripcion('');
        setObservaciones('');
        setPrioridad('NORMAL');
        await cargarPendientes();
      }
    } catch (err: any) {
      alert(err.message || 'Error registrando pendiente directo');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Cargando historial de hallazgos y pendientes técnicos...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-2xs">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-red-800">{error}</p>
        <button
          onClick={cargarPendientes}
          className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  const items = data?.items || [];
  const pendientesActivosIds = items
    .filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION')
    .map((p) => p.id_orden_pendiente);

  const filtrados = items.filter((p) => {
    if (filtro === 'ACTIVOS') {
      if (p.estado !== 'PENDIENTE' && p.estado !== 'EN_GESTION') return false;
    } else if (filtro === 'RESUELTOS') {
      if (p.estado !== 'RESUELTO') return false;
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchDesc = p.descripcion?.toLowerCase().includes(q);
      const matchOrden = p.ordenes_servicio?.numero_orden?.toLowerCase().includes(q);
      const matchObs = p.observaciones?.toLowerCase().includes(q);
      const matchTec = p.empleados_ordenes_pendientes_creado_porToempleados?.persona?.nombre_completo
        ?.toLowerCase()
        .includes(q);
      return matchDesc || matchOrden || matchObs || matchTec;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Header con Resumen y Acción Rápida */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Trazabilidad de Hallazgos & Pendientes del Equipo (EAM 360°)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {data?.total || 0} total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro histórico y activo de pendientes técnicos capturados en órdenes de servicio o reportados directamente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={cargarPendientes}
            className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nuevo Pendiente Directo</span>
          </button>
          <Link
            href={`/ordenes/nueva?equipoId=${idEquipo}${
              pendientesActivosIds.length > 0
                ? `&pendientesIds=${pendientesActivosIds.join(',')}&tipoVisita=CORRECTIVO_DERIVADO`
                : ''
            }`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
          >
            <CornerDownRight className="h-4 w-4" />
            <span>Generar OT Correctiva</span>
          </Link>
        </div>
      </div>

      {/* 2. Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Pendientes Activos (Por Resolver)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                'text-2xl font-black',
                (data?.activosCount || 0) > 0 ? 'text-amber-600' : 'text-slate-800'
              )}
            >
              {data?.activosCount || 0}
            </span>
            <span className="text-xs text-slate-500">requerimientos abiertos</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Requieren cotización o inclusión en la próxima OT
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Histórico Resueltos
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">
              {data?.resueltosCount || 0}
            </span>
            <span className="text-xs text-slate-500">reparaciones cerradas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Trabajos completados con trazabilidad de orden de resolución
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Desestimados / Cancelados
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-400">
              {data?.canceladosCount || 0}
            </span>
            <span className="text-xs text-slate-500">ítems cancelados</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Hallazgos no aplicables o sustituidos
          </p>
        </div>
      </div>

      {/* 3. Filtros y Búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-semibold">Filtrar:</span>
          {(['TODOS', 'ACTIVOS', 'RESUELTOS'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                filtro === f
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {f === 'TODOS'
                ? `Todos (${data?.total || 0})`
                : f === 'ACTIVOS'
                ? `Activos (${data?.activosCount || 0})`
                : `Resueltos (${data?.resueltosCount || 0})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción, orden o técnico..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      {/* 4. Lista de Hallazgos */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-2xs">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-bold text-slate-800">
            Sin Pendientes en Este Criterio
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {busqueda.trim()
              ? 'No hay hallazgos que coincidan con la búsqueda ingresada.'
              : 'Este activo no tiene pendientes abiertos en el criterio seleccionado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtrados.map((p) => {
            const isResuelto = p.estado === 'RESUELTO';
            const isCancelado = p.estado === 'CANCELADO';
            const estadoClase = getPendienteEstadoColor(p.estado);
            const prioridadClase = getPrioridadColor(p.prioridad);
            const numOrden = p.ordenes_servicio?.numero_orden;
            const sistName = p.ordenes_equipos?.nombre_sistema;
            const ordenSec = p.ordenes_equipos?.orden_secuencia;

            return (
              <div
                key={p.id_orden_pendiente}
                className={cn(
                  'rounded-xl border p-4 transition-all flex flex-col justify-between gap-3 shadow-2xs',
                  isResuelto
                    ? 'bg-emerald-50/20 border-emerald-200'
                    : isCancelado
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-amber-200 hover:border-amber-300'
                )}
              >
                <div>
                  {/* Header de la tarjeta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-bold border',
                          estadoClase
                        )}
                      >
                        {p.estado}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-semibold',
                          prioridadClase
                        )}
                      >
                        {p.prioridad}
                      </span>
                      {ordenSec && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <Wrench className="h-3 w-3 text-blue-600" />
                          #{ordenSec} {sistName ? `· ${sistName}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Vínculo a la Orden de Servicio de Origen */}
                    {p.ordenes_servicio ? (
                      <Link
                        href={`/ordenes/${p.ordenes_servicio.id_orden_servicio}`}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:underline"
                        title="Ver Orden de Servicio donde se reportó este hallazgo"
                      >
                        <span>Origen: {numOrden || `OT #${p.ordenes_servicio.id_orden_servicio}`}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Directo Hoja de Vida
                      </span>
                    )}
                  </div>

                  {/* Descripción del Hallazgo */}
                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    {p.descripcion}
                  </p>

                  {/* Observaciones Técnicas */}
                  {p.observaciones && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <strong className="text-slate-700">Obs:</strong> {p.observaciones}
                    </p>
                  )}

                  {/* Vínculo a Orden de Resolución (Closed-Loop) */}
                  {p.orden_resolucion && (
                    <div className="mt-2 p-2 rounded-lg bg-indigo-50/80 border border-indigo-200 flex items-center justify-between text-xs">
                      <span className="text-indigo-900 font-semibold flex items-center gap-1">
                        <CornerDownRight className="h-3.5 w-3.5 text-indigo-600" />
                        {isResuelto ? 'Resuelto en:' : 'En resolución en:'}
                      </span>
                      <Link
                        href={`/ordenes/${p.orden_resolucion.id_orden_servicio}`}
                        className="font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1"
                      >
                        <span>
                          {p.orden_resolucion.numero_orden} (Visita #
                          {p.orden_resolucion.numero_visita_caso || 2})
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {/* Notas de Resolución */}
                  {p.observaciones_resolucion && (
                    <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
                      <p className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Resolución:
                      </p>
                      <p className="mt-0.5">{p.observaciones_resolucion}</p>
                    </div>
                  )}
                </div>

                {/* Footer con Metadata */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Reportado: {formatDateSafe(p.fecha_creacion)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isResuelto && !isCancelado && !p.orden_resolucion && (
                      <Link
                        href={`/ordenes/nueva?equipoId=${idEquipo}&pendientesIds=${p.id_orden_pendiente}${
                          p.ordenes_servicio?.id_orden_servicio
                            ? `&ordenPadreId=${p.ordenes_servicio.id_orden_servicio}&tipoVisita=CORRECTIVO_DERIVADO`
                            : ''
                        }`}
                        className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-[10px]"
                      >
                        Resolver en OT →
                      </Link>
                    )}
                    {p.empleados_ordenes_pendientes_creado_porToempleados?.persona && (
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>
                          {p.empleados_ordenes_pendientes_creado_porToempleados.persona
                            .nombre_completo ||
                            p.empleados_ordenes_pendientes_creado_porToempleados.persona
                              .primer_nombre}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Pendiente Directo al Equipo */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4 text-amber-600" />
                Registrar Pendiente Directo ({codigoEquipo || `Equipo #${idEquipo}`})
              </h4>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCrearPendienteDirecto} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Descripción del Requerimiento / Repuesto *
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  required
                  placeholder="Ej: Reemplazar sensor de presión de aceite VDO en próximo servicio..."
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Prioridad
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    className="w-full text-sm p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                    <option value="EMERGENCIA">Emergencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Observación / Parte
                  </label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ref / medida..."
                    className="w-full text-sm p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Guardar en Hoja de Vida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
