'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Globe, Layers, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArquetipoOption {
  codigo: string;
  nombre: string;
  label?: string;
}

export interface ArquetiposMultiComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: ArquetipoOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function getArquetipoEmoji(codigo: string): string {
  const c = codigo.toUpperCase();
  if (c.includes('ELEV') || c.includes('ASCENSOR')) return '🛗';
  if (c.includes('GEN') || c.includes('PLANTA')) return '⚡';
  if (c.includes('BOM') || c.includes('BOMBA')) return '💧';
  if (c.includes('COMP') || c.includes('COMPRESOR')) return '💨';
  if (c.includes('MOT') || c.includes('MOTOR')) return '⚙️';
  if (c.includes('HVAC') || c.includes('AIRE') || c.includes('CHILLER')) return '❄️';
  if (c.includes('TRANS') || c.includes('SUBESTACION')) return '🔌';
  if (c.includes('CALDERA')) return '🔥';
  if (c.includes('GRUA')) return '🏗️';
  return '📦';
}

/**
 * Combobox Selector Prémium Multi-Selección para Tipos de Activos Industriales (Arquetipos EAM)
 *
 * Características:
 * - Ultra-escalable: maneja de 5 a 100+ tipos de equipo sin desbordar el modal ni distorsionar la UI.
 * - Modo Universal de 1 clic: si no hay filtros específicos, aplica globalmente a todos los equipos.
 * - Búsqueda predictiva instantánea integrada por nombre o código técnico.
 * - Renderizado en Portal Flotante (document.body) con medición síncrona para evitar cortes por overflow:hidden.
 * - Badges compactos y removibles con límite de visualización (+N más).
 */
export function ArquetiposMultiCombobox({
  value = [],
  onChange,
  options = [],
  disabled = false,
  className = '',
}: ArquetiposMultiComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  // Calcular posición del popover respecto a la ventana con precisión inmediata
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    return {
      top: openUpward ? rect.top - 8 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 360),
      openUpward,
    };
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setCoords(null);
      setSearchTerm('');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      clearTimeout(timer);
    };
  }, [isOpen, calculatePosition]);

  // Cierre al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setCoords(null);
      setSearchTerm('');
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtrar opciones por término de búsqueda
  const filteredOptions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return options;
    return options.filter((opt) => {
      const nombre = (opt.nombre || opt.label || '').toLowerCase();
      const codigo = (opt.codigo || '').toLowerCase();
      return nombre.includes(term) || codigo.includes(term);
    });
  }, [options, searchTerm]);

  const handleToggleItem = (codigo: string) => {
    const curr = [...value];
    const idx = curr.indexOf(codigo);
    if (idx >= 0) {
      curr.splice(idx, 1);
    } else {
      curr.push(codigo);
    }
    onChange(curr);
  };

  const handleSetUniversal = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.codigo));
  };

  const isUniversal = !value || value.length === 0;

  // Badges visibles para el trigger (máximo 2, el resto "+N más")
  const maxVisiblePills = 2;
  const selectedOptions = useMemo(() => {
    return value.map((cod) => {
      const found = options.find((o) => o.codigo === cod);
      return {
        codigo: cod,
        nombre: found ? found.nombre || found.label || cod : cod,
      };
    });
  }, [value, options]);

  const visiblePills = selectedOptions.slice(0, maxVisiblePills);
  const hiddenCount = selectedOptions.length - maxVisiblePills;

  return (
    <div className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          'w-full min-h-[46px] px-3 py-1.5 bg-white border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all',
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50',
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : '',
        )}
      >
        {/* Left Area: Selected Badges or Universal */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 py-0.5">
          {isUniversal ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs font-bold">
              <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Universal (Aplica a Todos los Equipos)</span>
            </div>
          ) : (
            <>
              {visiblePills.map((item) => (
                <span
                  key={item.codigo}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold shrink-0 animate-in fade-in"
                >
                  <span>{getArquetipoEmoji(item.codigo)}</span>
                  <span className="truncate max-w-[150px]">{item.nombre}</span>
                  <span className="font-mono text-[10px] text-blue-600 bg-white px-1 rounded border border-blue-200">
                    {item.codigo}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleItem(item.codigo);
                    }}
                    className="hover:bg-blue-200/70 p-0.5 rounded-full text-blue-700 hover:text-blue-950 transition-colors ml-0.5 cursor-pointer"
                    title={`Quitar ${item.nombre}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {hiddenCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold">
                  +{hiddenCount} más
                </span>
              )}
            </>
          )}
        </div>

        {/* Right Area: Count indicator & Chevron */}
        <div className="flex items-center gap-1.5 shrink-0 text-gray-400">
          {!isUniversal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetUniversal();
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer mr-0.5"
              title="Restablecer a Universal (Sin filtro)"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md border border-gray-200">
            {isUniversal ? 'Todos' : `${value.length} tipo(s)`}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform duration-200',
              isOpen ? 'rotate-180 text-blue-600' : '',
            )}
          />
        </div>
      </div>

      {/* Portal Dropdown Menu */}
      {mounted &&
        isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
              transformOrigin: coords.openUpward ? 'bottom left' : 'top left',
            }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[360px] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Input Box */}
            <div className="p-3 border-b border-gray-100 bg-gray-50/70">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar tipo de equipo o código (ej: ELEV, Bomba)..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Action Pills */}
              <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-gray-200/60 text-[11px]">
                <button
                  type="button"
                  onClick={handleSetUniversal}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold transition-all cursor-pointer border',
                    isUniversal
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100',
                  )}
                >
                  <Globe className="h-3 w-3" />
                  <span>🌐 Universal (Todos)</span>
                  {isUniversal && <Check className="h-3 w-3 ml-0.5" />}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleSetUniversal}
                    className="text-gray-500 hover:text-red-600 font-medium hover:underline cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            {/* List of Archetypes (Scrollable) */}
            <div className="overflow-y-auto divide-y divide-gray-50 flex-1 p-1 max-h-[220px]">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-25" />
                  <p className="font-semibold text-gray-600">No se encontraron tipos de activo</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Prueba con otro término de búsqueda.
                  </p>
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value.includes(opt.codigo);
                  return (
                    <div
                      key={opt.codigo}
                      onClick={() => handleToggleItem(opt.codigo)}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs',
                        isSelected
                          ? 'bg-blue-50/80 text-blue-950 font-bold'
                          : 'hover:bg-gray-50 text-gray-700 font-medium',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={cn(
                            'w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0',
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'border-gray-300 bg-white',
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        {/* Emoji */}
                        <span className="text-base shrink-0 leading-none">
                          {getArquetipoEmoji(opt.codigo)}
                        </span>

                        {/* Nombre */}
                        <span className="truncate">{opt.nombre || opt.label}</span>
                      </div>

                      {/* Code Badge */}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider shrink-0 border uppercase',
                          isSelected
                            ? 'bg-white text-blue-700 border-blue-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200',
                        )}
                      >
                        {opt.codigo}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-2.5 px-3 border-t border-gray-100 bg-gray-50/90 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                {isUniversal
                  ? 'Aplica universalmente a todo el catálogo'
                  : `${value.length} de ${options.length} arquetipo(s) seleccionados`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setCoords(null);
                  setSearchTerm('');
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
