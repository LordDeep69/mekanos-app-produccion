/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: CaracteristicasOrdenFilter
 * 
 * Filtro dedicado, desplegable (popover) y dinámico para los estados e indicadores 
 * operacionales de las órdenes de servicio que se reflejan en los badges de las cards
 * (Correo Enviado, PDF Generado, Pendientes Técnicos, etc.).
 * 
 * DISEÑO PREMIUM:
 * - Desplegable tipo popover con la misma altura (h-9) y estética que los demás selectores.
 * - Muestra Feedback visual inmediato cuando está cerrado (micro-badges o resumen de activos).
 * - Botón de limpieza directa rápida (X) en el trigger.
 * - Soporte para cerrar al hacer clic afuera y con tecla Escape.
 * - Atajos rápidos de combinación (Con Correo + PDF, Con Pendientes, etc.).
 * 
 * ARQUITECTURA DINÁMICA: 
 * Si el día de mañana se agregan o quitan badges en la card, se actualiza 
 * el registro `CARACTERISTICAS_ORDEN_REGISTRY` y tanto la card como el filtro 
 * se sincronizan automáticamente sin código duplicado ni quemado.
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Mail,
    FileText,
    ClipboardList,
    Check,
    X,
    SlidersHorizontal,
    RotateCcw,
    Sparkles,
    ChevronDown,
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
    fullWidth?: boolean;
    align?: 'left' | 'right';
}

export function CaracteristicasOrdenFilter({
    filtros,
    onChange,
    onReset,
    className,
    fullWidth = true,
    align = 'left',
}: CaracteristicasOrdenFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Lista de características actualmente activadas (diferentes de 'TODOS')
    const activos = useMemo(() => {
        return CARACTERISTICAS_ORDEN_REGISTRY.filter((c) => {
            const v = filtros[c.id];
            return v === 'CON' || v === 'SIN';
        });
    }, [filtros]);

    const hayActivos = activos.length > 0;

    // Cerrar al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Cerrar con Escape
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className={cn('relative inline-block', fullWidth && 'w-full', className)}>
            {/* Trigger Button Desplegable con Feedback Visual de Selección */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    'flex items-center justify-between h-9 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs select-none cursor-pointer',
                    fullWidth ? 'w-full' : '',
                    hayActivos
                        ? 'bg-blue-50/90 border-blue-400 text-blue-900 ring-2 ring-blue-500/15'
                        : 'bg-white border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50'
                )}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                {/* Lado izquierdo: Icono y Feedback de Selección */}
                <div className="flex items-center gap-1.5 min-w-0 pr-1 overflow-hidden">
                    <SlidersHorizontal
                        className={cn(
                            'h-3.5 w-3.5 shrink-0 transition-colors',
                            hayActivos ? 'text-blue-600' : 'text-slate-400'
                        )}
                    />

                    {!hayActivos ? (
                        <span className="truncate text-slate-700 font-medium">
                            Todos los indicadores
                        </span>
                    ) : (
                        /* Feedback visual en el botón cerrado: micro-badges o resumen */
                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                            {activos.map((c) => {
                                const isCon = filtros[c.id] === 'CON';
                                const Icon = c.icon;
                                return (
                                    <span
                                        key={c.id}
                                        className={cn(
                                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 shadow-2xs',
                                            isCon
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                                        )}
                                        title={`${c.label}: ${isCon ? 'Con' : 'Sin'}`}
                                    >
                                        <Icon className="h-2.5 w-2.5" />
                                        <span>{isCon ? `Con ${c.labelCorto}` : `Sin ${c.labelCorto}`}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Lado derecho: Botón limpiar directo + Chevron animado */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                    {hayActivos && onReset && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                onReset();
                            }}
                            className="hover:bg-blue-200/60 rounded-full p-0.5 text-blue-800 transition-colors cursor-pointer mr-0.5"
                            title="Restablecer indicadores"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}

                    <ChevronDown
                        className={cn(
                            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                            isOpen && 'rotate-180',
                            hayActivos && 'text-blue-500'
                        )}
                    />
                </div>
            </button>

            {/* Popover Flotante de Selección */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3 min-w-[280px] sm:min-w-[340px] max-w-[380px] animate-in fade-in-0 zoom-in-95 duration-150',
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                    role="dialog"
                >
                    {/* Header del popover */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs font-bold text-slate-900">
                                Indicadores de Entrega
                            </span>
                            {hayActivos && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                    {activos.length}
                                </span>
                            )}
                        </div>

                        {hayActivos && onReset && (
                            <button
                                type="button"
                                onClick={onReset}
                                className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 font-semibold hover:underline cursor-pointer"
                                title="Restablecer todos los indicadores"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restablecer</span>
                            </button>
                        )}
                    </div>

                    {/* Lista dinámica de características con controles Tri-State */}
                    <div className="space-y-1.5">
                        {CARACTERISTICAS_ORDEN_REGISTRY.map((caract) => {
                            const Icon = caract.icon;
                            const estadoActual = filtros[caract.id] || 'TODOS';

                            return (
                                <div
                                    key={caract.id}
                                    className={cn(
                                        'flex items-center justify-between gap-2 p-1.5 rounded-lg transition-colors border',
                                        estadoActual !== 'TODOS'
                                            ? 'bg-slate-50 border-slate-200'
                                            : 'bg-white border-transparent hover:bg-slate-50/80'
                                    )}
                                >
                                    {/* Icono + Nombre */}
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

                                    {/* Botones Tri-State (Todos | Con | Sin) */}
                                    <div className="inline-flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/90 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onChange(caract.id, 'TODOS')}
                                            className={cn(
                                                'px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer',
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
                                                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                                                estadoActual === 'CON'
                                                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                    : 'text-slate-600 hover:text-emerald-700'
                                            )}
                                            title={`Filtrar órdenes CON ${caract.label}`}
                                        >
                                            <Check className="h-3 w-3" />
                                            <span>Con</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onChange(caract.id, 'SIN')}
                                            className={cn(
                                                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                                                estadoActual === 'SIN'
                                                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                                                    : 'text-slate-600 hover:text-rose-700'
                                            )}
                                            title={`Filtrar órdenes SIN ${caract.label}`}
                                        >
                                            <X className="h-3 w-3" />
                                            <span>Sin</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Atajos Rápidos */}
                    <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Atajos Rápidos:
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
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

                    {/* Botón de Cierre / Listo */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <span>Listo</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
