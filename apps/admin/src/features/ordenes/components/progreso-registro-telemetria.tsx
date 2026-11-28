/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: ProgresoRegistroTelemetria (FASE 2 · Espejo Vivo SSE)
 *
 * Panel completo de telemetría y Espejo Vivo en tiempo real de avance
 * de registro de orden de servicio en campo.
 */

'use client';

import React, { useState } from 'react';
import { useProgresoRegistro } from '../hooks/use-ordenes';
import type { OrdenRealtimeMirrorState } from '../hooks/use-orden-realtime-mirror';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileCheck2,
  PauseCircle,
  PenTool,
  Radio,
  RefreshCw,
  WifiOff,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProgresoRegistroTelemetriaProps {
  idOrden: number;
  className?: string;
  mirror?: OrdenRealtimeMirrorState;
  onVerChecklistTab?: () => void;
  onVerMedicionesTab?: () => void;
  onVerDocumentosTab?: () => void;
  onVerPendientesTab?: () => void;
}

export function ProgresoRegistroTelemetria({
  idOrden,
  className,
  mirror,
  onVerChecklistTab,
  onVerMedicionesTab,
  onVerDocumentosTab,
  onVerPendientesTab,
}: ProgresoRegistroTelemetriaProps) {
  const [autoRefreshFallback, setAutoRefreshFallback] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mekanos_telemetria_desplegada');
      return saved === 'true'; // Default false: compacta
    }
    return false;
  });

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mekanos_telemetria_desplegada', String(next));
      }
      return next;
    });
  };

  // Si `mirror` (SSE + fallback polling integrado) está montado, no duplicar polling HTTP aquí
  const {
    data: progreso,
    isLoading,
    isFetching,
    refetch,
  } = useProgresoRegistro(idOrden, {
    refetchInterval: !mirror && autoRefreshFallback ? 15000 : false,
  });

  if (isLoading && !progreso) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!progreso) {
    return null;
  }

  const {
    porcentaje_global = 0,
    estado_conexion = 'SIN_INICIAR',
    minutos_inactividad = null,
    actividades = {
      total: 0,
      completadas: 0,
      porcentaje: 0,
    },
    mediciones = { registradas: 0, total: 0, con_alerta: 0 },
    evidencias_fotos = 0,
    evidencias_fotos_esperadas = 3,
    pendientes = { total: 0, activos: 0, resueltos: 0, criticos: 0 },
    firmas = { tecnico: false, cliente: false, total: 0, esperadas: 2 },
    pesos_efectivos = { actividades: 40, mediciones: 25, evidencias: 15, firmas: 20 },
    total_equipos = 1,
    tecnico,
    ultimos_eventos: ultimosEventos = [],
  } = progreso;

  const codigoEstado = (progreso.estado_actual?.codigo_estado || '').toUpperCase();
  const esFinalizada =
    progreso.estado_actual?.es_estado_final === true ||
    codigoEstado === 'COMPLETADA' ||
    codigoEstado === 'CERRADA' ||
    codigoEstado === 'CANCELADA' ||
    estado_conexion === 'COMPLETADO';

  const firmasEsperadas = firmas.esperadas ?? 2;
  const medsTotal = Math.max(mediciones.total ?? mediciones.registradas, mediciones.registradas);
  const fotosEsperadas = Math.max(evidencias_fotos_esperadas ?? 2, 1);

  const formatRelativo = () => {
    if (esFinalizada) return 'Orden Finalizada';
    if (minutos_inactividad === null || minutos_inactividad === undefined) {
      return 'Sin sincronización móvil aún';
    }
    if (minutos_inactividad < 1) return 'Última sincr. hace segundos';
    if (minutos_inactividad < 60) return `Última sincr. hace ${minutos_inactividad} min`;
    const horas = Math.floor(minutos_inactividad / 60);
    return `Última sincr. hace ${horas} h`;
  };

  const getStatusStyle = () => {
    if (esFinalizada) {
      return {
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        text: 'FINALIZADA',
        dot: 'bg-emerald-500',
        label: 'Orden Finalizada',
        ping: false,
      };
    }
    switch (estado_conexion) {
      case 'EN_VIVO':
        return {
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
          text: 'TÉCNICO EN VIVO',
          dot: 'bg-emerald-500',
          label: 'Técnico trabajando en vivo',
          ping: true,
        };
      case 'RECIENTE':
        return {
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-300',
          text: 'ACTIVIDAD RECIENTE',
          dot: 'bg-amber-500',
          label: 'Actividad reciente en campo',
          ping: false,
        };
      case 'INACTIVO':
        return {
          badgeBg: 'bg-orange-50 text-orange-700 border-orange-300',
          text: 'SIN SEÑAL RECIENTE',
          dot: 'bg-orange-400',
          label: 'En campo sin señal reciente',
          ping: false,
        };
      default:
        return {
          badgeBg: 'bg-slate-50 text-slate-600 border-slate-200',
          text: 'EN ESPERA',
          dot: 'bg-slate-300',
          label: 'Esperando inicio en campo',
          ping: false,
        };
    }
  };

  const statusStyle = getStatusStyle();

  const renderMirrorBadge = () => {
    if (esFinalizada && (!mirror || mirror.connectionStatus === 'DISABLED')) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
          <span>✓</span>
          <span>Sincronizada</span>
        </span>
      );
    }

    if (mirror) {
      switch (mirror.connectionStatus) {
        case 'CONNECTED':
          return (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
              title="Conectado al canal SSE en tiempo real (se pausa automáticamente si cambias de pestaña)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>SSE En Vivo</span>
            </span>
          );
        case 'PAUSED_HIDDEN':
          return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white/10 text-slate-300 border-white/15">
              <PauseCircle className="h-3.5 w-3.5" />
              <span>Pausado</span>
            </span>
          );
        case 'FALLBACK_POLLING':
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                mirror.reconnect();
                toast.info('Reintentando conexión SSE en vivo...');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30 transition-colors"
              title="Polling automático activo cada 15s. Clic para reintentar SSE."
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>Respaldo (15s)</span>
            </button>
          );
        case 'CONNECTING':
          return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-indigo-500/20 text-indigo-200 border-indigo-400/40">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Conectando...</span>
            </span>
          );
        default:
          return null;
      }
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const next = !autoRefreshFallback;
          setAutoRefreshFallback(next);
          toast.info(next ? 'Auto-refresco activado (15s)' : 'Auto-refresco pausado');
        }}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
          autoRefreshFallback
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
            : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/15',
        )}
      >
        <span
          className={cn(
            'inline-flex rounded-full h-2 w-2',
            autoRefreshFallback ? 'bg-emerald-400' : 'bg-slate-400',
          )}
        />
        <span>{autoRefreshFallback ? 'En vivo (15s)' : 'Pausado'}</span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all',
        mirror?.isSectionPulsing('progreso') &&
          'ring-2 ring-emerald-400/80 border-emerald-300 shadow-emerald-100',
        className,
      )}
    >
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CABECERA ESPEJO EN VIVO - Plegable / Desplegable                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        onClick={handleToggleExpand}
        className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-3.5 cursor-pointer hover:bg-slate-800/90 transition-colors select-none"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Título + Estado en Vivo */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-inner shrink-0">
              <Radio
                className={cn(
                  'h-5 w-5',
                  statusStyle.ping ? 'text-emerald-400 animate-pulse' : 'text-slate-300',
                )}
              />
              {statusStyle.ping && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                  Espejo en Tiempo Real
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {total_equipos > 1 ? `Multi-Equipo (${total_equipos})` : 'Live Sync'}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 flex-wrap">
                <span>{statusStyle.label}</span>
                {!esFinalizada && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span>{formatRelativo()}</span>
                  </>
                )}
                {tecnico && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-indigo-200 font-medium">{tecnico.nombre_completo}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Resumen Compacto cuando está contraída */}
          {!isExpanded && (
            <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-300">Avance:</span>
                <span className="text-sm font-black text-white">{porcentaje_global}%</span>
              </div>
              <div className="w-16 h-2 bg-slate-700/80 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    esFinalizada || porcentaje_global >= 100
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                      : porcentaje_global >= 70
                        ? 'bg-gradient-to-r from-blue-400 to-indigo-400'
                        : 'bg-gradient-to-r from-amber-400 to-orange-400',
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, porcentaje_global))}%` }}
                />
              </div>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-300">
                <strong className="text-white">{actividades.completadas}</strong>/
                {Math.max(actividades.total, actividades.completadas)} acts
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-300">
                <strong className="text-white">{mediciones.registradas}</strong>/{medsTotal} meds
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-300">
                <strong className="text-white">{evidencias_fotos}</strong> fotos
              </span>
              {pendientes.total > 0 && (
                <>
                  <span className="text-slate-500 text-xs">•</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerPendientesTab?.();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40 hover:bg-amber-400/30 transition-colors"
                  >
                    <ClipboardList className="h-3 w-3" />
                    <span>{pendientes.activos} pend</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Controles */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            {renderMirrorBadge()}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                refetch();
                toast.success('Telemetría actualizada');
              }}
              disabled={isFetching}
              className="p-1.5 rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10 transition-colors disabled:opacity-50"
              title="Actualizar datos ahora"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin text-indigo-300')} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-100 hover:text-white border border-indigo-400/40 text-xs font-bold transition-all shadow-xs"
              title={isExpanded ? 'Contraer panel de telemetría' : 'Desplegar telemetría completa'}
            >
              <span>{isExpanded ? 'Contraer' : 'Desplegar'}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-300',
                  isExpanded && 'rotate-180',
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GRID DE MÉTRICAS KPI - PLEGABLE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isExpanded && (
        <div className="p-5 space-y-5 border-t border-slate-200/80 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Gran Barra de Progreso Ponderado */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Avance Global Ponderado
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {porcentaje_global}%
                  <span className="text-xs font-semibold text-slate-500 ml-2">
                    {esFinalizada ? 'Completado al 100%' : 'de registro en campo'}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5',
                  statusStyle.badgeBg,
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', statusStyle.dot)} />
                <span>{statusStyle.text}</span>
              </div>
            </div>

            <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden shadow-inner mb-2">
              <div
                className={cn(
                  'h-full transition-all duration-700 rounded-full',
                  esFinalizada || porcentaje_global >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : porcentaje_global >= 70
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      : porcentaje_global >= 40
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500',
                )}
                style={{ width: `${Math.min(100, Math.max(0, porcentaje_global))}%` }}
              />
            </div>

            {/* Pesos dinámicos normalizados del backend */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 gap-2">
              <span>Checklist: {pesos_efectivos.actividades}%</span>
              <span>•</span>
              <span>Mediciones: {pesos_efectivos.mediciones}%</span>
              <span>•</span>
              <span>Evidencias: {pesos_efectivos.evidencias}%</span>
              <span>•</span>
              <span>Firmas y Cierre: {pesos_efectivos.firmas}%</span>
            </div>
          </div>

          {/* Grid de 5 Bloques de Trabajo (incluye Pendientes en Vivo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. CHECKLIST */}
            <div
              onClick={onVerChecklistTab}
              className={cn(
                'p-3.5 rounded-xl border bg-white shadow-sm transition-all',
                mirror?.isSectionPulsing('actividades') &&
                  'ring-2 ring-emerald-400 border-emerald-300',
                onVerChecklistTab && 'cursor-pointer hover:border-indigo-300 hover:shadow-md',
              )}
            >
              <div className="flex items-center justify-between text-indigo-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Actividades</span>
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {actividades.completadas}
                <span className="text-xs font-normal text-slate-500"> / {actividades.total}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 my-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, actividades.porcentaje)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {actividades.porcentaje}% registradas
              </div>
            </div>

            {/* 2. MEDICIONES */}
            <div
              onClick={onVerMedicionesTab}
              className={cn(
                'p-3.5 rounded-xl border bg-white shadow-sm transition-all',
                (mediciones.con_alerta ?? 0) > 0
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200',
                mirror?.isSectionPulsing('mediciones') &&
                  'ring-2 ring-emerald-400 border-emerald-300',
                onVerMedicionesTab && 'cursor-pointer hover:border-emerald-300 hover:shadow-md',
              )}
            >
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Mediciones</span>
                <Activity className="h-4 w-4" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {mediciones.registradas}
                <span className="text-xs font-normal text-slate-500"> / {medsTotal}</span>
              </div>
              <div className="flex items-center gap-1.5 my-2">
                {(mediciones.con_alerta ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertTriangle className="h-3 w-3" />
                    {mediciones.con_alerta} fuera de rango
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    {mediciones.registradas > 0 ? 'Parámetros normales' : 'Sin capturas aún'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {medsTotal > 0
                  ? `${Math.round((mediciones.registradas / medsTotal) * 100)}% capturadas`
                  : 'Sin parámetros'}
              </div>
            </div>

            {/* 3. EVIDENCIAS FOTOGRÁFICAS */}
            <div
              onClick={onVerDocumentosTab}
              className={cn(
                'p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm transition-all',
                mirror?.isSectionPulsing('evidencias') &&
                  'ring-2 ring-emerald-400 border-emerald-300',
                onVerDocumentosTab && 'cursor-pointer hover:border-blue-300 hover:shadow-md',
              )}
            >
              <div className="flex items-center justify-between text-blue-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Evidencias</span>
                <Camera className="h-4 w-4" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {evidencias_fotos}
                <span className="text-xs font-normal text-slate-500"> / {fotosEsperadas}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 my-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (evidencias_fotos / fotosEsperadas) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {evidencias_fotos >= fotosEsperadas
                  ? 'Cuota mínima cumplida'
                  : `${evidencias_fotos}/${fotosEsperadas} esperadas`}
              </div>
            </div>

            {/* 4. PENDIENTES EN VIVO */}
            <div
              onClick={onVerPendientesTab}
              className={cn(
                'p-3.5 rounded-xl border bg-white shadow-sm transition-all',
                pendientes.activos > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200',
                mirror?.isSectionPulsing('pendientes') &&
                  'ring-2 ring-emerald-400 border-emerald-300',
                onVerPendientesTab && 'cursor-pointer hover:border-amber-400 hover:shadow-md',
              )}
            >
              <div className="flex items-center justify-between text-amber-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Pendientes</span>
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {pendientes.activos}
                <span className="text-xs font-normal text-slate-500"> activos</span>
              </div>
              <div className="flex items-center gap-1.5 my-2">
                {(pendientes.criticos ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                    {pendientes.criticos} prioritarios
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                    {pendientes.total} reportados
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {pendientes.resueltos} resueltos
              </div>
            </div>

            {/* 5. FIRMAS DIGITALES */}
            <div
              className={cn(
                'p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm transition-all',
                mirror?.isSectionPulsing('firmas') && 'ring-2 ring-emerald-400 border-emerald-300',
              )}
            >
              <div className="flex items-center justify-between text-purple-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Firmas Cierre</span>
                <PenTool className="h-4 w-4" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {firmas.total}
                <span className="text-xs font-normal text-slate-500"> de {firmasEsperadas}</span>
              </div>
              <div className="flex items-center gap-1.5 my-2">
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-bold border',
                    firmas.tecnico
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200',
                  )}
                >
                  Téc: {firmas.tecnico ? 'OK' : 'Pend'}
                </span>
                {firmasEsperadas >= 2 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold border',
                      firmas.cliente
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200',
                    )}
                  >
                    Cli: {firmas.cliente ? 'OK' : 'Pend'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {firmas.total >= firmasEsperadas ? 'Firmas completas' : 'Esperando firmas'}
              </div>
            </div>
          </div>

          {/* TIMELINE DE ÚLTIMOS EVENTOS EN CAMPO */}
          {ultimosEventos.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Últimas Acciones en Campo
                </span>
                <span className="text-[11px] text-slate-400">
                  Mostrando últimos {Math.min(6, ultimosEventos.length)} registros
                </span>
              </div>

              <div className="space-y-2">
                {ultimosEventos.slice(0, 6).map((evt, idx: number) => {
                  const horaTexto = evt.timestamp
                    ? new Date(evt.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '';

                  const getIcon = () => {
                    switch (evt.tipo) {
                      case 'ACTIVIDAD':
                        return <FileCheck2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />;
                      case 'MEDICION':
                        return <Activity className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
                      case 'FOTO':
                        return <Camera className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
                      case 'PENDIENTE':
                        return <ClipboardList className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
                      case 'FIRMA':
                        return <PenTool className="h-3.5 w-3.5 text-purple-600 shrink-0" />;
                      case 'HEARTBEAT':
                        return <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
                      default:
                        return <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
                    }
                  };

                  return (
                    <div
                      key={`${evt.tipo}-${idx}`}
                      className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {getIcon()}
                        <span className="text-slate-700 font-medium truncate">
                          {evt.descripcion}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 font-mono">
                        {horaTexto}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pie */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px] text-slate-400">
              Espejo en vivo vía Server-Sent Events · Pausa automática en pestañas ocultas
            </span>
            <button
              type="button"
              onClick={handleToggleExpand}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors border border-indigo-100 hover:border-indigo-200"
            >
              <ChevronUp className="h-4 w-4" />
              <span>Contraer panel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
