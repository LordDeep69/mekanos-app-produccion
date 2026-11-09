'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X, Scale } from 'lucide-react';

export interface EamSelectOption {
  value: string;
  label: string;
  key?: string;
  badge?: string | null;
  description?: string | null;
  icon?: React.ReactNode;
}

export interface EamSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (EamSelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
  searchable?: boolean;
  allowClear?: boolean;
  icon?: React.ReactNode;
  title?: string;
  minDropdownWidth?: number;
  dropdownWidth?: number | string;
}

/**
 * Normaliza opciones recibidas (strings o EamSelectOption) a formato estándar
 */
function normalizeOptions(options: (EamSelectOption | string)[]): EamSelectOption[] {
  return options.map((opt, idx) => {
    if (typeof opt === 'string') {
      return {
        value: opt,
        label: opt,
        key: `opt-${idx}-${opt}`,
      };
    }
    return {
      ...opt,
      key: opt.key || `opt-${idx}-${opt.value}`,
      label: opt.label || opt.value,
    };
  });
}

/**
 * Componente Select Prémium para Catálogos EAM y Simulador Interactivo
 *
 * Características:
 * - Renderizado en Portal (document.body) con posición fija para EVITAR ser cortado por contenedores con overflow-hidden.
 * - Auto-posicionamiento inteligente: se abre hacia arriba si está cerca del borde inferior del viewport.
 * - Soporte para búsqueda integrada en tiempo real si tiene 6 o más opciones (o si searchable=true).
 * - Temas 'light' (para formularios) y 'dark' (para barras de herramientas y simulador).
 * - Accesibilidad completa: navegación con teclado (Escape, Flechas, Enter) y detección de clics externos.
 * - Admite valores vacíos de manera limpia sin fallos de Shadcn/Radix.
 */
