/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: FiltroFechaPremium
 * 
 * Filtro de fecha de clase mundial (Estado del Arte) para órdenes de servicio.
 * Incluye:
 * - Presets inteligentes de un clic: Hoy, Ayer, Esta Semana, Últimos 7 días, Este Mes, Últimos 30 días, Mes Anterior, Este Año
 * - Selector de rango personalizado con inputs de fecha nativos y validación
 * - Botón disparador con indicador visual activo y formato legible en español
 * - Botón de limpieza rápida instantánea
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    X,
    Clock,
    Sparkles,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PresetFecha =
    | 'TODOS'
    | 'HOY'
    | 'AYER'
    | 'ESTA_SEMANA'
    | 'ULTIMOS_7_DIAS'
    | 'ESTE_MES'
    | 'ULTIMOS_30_DIAS'
    | 'MES_ANTERIOR'
    | 'ESTE_ANO'
    | 'PERSONALIZADO';

interface PresetItem {
    id: PresetFecha;
    label: string;
    description?: string;
    getRange: () => { desde: string; hasta: string };
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

export function toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
}

const PRESETS: PresetItem[] = [
    {
        id: 'HOY',
        label: 'Hoy',
        getRange: () => {
            const now = new Date();
            const ymd = toYMD(now);
            return { desde: ymd, hasta: ymd };
        },
    },
    {
        id: 'AYER',
        label: 'Ayer',
        getRange: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const ymd = toYMD(d);
            return { desde: ymd, hasta: ymd };
        },
    },
    {
        id: 'ESTA_SEMANA',
        label: 'Esta Semana',
        description: 'Lunes a Domingo',
        getRange: () => {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const lunes = new Date(now);
            lunes.setDate(now.getDate() + diffToMonday);

            const domingo = new Date(lunes);
            domingo.setDate(lunes.getDate() + 6);
            return { desde: toYMD(lunes), hasta: toYMD(domingo) };
        },
    },
    {
        id: 'ULTIMOS_7_DIAS',
        label: 'Últimos 7 días',
        getRange: () => {
            const hasta = new Date();
            const desde = new Date();
            desde.setDate(hasta.getDate() - 6);
            return { desde: toYMD(desde), hasta: toYMD(hasta) };
        },
    },
    {
        id: 'ESTE_MES',
        label: 'Este Mes',
        getRange: () => {
            const now = new Date();
            const primerDia = new Date(now.getFullYear(), now.getMonth(), 1);
            const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { desde: toYMD(primerDia), hasta: toYMD(ultimoDia) };
        },
    },
    {
        id: 'ULTIMOS_30_DIAS',
        label: 'Últimos 30 días',
        getRange: () => {
            const hasta = new Date();
            const desde = new Date();
            desde.setDate(hasta.getDate() - 29);
            return { desde: toYMD(desde), hasta: toYMD(hasta) };
        },
    },
    {
        id: 'MES_ANTERIOR',
        label: 'Mes Anterior',
        getRange: () => {
            const now = new Date();
            const primerDia = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const ultimoDia = new Date(now.getFullYear(), now.getMonth(), 0);
            return { desde: toYMD(primerDia), hasta: toYMD(ultimoDia) };
        },
    },
    {
        id: 'ESTE_ANO',
        label: 'Este Año',
        getRange: () => {
            const now = new Date();
            const primerDia = new Date(now.getFullYear(), 0, 1);
            const ultimoDia = new Date(now.getFullYear(), 11, 31);
            return { desde: toYMD(primerDia), hasta: toYMD(ultimoDia) };
        },
    },
];

interface FiltroFechaPremiumProps {
    fechaDesde?: string;
    fechaHasta?: string;
    onSelectRange: (desde: string, hasta: string, preset?: PresetFecha) => void;
    onClear: () => void;
    className?: string;
    align?: 'left' | 'right';
}

