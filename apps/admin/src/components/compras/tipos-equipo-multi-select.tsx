'use client';

import {
  ArquetipoEquipo,
  getArquetiposEam,
} from '@/features/catalogos-eam/api/catalogos-eam.service';
import { resolveEquipoLucideIcon } from '@/lib/equipo-icon';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp, Globe2, Layers, Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface TiposEquipoMultiSelectProps {
  aplicaTodos: boolean;
  selectedIds: number[];
  onChange: (next: { aplicaTodos: boolean; selectedIds: number[] }) => void;
  enableModulos?: boolean;
  selectedModuloIds?: number[];
  onModulosChange?: (nextModuloIds: number[]) => void;
  disabled?: boolean;
  placeholderUniversal?: string;
  compact?: boolean;
  className?: string;
}

interface ModuloDisponible {
  id_modulo: number;
  codigo_modulo: string;
  nombre_modulo: string;
  color_ui?: string | null;
  equiposIds: number[];
  equiposCodigos: string[];
}

interface GrupoModulosEquipo {
  key: string;
  titulo: string;
  codigo?: string;
  iconoUi?: string | null;
  colorHex?: string | null;
  esCompartido?: boolean;
  modulos: ModuloDisponible[];
}

export function TiposEquipoMultiSelect({
  aplicaTodos,
  selectedIds,
  onChange,
  enableModulos = false,
  selectedModuloIds = [],
  onModulosChange,
  disabled = false,
  placeholderUniversal = 'Todos los tipos de equipo (Universal)',
  compact = false,
  className,
}: TiposEquipoMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modulosOpen, setModulosOpen] = useState(false);
  const [modulosSearch, setModulosSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tiposEquipo, setTiposEquipo] = useState<ArquetipoEquipo[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const modulosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getArquetiposEam()
      .then((list) => {
        if (!active) return;
        const activos = (Array.isArray(list) ? list : [])
          .filter((a) => a.activo !== false)
          .sort((a, b) => a.nombre_tipo.localeCompare(b.nombre_tipo, 'es'));
        setTiposEquipo(activos);
      })
      .catch((err) => {
        console.error('Error cargando tipos de equipo EAM:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (!modulosOpen) return;
    function handleOutside(e: MouseEvent) {
      if (modulosRef.current && !modulosRef.current.contains(e.target as Node)) {
        setModulosOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [modulosOpen]);

  const effectiveIds = useMemo(
    () => (aplicaTodos ? [] : Array.from(new Set(selectedIds.filter((n) => n > 0)))),
    [aplicaTodos, selectedIds],
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tiposEquipo;
    return tiposEquipo.filter(
      (t) =>
        t.nombre_tipo.toLowerCase().includes(q) ||
        t.codigo_tipo.toLowerCase().includes(q) ||
        (t.categoria || '').toLowerCase().includes(q),
    );
  }, [tiposEquipo, search]);

  const selectedItems = useMemo(
    () => tiposEquipo.filter((t) => effectiveIds.includes(t.id_tipo_equipo)),
    [tiposEquipo, effectiveIds],
  );

  // Unión deduplicada de partes/subsistemas (modulos_tecnicos) vinculados a los tipos de equipo seleccionados
  const modulosDisponibles = useMemo<ModuloDisponible[]>(() => {
    if (!enableModulos || aplicaTodos || selectedItems.length === 0) return [];
    const map = new Map<number, ModuloDisponible>();
    for (const te of selectedItems) {
      const links = Array.isArray(te.tipo_equipo_modulos) ? te.tipo_equipo_modulos : [];
      for (const link of links) {
        const mod = link?.modulo;
        if (!mod || mod.activo === false) continue;
        const existing = map.get(mod.id_modulo);
        if (existing) {
          if (!existing.equiposIds.includes(te.id_tipo_equipo)) {
            existing.equiposIds.push(te.id_tipo_equipo);
          }
          if (!existing.equiposCodigos.includes(te.codigo_tipo)) {
            existing.equiposCodigos.push(te.codigo_tipo);
          }
        } else {
          map.set(mod.id_modulo, {
            id_modulo: mod.id_modulo,
            codigo_modulo: mod.codigo_modulo,
            nombre_modulo: link.etiqueta_local?.trim() || mod.nombre_modulo,
            color_ui: mod.color_ui ?? null,
            equiposIds: [te.id_tipo_equipo],
            equiposCodigos: [te.codigo_tipo],
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre_modulo.localeCompare(b.nombre_modulo, 'es'),
    );
  }, [enableModulos, aplicaTodos, selectedItems]);

  const modulosFiltrados = useMemo(() => {
    const q = modulosSearch.trim().toLowerCase();
    if (!q) return modulosDisponibles;
    return modulosDisponibles.filter(
      (m) =>
        m.nombre_modulo.toLowerCase().includes(q) ||
        m.codigo_modulo.toLowerCase().includes(q) ||
        m.equiposCodigos.some((c) => c.toLowerCase().includes(q)),
    );
  }, [modulosDisponibles, modulosSearch]);

  // Agrupación sutil por tipo de equipo cuando hay 2+ tipos seleccionados (sin duplicar subsistemas compartidos)
  const gruposModulos = useMemo<GrupoModulosEquipo[]>(() => {
    if (selectedItems.length <= 1) {
      return modulosFiltrados.length > 0
        ? [
            {
              key: 'single',
              titulo: selectedItems[0]?.nombre_tipo || '',
              codigo: selectedItems[0]?.codigo_tipo,
              iconoUi: selectedItems[0]?.icono_ui,
              colorHex: selectedItems[0]?.color_hex,
              modulos: modulosFiltrados,
            },
          ]
        : [];
    }

    const grupos: GrupoModulosEquipo[] = [];
    const compartidos = modulosFiltrados.filter((m) => m.equiposIds.length > 1);
    if (compartidos.length > 0) {
      grupos.push({
        key: 'shared',
        titulo: 'Subsistemas compartidos',
        esCompartido: true,
        modulos: compartidos,
      });
    }

    for (const te of selectedItems) {
      const propios = modulosFiltrados.filter(
        (m) => m.equiposIds.length === 1 && m.equiposIds[0] === te.id_tipo_equipo,
      );
      if (propios.length > 0) {
        grupos.push({
          key: `tipo-${te.id_tipo_equipo}`,
          titulo: te.nombre_tipo,
          codigo: te.codigo_tipo,
          iconoUi: te.icono_ui,
          colorHex: te.color_hex,
          modulos: propios,
        });
      }
    }

    return grupos;
  }, [selectedItems, modulosFiltrados]);

  const effectiveModuloIds = useMemo(() => {
    if (!enableModulos || aplicaTodos) return [];
    const validSet = new Set(modulosDisponibles.map((m) => m.id_modulo));
    return Array.from(new Set(selectedModuloIds.filter((id) => validSet.has(id))));
  }, [enableModulos, aplicaTodos, modulosDisponibles, selectedModuloIds]);

  const selectedModulosItems = useMemo(
    () => modulosDisponibles.filter((m) => effectiveModuloIds.includes(m.id_modulo)),
    [modulosDisponibles, effectiveModuloIds],
  );

  const allIds = useMemo(() => tiposEquipo.map((t) => t.id_tipo_equipo), [tiposEquipo]);
  const allExplicitSelected =
    !aplicaTodos && allIds.length > 0 && effectiveIds.length === allIds.length;

  const pruneModulosForTipos = (nextTipoIds: number[]) => {
    if (!enableModulos || !onModulosChange) return;
    if (nextTipoIds.length === 0) {
      onModulosChange([]);
      return;
    }
    const allowedMods = new Set<number>();
    for (const te of tiposEquipo) {
      if (!nextTipoIds.includes(te.id_tipo_equipo)) continue;
      for (const link of te.tipo_equipo_modulos || []) {
        if (link?.modulo?.id_modulo) allowedMods.add(link.modulo.id_modulo);
      }
    }
    const pruned = selectedModuloIds.filter((id) => allowedMods.has(id));
    if (pruned.length !== selectedModuloIds.length) {
      onModulosChange(pruned);
    }
  };

  const selectUniversal = () => {
    onChange({ aplicaTodos: true, selectedIds: [] });
    if (enableModulos && onModulosChange && selectedModuloIds.length > 0) {
      onModulosChange([]);
    }
    setModulosOpen(false);
  };

  const toggleTipo = (idTipoEquipo: number) => {
    if (aplicaTodos) {
      onChange({ aplicaTodos: false, selectedIds: [idTipoEquipo] });
      pruneModulosForTipos([idTipoEquipo]);
      return;
    }
    const exists = effectiveIds.includes(idTipoEquipo);
    const nextIds = exists
      ? effectiveIds.filter((id) => id !== idTipoEquipo)
      : [...effectiveIds, idTipoEquipo];

    if (nextIds.length === 0) {
      selectUniversal();
    } else {
      onChange({ aplicaTodos: false, selectedIds: nextIds });
      pruneModulosForTipos(nextIds);
    }
  };

  const toggleSelectAll = () => {
    if (allExplicitSelected) {
      selectUniversal();
    } else {
      onChange({ aplicaTodos: false, selectedIds: allIds });
      pruneModulosForTipos(allIds);
    }
  };

  const toggleModulo = (idModulo: number) => {
    if (!onModulosChange) return;
    const exists = effectiveModuloIds.includes(idModulo);
    const next = exists
      ? effectiveModuloIds.filter((id) => id !== idModulo)
      : [...effectiveModuloIds, idModulo];
    onModulosChange(next);
  };

  const allModulosSelected =
    modulosDisponibles.length > 0 && effectiveModuloIds.length === modulosDisponibles.length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* 1. SELECTOR MULTI-CHECK DE TIPOS DE EQUIPO */}
      <div ref={containerRef} className="space-y-2.5">
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              'w-full flex items-center justify-between gap-2 bg-white border transition-all text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
              compact
                ? 'px-3 py-1.5 text-xs font-semibold rounded-full'
                : 'px-3.5 py-2.5 text-xs font-semibold rounded-xl shadow-2xs',
              open || !aplicaTodos
                ? 'border-slate-400 text-slate-900'
                : 'border-slate-200 text-slate-700 hover:border-slate-300',
            )}
            style={
              open || !aplicaTodos
                ? {
                    borderColor: 'var(--org-primary, #1E40AF)',
                    boxShadow:
                      '0 0 0 2px color-mix(in srgb, var(--org-primary, #1E40AF) 16%, transparent)',
                  }
                : undefined
            }
          >
            <span className="flex items-center gap-2 min-w-0 truncate">
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />
                  <span className="text-slate-500 font-normal">Cargando tipos de equipo...</span>
                </>
              ) : aplicaTodos ? (
                <>
                  <Globe2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{placeholderUniversal}</span>
                  {!compact && tiposEquipo.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                      {tiposEquipo.length} clases
                    </span>
                  )}
                </>
              ) : selectedItems.length === 1 ? (
                <>
                  {(() => {
                    const Icon = resolveEquipoLucideIcon(
                      selectedItems[0].icono_ui,
                      selectedItems[0].codigo_tipo,
                    );
                    return (
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{
                          color: selectedItems[0].color_hex || 'var(--org-primary, #1E40AF)',
                        }}
                      />
                    );
                  })()}
                  <span className="truncate">
                    {selectedItems[0].nombre_tipo} ({selectedItems[0].codigo_tipo})
                  </span>
                </>
              ) : (
                <>
                  <span className="truncate">
                    {effectiveIds.length} tipos de equipo seleccionados
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold shrink-0 tabular-nums"
                    style={{ backgroundColor: 'var(--org-primary, #1E40AF)' }}
                  >
                    {effectiveIds.length}
                  </span>
                </>
              )}
            </span>
            {open ? (
              <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
            )}
          </button>

          {open && (
            <div
              className={cn(
                'absolute z-50 left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden',
                compact ? 'w-80' : 'w-full min-w-[340px] max-w-2xl',
              )}
            >
              {/* Buscador interno + barra de acciones rápidas */}
              <div className="p-2.5 border-b border-slate-100 space-y-2 bg-slate-50/60">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar tipo de equipo por nombre o código..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] px-0.5">
                  <button
                    type="button"
                    onClick={selectUniversal}
                    className="font-semibold hover:underline cursor-pointer"
                    style={{ color: 'var(--org-primary, #1E40AF)' }}
                  >
                    Todos los tipos ({tiposEquipo.length})
                  </button>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    {allExplicitSelected
                      ? 'Volver a universal'
                      : `Seleccionar todos (${tiposEquipo.length})`}
                  </button>
                </div>
              </div>

              {/* Listado multi-check */}
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                {!search.trim() && (
                  <button
                    type="button"
                    onClick={selectUniversal}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer',
                      aplicaTodos
                        ? 'bg-emerald-50/80 text-slate-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border shrink-0 transition-colors',
                          aplicaTodos
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white',
                        )}
                      >
                        {aplicaTodos && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <Globe2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Todos los tipos de equipo</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 bg-emerald-100/80 text-emerald-800">
                      Universal
                    </span>
                  </button>
                )}

                {filtrados.map((te) => {
                  const checked = !aplicaTodos && effectiveIds.includes(te.id_tipo_equipo);
                  const Icon = resolveEquipoLucideIcon(te.icono_ui, te.codigo_tipo);
                  const accent = te.color_hex || 'var(--org-primary, #1E40AF)';

                  return (
                    <button
                      key={te.id_tipo_equipo}
                      type="button"
                      onClick={() => toggleTipo(te.id_tipo_equipo)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer',
                        checked
                          ? 'bg-slate-100/90 text-slate-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border shrink-0 transition-colors',
                            checked ? 'text-white border-transparent' : 'border-slate-300 bg-white',
                          )}
                          style={
                            checked
                              ? { backgroundColor: 'var(--org-primary, #1E40AF)' }
                              : undefined
                          }
                        >
                          {checked && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                        <span className="truncate">{te.nombre_tipo}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 bg-slate-100 text-slate-600">
                        {te.codigo_tipo}
                      </span>
                    </button>
                  );
                })}

                {filtrados.length === 0 && (
                  <p className="py-5 text-center text-xs text-slate-400">
                    No se encontraron tipos de equipo coincidentes.
                  </p>
                )}
              </div>

              {/* Footer con resumen y botón Listo */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/70">
                <span className="text-[11px] text-slate-500 font-medium">
                  {aplicaTodos
                    ? 'Aplica a todos los tipos'
                    : `${effectiveIds.length} ${effectiveIds.length === 1 ? 'tipo seleccionado' : 'tipos seleccionados'}`}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ backgroundColor: 'var(--org-primary, #1E40AF)' }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chips removibles de tipos de equipo (solo en modo formulario) */}
        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5">
            {aplicaTodos ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                <Globe2 className="h-3.5 w-3.5" />
                Aplica universalmente a todos los tipos de equipo (presentes y futuros)
              </span>
            ) : (
              <>
                {selectedItems.map((te) => {
                  const Icon = resolveEquipoLucideIcon(te.icono_ui, te.codigo_tipo);
                  const accent = te.color_hex || 'var(--org-primary, #1E40AF)';
                  return (
                    <span
                      key={te.id_tipo_equipo}
                      className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 text-[11px] font-semibold shadow-2xs"
                    >
                      <Icon className="h-3 w-3 shrink-0" style={{ color: accent }} />
                      <span>{te.nombre_tipo}</span>
                      <span className="text-[10px] font-mono text-slate-400">{te.codigo_tipo}</span>
                      <button
                        type="button"
                        onClick={() => toggleTipo(te.id_tipo_equipo)}
                        className="ml-0.5 p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
                        aria-label={`Quitar ${te.nombre_tipo}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={selectUniversal}
                    className="text-[11px] text-slate-500 hover:text-slate-900 underline px-1.5 py-0.5 cursor-pointer"
                  >
                    Restablecer a todos
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. SELECTOR CASCADA OPCIONAL: PARTES / SUBSISTEMAS DEL EQUIPO (modulos_tecnicos) */}
      {enableModulos && !compact && !aplicaTodos && modulosDisponibles.length > 0 && (
        <div
          ref={modulosRef}
          className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 space-y-2.5"
        >
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" style={{ color: 'var(--org-primary, #1E40AF)' }} />
              Partes / Subsistemas del Equipo (Opcional)
            </span>
            <span className="text-[11px] text-slate-400">
              Especifica si el repuesto pertenece a subsistemas puntuales
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setModulosOpen((prev) => !prev)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border transition-all text-left cursor-pointer disabled:opacity-60',
                modulosOpen || effectiveModuloIds.length > 0
                  ? 'border-slate-400 text-slate-900'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300',
              )}
              style={
                modulosOpen || effectiveModuloIds.length > 0
                  ? {
                      borderColor: 'var(--org-primary, #1E40AF)',
                      boxShadow:
                        '0 0 0 2px color-mix(in srgb, var(--org-primary, #1E40AF) 14%, transparent)',
                    }
                  : undefined
              }
            >
              <span className="flex items-center gap-2 min-w-0 truncate">
                {effectiveModuloIds.length === 0 ? (
                  <>
                    <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-600 font-medium">
                      Todas las partes / subsistemas de los equipos seleccionados (
                      {modulosDisponibles.length})
                    </span>
                  </>
                ) : selectedModulosItems.length === 1 ? (
                  <>
                    <Layers
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: 'var(--org-primary, #1E40AF)' }}
                    />
                    <span className="truncate">{selectedModulosItems[0].nombre_modulo}</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">
                      {effectiveModuloIds.length} partes / subsistemas seleccionados
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold shrink-0 tabular-nums"
                      style={{ backgroundColor: 'var(--org-primary, #1E40AF)' }}
                    >
                      {effectiveModuloIds.length}
                    </span>
                  </>
                )}
              </span>
              {modulosOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
              )}
            </button>

            {modulosOpen && (
              <div className="absolute z-50 left-0 mt-1.5 w-full min-w-[320px] max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2.5 border-b border-slate-100 space-y-2 bg-slate-50/60">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={modulosSearch}
                      onChange={(e) => setModulosSearch(e.target.value)}
                      placeholder="Buscar parte o subsistema..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    {modulosSearch && (
                      <button
                        type="button"
                        onClick={() => setModulosSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] px-0.5">
                    <button
                      type="button"
                      onClick={() => onModulosChange?.([])}
                      className="font-semibold hover:underline cursor-pointer"
                      style={{ color: 'var(--org-primary, #1E40AF)' }}
                    >
                      Todas las partes ({modulosDisponibles.length})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onModulosChange?.(
                          allModulosSelected ? [] : modulosDisponibles.map((m) => m.id_modulo),
                        )
                      }
                      className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                    >
                      {allModulosSelected
                        ? 'Desmarcar todas'
                        : `Seleccionar todas (${modulosDisponibles.length})`}
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                  {!modulosSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => onModulosChange?.([])}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer',
                        effectiveModuloIds.length === 0
                          ? 'bg-emerald-50/80 text-slate-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border shrink-0 transition-colors',
                            effectiveModuloIds.length === 0
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white',
                          )}
                        >
                          {effectiveModuloIds.length === 0 && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span className="truncate">Todas las partes / subsistemas</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 bg-emerald-100/80 text-emerald-800">
                        Sin restricción
                      </span>
                    </button>
                  )}

                  {gruposModulos.map((grupo, groupIdx) => {
                    const mostrarEncabezado = selectedItems.length > 1;
                    const GroupIcon = grupo.esCompartido
                      ? Layers
                      : resolveEquipoLucideIcon(grupo.iconoUi, grupo.codigo);
                    const groupAccent = grupo.esCompartido
                      ? 'var(--org-primary, #1E40AF)'
                      : grupo.colorHex || 'var(--org-primary, #1E40AF)';

                    return (
                      <div
                        key={grupo.key}
                        className={cn(
                          mostrarEncabezado &&
                            (groupIdx > 0 || !modulosSearch.trim()) &&
                            'mt-1.5 pt-1.5 border-t border-slate-100',
                        )}
                      >
                        {mostrarEncabezado && (
                          <div className="flex items-center justify-between gap-2 px-2.5 py-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <GroupIcon
                                className="h-3 w-3 shrink-0 opacity-85"
                                style={{ color: groupAccent }}
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                                {grupo.titulo}
                              </span>
                            </div>
                            {grupo.codigo && (
                              <span className="text-[9px] font-mono font-semibold text-slate-400 shrink-0">
                                {grupo.codigo}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="space-y-0.5">
                          {grupo.modulos.map((mod) => {
                            const checked = effectiveModuloIds.includes(mod.id_modulo);
                            return (
                              <button
                                key={mod.id_modulo}
                                type="button"
                                onClick={() => toggleModulo(mod.id_modulo)}
                                className={cn(
                                  'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer',
                                  checked
                                    ? 'bg-slate-100/90 text-slate-900 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50',
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={cn(
                                      'flex h-4 w-4 items-center justify-center rounded border shrink-0 transition-colors',
                                      checked
                                        ? 'text-white border-transparent'
                                        : 'border-slate-300 bg-white',
                                    )}
                                    style={
                                      checked
                                        ? { backgroundColor: 'var(--org-primary, #1E40AF)' }
                                        : undefined
                                    }
                                  >
                                    {checked && <Check className="h-3 w-3 stroke-[3]" />}
                                  </span>
                                  <span className="truncate">{mod.nombre_modulo}</span>
                                </div>
                                {(!mostrarEncabezado || grupo.esCompartido) && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold shrink-0 bg-slate-100 text-slate-500">
                                    {mod.equiposCodigos.join(' · ')}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {modulosFiltrados.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-400">
                      Sin partes o subsistemas coincidentes.
                    </p>
                  )}
                </div>

                {/* Footer con resumen y botón Listo */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/70">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {effectiveModuloIds.length === 0
                      ? 'Aplica a todas las partes'
                      : `${effectiveModuloIds.length} ${effectiveModuloIds.length === 1 ? 'subsistema seleccionado' : 'subsistemas seleccionados'}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModulosOpen(false)}
                    style={{ backgroundColor: 'var(--org-primary, #1E40AF)' }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedModulosItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedModulosItems.map((mod) => (
                <span
                  key={mod.id_modulo}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 text-[11px] font-semibold shadow-2xs"
                >
                  <Layers
                    className="h-3 w-3 shrink-0"
                    style={{ color: 'var(--org-primary, #1E40AF)' }}
                  />
                  <span>{mod.nombre_modulo}</span>
                  <button
                    type="button"
                    onClick={() => toggleModulo(mod.id_modulo)}
                    className="ml-0.5 p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
                    aria-label={`Quitar ${mod.nombre_modulo}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => onModulosChange?.([])}
                className="text-[11px] text-slate-500 hover:text-slate-900 underline px-1.5 py-0.5 cursor-pointer"
              >
                Todas las partes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