export function EamSelect({
  value,
  onChange,
  options: rawOptions,
  placeholder = '-- Seleccionar opción --',
  disabled = false,
  className = '',
  variant = 'light',
  size = 'md',
  searchable,
  allowClear = false,
  icon,
  title,
  minDropdownWidth = 320,
  dropdownWidth,
}: EamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const options = useMemo(() => normalizeOptions(rawOptions), [rawOptions]);

  const selectedOption = useMemo(() => {
    const strVal = String(value ?? '').trim();
    const match = options.find(
      (op) => String(op.value).trim().toLowerCase() === strVal.toLowerCase(),
    );
    if (match) return match;
    if (strVal) return { value: strVal, label: strVal };
    return null;
  }, [options, value]);

  const shouldShowSearch = useMemo(() => {
    if (typeof searchable === 'boolean') return searchable;
    return options.length >= 6;
  }, [searchable, options.length]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(
      (op) =>
        op.label.toLowerCase().includes(term) ||
        op.value.toLowerCase().includes(term) ||
        (op.badge && op.badge.toLowerCase().includes(term)) ||
        (op.description && op.description.toLowerCase().includes(term)),
    );
  }, [options, searchTerm]);

  // Calcular coordenadas de forma atómica y síncrona
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(320, filteredOptions.length * 40 + (shouldShowSearch ? 50 : 20));
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    return {
      top: openUpward ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      openUpward,
    };
  }, [filteredOptions.length, shouldShowSearch]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setSearchTerm('');
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setCoords(null);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setCoords(null);
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    setCoords(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(-1);

    if (shouldShowSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setCoords(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setCoords(null);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          e.preventDefault();
          const chosen = filteredOptions[highlightedIndex];
          onChange(chosen.value);
          setIsOpen(false);
          setCoords(null);
          triggerRef.current?.focus();
        }
      }
    };

    const handleScrollOrResize = () => {
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, calculatePosition, filteredOptions, highlightedIndex, shouldShowSearch]);

  // Clases por variante y tamaño
  const isDark = variant === 'dark';
  const isCompact = size === 'sm';

  const triggerClasses = isDark
    ? `bg-slate-900 hover:bg-slate-800 text-white border-slate-700 hover:border-slate-500 focus:ring-blue-500`
    : `bg-slate-50/70 hover:bg-white text-slate-900 border-slate-300 hover:border-blue-400 focus:ring-blue-500`;

  return (
    <div className={`relative inline-block w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border font-semibold shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 cursor-pointer ${
          isCompact ? 'h-8 px-2.5 text-xs' : 'h-10 px-3.5 text-xs'
        } ${triggerClasses} ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''} ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {icon && <span className="shrink-0">{icon}</span>}
          {selectedOption ? (
            <span className="truncate font-bold">
              {selectedOption.label}
            </span>
          ) : (
            <span className={isDark ? 'text-slate-400' : 'text-slate-400 font-normal truncate'}>
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-0.5 rounded-full hover:bg-slate-200/80 transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Limpiar selección"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-500' : isDark ? 'text-slate-400' : 'text-slate-400'
            }`}
          />
        </div>
      </button>

      {/* Popover flotante vía Portal */}
      {mounted &&
        isOpen &&
        coords &&
        (() => {
          const targetWidth = dropdownWidth || Math.max(coords.width, minDropdownWidth);
          const numWidth = typeof targetWidth === 'number' ? targetWidth : parseInt(String(targetWidth), 10) || 320;
          const safeLeft = typeof window !== 'undefined'
            ? Math.max(12, Math.min(coords.left, window.innerWidth - numWidth - 16))
            : coords.left;

          return createPortal(
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: coords.openUpward ? undefined : coords.top + 4,
                bottom: coords.openUpward ? window.innerHeight - coords.top + 4 : undefined,
                left: safeLeft,
                width: targetWidth,
                maxWidth: 'calc(100vw - 24px)',
                zIndex: 99999,
                transformOrigin: coords.openUpward ? 'bottom left' : 'top left',
              }}
              className={`rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
                coords.openUpward ? 'origin-bottom' : 'origin-top'
              } ${
                isDark
                  ? 'bg-slate-900/95 border-slate-700 text-white divide-slate-800'
                  : 'bg-white/95 border-slate-200/90 text-slate-900 divide-slate-100'
              }`}
            >
              {/* Buscador integrado si hay muchas opciones */}
              {shouldShowSearch && (
                <div
                  className={`p-2 border-b flex items-center gap-2 ${
                    isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/70'
                  }`}
                >
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar opción..."
                    className={`w-full bg-transparent text-xs font-semibold focus:outline-none placeholder:text-slate-400 ${
                      isDark ? 'text-white' : 'text-slate-800'
                    }`}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Lista de Opciones */}
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div className="py-4 px-3 text-center text-xs text-slate-400 font-medium">
                    No se encontraron opciones
                  </div>
                ) : (
                  filteredOptions.map((op, idx) => {
                    const isSelected =
                      selectedOption &&
                      String(selectedOption.value).toLowerCase() === String(op.value).toLowerCase();
                    const isHighlighted = idx === highlightedIndex;

                    return (
                      <button
                        key={op.key || `opt-${idx}`}
                        type="button"
                        onClick={() => handleSelect(op.value)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all duration-100 flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40 shadow-xs'
                              : 'bg-blue-50/90 text-blue-800 font-bold border border-blue-200/80 shadow-xs'
                            : isHighlighted
                            ? isDark
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100/90 text-slate-900'
                            : isDark
                            ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {op.icon && <span className="shrink-0 text-slate-500">{op.icon}</span>}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold leading-snug whitespace-normal break-words">
                              {op.label}
                            </div>
                            {op.description && (
                              <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5 whitespace-normal break-words">
                                {op.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {op.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isDark
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {op.badge}
                            </span>
                          )}
                          {isSelected && (
                            <Check
                              className={`h-4 w-4 shrink-0 ${
                                isDark ? 'text-blue-400' : 'text-blue-600'
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          );
        })()}
    </div>
  );
}

export interface EamUomUnit {
  codigo: string;
  simbolo?: string;
  nombre?: string;
  factor_conversion?: number;
}

export interface EamUomSelectProps {
  value: string;
  units?: EamUomUnit[];
  onChange: (codigo: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Selector Prémium para Unidades de Medida adherido a inputs numéricos
 *
 * Se acopla a la derecha del input de número con estilo de píldora interactiva.
 * Despliega un menú flotante con los símbolos y nombres de todas las unidades
 * compatibles de la magnitud física, con conversión en vivo.
 */
export function EamUomSelect({
  value,
  units = [],
  onChange,
  disabled = false,
  className = '',
}: EamUomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    right: number;
    openUpward: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUnit = useMemo(() => {
    if (!value) return units[0] || null;
    return units.find((u) => u.codigo.toUpperCase() === value.toUpperCase()) || null;
  }, [units, value]);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(260, units.length * 44 + 50);
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    return {
      top: openUpward ? rect.top : rect.bottom,
      right: window.innerWidth - rect.right,
      openUpward,
    };
  }, [units.length]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setCoords(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setCoords(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setCoords(null);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, calculatePosition]);

  // Si no hay unidades o sólo hay 1, mostramos una etiqueta estática sin flecha
  if (units.length <= 1) {
    const single = currentUnit || units[0];
    const display = single?.simbolo || single?.codigo || value || '';
    if (!display) return null;
    return (
      <span
        className={`h-9 px-2.5 bg-slate-100/90 border-l border-slate-300 text-slate-700 font-bold text-xs flex items-center select-none ${className}`}
        title={`Unidad fija: ${single?.nombre || display}`}
      >
        {display}
      </span>
    );
  }

  const activeLabel = currentUnit?.simbolo || currentUnit?.codigo || value;

  return (
    <div className="relative inline-flex h-full shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        title="Cambiar unidad convierte automáticamente el valor numérico"
        className={`h-9 px-2.5 bg-blue-50/80 hover:bg-blue-100/90 text-blue-800 font-bold text-xs border-l border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer select-none group focus:outline-none focus:bg-blue-100 ${
          isOpen ? 'bg-blue-100 ring-1 ring-blue-500' : ''
        } ${className}`}
      >
        <span className="font-mono">{activeLabel}</span>
        <ChevronDown
          className={`h-3 w-3 text-blue-600 transition-transform duration-200 group-hover:text-blue-800 ${
            isOpen ? 'rotate-180 text-blue-800' : ''
          }`}
        />
      </button>

      {/* Popover flotante vía Portal */}
      {mounted &&
        isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : coords.top + 4,
              bottom: coords.openUpward ? window.innerHeight - coords.top + 4 : undefined,
              right: coords.right,
              width: 220,
              zIndex: 99999,
              transformOrigin: coords.openUpward ? 'bottom right' : 'top right',
            }}
            className={`rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
              coords.openUpward ? 'origin-bottom' : 'origin-top'
            }`}
          >
            {/* Header del selector de unidades */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 flex items-center gap-2">
              <Scale className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                  Unidad de Medida
                </div>
                <div className="text-[10px] text-blue-700 font-semibold">
                  Conversión en vivo
                </div>
              </div>
            </div>

            {/* Lista de unidades compatibles */}
            <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {units.map((u) => {
                const isSelected =
                  u.codigo.toUpperCase() === (currentUnit?.codigo || value).toUpperCase();

                return (
                  <button
                    key={u.codigo}
                    type="button"
                    onClick={() => {
                      onChange(u.codigo);
                      setIsOpen(false);
                      setCoords(null);
                      triggerRef.current?.focus();
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all duration-100 flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 text-blue-900 font-bold border border-blue-200/80 shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-extrabold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded text-[11px] min-w-[28px] text-center shrink-0">
                        {u.simbolo || u.codigo}
                      </span>
                      <span className="text-slate-700 text-xs truncate">
                        {u.nombre || u.codigo}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
