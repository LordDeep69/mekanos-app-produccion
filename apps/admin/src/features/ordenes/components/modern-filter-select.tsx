/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: ModernFilterSelect
 * 
 * Selector desplegable premium 100% personalizado para filtros de órdenes.
 * Sustituye totalmente los select nativos del navegador por un popover flotante moderno:
 * - Menú flotante estilizado con bordes redondeados y sombra suave (sin select nativo OS)
 * - Icono descriptivo al frente
 * - Resaltado visual interactivo cuando el filtro está activo (anillo y color azul sutil)
 * - Indicador de flecha chevron elegante con rotación animada
 * - Buscador integrado automático cuando la lista tiene más de 5 opciones (ej: técnicos, tipos)
 * - Pastillas / opciones con checkmark de selección activa y hover states
 * - Botón de limpieza directa rápida (X)
 * - Manejo de clic exterior y tecla Escape
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModernFilterOption {
    value: string | number;
    label: string;
    sublabel?: string;
    icon?: LucideIcon;
}

interface ModernFilterSelectProps {
    icon: LucideIcon;
    value: string | number;
    onChange: (val: string) => void;
    options: ModernFilterOption[];
    placeholder: string;
    className?: string;
    onClear?: () => void;
    searchable?: boolean;
    searchPlaceholder?: string;
    align?: 'left' | 'right';
    fullWidth?: boolean;
}

export function ModernFilterSelect({
    icon: Icon,
    value,
    onChange,
    options,
    placeholder,
    className,
    onClear,
    searchable,
    searchPlaceholder,
    align = 'left',
    fullWidth = false,
}: ModernFilterSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const isActivo = Boolean(value !== '' && value !== undefined && value !== null);
    const activeOption = options.find((opt) => String(opt.value) === String(value));
    const labelMostrar = activeOption ? activeOption.label : placeholder;

    // Detectar si requiere buscador automáticamente (> 6 opciones) o si se forzó por prop
    const showSearch = searchable !== undefined ? searchable : options.length > 6;

    // Cerrar al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Cerrar al presionar Escape
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Enfocar buscador al abrir
    useEffect(() => {
        if (isOpen && showSearch) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, showSearch]);

    // Filtrar opciones por búsqueda
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const q = searchTerm.toLowerCase();
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(q) ||
                (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
        );
    }, [options, searchTerm]);

    return (
        <div ref={containerRef} className={cn('relative inline-block', fullWidth && 'w-full')}>
            {/* Trigger Button Estilizado */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    'flex items-center justify-between h-9 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs select-none cursor-pointer',
                    fullWidth ? 'w-full' : '',
                    isActivo
                        ? 'bg-blue-50/90 border-blue-400 text-blue-900 ring-2 ring-blue-500/15'
                        : 'bg-white border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50',
                    className
                )}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <Icon
                        className={cn(
                            'h-3.5 w-3.5 shrink-0 transition-colors',
                            isActivo ? 'text-blue-600' : 'text-slate-400'
                        )}
                    />
                    <span className="truncate max-w-[130px] sm:max-w-[160px] text-left">
                        {labelMostrar}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                    {/* Botón limpiar directo si está activo */}
                    {isActivo && onClear ? (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            className="hover:bg-blue-200/60 rounded-full p-0.5 text-blue-800 transition-colors cursor-pointer"
                            title={`Restablecer ${placeholder}`}
                        >
                            <X className="h-3 w-3" />
                        </span>
                    ) : null}

                    {/* Chevron animado */}
                    <ChevronDown
                        className={cn(
                            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                            isOpen && 'rotate-180',
                            isActivo && 'text-blue-500'
                        )}
                    />
                </div>
            </button>

            {/* Popover Menú Flotante Personalizado */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150',
                        fullWidth ? 'w-full min-w-[200px]' : 'min-w-[200px] max-w-[320px]',
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                    role="listbox"
                >
                    {/* Buscador integrado si corresponde */}
                    {showSearch && (
                        <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={searchPlaceholder || `Buscar opción...`}
                                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 font-normal"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Lista de Opciones */}
                    <div className="p-1 max-h-60 overflow-y-auto space-y-0.5 overscroll-contain">
                        {/* Opción default: Todos / Sin filtro */}
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                            className={cn(
                                'w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                                !isActivo
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-100 font-medium'
                            )}
                        >
                            <span className="truncate">{placeholder}</span>
                            {!isActivo && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-2" />}
                        </button>

                        {/* Opciones filtradas */}
                        {filteredOptions.map((opt) => {
                            const isSelected = String(opt.value) === String(value);
                            const OptIcon = opt.icon;
                            return (
                                <button
                                    key={String(opt.value)}
                                    type="button"
                                    onClick={() => {
                                        onChange(String(opt.value));
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={cn(
                                        'w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                                        isSelected
                                            ? 'bg-blue-50 text-blue-700 font-semibold'
                                            : 'text-slate-700 hover:bg-slate-100 font-medium'
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                        {OptIcon && <OptIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                                        <div className="min-w-0">
                                            <div className="truncate">{opt.label}</div>
                                            {opt.sublabel && (
                                                <div className="text-[10px] text-slate-400 truncate font-normal">
                                                    {opt.sublabel}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-2" />}
                                </button>
                            );
                        })}

                        {filteredOptions.length === 0 && (
                            <div className="py-4 text-center text-xs text-slate-400">
                                No se encontraron opciones
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
