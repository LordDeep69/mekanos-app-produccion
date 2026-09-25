/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: ProgresoRegistroBadge (Estilo Sytex)
 * 
 * Barra de progreso y badges de telemetría en tiempo real para
 * tarjetas y filas de órdenes de servicio.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { ProgresoRegistroResumen, EstadoConexionTecnico } from '@/types/ordenes';
import {
    Activity,
    Camera,
    CheckCircle2,
    FileCheck2,
    PenTool,
    Radio,
    Wifi,
    WifiOff,
    Zap
} from 'lucide-react';

interface ProgresoRegistroBadgeProps {
    progreso?: ProgresoRegistroResumen;
    estadoOrden?: string;
    compact?: boolean;
    className?: string;
}

export function ProgresoRegistroBadge({
    progreso,
    estadoOrden,
    compact = false,
    className,
}: ProgresoRegistroBadgeProps) {
    if (!progreso) {
        return null;
    }

    const {
        porcentaje_global,
        estado_conexion,
        minutos_inactividad,
        actividades,
        mediciones,
        evidencias_fotos,
        firmas,
    } = progreso;

    const esFinalizada =
        estadoOrden === 'COMPLETADA' ||
        estadoOrden === 'APROBADA' ||
        estado_conexion === 'COMPLETADO';

    // Formatear texto de inactividad
    const getInactividadTexto = () => {
        if (esFinalizada) return 'Finalizado';
        if (minutos_inactividad === null || minutos_inactividad === undefined) return 'Sin iniciar';
        if (minutos_inactividad < 1) return 'Justo ahora';
        if (minutos_inactividad < 60) return `Hace ${minutos_inactividad}m`;
        const horas = Math.floor(minutos_inactividad / 60);
        return `Hace ${horas}h`;
    };

    // Configuración visual según estado de conexión
    const getConexionConfig = (estado: EstadoConexionTecnico) => {
        if (esFinalizada) {
            return {
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dot: 'bg-emerald-500',
                icon: CheckCircle2,
                label: 'Completada',
                animate: false,
            };
        }
        switch (estado) {
            case 'EN_VIVO':
                return {
                    bg: 'bg-green-50 text-green-700 border-green-300 shadow-sm',
                    dot: 'bg-green-500',
                    icon: Zap,
                    label: 'En vivo',
                    animate: true,
                };
            case 'RECIENTE':
                return {
                    bg: 'bg-amber-50 text-amber-700 border-amber-200',
                    dot: 'bg-amber-500',
                    icon: Activity,
                    label: getInactividadTexto(),
                    animate: false,
                };
            case 'INACTIVO':
                return {
                    bg: 'bg-gray-50 text-gray-600 border-gray-200',
                    dot: 'bg-gray-400',
                    icon: WifiOff,
                    label: getInactividadTexto(),
                    animate: false,
                };
            default:
                return {
                    bg: 'bg-slate-50 text-slate-500 border-slate-200',
                    dot: 'bg-slate-300',
                    icon: Wifi,
                    label: 'Sin señal',
                    animate: false,
                };
        }
    };

    const conexion = getConexionConfig(estado_conexion);

    // Color dinámico de la barra según porcentaje
    const getBarColor = (pct: number) => {
        if (pct >= 100 || esFinalizada) return 'bg-emerald-500';
        if (pct >= 70) return 'bg-blue-600';
        if (pct >= 40) return 'bg-indigo-500';
        if (pct > 0) return 'bg-amber-500';
        return 'bg-gray-300';
    };

    if (compact) {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                        className={cn('h-full transition-all duration-500', getBarColor(porcentaje_global))}
                        style={{ width: `${Math.min(100, Math.max(0, porcentaje_global))}%` }}
                    />
                </div>
                <span className="text-xs font-semibold text-gray-700">{porcentaje_global}%</span>
                {estado_conexion === 'EN_VIVO' && !esFinalizada && (
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-lg border bg-gradient-to-br from-slate-50/70 to-blue-50/30 p-2.5 transition-all',
                className
            )}
        >
            {/* Header: Barra de progreso + Badge En Vivo */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-800">
                        {porcentaje_global}%
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">avance</span>
                </div>

                {/* Badge de conexión / telemetría */}
                <div
                    className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border',
                        conexion.bg
                    )}
                    title={`Última actividad: ${progreso.ultima_actividad ? new Date(progreso.ultima_actividad).toLocaleTimeString() : 'N/A'}`}
                >
                    <span className="relative flex h-1.5 w-1.5">
                        {conexion.animate && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        )}
                        <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', conexion.dot)} />
                    </span>
                    <span>{conexion.label}</span>
                </div>
            </div>

            {/* Barra de progreso visual */}
            <div className="w-full bg-slate-200/80 rounded-full h-1.5 mb-2 overflow-hidden">
                <div
                    className={cn('h-full transition-all duration-700 rounded-full', getBarColor(porcentaje_global))}
                    style={{ width: `${Math.min(100, Math.max(0, porcentaje_global))}%` }}
                />
            </div>

            {/* Desglose de telemetría de campo (Micro-chips) */}
            <div className="grid grid-cols-4 gap-1 text-[10px] font-medium text-slate-600">
                {/* Checklist */}
                <div
                    className="flex items-center gap-1 bg-white/80 px-1 py-0.5 rounded border border-slate-200/60"
                    title={`Checklist: ${actividades.completadas} de ${actividades.total} actividades`}
                >
                    <FileCheck2 className="h-3 w-3 text-indigo-600 flex-shrink-0" />
                    <span className="truncate">
                        {actividades.completadas}/{actividades.total}
                    </span>
                </div>

                {/* Mediciones */}
                <div
                    className="flex items-center gap-1 bg-white/80 px-1 py-0.5 rounded border border-slate-200/60"
                    title={`Mediciones: ${mediciones.registradas} parámetros registrados`}
                >
                    <Activity className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">
                        {mediciones.registradas} med
                    </span>
                </div>

                {/* Fotos */}
                <div
                    className="flex items-center gap-1 bg-white/80 px-1 py-0.5 rounded border border-slate-200/60"
                    title={`Evidencias: ${evidencias_fotos} fotos capturadas`}
                >
                    <Camera className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="truncate">
                        {evidencias_fotos} {evidencias_fotos === 1 ? 'foto' : 'fotos'}
                    </span>
                </div>

                {/* Firmas */}
                <div
                    className={cn(
                        'flex items-center gap-1 px-1 py-0.5 rounded border',
                        firmas.total === 2
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white/80 text-slate-600 border-slate-200/60'
                    )}
                    title={`Firmas: ${firmas.total}/2 (Técnico: ${firmas.tecnico ? 'OK' : 'Pendiente'}, Cliente: ${firmas.cliente ? 'OK' : 'Pendiente'})`}
                >
                    <PenTool className="h-3 w-3 text-purple-600 flex-shrink-0" />
                    <span className="truncate">
                        {firmas.total}/2 fir
                    </span>
                </div>
            </div>
        </div>
    );
}
