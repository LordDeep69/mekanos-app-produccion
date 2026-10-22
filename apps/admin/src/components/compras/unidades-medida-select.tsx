'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Selector de Unidades de Medida Normalizadas (UnidadesMedidaSelect)
 * 
 * Componente Premium Combobox / Popover:
 * - Búsqueda rápida por nombre o símbolo ISO (ej: und, gal, litro, kg, m).
 * - Agrupación estructurada por tipo de magnitud física con badges e iconos.
 * - Indicador técnico de admisión de decimales (Entero vs Decimal).
 * - Selección por defecto inteligente a 'UND' (Unidad) en creación.
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Search,
  Scale,
  Ruler,
  Boxes,
  X,
} from 'lucide-react';

import { comprasService } from '@/lib/api/compras.service';
import { TipoMagnitud, UnidadMedida } from '@/types/compras.types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface UnidadesMedidaSelectProps {
  value?: string;
  onChange: (codigo_unidad: string, unidad?: UnidadMedida | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  defaultToUnd?: boolean;
}

// Metadatos visuales de magnitudes
const MAGNITUD_CONFIG: Record<
  TipoMagnitud,
  { label: string; icon: string; badgeColor: string }
> = {
  CANTIDAD: {
    label: 'Conteo / Piezas',
    icon: '🔢',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  VOLUMEN: {
    label: 'Volumen y Capacidad',
    icon: '🧪',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  LONGITUD: {
    label: 'Longitud y Distancia',
    icon: '📏',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  MASA: {
    label: 'Masa y Peso',
    icon: '⚖️',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  CONJUNTO: {
    label: 'Conjuntos y Juegos',
    icon: '📦',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
  },
};

export function UnidadesMedidaSelect({
  value,
  onChange,
  placeholder = 'Seleccionar unidad de medida...',
  disabled = false,
  className,
  id,
  defaultToUnd = true,
}: UnidadesMedidaSelectProps) {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroMagnitud, setFiltroMagnitud] = useState<TipoMagnitud | 'TODAS'>('TODAS');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar catálogo de unidades de medida
  useEffect(() => {
    let isMounted = true;
    async function loadUnidades() {
      try {
        setIsLoading(true);
        const data = await comprasService.getUnidadesMedida();
        if (isMounted) {
          setUnidades(data);
          // Si no hay valor y defaultToUnd está activo, seleccionar UND por defecto
          if (!value && defaultToUnd) {
            const und = data.find((u) => (u.codigo || u.codigo_unidad) === 'UND');
            if (und) {
              onChange('UND', und);
            }
          }
        }
      } catch (e) {
        console.error('Error al cargar unidades de medida:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadUnidades();
    return () => {
      isMounted = false;
    };
  }, []);

  // Unidad actualmente seleccionada
  const selectedUnidad = useMemo(() => {
    if (!value) return null;
    return (
      unidades.find(
        (u) =>
          u.codigo === value ||
          u.codigo_unidad === value ||
          u.codigo === value.toUpperCase()
      ) || null
    );
  }, [unidades, value]);

  // Cierre por click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrado reactivo por término y por magnitud
  const filteredUnidades = useMemo(() => {
    const q = search.toLowerCase().trim();
    return unidades.filter((u) => {
      const matchMagnitud =
        filtroMagnitud === 'TODAS' || u.tipo_magnitud === filtroMagnitud;
      const matchTexto =
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        u.simbolo.toLowerCase().includes(q) ||
        (u.codigo || '').toLowerCase().includes(q);
      return matchMagnitud && matchTexto;
    });
  }, [unidades, search, filtroMagnitud]);

  // Agrupación por magnitud para la lista renderizada
  const agrupadas = useMemo(() => {
    const orden: TipoMagnitud[] = [
      'CANTIDAD',
      'VOLUMEN',
      'LONGITUD',
      'MASA',
      'CONJUNTO',
    ];

    const map = new Map<TipoMagnitud, UnidadMedida[]>();
    for (const m of orden) {
      map.set(m, []);
    }

    for (const u of filteredUnidades) {
      const lista = map.get(u.tipo_magnitud) || [];
      lista.push(u);
      map.set(u.tipo_magnitud, lista);
    }

    return map;
  }, [filteredUnidades]);

  const handleSelect = (u: UnidadMedida) => {
    const cod = u.codigo || u.codigo_unidad || '';
    onChange(cod, u);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearch('');
  };

  const magMeta = selectedUnidad
    ? MAGNITUD_CONFIG[selectedUnidad.tipo_magnitud] || {
        icon: '📦',
        label: selectedUnidad.tipo_magnitud,
        badgeColor: 'bg-gray-100 text-gray-700',
      }
    : null;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Botón Gatillo / Display */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(true);
          }
        }}
        className={cn(
          'flex min-h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          disabled
            ? 'cursor-not-allowed opacity-50 bg-gray-50'
            : 'cursor-pointer hover:border-gray-400',
          isOpen && 'border-blue-500 ring-1 ring-blue-500'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          {selectedUnidad ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm">{magMeta?.icon}</span>
              <span className="font-semibold text-gray-900 truncate">
                {selectedUnidad.nombre}
              </span>
              <Badge
                variant="outline"
                className="font-mono text-[10px] px-1.5 py-0 bg-blue-50/70 border-blue-200 text-blue-700 font-bold"
              >
                {selectedUnidad.simbolo}
              </Badge>
              {selectedUnidad.permite_decimales && (
                <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                  (dec)
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs">
              {isLoading ? 'Cargando unidades...' : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedUnidad && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Limpiar unidad"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Popover / Menú Desplegable Flotante */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-lg border border-gray-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Cabecera con Buscador */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar (ej: und, gal, litro, metro, kg)..."
                className="pl-8 pr-3 h-8 text-xs bg-white border-gray-200"
                autoFocus
              />
            </div>

            {/* Chips de filtro por tipo de magnitud física */}
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setFiltroMagnitud('TODAS')}
                className={cn(
                  'px-2 py-0.5 rounded-full border transition-colors',
                  filtroMagnitud === 'TODAS'
                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                )}
              >
                Todas
              </button>
              {(Object.keys(MAGNITUD_CONFIG) as TipoMagnitud[]).map((mag) => {
                const conf = MAGNITUD_CONFIG[mag];
                const active = filtroMagnitud === mag;
                return (
                  <button
                    key={mag}
                    type="button"
                    onClick={() => setFiltroMagnitud(mag)}
                    className={cn(
                      'px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1',
                      active
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <span>{conf.icon}</span>
                    <span>{conf.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listado de Unidades Agrupadas */}
          <div className="max-h-64 overflow-y-auto p-1 text-xs">
            {isLoading ? (
              <div className="py-6 text-center text-gray-500">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
                <p className="mt-2 text-xs">Cargando unidades de medida...</p>
              </div>
            ) : filteredUnidades.length > 0 ? (
              <div className="space-y-2">
                {Array.from(agrupadas.entries()).map(([magnitud, items]) => {
                  if (!items || items.length === 0) return null;
                  const conf = MAGNITUD_CONFIG[magnitud] || {
                    icon: '📦',
                    label: magnitud,
                    badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
                  };

                  return (
                    <div key={magnitud} className="space-y-0.5">
                      {/* Encabezado de la Magnitud */}
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80 rounded flex items-center gap-1.5">
                        <span>{conf.icon}</span>
                        <span>{conf.label}</span>
                      </div>

                      {/* Items de la Magnitud */}
                      <div className="space-y-0.5">
                        {items.map((u) => {
                          const cod = u.codigo || u.codigo_unidad;
                          const isSelected =
                            selectedUnidad?.codigo === cod ||
                            selectedUnidad?.codigo_unidad === cod;

                          return (
                            <button
                              key={cod}
                              type="button"
                              onClick={() => handleSelect(u)}
                              className={cn(
                                'w-full flex items-center justify-between rounded-md py-1.5 px-2.5 transition-colors text-left group',
                                isSelected
                                  ? 'bg-blue-50 text-blue-900 font-semibold'
                                  : 'hover:bg-gray-100 text-gray-700'
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'font-mono text-[10px] px-1.5 py-0 font-bold',
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-gray-100 text-gray-800 border-gray-200 group-hover:bg-white'
                                  )}
                                >
                                  {u.simbolo}
                                </Badge>
                                <span className="truncate">{u.nombre}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {u.permite_decimales ? 'Decimales' : 'Entero'}
                                </span>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-blue-600 shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500 text-xs">
                No se encontraron unidades para "{search}"
              </div>
            )}
          </div>

          {/* Pie informativo */}
          <div className="p-2 border-t border-gray-100 bg-gray-50/70 text-[10px] text-gray-500 flex items-center justify-between">
            <span>{filteredUnidades.length} unidades disponibles</span>
            <span className="font-mono text-[9px] text-gray-400">Estándar ISO / DIAN</span>
          </div>
        </div>
      )}
    </div>
  );
}
