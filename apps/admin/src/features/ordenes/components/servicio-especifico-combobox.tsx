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
import { cn } from '@/lib/utils';
import {
    Check,
    ChevronDown,
    Layers,
    Loader2,
    RotateCcw,
    Search,
    Tag,
    Wrench,
    X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface ServicioEspecificoComboboxProps {
    selectedId?: number | null;
    onSelect: (servicioId: number | null) => void;
    tipoServicioId?: number; // Opcional: para contextualizar según el tipo macro seleccionado
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export function ServicioEspecificoCombobox({
    selectedId,
    onSelect,
    tipoServicioId,
    disabled = false,
    className,
    placeholder = 'Filtrar por servicio específico...',
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

    // Lista de categorías únicas disponibles en los servicios
    const categoriasDisponibles = useMemo(() => {
        if (!catalogoServicios) return [];
        const cats = new Set<string>();
        catalogoServicios.forEach((s) => {
            if (s.categoria) cats.add(s.categoria);
        });
        return Array.from(cats);
    }, [catalogoServicios]);

    // Normalizar texto para búsqueda tolerante (sin tildes, minúsculas)
    const normalize = (str: string) =>
        str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

    // Filtrar servicios por búsqueda y categoría
    const serviciosFiltrados = useMemo(() => {
        if (!catalogoServicios) return [];

        let list = [...catalogoServicios];

        // Filtro por tab de categoría
        if (categoriaTab !== 'TODOS') {
            list = list.filter((s) => s.categoria === categoriaTab);
        }

        // Si hay búsqueda por texto
        const query = normalize(searchQuery.trim());
        if (query) {
            list = list.filter((s) => {
                const nombre = normalize(s.nombre_servicio || '');
                const codigo = normalize(s.codigo_servicio || '');
                const desc = normalize(s.descripcion || '');
                const cat = normalize(s.categoria || '');
                const tipo = normalize(s.tipos_servicio?.nombre_tipo || '');
                return (
                    nombre.includes(query) ||
                    codigo.includes(query) ||
                    desc.includes(query) ||
                    cat.includes(query) ||
                    tipo.includes(query)
                );
            });
        }

        // Si se especificó un tipo de servicio macro, priorizar los de ese tipo arriba
        if (tipoServicioId) {
            list.sort((a, b) => {
                const aMatch = a.id_tipo_servicio === tipoServicioId ? 1 : 0;
                const bMatch = b.id_tipo_servicio === tipoServicioId ? 1 : 0;
                return bMatch - aMatch;
            });
        }

        return list;
    }, [catalogoServicios, searchQuery, categoriaTab, tipoServicioId]);

    const handleSelect = (servicio: CatalogoServicio | null) => {
        onSelect(servicio ? servicio.id_servicio : null);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(null);
    };

    return (
        <div ref={containerRef} className={cn('relative inline-block w-full', className)}>
            {/* BOTÓN TRIGGER */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-lg text-sm transition-all border',
                    selectedServicio
                        ? 'border-blue-400 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-300/50'
                        : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
                    disabled && 'opacity-50 cursor-not-allowed bg-gray-100',
                    isOpen && 'ring-2 ring-blue-500 border-blue-500'
                )}
                title={selectedServicio ? `${selectedServicio.codigo_servicio} - ${selectedServicio.nombre_servicio}` : undefined}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Tag className={cn('h-4 w-4 shrink-0', selectedServicio ? 'text-blue-600' : 'text-gray-400')} />
                    {selectedServicio ? (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                                {selectedServicio.codigo_servicio}
                            </span>
                            <span className="truncate text-xs font-medium text-gray-800">
                                {selectedServicio.nombre_servicio}
                            </span>
                        </div>
                    ) : (
                        <span className="text-gray-500 text-xs truncate">
                            {placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {selectedServicio && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                            className="p-0.5 hover:bg-blue-200/70 rounded-full text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                            title="Quitar filtro de servicio específico"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')} />
                </div>
            </button>

            {/* POPOVER DROPDOWN */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute left-0 top-full mt-1.5 w-full sm:w-[440px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150'
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
                                placeholder="Buscar por código, nombre o intervención..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
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
                        {/* Opción para deseleccionar / ver todas las órdenes */}
                        <button
                            type="button"
                            onClick={() => handleSelect(null)}
                            className={cn(
                                'w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-colors',
                                !selectedId
                                    ? 'bg-blue-50/80 text-blue-800 font-semibold'
                                    : 'hover:bg-gray-50 text-gray-600'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                                <span>Todos los servicios (sin filtro específico)</span>
                            </div>
                            {!selectedId && <Check className="h-4 w-4 text-blue-600" />}
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
                                                    {servicio.codigo_servicio}
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
                                                {servicio.nombre_servicio}
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
