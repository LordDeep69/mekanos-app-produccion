'use client';

import { cn } from '@/lib/utils';
import type { UnidadMedida } from '@/types/compras.types';
import { Check, ChevronDown, ChevronUp, Cpu, Lock, Plus, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const subscribeNoop = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

interface AnchoredCoords {
  mode: 'document' | 'fixed';
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
  zIndex: number;
}

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let curr = el?.parentElement || null;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const oy = style.overflowY;
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      curr.scrollHeight > curr.clientHeight
    ) {
      return curr;
    }
    curr = curr.parentElement;
  }
  return null;
}

/**
 * Calcula coordenadas ancladas al trigger sin desligamiento en scroll:
 * - En flujo normal de página: `position: absolute` en `document.body` (anclaje nativo GPU 120 FPS,
 *   z-index 19 para deslizarse limpiamente bajo la barra sticky y el Header fijo del portal).
 * - Dentro de un Dialog modal o contenedor scrollable: `position: fixed` (z-index 9999) con sync directo en DOM.
 */
function computeAnchoredCoords(
  triggerEl: HTMLElement,
  minWidth: number,
  lockedOpenUpward?: boolean | null,
): AnchoredCoords {
  const rect = triggerEl.getBoundingClientRect();
  const inDialog = Boolean(triggerEl.closest('[role="dialog"]'));
  const scrollParent = findScrollableAncestor(triggerEl);
  const mode: 'document' | 'fixed' = inDialog || scrollParent ? 'fixed' : 'document';

  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward =
    typeof lockedOpenUpward === 'boolean'
      ? lockedOpenUpward
      : spaceBelow < 280 && rect.top > spaceBelow;

  const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - 16);
  const rawLeft = Math.min(rect.left, Math.max(8, window.innerWidth - width - 8));

  if (mode === 'document') {
    return {
      mode,
      top: openUpward ? rect.top + window.scrollY - 4 : rect.bottom + window.scrollY + 4,
      left: rawLeft + window.scrollX,
      width,
      openUpward,
      zIndex: 19,
    };
  }

  return {
    mode,
    top: openUpward ? rect.top - 4 : rect.bottom + 4,
    left: rawLeft,
    width,
    openUpward,
    zIndex: 9999,
  };
}

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
export function matchesAllTokens(query: string, fields: Array<string | null | undefined>): boolean {
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
  showNormalizedPreview?: boolean;
  onCreateCustom?: (
    rawLabel: string,
    normalizedValue: string,
  ) => void | string | Promise<void | string>;
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
  showNormalizedPreview = false,
  onCreateCustom,
  className,
  minDropdownWidth = 240,
  maxVisibleOptions = 40,
  icon,
}: CpqCreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creatingCustom, setCreatingCustom] = useState(false);
  const mounted = useSyncExternalStore(subscribeNoop, getClientMounted, getServerMounted);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<AnchoredCoords | null>(null);
  const openUpwardLockedRef = useRef<boolean | null>(null);

  const selectedMatch = useMemo(() => {
    const v = String(value || '')
      .trim()
      .toLowerCase();
    if (!v) return null;
    return options.find((o) => o.value.toLowerCase() === v || o.label.toLowerCase() === v) || null;
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
  const normalizedPreview = useMemo(() => {
    if (!trimmedQuery) return '';
    return normalizeCustom ? normalizeCustom(trimmedQuery) : trimmedQuery;
  }, [trimmedQuery, normalizeCustom]);

  const readableCustomLabel = useMemo(() => {
    if (!trimmedQuery) return '';
    if (
      /^[A-Z0-9_]+$/.test(trimmedQuery) &&
      (trimmedQuery.includes('_') || trimmedQuery.length > 4)
    ) {
      return trimmedQuery
        .split('_')
        .filter(Boolean)
        .map((w) => w[0] + w.slice(1).toLowerCase())
        .join(' ');
    }
    return trimmedQuery;
  }, [trimmedQuery]);

  // Comparación anti-duplicados insensible a tildes, mayúsculas, espacios y guiones
  const canonicalMatchKey = (s: string) => normalizeSearchText(s).replace(/[^a-z0-9]+/g, '');

  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return true;
    const queryCanon = canonicalMatchKey(trimmedQuery);
    const normCanon = canonicalMatchKey(normalizedPreview);
    return options.some((o) => {
      const valCanon = canonicalMatchKey(o.value);
      const lblCanon = canonicalMatchKey(o.label);
      return (
        valCanon === queryCanon ||
        lblCanon === queryCanon ||
        (Boolean(normCanon) && (valCanon === normCanon || lblCanon === normCanon))
      );
    });
  }, [options, trimmedQuery, normalizedPreview]);

  const updatePosition = (lockDirection = false) => {
    if (!triggerRef.current) return;
    const next = computeAnchoredCoords(
      triggerRef.current,
      minDropdownWidth,
      lockDirection ? null : openUpwardLockedRef.current,
    );
    if (lockDirection) {
      openUpwardLockedRef.current = next.openUpward;
    }
    setCoords(next);
  };

  useEffect(() => {
    if (!open) {
      openUpwardLockedRef.current = null;
      return;
    }
    updatePosition(true);
    const timer = setTimeout(() => inputRef.current?.focus(), 10);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleScroll = (e: Event) => {
      // Permitir scroll interno en la lista del desplegable sin recalcular ni cerrar
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (!triggerRef.current) {
        setOpen(false);
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      // En modo 'document' (position: absolute), el navegador ancla el menú al flujo del documento sin lag.
      // En modo 'fixed' (modal/contenedor scrollable), actualizar estilo directo en DOM sin re-render.
      if (popoverRef.current && popoverRef.current.style.position === 'fixed') {
        const next = computeAnchoredCoords(
          triggerRef.current,
          minDropdownWidth,
          openUpwardLockedRef.current,
        );
        popoverRef.current.style.top = `${next.top}px`;
        popoverRef.current.style.left = `${next.left}px`;
      }
    };
    const handleResize = () => updatePosition(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectValue = (nextVal: string) => {
    onChange(nextVal);
    setOpen(false);
    setQuery('');
  };

  const handleCreateCustom = async () => {
    if (!trimmedQuery || creatingCustom) return;
    let nextVal = normalizedPreview || trimmedQuery;
    if (!nextVal) return;
    if (onCreateCustom) {
      try {
        setCreatingCustom(true);
        const createdVal = await onCreateCustom(readableCustomLabel || trimmedQuery, nextVal);
        if (typeof createdVal === 'string' && createdVal.trim()) {
          nextVal = createdVal.trim();
        }
      } catch {
        // Error ya notificado por el callback/mutación; no seleccionar valor fallido
        return;
      } finally {
        setCreatingCustom(false);
      }
    }
    selectValue(nextVal);
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
          <span
            className={cn('truncate font-medium', !displayLabel && 'text-slate-400 font-normal')}
          >
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
              position: coords.mode === 'document' ? 'absolute' : 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUpward ? 'translateY(-100%)' : undefined,
              zIndex: coords.zIndex,
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
                        const queryCanon = canonicalMatchKey(trimmedQuery);
                        const exact = filtered.find(
                          (o) =>
                            canonicalMatchKey(o.label) === queryCanon ||
                            canonicalMatchKey(o.value) === queryCanon,
                        );
                        if (exact) {
                          selectValue(exact.value);
                        } else if (allowCustom && !hasExactMatch) {
                          void handleCreateCustom();
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
                      String(value || '')
                        .trim()
                        .toLowerCase() === opt.value.toLowerCase();
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

              {allowCustom && !trimmedQuery && showNormalizedPreview && (
                <div className="px-2.5 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 mt-1">
                  Escribe cualquier nombre arriba para crear un nuevo tipo al instante.
                </div>
              )}

              {allowCustom && trimmedQuery && !hasExactMatch && Boolean(normalizedPreview) && (
                <button
                  type="button"
                  disabled={creatingCustom}
                  onClick={() => void handleCreateCustom()}
                  className="w-full mt-1 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/25 flex items-start gap-2 transition-colors disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {customLabel}: &ldquo;{readableCustomLabel}&rdquo;
                    </span>
                    {showNormalizedPreview && (
                      <span className="block text-[10px] font-mono font-normal text-slate-500 mt-0.5 truncate">
                        Código: {normalizedPreview}
                      </span>
                    )}
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
// 1B. SELECTOR MULTI-EQUIPO CON CHECKBOXES (Todos los equipos + 1 o varios)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CpqEquipoOption {
  id: number;
  codigo: string;
  nombre?: string | null;
  tipo?: string | null;
}

export interface CpqEquiposMultiSelectProps {
  equipos: CpqEquipoOption[];
  /** Lista de IDs asignados a esta línea; [] significa "Todos los equipos" */
  selectedIds: number[];
  onChange: (nextSelectedIds: number[]) => void;
  disabled?: boolean;
  /** Indica si la fila escala automáticamente su cantidad con los equipos elegidos */
  escalable?: boolean;
}

export function CpqEquiposMultiSelect({
  equipos,
  selectedIds,
  onChange,
  disabled = false,
  escalable = true,
}: CpqEquiposMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mounted = useSyncExternalStore(subscribeNoop, getClientMounted, getServerMounted);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<AnchoredCoords | null>(null);
  const openUpwardLockedRef = useRef<boolean | null>(null);

  const isTodos = selectedIds.length === 0;
  const effectiveCount = isTodos ? equipos.length : selectedIds.length;
  const checkedSet = useMemo(
    () => new Set(isTodos ? equipos.map((e) => e.id) : selectedIds),
    [isTodos, equipos, selectedIds],
  );

  const filteredEquipos = useMemo(() => {
    const q = query.trim();
    if (!q) return equipos;
    return equipos.filter((e) => matchesAllTokens(q, [e.codigo, e.nombre, e.tipo]));
  }, [equipos, query]);

  const selectedLabels = useMemo(() => {
    if (isTodos) return equipos.map((e) => e.codigo);
    return equipos.filter((e) => checkedSet.has(e.id)).map((e) => e.codigo);
  }, [isTodos, equipos, checkedSet]);

  const updatePosition = (lockDirection = false) => {
    if (!triggerRef.current) return;
    const next = computeAnchoredCoords(
      triggerRef.current,
      304,
      lockDirection ? null : openUpwardLockedRef.current,
    );
    if (lockDirection) openUpwardLockedRef.current = next.openUpward;
    setCoords(next);
  };

  useEffect(() => {
    if (!open) {
      openUpwardLockedRef.current = null;
      return;
    }
    updatePosition(true);
    const timer = equipos.length > 5 ? setTimeout(() => searchRef.current?.focus(), 10) : undefined;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleScroll = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (!triggerRef.current) {
        setOpen(false);
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      if (popoverRef.current && popoverRef.current.style.position === 'fixed') {
        const next = computeAnchoredCoords(triggerRef.current, 304, openUpwardLockedRef.current);
        popoverRef.current.style.top = `${next.top}px`;
        popoverRef.current.style.left = `${next.left}px`;
      }
    };
    const handleResize = () => updatePosition(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, equipos.length]);

  const handleSelectTodos = () => {
    onChange([]);
  };

  const handleToggleEquipo = (id: number) => {
    if (isTodos) {
      const remaining = equipos.filter((e) => e.id !== id).map((e) => e.id);
      if (remaining.length === 0) return;
      onChange(remaining);
      return;
    }

    if (checkedSet.has(id)) {
      const remaining = selectedIds.filter((x) => x !== id);
      // Nunca dejar 0 equipos seleccionados en una fila activa
      if (remaining.length === 0) return;
      onChange(remaining);
    } else {
      const next = [...selectedIds, id];
      if (next.length >= equipos.length) {
        onChange([]);
      } else {
        onChange(next);
      }
    }
  };

  const handleSelectSolo = (id: number) => {
    onChange([id]);
  };

  const triggerText = isTodos
    ? `Todos (${equipos.length} eq.)`
    : selectedIds.length === 1
      ? selectedLabels[0] || `1 eq.`
      : `${selectedIds.length} de ${equipos.length} eq.`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        title={
          isTodos
            ? `Aplica a todos los equipos (${selectedLabels.join(', ')})`
            : `Equipos seleccionados: ${selectedLabels.join(', ')}`
        }
        className={cn(
          'h-7 px-2.5 rounded-lg text-[11px] font-semibold border inline-flex items-center gap-1.5 transition-all max-w-[195px]',
          isTodos
            ? 'bg-sky-50/80 border-sky-200/90 text-sky-900 hover:bg-sky-100/70 hover:border-sky-300'
            : 'bg-indigo-50/80 border-indigo-200 text-indigo-900 hover:bg-indigo-100/70 hover:border-indigo-300',
          open && 'ring-2 ring-primary/20 border-primary',
          disabled && 'opacity-65 cursor-not-allowed',
        )}
      >
        <Cpu className={cn('h-3 w-3 shrink-0', isTodos ? 'text-sky-600' : 'text-indigo-600')} />
        <span className={cn('truncate', !isTodos && selectedIds.length === 1 && 'font-mono')}>
          {triggerText}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 opacity-70 transition-transform',
            open && 'rotate-180 text-primary opacity-100',
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
              position: coords.mode === 'document' ? 'absolute' : 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUpward ? 'translateY(-100%)' : undefined,
              zIndex: coords.zIndex,
            }}
            className="bg-white border border-slate-200/95 rounded-xl shadow-[0_18px_42px_-10px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          >
            {/* Cabecera */}
            <div className="px-3 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                Equipos cubiertos por esta línea
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                {effectiveCount}/{equipos.length}
              </span>
            </div>

            {/* Opción destacada: Todos los equipos */}
            <div className="p-2 pb-1.5">
              <button
                type="button"
                onClick={handleSelectTodos}
                className={cn(
                  'w-full px-2.5 py-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-all',
                  isTodos
                    ? 'bg-sky-50/90 border-sky-300 text-sky-950 shadow-2xs'
                    : 'bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-sky-50/50 hover:border-sky-200',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      'h-4 w-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors',
                      isTodos
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white border-slate-300',
                    )}
                  >
                    {isTodos && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">
                      Todos los equipos ({equipos.length})
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      {escalable
                        ? `Escala cantidad ×${equipos.length} automáticamente`
                        : 'Aplica al conjunto completo (cantidad fija)'}
                    </div>
                  </div>
                </div>
                {isTodos && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-600 text-white shrink-0">
                    Activo
                  </span>
                )}
              </button>
            </div>

            {/* Separador + Buscador si hay >5 equipos */}
            <div className="px-3 pt-1 pb-1 flex items-center gap-2">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                O elegir uno o varios
              </span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            {equipos.length > 5 && (
              <div className="px-2 pb-1.5">
                <div className="relative">
                  <Search className="h-3 w-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtrar equipo por código o nombre..."
                    className="w-full h-7 pl-7 pr-6 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-primary"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lista con checkboxes */}
            <div className="max-h-56 overflow-y-auto px-2 pb-2 space-y-1">
              {filteredEquipos.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-slate-400">
                  Sin equipos coincidentes
                </p>
              ) : (
                filteredEquipos.map((eq) => {
                  const isChecked = checkedSet.has(eq.id);
                  const isLastSingle = !isTodos && isChecked && selectedIds.length === 1;
                  return (
                    <div
                      key={eq.id}
                      onClick={() => handleToggleEquipo(eq.id)}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleToggleEquipo(eq.id);
                        }
                      }}
                      className={cn(
                        'group px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all select-none',
                        isChecked
                          ? isTodos
                            ? 'bg-white border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/40'
                            : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200/80 text-slate-600',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          title={
                            isLastSingle
                              ? 'Debe quedar al menos 1 equipo seleccionado'
                              : isChecked
                                ? 'Desmarcar equipo'
                                : 'Marcar equipo'
                          }
                          className={cn(
                            'h-4 w-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors',
                            isChecked
                              ? isTodos
                                ? 'bg-sky-500/85 border-sky-500 text-white'
                                : 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-300 group-hover:border-slate-400',
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-[11px] text-slate-900 shrink-0">
                              {eq.codigo}
                            </span>
                            {eq.tipo && (
                              <span className="text-[9.5px] text-slate-400 truncate">
                                · {eq.tipo}
                              </span>
                            )}
                          </div>
                          {eq.nombre && eq.nombre !== eq.codigo && (
                            <div className="text-[10.5px] text-slate-500 truncate leading-tight">
                              {eq.nombre}
                            </div>
                          )}
                        </div>
                      </div>

                      {!(selectedIds.length === 1 && selectedIds[0] === eq.id) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSolo(eq.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-opacity"
                          title={`Asignar solo a ${eq.codigo}`}
                        >
                          Solo
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer resumen */}
            <div className="px-3 py-1.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2 text-[10.5px]">
              <span className="text-slate-500">
                {isTodos
                  ? `Todos los equipos (${equipos.length})`
                  : `${selectedIds.length} de ${equipos.length} seleccionado${selectedIds.length !== 1 ? 's' : ''}`}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-bold text-primary hover:underline"
              >
                Listo
              </button>
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
  {
    value: 'und',
    label: 'und',
    description: 'Unidad',
    badge: 'UND',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'servicio',
    label: 'servicio',
    description: 'Servicio Técnico',
    badge: 'SRV',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'global',
    label: 'global',
    description: 'Suma Global / Paquete',
    badge: 'GLB',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'hr',
    label: 'hr',
    description: 'Hora de Labor / Alquiler',
    badge: 'HR',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'dia',
    label: 'día',
    description: 'Día Operativo',
    badge: 'DIA',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'dia-tecnico',
    label: 'día-técnico',
    description: 'Jornada por Técnico',
    badge: 'D-T',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'gal',
    label: 'gal',
    description: 'Galón (Fluidos / Aceite)',
    badge: 'GAL',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'L',
    label: 'L',
    description: 'Litro',
    badge: 'LT',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'kg',
    label: 'kg',
    description: 'Kilogramo',
    badge: 'KG',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'm',
    label: 'm',
    description: 'Metro Lineal',
    badge: 'M',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'km',
    label: 'km',
    description: 'Kilómetro (Transporte)',
    badge: 'KM',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'kit',
    label: 'kit',
    description: 'Kit / Juego Completo',
    badge: 'KIT',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'par',
    label: 'par',
    description: 'Par',
    badge: 'PAR',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'caja',
    label: 'caja',
    description: 'Caja',
    badge: 'CAJ',
    group: 'Unidades Comerciales Frecuentes',
  },
  {
    value: 'rollo',
    label: 'rollo',
    description: 'Rollo',
    badge: 'ROL',
    group: 'Unidades Comerciales Frecuentes',
  },
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
  {
    value: 'TRANSPORTE',
    label: 'Transporte / Movilización',
    badge: 'TRN',
    group: 'Rubros Frecuentes',
  },
  { value: 'VIATICOS', label: 'Viáticos / Estadía', badge: 'VIA', group: 'Rubros Frecuentes' },
  { value: 'POLIZA', label: 'Póliza / Garantía', badge: 'POL', group: 'Rubros Frecuentes' },
  { value: 'ALQUILER', label: 'Alquiler Equipos / Grúa', badge: 'ALQ', group: 'Rubros Frecuentes' },
  {
    value: 'DISPOSICION_AMBIENTAL',
    label: 'Disposición Ambiental',
    badge: 'AMB',
    group: 'Rubros Frecuentes',
  },
  {
    value: 'SUBCONTRATO',
    label: 'Subcontrato Especializado',
    badge: 'SUB',
    group: 'Rubros Frecuentes',
  },
  { value: 'OTRO', label: 'Otro Rubro', badge: 'OTR', group: 'Rubros Frecuentes' },
];

export const FORMA_PAGO_COMBOBOX_OPTIONS: CpqComboboxOption[] = [
  {
    value: 'CONTADO',
    label: 'Contado',
    description: 'Pago al recibir factura o entrega',
    badge: '0d',
    group: 'Formas de Pago Frecuentes',
  },
  {
    value: 'CREDITO 15 DIAS',
    label: 'Crédito 15 días',
    description: 'Factura a 15 días calendario',
    badge: '15d',
    group: 'Formas de Pago Frecuentes',
  },
  {
    value: 'CREDITO 30 DIAS',
    label: 'Crédito 30 días',
    description: 'Factura a 30 días calendario',
    badge: '30d',
    group: 'Formas de Pago Frecuentes',
  },
  {
    value: 'CREDITO 45 DIAS',
    label: 'Crédito 45 días',
    description: 'Factura a 45 días calendario',
    badge: '45d',
    group: 'Formas de Pago Frecuentes',
  },
  {
    value: 'CREDITO 60 DIAS',
    label: 'Crédito 60 días',
    description: 'Factura a 60 días calendario',
    badge: '60d',
    group: 'Formas de Pago Frecuentes',
  },
  {
    value: '50% ANTICIPO / 50% CONTRA ENTREGA',
    label: '50% Anticipo / 50% Contra Entrega',
    description: 'Anticipo para inicio y saldo al cierre',
    badge: '50/50',
    group: 'Anticipos y Parciales',
  },
  {
    value: '30% ANTICIPO / 70% CONTRA ENTREGA',
    label: '30% Anticipo / 70% Contra Entrega',
    description: 'Anticipo inicial y saldo contra acta',
    badge: '30/70',
    group: 'Anticipos y Parciales',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CONSTRUCTOR ESTRUCTURADO DE ÍTEMS (ALCANCE INCLUIDO / EXCLUSIONES)
//    Serializa y lee desde texto plano separado por `\n` (100% compatible con BD)
// ═══════════════════════════════════════════════════════════════════════════════

const BULLET_PREFIX_RE = /^(?:[-•*–—·✓✔✕✖✗▪▸►]+|\d+[.)])\s+/;

export function cleanCpqBulletLine(raw: string): string {
  let text = String(raw || '').trim();
  // Retira viñetas o guiones repetidos al inicio (ej. "• - Texto")
  while (BULLET_PREFIX_RE.test(text)) {
    text = text.replace(BULLET_PREFIX_RE, '').trim();
  }
  return text;
}

export function parseCpqBulletLines(value?: string | null): string[] {
  if (!value) return [];
  return String(value).split(/\r?\n/).map(cleanCpqBulletLine).filter(Boolean);
}

export interface CpqBulletListEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  variant: 'incluido' | 'exclusion';
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function CpqBulletListEditor({
  value,
  onChange,
  variant,
  placeholder,
  emptyMessage,
  disabled = false,
  className,
}: CpqBulletListEditorProps) {
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const items = useMemo(() => parseCpqBulletLines(value), [value]);

  const commitItems = (nextItems: string[]) => {
    const cleaned = nextItems.map(cleanCpqBulletLine).filter(Boolean);
    onChange(cleaned.join('\n'));
  };

  const handleAddDraft = () => {
    if (disabled) return;
    const lines = parseCpqBulletLines(draft);
    if (lines.length === 0) return;
    commitItems([...items, ...lines]);
    setDraft('');
  };

  const handlePasteDraft = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const pasted = e.clipboardData?.getData('text') || '';
    if (!/[\r\n]/.test(pasted)) return;
    const lines = parseCpqBulletLines(pasted);
    if (lines.length === 0) return;
    e.preventDefault();
    const combined = [...items];
    const currentPrefix = cleanCpqBulletLine(draft);
    if (currentPrefix) combined.push(currentPrefix);
    combined.push(...lines);
    commitItems(combined);
    setDraft('');
  };

  const handleRemove = (idx: number) => {
    if (disabled) return;
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditingText('');
    }
    commitItems(items.filter((_, i) => i !== idx));
  };

  const handleMove = (idx: number, direction: -1 | 1) => {
    if (disabled) return;
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    if (editingIndex === idx) setEditingIndex(target);
    else if (editingIndex === target) setEditingIndex(idx);
    commitItems(next);
  };

  const startEditing = (idx: number) => {
    if (disabled) return;
    setEditingIndex(idx);
    setEditingText(items[idx] ?? '');
  };

  const commitEditing = () => {
    if (editingIndex === null) return;
    const cleaned = cleanCpqBulletLine(editingText);
    const next = [...items];
    if (!cleaned) {
      next.splice(editingIndex, 1);
    } else {
      next[editingIndex] = cleaned;
    }
    setEditingIndex(null);
    setEditingText('');
    commitItems(next);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const isIncluido = variant === 'incluido';

  return (
    <div
      className={cn(
        'rounded-lg border bg-white overflow-hidden transition-colors',
        isIncluido ? 'border-emerald-200/90' : 'border-rose-200/90',
        disabled && 'opacity-75 bg-slate-50/70',
        className,
      )}
    >
      {/* Input rápido superior */}
      {!disabled && (
        <div
          className={cn(
            'flex items-center gap-1.5 p-2 border-b',
            isIncluido ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100',
          )}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={handlePasteDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDraft();
              }
            }}
            placeholder={
              placeholder ||
              (isIncluido
                ? 'Escribe un ítem incluido y presiona Enter (o pega varias líneas)...'
                : 'Escribe una exclusión y presiona Enter (o pega varias líneas)...')
            }
            className="flex-1 min-w-0 h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={handleAddDraft}
            disabled={!cleanCpqBulletLine(draft)}
            className={cn(
              'h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed',
              isIncluido
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-rose-600 text-white hover:bg-rose-700',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        </div>
      )}

      {/* Lista de ítems */}
      <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic text-center py-3 px-2">
            {emptyMessage ||
              (isIncluido
                ? 'Sin ítems de alcance definidos aún.'
                : 'Sin exclusiones registradas aún.')}
          </p>
        ) : (
          items.map((item, idx) => {
            const isEditing = editingIndex === idx;
            return (
              <div
                key={`${idx}-${item.slice(0, 24)}`}
                className={cn(
                  'group flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors',
                  isIncluido
                    ? 'bg-emerald-50/30 border-emerald-100/90 hover:bg-emerald-50/60'
                    : 'bg-rose-50/30 border-rose-100/90 hover:bg-rose-50/60',
                )}
              >
                <span
                  className={cn(
                    'h-4 w-4 rounded-full flex items-center justify-center shrink-0',
                    isIncluido ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                  )}
                  aria-hidden="true"
                >
                  {isIncluido ? (
                    <Check className="h-2.5 w-2.5 stroke-[2.75]" />
                  ) : (
                    <X className="h-2.5 w-2.5 stroke-[2.75]" />
                  )}
                </span>

                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={commitEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitEditing();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEditing();
                      }
                    }}
                    className="flex-1 min-w-0 h-6 px-2 text-xs bg-white border border-primary/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => startEditing(idx)}
                    title={disabled ? undefined : 'Clic para editar este ítem'}
                    className={cn(
                      'flex-1 min-w-0 text-left text-slate-800 leading-snug break-words',
                      !disabled && 'cursor-text hover:text-slate-950',
                    )}
                  >
                    {item}
                  </button>
                )}

                {!disabled && !isEditing && (
                  <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, -1)}
                      title="Subir"
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMove(idx, 1)}
                      title="Bajar"
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      title="Eliminar ítem"
                      className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pie informativo con conteo */}
      <div className="px-2.5 py-1 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span>
          {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </span>
        {!disabled && (
          <span className="text-slate-400">Clic para editar · Pegar multilínea admitido</span>
        )}
      </div>
    </div>
  );
}
