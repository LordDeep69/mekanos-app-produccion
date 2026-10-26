/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: ServicioEspecificoCombobox
 * 
 * Selector interactivo para filtrar órdenes por servicio específico del catálogo.
 * Permite buscar por código, nombre o categoría, y deslizar (scroll fluido)
 * para seleccionar el servicio exacto.
 */

'use client';

import { useServiciosComerciales } from '@/features/ordenes';
import type { CatalogoServicio } from '@/features/ordenes/api/catalogos.service';
import { getCategoriaServicioColor, getCategoriaServicioLabel } from '@/features/ordenes/api/catalogos.service';
import { calculateSmartMatchScore, SmartHighlight } from '@/lib/search-utils';
import { cn } from '@/lib/utils';
import {
    Check,
    ChevronDown,
    Layers,
    Loader2,
    RotateCcw,
    Search,
    Sparkles,
    Tag,
    Wrench,
    X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface ServicioEspecificoComboboxProps {
    selectedId?: number | null;
    selectedTexto?: string | null;
    onSelect: (servicioId: number | null, servicioTexto?: string | null) => void;
    tipoServicioId?: number; // Opcional: para contextualizar según el tipo macro seleccionado
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    align?: 'left' | 'right';
}

export function ServicioEspecificoCombobox({
    selectedId,
    selectedTexto,
    onSelect,
    tipoServicioId,
    disabled = false,
    className,
    placeholder = 'Filtrar por servicio específico...',
    align = 'left',
}: ServicioEspecificoComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoriaTab, setCategoriaTab] = useState<string>('TODOS');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Cargar servicios comerciales activos desde el catálogo
    const { data: catalogoServicios, isLoading } = useServiciosComerciales({
        activo: true,
        limit: 250,
    });

    // Servicio actualmente seleccionado
    const selectedServicio = useMemo(() => {
        if (!selectedId || !catalogoServicios) return null;
        return catalogoServicios.find((s) => s.id_servicio === selectedId) || null;
    }, [catalogoServicios, selectedId]);

    // Cerrar al hacer click fuera o presionar Escape
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            // Autofocus en el input de búsqueda
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Lista de categorías únicas disponibles en los servicios (priorizando CORRECTIVO)
    const categoriasDisponibles = useMemo(() => {
        if (!catalogoServicios) return [];
        const cats = new Set<string>();
        catalogoServicios.forEach((s) => {
            if (s.categoria) cats.add(s.categoria);
        });
        const ordenDeseado = ['CORRECTIVO', 'PREVENTIVO', 'PREDICTIVO', 'ESPECIALIZADO', 'OVERHAUL', 'DIAGNOSTICO'];
        return Array.from(cats).sort((a, b) => {
            const idxA = ordenDeseado.indexOf(a);
            const idxB = ordenDeseado.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [catalogoServicios]);

    // Filtrar y ordenar servicios inteligentemente (independiente del orden de palabras, acentos o combinación de caracteres)
    const serviciosFiltrados = useMemo(() => {
        if (!catalogoServicios) return [];

        let list = [...catalogoServicios];

        // Filtro por tab de categoría
        if (categoriaTab !== 'TODOS') {
            list = list.filter((s) => s.categoria === categoriaTab);
        }

        const query = searchQuery.trim();

        // Si no hay búsqueda por texto, mantener orden o priorizar por tipo macro
        if (!query) {
            if (tipoServicioId) {
                list.sort((a, b) => {
                    const aMatch = a.id_tipo_servicio === tipoServicioId ? 1 : 0;
                    const bMatch = b.id_tipo_servicio === tipoServicioId ? 1 : 0;
                    return bMatch - aMatch;
                });
            }
            return list;
        }

        // Búsqueda inteligente: evaluar coincidencia permutativa, sin acentos y clasificar por relevancia
        const scoredItems: Array<{ servicio: CatalogoServicio; score: number }> = [];

        for (const servicio of list) {
            const score = calculateSmartMatchScore(query, {
                primary: servicio.nombre_servicio,
                secondary: servicio.codigo_servicio,
                extra: [
                    servicio.descripcion,
                    servicio.categoria,
                    servicio.tipos_servicio?.nombre_tipo,
                ],
            });

            if (score > 0) {
                let finalScore = score;
                // Bonificación si coincide con el tipo macro activo
                if (tipoServicioId && servicio.id_tipo_servicio === tipoServicioId) {
                    finalScore += 500;
                }
                scoredItems.push({ servicio, score: finalScore });
            }
        }

        // Ordenar de mayor a menor relevancia
        scoredItems.sort((a, b) => b.score - a.score);

        return scoredItems.map((item) => item.servicio);
    }, [catalogoServicios, searchQuery, categoriaTab, tipoServicioId]);

    const handleSelect = (servicio: CatalogoServicio | null) => {
        onSelect(servicio ? servicio.id_servicio : null, null);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleSelectTexto = (texto: string) => {
        const clean = texto.trim();
        if (!clean) return;
        onSelect(null, clean);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        onSelect(null, null);
    };

    const esCorrectivo = selectedServicio?.categoria === 'CORRECTIVO';
    const isKeywordFilterActive = Boolean(selectedTexto && !selectedServicio);

    return (
        <div ref={containerRef} className={cn('relative inline-block w-full', className)}>
            {/* BOTÓN TRIGGER */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center justify-between gap-1.5 px-3 py-2 text-left rounded-lg text-xs font-medium transition-all border',
                    isKeywordFilterActive
                        ? 'border-amber-400 bg-amber-50/90 text-amber-950 shadow-2xs ring-1 ring-amber-300/50'
                        : selectedServicio
                            ? esCorrectivo
                                ? 'border-orange-300 bg-orange-50/80 text-orange-950 shadow-2xs ring-1 ring-orange-300/50'
                                : 'border-blue-400 bg-blue-50/70 text-blue-900 shadow-2xs ring-1 ring-blue-300/50'
                            : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
                    disabled && 'opacity-50 cursor-not-allowed bg-gray-100',
                    isOpen && (isKeywordFilterActive || esCorrectivo ? 'ring-2 ring-amber-500 border-amber-500' : 'ring-2 ring-blue-500 border-blue-500')
                )}
                title={
                    isKeywordFilterActive
                        ? `Búsqueda inteligente por palabra clave: "${selectedTexto}"`
                        : selectedServicio
                            ? `${selectedServicio.codigo_servicio} - ${selectedServicio.nombre_servicio}`
                            : undefined
                }
            >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isKeywordFilterActive ? (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300/80 shrink-0 uppercase tracking-tight">
                                Contiene
                            </span>
                            <span className="truncate text-xs font-bold text-amber-950">
                                &quot;{selectedTexto}&quot;
                            </span>
                        </div>
                    ) : selectedServicio ? (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Tag className={cn('h-3.5 w-3.5 shrink-0', esCorrectivo ? 'text-orange-600' : 'text-blue-600')} />
                            <span className={cn(
                                'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                                esCorrectivo
                                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                    : 'bg-blue-100 text-blue-800'
                            )}>
                                {selectedServicio.codigo_servicio}
                            </span>
                            <span className="truncate text-xs font-semibold text-gray-900">
                                {selectedServicio.nombre_servicio}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 text-xs truncate">
                                {placeholder}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {(selectedServicio || isKeywordFilterActive) && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                            className={cn(
                                'p-0.5 rounded-full transition-colors cursor-pointer',
                                isKeywordFilterActive
                                    ? 'hover:bg-amber-200 text-amber-800'
                                    : esCorrectivo
                                        ? 'hover:bg-orange-200 text-orange-700'
                                        : 'hover:bg-blue-200/70 text-blue-600 hover:text-blue-800'
                            )}
                            title="Quitar filtro de servicio específico"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')} />
                </div>
            </button>

            {/* POPOVER DROPDOWN */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full mt-1.5 w-[340px] sm:w-[450px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150',
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                >
                    {/* Header del dropdown con buscador */}
                    <div className="p-3 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Wrench className="h-3.5 w-3.5 text-blue-600" />
                                Catálogo de Servicios Específicos
                            </span>
                            <span className="text-[11px] font-medium text-gray-400">
                                {catalogoServicios?.length || 0} disponibles
                            </span>
                        </div>

                        {/* Input de búsqueda */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar por código, nombre o palabra clave (ej: RADIADOR)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        e.preventDefault();
                                        handleSelectTexto(searchQuery.trim());
                                    }
                                }}
                                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Pills de categoría para filtrar rápidamente */}
                        {categoriasDisponibles.length > 0 && (
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                                <button
                                    type="button"
                                    onClick={() => setCategoriaTab('TODOS')}
                                    className={cn(
                                        'px-2 py-0.5 rounded-md font-semibold transition-colors shrink-0',
                                        categoriaTab === 'TODOS'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    Todos
                                </button>
                                {categoriasDisponibles.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategoriaTab(cat)}
                                        className={cn(
                                            'px-2 py-0.5 rounded-md font-semibold transition-colors shrink-0 uppercase text-[10px]',
                                            categoriaTab === cat
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        )}
                                    >
                                        {getCategoriaServicioLabel(cat)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* LISTA SCROLLABLE DE SERVICIOS ("deslizar para indicar cuál servicio") */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 p-1">
                        {/* Estado si hay filtro por palabra clave activo */}
                        {isKeywordFilterActive && (
                            <div className="p-2 mb-1 rounded-lg bg-amber-50/90 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                                <span className="flex items-center gap-1.5 font-medium truncate">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>Palabra clave activa: <strong>&quot;{selectedTexto}&quot;</strong></span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleClear()}
                                    className="text-amber-800 hover:text-amber-950 font-bold hover:underline shrink-0 text-[11px] ml-2"
                                >
                                    Restablecer
                                </button>
                            </div>
                        )}

                        {/* Botón de Búsqueda Inteligente por Palabra Clave */}
                        {searchQuery.trim().length > 0 && (
                            <button
                                type="button"
                                onClick={() => handleSelectTexto(searchQuery.trim())}
                                className={cn(
                                    'w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all mb-1 border shadow-2xs group cursor-pointer',
                                    selectedTexto?.toLowerCase() === searchQuery.trim().toLowerCase()
                                        ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold ring-2 ring-amber-400/50'
                                        : 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100/80 hover:to-orange-100/80 text-amber-950 border-amber-200/90'
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="p-1.5 rounded-md bg-amber-500 text-white shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                                        <Sparkles className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-amber-950 truncate">
                                                Buscar órdenes con: &quot;{searchQuery.trim()}&quot;
                                            </span>
                                            <span className="text-[9px] bg-amber-200/90 text-amber-900 font-bold px-1.5 py-0.2 rounded uppercase">
                                                Palabra clave
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-amber-700 truncate mt-0.5">
                                            {serviciosFiltrados.length} servicio(s) coincidente(s) • Clic o Enter para filtrar todas
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-mono text-amber-800 bg-white/90 border border-amber-200 px-1.5 py-0.5 rounded shadow-2xs shrink-0 ml-1">
                                    <span>↵ Enter</span>
                                </div>
                            </button>
                        )}

                        {/* Opción para deseleccionar / ver todas las órdenes */}
                        <button
                            type="button"
                            onClick={() => handleSelect(null)}
                            className={cn(
                                'w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-colors',
                                !selectedId && !selectedTexto
                                    ? 'bg-blue-50/80 text-blue-800 font-semibold'
                                    : 'hover:bg-gray-50 text-gray-600'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                                <span>Todos los servicios (sin filtro específico)</span>
                            </div>
                            {!selectedId && !selectedTexto && <Check className="h-4 w-4 text-blue-600" />}
                        </button>

                        {/* Estados de carga / vacío / resultados */}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                                <span className="text-xs">Cargando catálogo de servicios...</span>
                            </div>
                        ) : serviciosFiltrados.length === 0 ? (
                            <div className="py-8 text-center px-4">
                                <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs font-medium text-gray-600">No se encontraron servicios</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Intenta con otro término o selecciona &quot;Todos&quot;
                                </p>
                            </div>
                        ) : (
                            serviciosFiltrados.map((servicio) => {
                                const isSelected = selectedId === servicio.id_servicio;
                                const isMacroMatch = tipoServicioId && servicio.id_tipo_servicio === tipoServicioId;

                                return (
                                    <button
                                        key={servicio.id_servicio}
                                        type="button"
                                        onClick={() => handleSelect(servicio)}
                                        className={cn(
                                            'w-full flex items-start justify-between gap-3 p-2.5 rounded-lg text-left transition-all group',
                                            isSelected
                                                ? 'bg-blue-50/90 text-blue-900 border border-blue-200/80 shadow-xs'
                                                : 'hover:bg-slate-50 text-gray-800'
                                        )}
                                    >
                                        <div className="min-w-0 flex-1 space-y-1">
                                            {/* Fila superior: Código y Categoría */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn(
                                                    'font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border',
                                                    isSelected
                                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                                        : 'bg-gray-100 text-gray-700 border-gray-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200'
                                                )}>
                                                    <SmartHighlight text={servicio.codigo_servicio} query={searchQuery} />
                                                </span>

                                                <span className={cn(
                                                    'text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase',
                                                    getCategoriaServicioColor(servicio.categoria)
                                                )}>
                                                    {getCategoriaServicioLabel(servicio.categoria)}
                                                </span>

                                                {isMacroMatch && (
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Tipo actual
                                                    </span>
                                                )}
                                            </div>

                                            {/* Nombre del servicio */}
                                            <p className={cn(
                                                'text-xs font-semibold leading-snug line-clamp-2',
                                                isSelected ? 'text-blue-900 font-bold' : 'text-gray-900'
                                            )}>
                                                <SmartHighlight text={servicio.nombre_servicio} query={searchQuery} />
                                            </p>

                                            {/* Info complementaria: descripción o tipo macro */}
                                            {servicio.tipos_servicio?.nombre_tipo && (
                                                <p className="text-[10px] text-gray-500 line-clamp-1">
                                                    Macro: {servicio.tipos_servicio.nombre_tipo}
                                                </p>
                                            )}
                                        </div>

                                        {/* Icono de seleccionado */}
                                        <div className="shrink-0 self-center">
                                            {isSelected && (
                                                <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xs">
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer informativo */}
                    <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>
                            {serviciosFiltrados.length} servicio(s) coincidente(s)
                        </span>
                        {selectedId && (
                            <button
                                type="button"
                                onClick={() => handleSelect(null)}
                                className="text-red-600 hover:text-red-800 font-medium hover:underline"
                            >
                                Limpiar filtro
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
