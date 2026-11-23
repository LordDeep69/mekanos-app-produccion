'use client';

import { cn } from '@/lib/utils';
import type { UnidadMedida } from '@/types/compras.types';
import { Check, ChevronDown, Lock, Plus, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const subscribeNoop = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

/**
 * Normaliza texto para búsqueda insensible a mayúsculas y tildes/diacríticos.
 */
export function normalizeSearchText(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Coincidencia tokenizada multi-palabra (AND entre tokens, OR entre campos, sin tildes ni orden rígido).
 */
export function matchesAllTokens(
  query: string,
  fields: Array<string | null | undefined>,
): boolean {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const normalizedFields = fields.map((f) => normalizeSearchText(f)).filter(Boolean);
  if (normalizedFields.length === 0) return false;
  return tokens.every((tok) => normalizedFields.some((nf) => nf.includes(tok)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. COMBOBOX PRÉMIUM BUSCABLE Y CREABLE (Reemplaza todos los <datalist> nativos)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CpqComboboxOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  group?: string;
}

export interface CpqCreatableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: CpqComboboxOption[];
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  size?: 'xs' | 'sm' | 'md';
  allowCustom?: boolean;
  customLabel?: string;
  normalizeCustom?: (raw: string) => string;
  className?: string;
  minDropdownWidth?: number;
  maxVisibleOptions?: number;
  icon?: React.ReactNode;
}

export function CpqCreatableCombobox({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar o escribir personalizado...',
  size = 'md',
  allowCustom = true,
  customLabel = 'Usar personalizado',
  normalizeCustom,
  className,
  minDropdownWidth = 240,
  maxVisibleOptions = 40,
  icon,
}: CpqCreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mounted = useSyncExternalStore(subscribeNoop, getClientMounted, getServerMounted);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const selectedMatch = useMemo(() => {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return null;
    return (
      options.find(
        (o) => o.value.toLowerCase() === v || o.label.toLowerCase() === v,
      ) || null
    );
  }, [options, value]);

  const displayLabel = useMemo(() => {
    if (selectedMatch) return selectedMatch.label;
    const raw = String(value || '').trim();
    if (!raw) return '';
    // Mostrar valores snake_case personalizados de forma legible
    if (/^[A-Z0-9_]+$/.test(raw) && raw.includes('_')) {
      return raw
        .split('_')
        .map((w) => (w ? w[0] + w.slice(1).toLowerCase() : ''))
        .join(' ');
    }
    return raw;
  }, [selectedMatch, value]);

  const filtered = useMemo(() => {
    const list = query.trim()
      ? options.filter((o) => matchesAllTokens(query, [o.label, o.value, o.description, o.badge]))
      : options;
    return list.slice(0, maxVisibleOptions);
  }, [options, query, maxVisibleOptions]);

  const grouped = useMemo(() => {
    const map = new Map<string, CpqComboboxOption[]>();
    for (const opt of filtered) {
      const g = opt.group || '';
      const arr = map.get(g) || [];
      arr.push(opt);
      map.set(g, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const trimmedQuery = query.trim();
  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return true;
    const lower = trimmedQuery.toLowerCase();
    return options.some(
      (o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower,
    );
  }, [options, trimmedQuery]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 260 && rect.top > spaceBelow;
    const width = Math.max(rect.width, minDropdownWidth);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - width - 8));
    setCoords({
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left,
      width,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const timer = setTimeout(() => inputRef.current?.focus(), 10);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleScrollOrResize = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectValue = (nextVal: string) => {
    onChange(nextVal);
    setOpen(false);
    setQuery('');
  };

  const sizeClasses =
    size === 'xs'
      ? 'h-7 px-2 text-[11px] rounded-md'
      : size === 'sm'
        ? 'h-8 px-2.5 text-xs rounded-md'
        : 'h-9 px-3 text-xs rounded-lg';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full inline-flex items-center justify-between gap-1.5 border bg-white text-left transition-all',
          open
            ? 'border-primary ring-2 ring-primary/15'
            : 'border-slate-200 hover:border-slate-300',
          disabled && 'bg-slate-50 text-slate-500 cursor-not-allowed opacity-80',
          sizeClasses,
          className,
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          <span className={cn('truncate font-medium', !displayLabel && 'text-slate-400 font-normal')}>
            {displayLabel || placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform',
            open && 'rotate-180 text-primary',
          )}
        />
      </button>

      {open &&
        mounted &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filtered.length > 0 && !allowCustom) {
                        selectValue(filtered[0].value);
                      } else if (trimmedQuery) {
                        const exact = filtered.find(
                          (o) =>
                            o.label.toLowerCase() === trimmedQuery.toLowerCase() ||
                            o.value.toLowerCase() === trimmedQuery.toLowerCase(),
                        );
                        if (exact) {
                          selectValue(exact.value);
                        } else if (allowCustom) {
                          selectValue(
                            normalizeCustom ? normalizeCustom(trimmedQuery) : trimmedQuery,
                          );
                        }
                      }
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {grouped.map(([groupName, items]) => (
                <div key={groupName || 'default'}>
                  {groupName && (
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {groupName}
                    </div>
                  )}
                  {items.map((opt) => {
                    const isActive =
                      String(value || '').trim().toLowerCase() === opt.value.toLowerCase();
                    return (
                      <button
                        key={`${groupName}-${opt.value}`}
                        type="button"
                        onClick={() => selectValue(opt.value)}
                        className={cn(
                          'w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-slate-700 hover:bg-slate-100/80',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[10px] text-slate-400 truncate font-normal">
                              {opt.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {opt.badge}
                            </span>
                          )}
                          {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {filtered.length === 0 && !allowCustom && (
                <p className="py-4 text-center text-xs text-slate-400">Sin resultados</p>
              )}

              {allowCustom && trimmedQuery && !hasExactMatch && (
                <button
                  type="button"
                  onClick={() =>
                    selectValue(normalizeCustom ? normalizeCustom(trimmedQuery) : trimmedQuery)
                  }
                  className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {customLabel}: &ldquo;{trimmedQuery}&rdquo;
                  </span>
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. INPUT NUMÉRICO INTELIGENTE (Auto-selecciona / limpia el "0" al enfocar)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CpqSmartNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  decimals?: number;
  disabled?: boolean;
  placeholder?: string;
  suffix?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  title?: string;
}

export function CpqSmartNumberInput({
  value,
  onChange,
  min = 0,
  max,
  decimals = 2,
  disabled = false,
  placeholder = '0',
  suffix,
  align = 'right',
  className,
  title,
}: CpqSmartNumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState('');

  const displayVal = Number.isFinite(value) ? String(value) : '0';

  const parseNum = (txt: string): number => {
    const normalized = txt.replace(',', '.').replace(/[^\d.]/g, '');
    if (!normalized) return 0;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return 0;
    let clamped = Math.max(min, parsed);
    if (max !== undefined) clamped = Math.min(max, clamped);
    if (decimals === 0) return Math.round(clamped);
    const factor = 10 ** decimals;
    return Math.round(clamped * factor) / factor;
  };

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        disabled={disabled}
        title={title}
        value={focused ? rawText : displayVal}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true);
          if (value === 0) {
            setRawText('');
          } else {
            setRawText(String(value));
            requestAnimationFrame(() => e.target.select());
          }
        }}
        onChange={(e) => {
          const next = e.target.value;
          setRawText(next);
          if (next.trim() === '') {
            onChange(min > 0 ? 0 : 0);
          } else {
            onChange(parseNum(next));
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (rawText.trim() === '') {
            onChange(min > 0 ? min : 0);
          } else {
            onChange(parseNum(rawText));
          }
        }}
        className={cn(
          'w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-mono transition-colors',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
          'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
          align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right',
          suffix && 'pr-5',
          className,
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 text-[10px] font-medium text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. INPUT MONETARIO INTELIGENTE (Miles formateados + limpia/selecciona al enfocar)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CpqMoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  locale?: string;
  symbol?: string;
  decimals?: number;
  disabled?: boolean;
  locked?: boolean;
  tone?: 'default' | 'cost';
  title?: string;
  className?: string;
}

export function CpqMoneyInput({
  value,
  onChange,
  locale = 'es-CO',
  symbol = '$',
  decimals = 0,
  disabled = false,
  locked = false,
  tone = 'default',
  title,
  className,
}: CpqMoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState('');

  const safeDecimals = Math.max(0, Math.min(4, Number(decimals) || 0));
  const formatted = new Intl.NumberFormat(locale || 'es-CO', {
    minimumFractionDigits: safeDecimals,
    maximumFractionDigits: safeDecimals,
  }).format(Number.isFinite(value) ? value : 0);

  const parseMoney = (txt: string): number => {
    const cleaned = txt.replace(/[^\d.,]/g, '');
    if (!cleaned) return 0;
    if (safeDecimals === 0) {
      const digits = cleaned.replace(/[.,]/g, '');
      return Math.max(0, Number(digits) || 0);
    }
    const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
    if (lastSep === -1) return Math.max(0, Number(cleaned) || 0);
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
    const decPart = cleaned.slice(lastSep + 1).replace(/[.,]/g, '');
    const parsed = Number(`${intPart || '0'}.${decPart}`);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  return (
    <div className="relative flex items-center">
      {locked || tone === 'cost' ? (
        <Lock
          className={cn(
            'h-3 w-3 absolute left-2 pointer-events-none',
            tone === 'cost' ? 'text-amber-500/80' : 'text-slate-400',
          )}
        />
      ) : (
        <span className="pointer-events-none absolute left-2 text-[11px] font-mono text-slate-400">
          {symbol || '$'}
        </span>
      )}
      <input
        type="text"
        inputMode={safeDecimals > 0 ? 'decimal' : 'numeric'}
        disabled={disabled || locked}
        title={title}
        value={focused ? rawText : formatted}
        placeholder="0"
        onFocus={(e) => {
          setFocused(true);
          if (value === 0) {
            setRawText('');
          } else {
            setRawText(String(value));
            requestAnimationFrame(() => e.target.select());
          }
        }}
        onChange={(e) => {
          const next = e.target.value;
          setRawText(next);
          onChange(parseMoney(next));
        }}
        onBlur={() => {
          setFocused(false);
        }}
        className={cn(
          'w-full h-8 rounded-md border pl-6 pr-2 text-xs font-mono text-right transition-colors',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
          tone === 'cost'
            ? 'bg-amber-50/50 border-amber-200/80 text-slate-800'
            : 'bg-white border-slate-200 text-slate-900',
          (disabled || locked) && 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed',
          className,
        )}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CATÁLOGO CURADO DE UNIDADES COMERCIALES + UNIDADES MAESTRAS DE BD
// ═══════════════════════════════════════════════════════════════════════════════

const UNIDADES_COMERCIALES_CURADAS: CpqComboboxOption[] = [
  { value: 'und', label: 'und', description: 'Unidad', badge: 'UND', group: 'Unidades Comerciales Frecuentes' },
  { value: 'servicio', label: 'servicio', description: 'Servicio Técnico', badge: 'SRV', group: 'Unidades Comerciales Frecuentes' },
  { value: 'global', label: 'global', description: 'Suma Global / Paquete', badge: 'GLB', group: 'Unidades Comerciales Frecuentes' },
  { value: 'hr', label: 'hr', description: 'Hora de Labor / Alquiler', badge: 'HR', group: 'Unidades Comerciales Frecuentes' },
  { value: 'dia', label: 'día', description: 'Día Operativo', badge: 'DIA', group: 'Unidades Comerciales Frecuentes' },
  { value: 'dia-tecnico', label: 'día-técnico', description: 'Jornada por Técnico', badge: 'D-T', group: 'Unidades Comerciales Frecuentes' },
  { value: 'gal', label: 'gal', description: 'Galón (Fluidos / Aceite)', badge: 'GAL', group: 'Unidades Comerciales Frecuentes' },
  { value: 'L', label: 'L', description: 'Litro', badge: 'LT', group: 'Unidades Comerciales Frecuentes' },
  { value: 'kg', label: 'kg', description: 'Kilogramo', badge: 'KG', group: 'Unidades Comerciales Frecuentes' },
  { value: 'm', label: 'm', description: 'Metro Lineal', badge: 'M', group: 'Unidades Comerciales Frecuentes' },
  { value: 'km', label: 'km', description: 'Kilómetro (Transporte)', badge: 'KM', group: 'Unidades Comerciales Frecuentes' },
  { value: 'kit', label: 'kit', description: 'Kit / Juego Completo', badge: 'KIT', group: 'Unidades Comerciales Frecuentes' },
  { value: 'par', label: 'par', description: 'Par', badge: 'PAR', group: 'Unidades Comerciales Frecuentes' },
  { value: 'caja', label: 'caja', description: 'Caja', badge: 'CAJ', group: 'Unidades Comerciales Frecuentes' },
  { value: 'rollo', label: 'rollo', description: 'Rollo', badge: 'ROL', group: 'Unidades Comerciales Frecuentes' },
];

export function buildUnidadOptions(unidadesBd: UnidadMedida[]): CpqComboboxOption[] {
  const seen = new Set(UNIDADES_COMERCIALES_CURADAS.map((u) => u.value.toLowerCase()));
  const extra: CpqComboboxOption[] = [];

  for (const u of unidadesBd) {
    const val = (u.simbolo || u.codigo || '').trim();
    if (!val || seen.has(val.toLowerCase())) continue;
    // Priorizar magnitudes comerciales (CANTIDAD, VOLUMEN, LONGITUD, MASA, CONJUNTO) antes de físicas
    const mag = String(u.tipo_magnitud || '').toUpperCase();
    const isCommercial = ['CANTIDAD', 'VOLUMEN', 'LONGITUD', 'MASA', 'CONJUNTO'].includes(mag);
    if (!isCommercial) continue;
    seen.add(val.toLowerCase());
    extra.push({
      value: val,
      label: val,
      description: u.nombre,
      badge: u.codigo,
      group: 'Catálogo de Unidades (BD)',
    });
  }

  return [...UNIDADES_COMERCIALES_CURADAS, ...extra];
}

export const TIPO_OFERTA_COMBOBOX_OPTIONS: CpqComboboxOption[] = [
  {
    value: 'SERVICIO_TECNICO',
    label: 'Servicio Técnico',
    description: 'Mano de obra, visitas y soporte especializado',
    badge: 'SRV',
    group: 'Tipos de Oferta Estándar',
  },
  {
    value: 'SUMINISTRO_INSTALACION',
    label: 'Suministro e Instalación',
    description: 'Equipos, baterías o repuestos con montaje incluido',
    badge: 'S+I',
    group: 'Tipos de Oferta Estándar',
  },
  {
    value: 'SUMINISTRO',
    label: 'Suministro de Repuestos',
    description: 'Venta directa de repuestos, consumibles e insumos',
    badge: 'SUM',
    group: 'Tipos de Oferta Estándar',
  },
  {
    value: 'PREVENTIVO',
    label: 'Mantenimiento Preventivo',
    description: 'Rutinas programadas por horas o calendario',
    badge: 'PM',
    group: 'Tipos de Oferta Estándar',
  },
  {
    value: 'CORRECTIVO',
    label: 'Mantenimiento Correctivo',
    description: 'Reparación de fallas y hallazgos técnicos',
    badge: 'CM',
    group: 'Tipos de Oferta Estándar',
  },
  {
    value: 'PROYECTO',
    label: 'Proyecto / Ingeniería',
    description: 'Obra, adecuaciones, overhaul mayor o AIU',
    badge: 'PRY',
    group: 'Tipos de Oferta Estándar',
  },
  {
    value: 'CONTRATO',
    label: 'Propuesta Contractual',
    description: 'Póliza anual o plan recurrente de mantenimiento',
    badge: 'CNT',
    group: 'Tipos de Oferta Estándar',
  },
  {
    value: 'DIAGNOSTICO',
    label: 'Diagnóstico Técnico',
    description: 'Inspección, pruebas de carga o peritaje',
    badge: 'DGN',
    group: 'Tipos de Oferta Estándar',
  },
];

export const RUBRO_OTRO_COMBOBOX_OPTIONS: CpqComboboxOption[] = [
  { value: 'TRANSPORTE', label: 'Transporte / Movilización', badge: 'TRN', group: 'Rubros Frecuentes' },
  { value: 'VIATICOS', label: 'Viáticos / Estadía', badge: 'VIA', group: 'Rubros Frecuentes' },
  { value: 'POLIZA', label: 'Póliza / Garantía', badge: 'POL', group: 'Rubros Frecuentes' },
  { value: 'ALQUILER', label: 'Alquiler Equipos / Grúa', badge: 'ALQ', group: 'Rubros Frecuentes' },
  { value: 'DISPOSICION_AMBIENTAL', label: 'Disposición Ambiental', badge: 'AMB', group: 'Rubros Frecuentes' },
  { value: 'SUBCONTRATO', label: 'Subcontrato Especializado', badge: 'SUB', group: 'Rubros Frecuentes' },
  { value: 'OTRO', label: 'Otro Rubro', badge: 'OTR', group: 'Rubros Frecuentes' },
];

export const FORMA_PAGO_COMBOBOX_OPTIONS: CpqComboboxOption[] = [
  { value: 'CONTADO', label: 'Contado', description: 'Pago al recibir factura o entrega', badge: '0d', group: 'Formas de Pago Frecuentes' },
  { value: 'CREDITO 15 DIAS', label: 'Crédito 15 días', description: 'Factura a 15 días calendario', badge: '15d', group: 'Formas de Pago Frecuentes' },
  { value: 'CREDITO 30 DIAS', label: 'Crédito 30 días', description: 'Factura a 30 días calendario', badge: '30d', group: 'Formas de Pago Frecuentes' },
  { value: 'CREDITO 45 DIAS', label: 'Crédito 45 días', description: 'Factura a 45 días calendario', badge: '45d', group: 'Formas de Pago Frecuentes' },
  { value: 'CREDITO 60 DIAS', label: 'Crédito 60 días', description: 'Factura a 60 días calendario', badge: '60d', group: 'Formas de Pago Frecuentes' },
  { value: '50% ANTICIPO / 50% CONTRA ENTREGA', label: '50% Anticipo / 50% Contra Entrega', description: 'Anticipo para inicio y saldo al cierre', badge: '50/50', group: 'Anticipos y Parciales' },
  { value: '30% ANTICIPO / 70% CONTRA ENTREGA', label: '30% Anticipo / 70% Contra Entrega', description: 'Anticipo inicial y saldo contra acta', badge: '30/70', group: 'Anticipos y Parciales' },
];
