/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: CaracteristicasOrdenFilter
 * 
 * Filtro dedicado, dinámico y extensible para los estados e indicadores 
 * operacionales de las órdenes de servicio que se reflejan en los badges de las cards
 * (Correo Enviado, PDF Generado, Pendientes Técnicos, etc.).
 * 
 * ARQUITECTURA DINÁMICA: 
 * Si el día de mañana se agregan o quitan badges en la card, se actualiza 
 * el registro `CARACTERISTICAS_ORDEN_REGISTRY` y tanto la card como el filtro 
 * se sincronizan automáticamente sin código duplicado ni quemado.
 */

'use client';

import React from 'react';
import {
    Mail,
    FileText,
    ClipboardList,
    Check,
    X,
    SlidersHorizontal,
    RotateCcw,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';

export type EstadoFiltroCaracteristica = 'TODOS' | 'CON' | 'SIN';

export type FiltrosCaracteristicas = Record<string, EstadoFiltroCaracteristica>;

export interface CaracteristicaBadgeDef {
    id: string;
    label: string;
    labelCorto: string;
    icon: LucideIcon;
    colorPillActiva: string;
    colorPillInactiva: string;
    activeBadgeColor: string;
    check: (orden: Orden) => boolean;
    getCount: (orden: Orden) => number;
    titleCard: (count: number) => string;
    titleInactivo: string;
}

/**
 * REGISTRO CENTRAL DE CARACTERÍSTICAS / BADGES DE LA CARD
 * Fuente única de verdad consumida por OrdenCard y CaracteristicasOrdenFilter
 */
export const CARACTERISTICAS_ORDEN_REGISTRY: CaracteristicaBadgeDef[] = [
    {
        id: 'correo',
        label: 'Correos Enviados',
        labelCorto: 'Correo',
        icon: Mail,
        colorPillActiva: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium',
        colorPillInactiva: 'bg-gray-100 text-gray-500 border-gray-200',
        activeBadgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        check: (o) => Boolean(o.total_emails_enviados && o.total_emails_enviados > 0),
        getCount: (o) => o.total_emails_enviados || 0,
        titleCard: (c) => `${c} email(s) enviado(s)`,
        titleInactivo: 'Sin emails enviados',
    },
    {
        id: 'pdf',
        label: 'Informes PDF',
        labelCorto: 'PDF',
        icon: FileText,
        colorPillActiva: 'bg-red-100 text-red-800 border-red-300 font-medium',
        colorPillInactiva: 'bg-gray-100 text-gray-500 border-gray-200',
        activeBadgeColor: 'bg-red-50 text-red-800 border-red-200',
        check: (o) => Boolean(o.total_documentos_pdf && o.total_documentos_pdf > 0),
        getCount: (o) => o.total_documentos_pdf || 0,
        titleCard: (c) => `${c} PDF(s) generado(s)`,
        titleInactivo: 'Sin PDF generado',
    },
    {
        id: 'pendientes',
        label: 'Pendientes Técnicos',
        labelCorto: 'Pendientes',
        icon: ClipboardList,
        colorPillActiva: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-2xs',
        colorPillInactiva: 'bg-gray-100 text-gray-400 border-gray-200',
        activeBadgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
        check: (o) => Boolean(
            (o.total_pendientes && o.total_pendientes > 0) ||
            (o.pendientes_activos && o.pendientes_activos > 0)
        ),
        getCount: (o) => o.pendientes_activos ?? o.total_pendientes ?? 0,
        titleCard: (c) => `${c} pendiente(s) técnico(s) activo(s)`,
        titleInactivo: 'Sin pendientes técnicos',
    },
];

interface CaracteristicasOrdenFilterProps {
    filtros: FiltrosCaracteristicas;
    onChange: (id: string, nuevoEstado: EstadoFiltroCaracteristica) => void;
    onReset?: () => void;
    className?: string;
}

export function CaracteristicasOrdenFilter({
    filtros,
    onChange,
    onReset,
    className,
}: CaracteristicasOrdenFilterProps) {
    const hayActivos = Object.values(filtros).some((v) => v && v !== 'TODOS');

    return (
        <div className={cn('space-y-2.5', className)}>
            <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                    <span>Indicadores de Entrega y Badges</span>
                    {hayActivos && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                            Activo
                        </span>
                    )}
                </label>

                {hayActivos && onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 font-medium hover:underline cursor-pointer"
                        title="Restablecer indicadores"
                    >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restablecer</span>
                    </button>
                )}
            </div>

            {/* Lista dinámica de características */}
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-2 shadow-2xs">
                {CARACTERISTICAS_ORDEN_REGISTRY.map((caract) => {
                    const Icon = caract.icon;
                    const estadoActual = filtros[caract.id] || 'TODOS';

                    return (
                        <div
                            key={caract.id}
                            className={cn(
                                'flex items-center justify-between gap-2 p-1.5 rounded-lg transition-colors',
                                estadoActual !== 'TODOS'
                                    ? 'bg-slate-50 border border-slate-200/80'
                                    : 'hover:bg-slate-50/60'
                            )}
                        >
                            {/* Identificador con icono */}
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div
                                    className={cn(
                                        'p-1 rounded-md text-xs',
                                        estadoActual === 'CON'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : estadoActual === 'SIN'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-slate-100 text-slate-600'
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                    {caract.labelCorto}
                                </span>
                            </div>

                            {/* Control Tri-State Compacto (Todos | Con | Sin) */}
                            <div className="inline-flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/90 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => onChange(caract.id, 'TODOS')}
                                    className={cn(
                                        'px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                                        estadoActual === 'TODOS'
                                            ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                                            : 'text-slate-500 hover:text-slate-800'
                                    )}
                                    title="Sin filtrar por este indicador"
                                >
                                    Todos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange(caract.id, 'CON')}
                                    className={cn(
                                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                                        estadoActual === 'CON'
                                            ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                            : 'text-slate-600 hover:text-emerald-700'
                                    )}
                                    title={`Filtrar órdenes QUE SÍ tienen ${caract.label}`}
                                >
                                    <Check className="h-3 w-3" />
                                    <span>Con</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange(caract.id, 'SIN')}
                                    className={cn(
                                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                                        estadoActual === 'SIN'
                                            ? 'bg-rose-600 text-white shadow-xs font-bold'
                                            : 'text-slate-600 hover:text-rose-700'
                                    )}
                                    title={`Filtrar órdenes QUE NO tienen ${caract.label}`}
                                >
                                    <X className="h-3 w-3" />
                                    <span>Sin</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Atajos Rápidos de Combinación */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Atajos:
                </span>
                <button
                    type="button"
                    onClick={() => {
                        onChange('correo', 'CON');
                        onChange('pdf', 'CON');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                >
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                    <span>Con Correo + PDF</span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onChange('pendientes', 'CON');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                >
                    <ClipboardList className="h-2.5 w-2.5 text-amber-700" />
                    <span>Con Pendientes</span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onChange('correo', 'SIN');
                        onChange('pdf', 'CON');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors cursor-pointer"
                >
                    <span>PDF sin enviar</span>
                </button>
            </div>
        </div>
    );
}