export function FiltroFechaPremium({
    fechaDesde = '',
    fechaHasta = '',
    onSelectRange,
    onClear,
    className,
    align = 'left',
}: FiltroFechaPremiumProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customDesde, setCustomDesde] = useState(fechaDesde);
    const [customHasta, setCustomHasta] = useState(fechaHasta);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sincronizar inputs personalizados cuando cambian los props externos
    useEffect(() => {
        setCustomDesde(fechaDesde);
        setCustomHasta(fechaHasta);
    }, [fechaDesde, fechaHasta]);

    // Cerrar al hacer clic afuera
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

    // Detectar preset activo
    const presetActivo = useMemo<PresetFecha | null>(() => {
        if (!fechaDesde && !fechaHasta) return null;
        for (const p of PRESETS) {
            const r = p.getRange();
            if (r.desde === fechaDesde && r.hasta === fechaHasta) {
                return p.id;
            }
        }
        return 'PERSONALIZADO';
    }, [fechaDesde, fechaHasta]);

    // Etiqueta legible para el botón disparador
    const displayLabel = useMemo(() => {
        if (!fechaDesde && !fechaHasta) {
            return 'Todas las fechas';
        }

        const presetMatch = PRESETS.find((p) => p.id === presetActivo);
        if (presetMatch) {
            return presetMatch.label;
        }

        const formatShort = (ymd: string) => {
            if (!ymd) return '';
            const parts = ymd.split('-');
            if (parts.length === 3) {
                const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                const mIndex = parseInt(parts[1], 10) - 1;
                return `${parseInt(parts[2], 10)} ${meses[mIndex] || ''}`;
            }
            return ymd;
        };

        if (fechaDesde && fechaHasta) {
            if (fechaDesde === fechaHasta) return formatShort(fechaDesde);
            return `${formatShort(fechaDesde)} - ${formatShort(fechaHasta)}`;
        }
        if (fechaDesde) return `Desde ${formatShort(fechaDesde)}`;
        if (fechaHasta) return `Hasta ${formatShort(fechaHasta)}`;
        return 'Fechas';
    }, [fechaDesde, fechaHasta, presetActivo]);

    const handleApplyPreset = (preset: PresetItem) => {
        const { desde, hasta } = preset.getRange();
        setCustomDesde(desde);
        setCustomHasta(hasta);
        onSelectRange(desde, hasta, preset.id);
        setIsOpen(false);
    };

    const handleApplyCustom = () => {
        onSelectRange(customDesde, customHasta, 'PERSONALIZADO');
        setIsOpen(false);
    };

    const isFiltrado = Boolean(fechaDesde || fechaHasta);

    return (
        <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
            {/* Botón Disparador Premium */}
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none shadow-2xs',
                    isFiltrado
                        ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/15'
                        : 'bg-white border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50'
                )}
                onClick={() => setIsOpen(!isOpen)}
                title={isFiltrado ? `Filtro de fecha activo: ${displayLabel}` : 'Filtrar órdenes por fecha'}
            >
                <CalendarIcon
                    className={cn('h-3.5 w-3.5 shrink-0', isFiltrado ? 'text-blue-600' : 'text-slate-500')}
                />
                <span className="truncate max-w-[130px] sm:max-w-[170px]">{displayLabel}</span>

                {isFiltrado ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="hover:bg-blue-200/60 rounded-full p-0.5 text-blue-800 transition-colors ml-0.5"
                        title="Quitar filtro de fecha"
                    >
                        <X className="h-3 w-3" />
                    </button>
                ) : (
                    <ChevronDown
                        className={cn(
                            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                            isOpen && 'rotate-180'
                        )}
                    />
                )}
            </div>

            {/* Panel Flotante / Popover de Rango de Fechas */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 p-3.5 animate-in fade-in slide-in-from-top-2 duration-150',
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                >
                    {/* Header Popover */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                                <CalendarIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-900">Período de Servicio</h4>
                                <p className="text-[10px] text-slate-500">Filtrar por fecha programada</p>
                            </div>
                        </div>

                        {isFiltrado && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClear();
                                    setIsOpen(false);
                                }}
                                className="text-[11px] text-red-600 hover:text-red-800 font-semibold hover:underline"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>

                    {/* Presets Rápidos */}
                    <div className="space-y-1.5 mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Atajos Rápidos
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                            {PRESETS.map((preset) => {
                                const isSelected = presetActivo === preset.id;
                                return (
                                    <button
                                        type="button"
                                        key={preset.id}
                                        onClick={() => handleApplyPreset(preset)}
                                        className={cn(
                                            'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all cursor-pointer',
                                            isSelected
                                                ? 'bg-blue-600 text-white font-bold shadow-xs'
                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/60'
                                        )}
                                    >
                                        <span>{preset.label}</span>
                                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rango Personalizado */}
                    <div className="pt-2.5 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Rango Personalizado
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Desde
                                </label>
                                <input
                                    type="date"
                                    value={customDesde}
                                    onChange={(e) => setCustomDesde(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Hasta
                                </label>
                                <input
                                    type="date"
                                    value={customHasta}
                                    onChange={(e) => setCustomHasta(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleApplyCustom}
                                disabled={!customDesde && !customHasta}
                                className={cn(
                                    'w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white transition-all cursor-pointer',
                                    customDesde || customHasta
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-xs'
                                        : 'bg-slate-300 cursor-not-allowed opacity-60'
                                )}
                            >
                                Aplicar Rango
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
