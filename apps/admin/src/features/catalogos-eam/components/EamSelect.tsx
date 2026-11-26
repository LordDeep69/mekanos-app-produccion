'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from 'react';

const subscribeNoop = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;
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
  usePortal?: boolean;
  align?: 'left' | 'right';
  /** Abre el menú hacia arriba (modo inline) */
  dropUp?: boolean;
  /** Placeholder del input interno de búsqueda cuando searchable está activo */
  searchPlaceholder?: string;
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
  minDropdownWidth = 340,
  dropdownWidth,
  usePortal = true,
  align = 'left',
  dropUp = false,
  searchPlaceholder = 'Buscar opción...',
}: EamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const mounted = useSyncExternalStore(subscribeNoop, getClientMounted, getServerMounted);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    mode: 'document' | 'fixed';
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
    zIndex: number;
  } | null>(null);
  const openUpwardLockedRef = useRef<boolean | null>(null);

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

  // Detectar si el trigger está dentro de un contenedor scrollable distinto del documento (ej. Dialog)
  const hasScrollableAncestor = useCallback((el: HTMLElement | null): boolean => {
    let curr = el?.parentElement || null;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const style = window.getComputedStyle(curr);
      const oy = style.overflowY;
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
        curr.scrollHeight > curr.clientHeight
      ) {
        return true;
      }
      curr = curr.parentElement;
    }
    return false;
  }, []);

  // Calcular coordenadas ancladas: en página normal usa `position: absolute` en documento
  // (0ms de lag / cero desligamiento al hacer scroll); en modales/scrollables usa `fixed`.
  const calculatePosition = useCallback(
    (explicitOptionCount?: number, lockedUpward?: boolean | null) => {
      if (!triggerRef.current) return null;
      const rect = triggerRef.current.getBoundingClientRect();
      const inDialog = Boolean(triggerRef.current.closest('[role="dialog"]'));
      const mode: 'document' | 'fixed' =
        inDialog || hasScrollableAncestor(triggerRef.current) ? 'fixed' : 'document';

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const popoverWidth = dropdownWidth
        ? typeof dropdownWidth === 'number'
          ? dropdownWidth
          : parseInt(String(dropdownWidth), 10) || 340
        : Math.max(rect.width, minDropdownWidth);

      const optionCount = explicitOptionCount ?? filteredOptions.length;
      const estimatedHeight = Math.min(340, optionCount * 44 + (shouldShowSearch ? 52 : 16));
      const openUpward =
        typeof lockedUpward === 'boolean'
          ? lockedUpward
          : dropUp
            ? spaceAbove >= Math.min(260, estimatedHeight) + 12 || spaceAbove > spaceBelow
            : spaceBelow < estimatedHeight &&
              (spaceAbove >= estimatedHeight + 10 || spaceAbove > spaceBelow);

      const availableSpace = openUpward ? spaceAbove - 16 : spaceBelow - 16;
      const maxHeight = Math.max(160, Math.min(340, availableSpace));

      const preferRight =
        align === 'right' ||
        (rect.left + popoverWidth > window.innerWidth - 16 && rect.right - popoverWidth >= 12);
      let targetLeft = preferRight ? rect.right - popoverWidth : rect.left;
      targetLeft = Math.max(12, Math.min(targetLeft, window.innerWidth - popoverWidth - 12));

      if (mode === 'document') {
        return {
          mode,
          top: openUpward ? rect.top + window.scrollY - 6 : rect.bottom + window.scrollY + 6,
          left: targetLeft + window.scrollX,
          width: popoverWidth,
          maxHeight,
          openUpward,
          zIndex: 19,
        };
      }

      return {
        mode,
        top: openUpward ? rect.top - 6 : rect.bottom + 6,
        left: targetLeft,
        width: popoverWidth,
        maxHeight,
        openUpward,
        zIndex: 99999,
      };
    },
    [
      align,
      dropUp,
      dropdownWidth,
      minDropdownWidth,
      filteredOptions.length,
      shouldShowSearch,
      hasScrollableAncestor,
    ],
  );

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
      if (usePortal) {
        const nextCoords = calculatePosition(options.length, null);
        if (nextCoords) {
          openUpwardLockedRef.current = nextCoords.openUpward;
          setCoords(nextCoords);
        }
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setCoords(null);
      openUpwardLockedRef.current = null;
    }
  };

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
    if (isOpen && shouldShowSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    }
  }, [isOpen, shouldShowSearch]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const item = popoverRef.current?.querySelector(
      `[data-eam-idx="${highlightedIndex}"]`,
    ) as HTMLElement | null;
    item?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlightedIndex]);

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
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          e.preventDefault();
          const chosen = filteredOptions[highlightedIndex];
          onChangeRef.current(chosen.value);
          setIsOpen(false);
          setCoords(null);
          triggerRef.current?.focus();
        }
      }
    };

    const handleScroll = (e: Event) => {
      // En modo absolute inline (usePortal=false), CSS mantiene el anclaje nativo perfecto
      if (!usePortal) return;
      // Si el scroll ocurre dentro de la lista de opciones del popover, permitirlo sin interferir
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      if (!triggerRef.current) {
        setIsOpen(false);
        setCoords(null);
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      // Cerrar limpiamente solo cuando el campo sale por completo del viewport
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        setCoords(null);
        return;
      }
      // En modo 'document' (position: absolute), el navegador mueve el menú soldado al campo a 120 FPS sin lag.
      // Solo en modo 'fixed' (dentro de un Dialog / contenedor scrollable) sincronizamos estilo directo en DOM.
      if (coords?.mode === 'fixed' && popoverRef.current) {
        const next = calculatePosition(undefined, openUpwardLockedRef.current);
        if (next) {
          popoverRef.current.style.top = `${next.top}px`;
          popoverRef.current.style.left = `${next.left}px`;
        }
      }
    };

    const handleResize = () => {
      const nextCoords = calculatePosition(undefined, openUpwardLockedRef.current);
      if (nextCoords) {
        setCoords(nextCoords);
      } else {
        setIsOpen(false);
        setCoords(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, usePortal, calculatePosition, filteredOptions, highlightedIndex, coords?.mode]);

  // Clases por variante y tamaño
  const isDark = variant === 'dark';
  const isCompact = size === 'sm';

  const triggerClasses = isDark
    ? `bg-slate-900 hover:bg-slate-800 text-white border-slate-700 hover:border-slate-500 focus:ring-blue-500`
    : `bg-slate-50/70 hover:bg-white text-slate-900 border-slate-300 hover:border-blue-400 focus:ring-blue-500`;

  const renderDropdownContent = () => (
    <>
      {/* Buscador integrado si hay muchas opciones */}
      {shouldShowSearch && (
        <div
          className={`px-3 py-2.5 border-b flex items-center gap-2 shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
          }`}
        >
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setHighlightedIndex(0);
            }}
            placeholder={searchPlaceholder}
            className={`w-full bg-transparent text-xs font-semibold focus:outline-none placeholder:text-slate-400 ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}
          />
          {options.length >= 6 && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/70 text-slate-500'
              }`}
            >
              {filteredOptions.length}
            </span>
          )}
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setHighlightedIndex(-1);
                searchInputRef.current?.focus();
              }}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Lista de Opciones */}
      <div
        className={`flex-1 min-h-0 ${
          usePortal ? '' : 'max-h-64'
        } overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar`}
      >
        {filteredOptions.length === 0 ? (
          <div className="py-6 px-3 text-center text-xs text-slate-400 font-medium">
            No se encontraron opciones para «{searchTerm}»
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
                data-eam-idx={idx}
                type="button"
                onClick={() => handleSelect(op.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-semibold border transition-all duration-100 flex items-center justify-between gap-2.5 cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-blue-600/30 text-blue-200 font-bold border-blue-500/40 shadow-xs'
                      : 'bg-blue-50/90 text-blue-900 font-bold border-blue-200/80 shadow-2xs'
                    : isHighlighted
                      ? isDark
                        ? 'bg-slate-800 text-white border-transparent'
                        : 'bg-slate-100/90 text-slate-900 border-transparent'
                      : isDark
                        ? 'text-slate-300 border-transparent hover:bg-slate-800 hover:text-white'
                        : 'text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {op.icon && <span className="shrink-0">{op.icon}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold leading-snug whitespace-normal break-words">
                      {op.label}
                    </div>
                    {op.description && (
                      <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 whitespace-normal break-words">
                        {op.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {op.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wide border ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-slate-100/90 border-slate-200/80 text-slate-600'
                      }`}
                    >
                      {op.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check
                      className={`h-4 w-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                    />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div
      className={`relative inline-block w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        title={title}
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border font-semibold shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 cursor-pointer ${
          isCompact ? 'h-8 px-2.5 text-xs' : 'h-10 px-3 text-xs'
        } ${triggerClasses} ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''} ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {icon && <span className="shrink-0">{icon}</span>}
          {!icon && selectedOption && 'icon' in selectedOption && selectedOption.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          {selectedOption ? (
            <span className="truncate font-bold">{selectedOption.label}</span>
          ) : (
            <span className={isDark ? 'text-slate-400' : 'text-slate-400 font-normal truncate'}>
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              className={`p-0.5 rounded-full hover:bg-slate-200/80 transition-colors cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Limpiar selección"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-500' : isDark ? 'text-slate-400' : 'text-slate-400'
            }`}
          />
        </div>
      </button>

      {/* MODO 1: Inline Absolute (usePortal === false) -> Fijado 100% al contenedor padre sin lag */}
      {!usePortal && isOpen && (
        <div
          ref={popoverRef}
          style={{
            minWidth: minDropdownWidth || 340,
            width: dropdownWidth || undefined,
            maxWidth: 'calc(100vw - 24px)',
          }}
          className={`absolute flex flex-col overflow-hidden ${
            dropUp ? 'bottom-full mb-1.5 z-50' : 'z-50 mt-1.5 top-full'
          } rounded-2xl border ring-1 ring-slate-900/5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right'
              ? dropUp
                ? 'right-0 origin-bottom-right'
                : 'right-0 origin-top-right'
              : dropUp
                ? 'left-0 origin-bottom-left'
                : 'left-0 origin-top-left'
          } ${
            isDark
              ? 'bg-slate-900/98 border-slate-700 text-white divide-slate-800'
              : 'bg-white/98 border-slate-200/90 text-slate-900 divide-slate-100'
          }`}
        >
          {renderDropdownContent()}
        </div>
      )}

      {/* MODO 2: Portal Anclado (usePortal === true) -> Sin recorte por overflow-hidden y sin desligamiento al scroll */}
      {usePortal &&
        mounted &&
        isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: coords.mode === 'document' ? 'absolute' : 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              maxWidth: 'calc(100vw - 24px)',
              transform: coords.openUpward ? 'translateY(-100%)' : undefined,
              zIndex: coords.zIndex,
            }}
            className={`flex flex-col rounded-2xl border ring-1 ring-slate-900/5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.24)] backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
              coords.openUpward ? 'origin-bottom' : 'origin-top'
            } ${
              isDark
                ? 'bg-slate-900/98 border-slate-700 text-white divide-slate-800'
                : 'bg-white/98 border-slate-200/90 text-slate-900 divide-slate-100'
            }`}
          >
            {renderDropdownContent()}
          </div>,
          document.body,
        )}
    </div>
  );
}

const CUSTOM_OPTION_TOKEN = '__EAM_OTRO_CUSTOM__';

/**
 * Extrae de forma segura si un atributo SELECTOR admite valores manuales ("Otro...").
 */
export function permiteValorPersonalizado(
  validacionJson?: Record<string, unknown> | null,
): boolean {
  if (!validacionJson || typeof validacionJson !== 'object') return false;
  return Boolean((validacionJson as { permitir_otro?: unknown }).permitir_otro);
}

export interface EamSelectWithCustomProps extends EamSelectProps {
  allowCustom?: boolean;
  customPlaceholder?: string;
}

/**
 * Selector EAM con soporte opcional de modo híbrido ("Otro (especificar manualmente)...").
 * Si `allowCustom=true`, añade una opción final que habilita un campo de texto libre para
 * placas o escenarios atípicos sin sacrificar la estandarización de la lista principal.
 */
export function EamSelectWithCustom({
  allowCustom = false,
  customPlaceholder = 'Escribe el valor específico...',
  value,
  onChange,
  options: rawOptions,
  ...rest
}: EamSelectWithCustomProps) {
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  const normalized = useMemo(() => normalizeOptions(rawOptions), [rawOptions]);
  const strVal = String(value ?? '').trim();

  const matchesKnownOption = useMemo(() => {
    if (!strVal) return false;
    return normalized.some((op) => String(op.value).trim().toLowerCase() === strVal.toLowerCase());
  }, [normalized, strVal]);

  const isCustomActive = allowCustom && (customInputOpen || (strVal !== '' && !matchesKnownOption));

  const enhancedOptions = useMemo(() => {
    if (!allowCustom) return rawOptions;
    return [
      ...normalized,
      {
        value: CUSTOM_OPTION_TOKEN,
        label: 'Otro (especificar manualmente)...',
        badge: 'Manual',
      },
    ];
  }, [allowCustom, normalized, rawOptions]);

  const handleSelectChange = (selected: string) => {
    if (selected === CUSTOM_OPTION_TOKEN) {
      setCustomInputOpen(true);
      if (matchesKnownOption || !strVal) {
        onChange('');
      }
      setTimeout(() => customInputRef.current?.focus(), 30);
      return;
    }
    setCustomInputOpen(false);
    onChange(selected);
  };

  if (!allowCustom) {
    return <EamSelect value={value} onChange={onChange} options={rawOptions} {...rest} />;
  }

  return (
    <div className="space-y-1.5">
      <EamSelect
        value={isCustomActive ? CUSTOM_OPTION_TOKEN : value}
        onChange={handleSelectChange}
        options={enhancedOptions}
        {...rest}
      />
      {isCustomActive && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <input
            ref={customInputRef}
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={rest.disabled}
            placeholder={customPlaceholder}
            className="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50/40 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-500"
          />
          <span className="px-2 py-1 rounded-lg bg-amber-100/80 text-amber-800 border border-amber-200 text-[10px] font-bold shrink-0">
            Manual
          </span>
        </div>
      )}
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
  usePortal?: boolean;
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
  usePortal = true,
}: EamUomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeNoop, getClientMounted, getServerMounted);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    right: number;
    openUpward: boolean;
  } | null>(null);

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
      if (usePortal) {
        const nextCoords = calculatePosition();
        if (nextCoords) setCoords(nextCoords);
      }
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

    const handleScroll = (e: Event) => {
      // En modo absolute (usePortal=false), CSS mantiene el anclaje nativo perfecto sin desfase
      if (!usePortal) return;
      // Si el scroll ocurre dentro de la lista de opciones del popover, permitirlo
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      // Si el trigger ya no está visible en el viewport, cerrar limpiamente
      if (!triggerRef.current) {
        setIsOpen(false);
        setCoords(null);
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        setCoords(null);
        return;
      }
      // Si sigue en pantalla, recalcular posición en vivo para mantenerlo pegado al botón
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
    };

    const handleResize = () => {
      const nextCoords = calculatePosition();
      if (nextCoords) {
        setCoords(nextCoords);
      } else {
        setIsOpen(false);
        setCoords(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, usePortal, calculatePosition]);

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

  const renderUomDropdownContent = () => (
    <>
      {/* Header del selector de unidades */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 flex items-center gap-2">
        <Scale className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
            Unidad de Medida
          </div>
          <div className="text-[10px] text-blue-700 font-semibold">Conversión en vivo</div>
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
                <span className="text-slate-700 text-xs truncate">{u.nombre || u.codigo}</span>
              </div>

              {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
            </button>
          );
        })}
      </div>
    </>
  );

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

      {/* MODO 1: Inline Absolute (usePortal === false) */}
      {!usePortal && isOpen && (
        <div
          ref={popoverRef}
          style={{ width: 220 }}
          className="absolute z-50 mt-1.5 top-full right-0 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right"
        >
          {renderUomDropdownContent()}
        </div>
      )}

      {/* MODO 2: Portal Flotante (usePortal === true) */}
      {usePortal &&
        mounted &&
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
            {renderUomDropdownContent()}
          </div>,
          document.body,
        )}
    </div>
  );
}
