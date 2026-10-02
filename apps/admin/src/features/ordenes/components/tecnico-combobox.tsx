/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: TecnicoCombobox
 * 
 * Selector de técnicos con búsqueda en tiempo real, avatar con iniciales,
 * información de cargo, documento, teléfono y opción de desasignar.
 */

'use client';

import { cn } from '@/lib/utils';
import {
    Check,
    ChevronDown,
    Loader2,
    Search,
    User,
    UserCheck,
    UserMinus,
    UserX,
    X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TecnicoSelector } from '../api/catalogos.service';

interface TecnicoComboboxProps {
    tecnicos: TecnicoSelector[];
    selectedId: number | null | undefined;
    onSelect: (tecnicoId: number | null) => void;
    disabled?: boolean;
    isLoading?: boolean;
    className?: string;
}

const GRADIENTS = [
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-violet-600 to-purple-700',
    'from-amber-500 to-orange-600',
    'from-cyan-600 to-blue-700',
    'from-rose-600 to-pink-700',
];

function getAvatarGradient(id: number): string {
    return GRADIENTS[Math.abs(id) % GRADIENTS.length];
}

function getInitials(nombre: string): string {
    if (!nombre) return 'T';
    const words = nombre.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function normalizeStr(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function formatNombreTecnico(t?: TecnicoSelector | null): string {
    if (!t) return '';
    const p = t.persona;
    if (!p) return `Técnico #${t.id_empleado}`;
    if (p.nombre_completo) return p.nombre_completo.trim();
    const parts = [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(
        (v): v is string => Boolean(v)
    );
    return parts.join(' ').trim() || `Técnico #${t.id_empleado}`;
}

function formatCargo(cargo?: string): string {
    if (!cargo) return 'Técnico';
    return cargo
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TecnicoCombobox({
    tecnicos,
    selectedId,
    onSelect,
    disabled = false,
    isLoading = false,
    className,
}: TecnicoComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Técnico actualmente seleccionado
    const selectedTecnico = useMemo(() => {
        if (!selectedId) return null;
        return tecnicos.find((t) => t.id_empleado === selectedId) || null;
    }, [tecnicos, selectedId]);

    // Cerrar al hacer click fuera
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

    // Enfocar input de búsqueda al abrir.
    // La limpieza de `searchQuery` se hace en `handleSelectOption` y al cerrar
    // desde el trigger, no en un efecto: setState síncrono dentro de un efecto
    // provoca renders en cascada.
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, [isOpen]);

    // Tecla Escape cierra el selector
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Filtrar técnicos en memoria de manera instantánea y tolerante a acentos
    const filteredTecnicos = useMemo(() => {
        const query = normalizeStr(searchQuery.trim());
        if (!query) return tecnicos;

        return tecnicos.filter((t) => {
            const nombre = normalizeStr(formatNombreTecnico(t));
            const cargo = normalizeStr(t.cargo || '');
            const codigo = normalizeStr(t.codigo_empleado || '');
            const doc = normalizeStr(t.persona?.numero_identificacion || '');
            const celular = normalizeStr(t.persona?.celular || '');

            return (
                nombre.includes(query) ||
                cargo.includes(query) ||
                codigo.includes(query) ||
                doc.includes(query) ||
                celular.includes(query)
            );
        });
    }, [tecnicos, searchQuery]);

    const handleSelectOption = (id: number | null) => {
        onSelect(id);
        setSearchQuery('');
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen((prev) => {
            if (prev) setSearchQuery('');
            return !prev;
        });
    };

    return (
        <div ref={containerRef} className={cn('relative w-full', className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className={cn(
                    'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all duration-200 group',
                    isOpen
                        ? 'border-blue-500 ring-4 ring-blue-500/10 bg-white shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                    disabled && 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                )}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isLoading ? (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        </div>
                    ) : selectedTecnico ? (
                        <div
                            className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 bg-gradient-to-br',
                                getAvatarGradient(selectedTecnico.id_empleado)
                            )}
                        >
                            {getInitials(formatNombreTecnico(selectedTecnico))}
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                            <User className="w-5 h-5" />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        {selectedTecnico ? (
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-slate-900 truncate">
                                        {formatNombreTecnico(selectedTecnico)}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
                                        {formatCargo(selectedTecnico.cargo)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    {selectedTecnico.codigo_empleado && (
                                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                            {selectedTecnico.codigo_empleado}
                                        </span>
                                    )}
                                    {selectedTecnico.persona?.numero_identificacion && (
                                        <span>CC: {selectedTecnico.persona.numero_identificacion}</span>
                                    )}
                                    {selectedTecnico.persona?.celular && (
                                        <span className="hidden sm:inline">· Tel: {selectedTecnico.persona.celular}</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-semibold text-slate-600">Sin técnico asignado</p>
                                <p className="text-xs text-slate-400">Haz clic para buscar y asignar un técnico</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Botón rápido de desasignar si ya tiene técnico y no está disabled */}
                    {selectedTecnico && !disabled && (
                        <span
                            role="button"
                            title="Quitar asignación"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOption(null);
                            }}
                            className="p-1 hover:bg-slate-200/70 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </span>
                    )}
                    <ChevronDown
                        className={cn(
                            'w-4 h-4 text-slate-400 transition-transform duration-200',
                            isOpen && 'transform rotate-180 text-blue-600'
                        )}
                    />
                </div>
            </button>

            {/* Dropdown Floating Panel */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                    {/* Buscador */}
                    <div className="p-3 bg-slate-50/80 border-b border-slate-100">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre, cargo, código o cédula..."
                                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Contenido / Lista */}
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {/* Opción Sin Asignar */}
                        <button
                            type="button"
                            onClick={() => handleSelectOption(null)}
                            className={cn(
                                'w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all group',
                                selectedId === null || selectedId === undefined
                                    ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-200'
                                    : 'border-transparent hover:bg-slate-100/60 hover:border-slate-200'
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                                    <UserMinus className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Sin técnico asignado</p>
                                    <p className="text-xs text-slate-400">
                                        La orden quedará en estado PROGRAMADA si estaba asignada
                                    </p>
                                </div>
                            </div>
                            {(selectedId === null || selectedId === undefined) && (
                                <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0">
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                            )}
                        </button>

                        <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Técnicos del Sistema ({filteredTecnicos.length})
                            </span>
                            {searchQuery && (
                                <span className="text-[11px] text-blue-600 font-medium">
                                    Filtrando por: &quot;{searchQuery}&quot;
                                </span>
                            )}
                        </div>

                        {filteredTecnicos.length === 0 ? (
                            <div className="py-8 px-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                                    <UserX className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">
                                    No se encontraron técnicos
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    No hay resultados que coincidan con &quot;{searchQuery}&quot;
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
                                >
                                    Limpiar búsqueda
                                </button>
                            </div>
                        ) : (
                            filteredTecnicos.map((tecnico) => {
                                const isSelected = selectedId === tecnico.id_empleado;
                                const nombre = formatNombreTecnico(tecnico);
                                const cargo = formatCargo(tecnico.cargo);
                                const gradient = getAvatarGradient(tecnico.id_empleado);

                                return (
                                    <button
                                        key={tecnico.id_empleado}
                                        type="button"
                                        onClick={() => handleSelectOption(tecnico.id_empleado)}
                                        className={cn(
                                            'w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-150 group',
                                            isSelected
                                                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/30'
                                                : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div
                                                className={cn(
                                                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 bg-gradient-to-br',
                                                    gradient
                                                )}
                                            >
                                                {getInitials(nombre)}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        'font-semibold text-sm truncate',
                                                        isSelected ? 'text-blue-900' : 'text-slate-800'
                                                    )}>
                                                        {nombre}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 shrink-0">
                                                        {cargo}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    {tecnico.codigo_empleado && (
                                                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 rounded">
                                                            {tecnico.codigo_empleado}
                                                        </span>
                                                    )}
                                                    {tecnico.persona?.numero_identificacion && (
                                                        <span>CC: {tecnico.persona.numero_identificacion}</span>
                                                    )}
                                                    {tecnico.persona?.celular && (
                                                        <span className="hidden sm:inline">· 📱 {tecnico.persona.celular}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected ? (
                                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm ml-2">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50/50 flex items-center justify-center shrink-0 transition-colors ml-2">
                                                <UserCheck className="w-3 h-3 text-transparent group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer info bar */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>💡 Tip: Usa las flechas o escribe para buscar</span>
                        <span>{tecnicos.length} disponibles en total</span>
                    </div>
                </div>
            )}
        </div>
    );
}
