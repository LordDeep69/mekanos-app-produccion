/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: ModernFilterSelect
 * 
 * Selector estilizado premium para filtros de órdenes.
 * Sustituye los select planos nativos por un diseño moderno con:
 * - Icono descriptivo al frente
 * - Resaltado visual interactivo cuando el filtro está activo (anillo y color sutil)
 * - Indicador de flecha chevron elegante
 * - Botón de limpieza directa
 * - Accesibilidad 100% nativa (mantiene compatibilidad total con teclado y selectores móviles)
 */

'use client';

import React from 'react';
import { ChevronDown, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModernFilterOption {
    value: string | number;
    label: string;
}

interface ModernFilterSelectProps {
    icon: LucideIcon;
    value: string | number;
    onChange: (val: string) => void;
    options: ModernFilterOption[];
    placeholder: string;
    className?: string;
    onClear?: () => void;
    activeTheme?: 'blue' | 'indigo' | 'amber' | 'emerald';
}

export function ModernFilterSelect({
    icon: Icon,
    value,
    onChange,
    options,
    placeholder,
    className,
    onClear,
    activeTheme = 'blue',
}: ModernFilterSelectProps) {
    const isActivo = Boolean(value !== '' && value !== undefined && value !== null);

    const activeOption = options.find((opt) => String(opt.value) === String(value));
    const labelMostrar = activeOption ? activeOption.label : placeholder;

    return (
        <div
            className={cn(
                'relative inline-flex items-center h-9 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs group',
                isActivo
                    ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/15'
                    : 'bg-white border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50',
                className
            )}
        >
            {/* Icono descriptivo */}
            <Icon
                className={cn(
                    'h-3.5 w-3.5 mr-1.5 shrink-0 transition-colors',
                    isActivo ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
            />

            {/* Texto de la opción seleccionada */}
            <span className="truncate max-w-[130px] sm:max-w-[160px]">
                {labelMostrar}
            </span>

            {/* Botón limpiar o flecha indicadora */}
            {isActivo && onClear ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClear();
                    }}
                    className="relative z-20 hover:bg-blue-200/60 rounded-full p-0.5 text-blue-800 transition-colors ml-1.5 shrink-0"
                    title={`Quitar filtro ${placeholder}`}
                >
                    <X className="h-3 w-3" />
                </button>
            ) : (
                <ChevronDown
                    className={cn(
                        'h-3.5 w-3.5 ml-1.5 shrink-0 transition-colors',
                        isActivo ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                />
            )}

            {/* Select nativo invisible superpuesto para accesibilidad perfecta y picker nativo */}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title={placeholder}
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
