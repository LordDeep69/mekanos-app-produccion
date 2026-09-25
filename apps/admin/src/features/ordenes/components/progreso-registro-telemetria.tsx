/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: ProgresoRegistroTelemetria (Estilo Sytex)
 * 
 * Panel completo de telemetría y lectura en tiempo real de avance
 * de registro de orden de servicio en campo.
 */

'use client';

import React, { useState } from 'react';
import { useProgresoRegistro } from '../hooks/use-ordenes';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertTriangle,
    Camera,
    CheckCircle2,
    Clock,
    FileCheck2,
    HelpCircle,
    PenTool,
    Radio,
    RefreshCw,
    Signal,
    Timer,
    User,
    Wifi,
    WifiOff,
    Wrench,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface ProgresoRegistroTelemetriaProps {
    idOrden: number;
    className?: string;
    onVerChecklistTab?: () => void;
    onVerMedicionesTab?: () => void;
    onVerDocumentosTab?: () => void;
}

export function ProgresoRegistroTelemetria({
    idOrden,
    className,
    onVerChecklistTab,
    onVerMedicionesTab,
    onVerDocumentosTab,
}: ProgresoRegistroTelemetriaProps) {
    const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
    const [refreshIntervalMs, setRefreshIntervalMs] = useState<number>(15000); // 15 segundos

    const {
        data: progreso,
        isLoading,
        isFetching,
        refetch,
    } = useProgresoRegistro(idOrden, {
        refetchInterval: autoRefresh ? refreshIntervalMs : false,
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
        porcentaje_global,
        estado_conexion,
        minutos_inactividad,
        ultima_actividad,
        actividades,
        mediciones,
        evidencias_fotos,
        firmas,
        tiempo,
        tecnico,
        ultimos_eventos = [],
    } = progreso;

    const esFinalizada =
        progreso.estado_actual?.codigo_estado === 'COMPLETADA' ||
        progreso.estado_actual?.codigo_estado === 'APROBADA' ||
        estado_conexion === 'COMPLETADO';

    // Formato de tiempo relativo
    const formatRelativo = () => {
        if (esFinalizada) return 'Orden Finalizada';
        if (minutos_inactividad === null || minutos_inactividad === undefined) return 'Sin actividad registrada';
        if (minutos_inactividad < 1) return 'Actividad hace segundos';
        if (minutos_inactividad < 60) return `Actividad hace ${minutos_inactividad} minutos`;
        const horas = Math.floor(minutos_inactividad / 60);
        return `Actividad hace ${horas} hora(s)`;
    };

    // Configuración visual según estado de conexión
    const getStatusStyle = () => {
        if (esFinalizada) {
            return {
                bg: 'bg-emerald-500 text-white',
                border: 'border-emerald-200',
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
                    bg: 'bg-green-500 text-white',
                    border: 'border-green-300 shadow-green-100',
                    badgeBg: 'bg-green-50 text-green-700 border-green-300',
                    text: 'TÉCNICO EN VIVO',
                    dot: 'bg-green-500',
                    label: 'Técnico trabajando en tiempo real',
                    ping: true,
                };
            case 'RECIENTE':
                return {
                    bg: 'bg-amber-500 text-white',
                    border: 'border-amber-200',
                    badgeBg: 'bg-amber-50 text-amber-700 border-amber-300',
                    text: 'ACTIVIDAD RECIENTE',
                    dot: 'bg-amber-500',
                    label: 'Actividad en la última hora',
                    ping: false,
                };
            case 'INACTIVO':
                return {
                    bg: 'bg-slate-400 text-white',
                    border: 'border-slate-200',
                    badgeBg: 'bg-slate-50 text-slate-600 border-slate-300',
                    text: 'SIN SEÑAL RECIENTE',
                    dot: 'bg-slate-400',
                    label: 'Sin actividad reciente',
                    ping: false,
                };
            default:
                return {
                    bg: 'bg-slate-300 text-slate-700',
                    border: 'border-slate-200',
                    badgeBg: 'bg-slate-50 text-slate-500 border-slate-200',
                    text: 'SIN INICIAR',
                    dot: 'bg-slate-300',
                    label: 'Esperando inicio en campo',
                    ping: false,
                };
        }
    };

    const statusStyle = getStatusStyle();

    return (
        <div
            className={cn(
                'bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all',
                className
            )}
        >
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* CABECERA DE TELEMETRÍA (Estilo Sytex Console) */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Título + Estado en Vivo */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-inner">
                            <Radio className={cn('h-5 w-5', statusStyle.ping ? 'text-green-400 animate-pulse' : 'text-slate-300')} />
                            {statusStyle.ping && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-slate-900" />
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                                    Lectura en Tiempo Real
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                                        Modo Sytex
                                    </span>
                                </h3>
                            </div>
                            <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                                <span>{statusStyle.label}</span>
                                <span className="text-slate-500">•</span>
                                <span>{formatRelativo()}</span>
                                {tecnico && (
                                    <>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-indigo-200 font-medium">{tecnico.nombre_completo}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Controles: Auto-refresco + Refrescar Ahora */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                        {/* Switch de Auto-refresh */}
                        <button
                            type="button"
                            onClick={() => {
                                const nuevoEstado = !autoRefresh;
                                setAutoRefresh(nuevoEstado);
                                toast.info(nuevoEstado ? 'Auto-refresco activado (cada 15s)' : 'Auto-refresco pausado');
                            }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                                autoRefresh
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                                    : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/15'
                            )}
                            title={autoRefresh ? 'Pausar actualización en vivo' : 'Activar actualización automática en vivo'}
                        >
                            <span className="relative flex h-2 w-2">
                                {autoRefresh && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                )}
                                <span className={cn('relative inline-flex rounded-full h-2 w-2', autoRefresh ? 'bg-emerald-400' : 'bg-slate-400')} />
                            </span>
                            <span>{autoRefresh ? 'En vivo (15s)' : 'Pausado'}</span>
                        </button>

                        {/* Botón Refrescar */}
                        <button
                            type="button"
                            onClick={() => {
                                refetch();
                                toast.success('Telemetría actualizada');
                            }}
                            disabled={isFetching}
                            className="p-1.5 rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10 transition-colors disabled:opacity-50"
                            title="Actualizar datos ahora"
                        >
                            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin text-indigo-300')} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* GRID DE MÉTRICAS KPI (Tarjetas Interactivas) */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            <div className="p-5 space-y-5">
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
                                    {esFinalizada ? 'Completado al 100%' : 'de registro completado'}
                                </span>
                            </div>
                        </div>

                        {/* Badge de conexión */}
                        <div className={cn('px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5', statusStyle.badgeBg)}>
                            <span className={cn('w-2 h-2 rounded-full', statusStyle.dot)} />
                            <span>{statusStyle.text}</span>
                        </div>
                    </div>

                    {/* Barra visual principal */}
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
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, porcentaje_global))}%` }}
                        />
                    </div>

                    {/* Explicación de ponderación */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Checklist: 40%</span>
                        <span>•</span>
                        <span>Mediciones: 25%</span>
                        <span>•</span>
                        <span>Evidencias: 15%</span>
                        <span>•</span>
                        <span>Firmas y Cierre: 20%</span>
                    </div>
                </div>

                {/* Grid de 4 Bloques de Trabajo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. CHECKLIST */}
                    <div
                        onClick={onVerChecklistTab}
                        className={cn(
                            'p-3.5 rounded-xl border bg-white shadow-sm transition-all',
                            onVerChecklistTab && 'cursor-pointer hover:border-indigo-300 hover:shadow-md'
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
                            {actividades.porcentaje}% ejecutadas
                        </div>
                    </div>

                    {/* 2. MEDICIONES */}
                    <div
                        onClick={onVerMedicionesTab}
                        className={cn(
                            'p-3.5 rounded-xl border bg-white shadow-sm transition-all',
                            mediciones.con_alerta > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200',
                            onVerMedicionesTab && 'cursor-pointer hover:border-emerald-300 hover:shadow-md'
                        )}
                    >
                        <div className="flex items-center justify-between text-emerald-700 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Mediciones</span>
                            <Activity className="h-4 w-4" />
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {mediciones.registradas}
                            <span className="text-xs font-normal text-slate-500"> registradas</span>
                        </div>
                        <div className="flex items-center gap-1.5 my-2">
                            {mediciones.con_alerta > 0 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="h-3 w-3" />
                                    {mediciones.con_alerta} fuera de rango
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Parámetros normales
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                            {mediciones.registradas > 0 ? 'Capturas registradas' : 'Pendiente toma'}
                        </div>
                    </div>

                    {/* 3. EVIDENCIAS FOTOGRÁFICAS */}
                    <div
                        onClick={onVerDocumentosTab}
                        className={cn(
                            'p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm transition-all',
                            onVerDocumentosTab && 'cursor-pointer hover:border-blue-300 hover:shadow-md'
                        )}
                    >
                        <div className="flex items-center justify-between text-blue-700 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Evidencias</span>
                            <Camera className="h-4 w-4" />
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {evidencias_fotos}
                            <span className="text-xs font-normal text-slate-500"> fotos</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 my-2 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (evidencias_fotos / 3) * 100)}%` }}
                            />
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                            {evidencias_fotos >= 3 ? 'Cuota ideal cumplida' : `${evidencias_fotos}/3 recomendadas`}
                        </div>
                    </div>

                    {/* 4. FIRMAS DIGITALES */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between text-purple-700 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Firmas Cierre</span>
                            <PenTool className="h-4 w-4" />
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {firmas.total}
                            <span className="text-xs font-normal text-slate-500"> de 2</span>
                        </div>
                        <div className="flex items-center gap-1.5 my-2">
                            <span
                                className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-bold border',
                                    firmas.tecnico
                                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                )}
                            >
                                Téc: {firmas.tecnico ? 'OK' : 'Pend'}
                            </span>
                            <span
                                className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-bold border',
                                    firmas.cliente
                                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                )}
                            >
                                Cli: {firmas.cliente ? 'OK' : 'Pend'}
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                            {firmas.total === 2 ? 'Firmas completas' : 'Esperando firmas'}
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════ */}
                {/* TIMELINE DE ÚLTIMOS EVENTOS REGISTRADOS EN CAMPO */}
                {/* ═══════════════════════════════════════════════════════════════════════ */}
                {ultimosEventos.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                Últimas Acciones en Campo
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Mostrando últimos {Math.min(5, ultimosEventos.length)} registros
                            </span>
                        </div>

                        <div className="space-y-2">
                            {ultimosEventos.slice(0, 5).map((evt, idx) => {
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
                                            return <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />;
                                        case 'MEDICION':
                                            return <Activity className="h-3.5 w-3.5 text-emerald-600" />;
                                        case 'FOTO':
                                            return <Camera className="h-3.5 w-3.5 text-blue-600" />;
                                        case 'FIRMA':
                                            return <PenTool className="h-3.5 w-3.5 text-purple-600" />;
                                        case 'HEARTBEAT':
                                            return <Zap className="h-3.5 w-3.5 text-amber-500" />;
                                        default:
                                            return <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />;
                                    }
                                };

                                return (
                                    <div
                                        key={idx}
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
            </div>
        </div>
    );
}
