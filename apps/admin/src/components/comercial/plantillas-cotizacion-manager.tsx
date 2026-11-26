'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TIPO_COTIZACION_PRESETS,
  type PlantillaCotizacionRecord,
} from '@/features/comercial/api/comercial.service';
import {
  usePlantillasActions,
  usePlantillasCotizacion,
  useTiposOfertaCotizacion,
} from '@/features/comercial/hooks/use-comercial';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { Copy, Edit3, Layers, Loader2, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { matchesAllTokens } from './cpq-premium-controls';
import { PlantillaCotizacionStudio } from './plantilla-cotizacion-studio';
import { resolveTipoOfertaLabel } from './tipos-oferta-manager-modal';

interface Props {
  onSelectForNewQuote?: (plantilla: PlantillaCotizacionRecord) => void;
  onStudioModeChange?: (isStudio: boolean) => void;
  /** Prefijo para query params de URL cuando se embebe dentro de otro Hub (ej. "pl_"). */
  queryPrefix?: string;
}

type StudioMode = 'create' | 'edit' | 'duplicate';

export function PlantillasCotizacionManager({
  onSelectForNewQuote,
  onStudioModeChange,
  queryPrefix = '',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatCurrency } = useOrgFormatters();

  const qKey = `${queryPrefix}q`;
  const tipoKey = `${queryPrefix}tipo`;
  const studioKey = `${queryPrefix}studio`;
  const studioIdKey = `${queryPrefix}id`;

  // Estado sincronizado en tiempo real con Query Params de la URL (persiste al navegar y usar Atrás)
  const urlSearch = searchParams.get(qKey) || '';
  const tipoFiltro = searchParams.get(tipoKey) || 'TODOS';
  const rawStudioMode = searchParams.get(studioKey);
  const studioMode: StudioMode | null =
    rawStudioMode === 'create' || rawStudioMode === 'edit' || rawStudioMode === 'duplicate'
      ? rawStudioMode
      : null;
  const rawStudioId = searchParams.get(studioIdKey);
  const studioPlantillaId = rawStudioId && /^\d+$/.test(rawStudioId) ? Number(rawStudioId) : null;

  const [draftSearch, setDraftSearch] = useState<{ base: string; value: string }>({
    base: urlSearch,
    value: urlSearch,
  });
  const search = draftSearch.base === urlSearch ? draftSearch.value : urlSearch;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushedStudioRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState<PlantillaCotizacionRecord | null>(null);

  const { data: plantillas = [], isLoading } = usePlantillasCotizacion();
  const { data: tiposOfertaCatalogo = [] } = useTiposOfertaCotizacion();
  const { eliminar } = usePlantillasActions();

  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === '') params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams],
  );

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const studioPlantilla = useMemo(() => {
    if (!studioMode || studioMode === 'create' || !studioPlantillaId) return undefined;
    return plantillas.find((p) => p.id_plantilla === studioPlantillaId);
  }, [studioMode, studioPlantillaId, plantillas]);

  const isStudioActive = Boolean(
    studioMode && (studioMode === 'create' || Boolean(studioPlantilla) || isLoading),
  );

  useEffect(() => {
    onStudioModeChange?.(isStudioActive);
  }, [isStudioActive, onStudioModeChange]);

  const handleSearchChange = (nextVal: string) => {
    setDraftSearch({ base: urlSearch, value: nextVal });
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const cleaned = nextVal.trim() ? nextVal : null;
      router.replace(buildUrl({ [qKey]: cleaned }), { scroll: false });
    }, 180);
  };

  const handleTipoFiltroChange = (nextTipo: string) => {
    router.replace(buildUrl({ [tipoKey]: nextTipo === 'TODOS' ? null : nextTipo }), {
      scroll: false,
    });
  };

  const clearFilters = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setDraftSearch({ base: '', value: '' });
    router.replace(buildUrl({ [qKey]: null, [tipoKey]: null }), { scroll: false });
  };

  const openStudio = (mode: StudioMode, plantilla?: PlantillaCotizacionRecord) => {
    pushedStudioRef.current = true;
    router.push(
      buildUrl({
        [studioKey]: mode,
        [studioIdKey]: plantilla ? String(plantilla.id_plantilla) : null,
      }),
      { scroll: false },
    );
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const closeStudio = (preferHistoryBack = true) => {
    if (
      preferHistoryBack &&
      pushedStudioRef.current &&
      typeof window !== 'undefined' &&
      window.history.length > 1
    ) {
      pushedStudioRef.current = false;
      router.back();
      return;
    }
    pushedStudioRef.current = false;
    router.replace(buildUrl({ [studioKey]: null, [studioIdKey]: null }), { scroll: false });
  };

  const tiposFiltroOpciones = useMemo(() => {
    const map = new Map<string, string>();
    if (tiposOfertaCatalogo.length > 0) {
      for (const t of tiposOfertaCatalogo) {
        map.set(t.codigo, t.nombre);
      }
    } else {
      for (const preset of TIPO_COTIZACION_PRESETS) {
        map.set(preset.value, preset.label);
      }
    }
    for (const pl of plantillas) {
      if (pl.tipo_cotizacion && !map.has(pl.tipo_cotizacion)) {
        map.set(
          pl.tipo_cotizacion,
          resolveTipoOfertaLabel(pl.tipo_cotizacion, tiposOfertaCatalogo),
        );
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [plantillas, tiposOfertaCatalogo]);

  const filtradas = useMemo(() => {
    const q = search.trim();
    return plantillas.filter((p) => {
      if (tipoFiltro !== 'TODOS' && p.tipo_cotizacion !== tipoFiltro) return false;
      if (!q) return true;
      return matchesAllTokens(q, [
        p.nombre,
        p.codigo_plantilla,
        p.descripcion,
        p.tipo_cotizacion,
        resolveTipoOfertaLabel(p.tipo_cotizacion, tiposOfertaCatalogo),
        p.tipos_equipo?.nombre_tipo,
        p.modelos_equipo?.marca,
        p.modelos_equipo?.modelo,
        p.modulos_tecnicos?.nombre_modulo,
        ...(p.items || []).map((it) => it.descripcion),
      ]);
    });
  }, [plantillas, search, tipoFiltro, tiposOfertaCatalogo]);

  // ── MODO TEMPLATE STUDIO (VISTA COMPLETA 2 COLUMNAS) ──────────────────────
  if (studioMode) {
    if (studioMode !== 'create' && isLoading) {
      return (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs font-medium">Cargando plantilla estándar...</p>
        </div>
      );
    }
    if (studioMode === 'create' || studioPlantilla) {
      return (
        <PlantillaCotizacionStudio
          key={`${studioMode}-${studioPlantilla?.id_plantilla ?? 'new'}`}
          mode={studioMode}
          plantilla={studioPlantilla}
          onBack={() => closeStudio(true)}
          onSaved={() => closeStudio(true)}
          onSelectForNewQuote={onSelectForNewQuote}
        />
      );
    }
  }

  const hayFiltrosActivos = Boolean(search.trim()) || tipoFiltro !== 'TODOS';

  // ── MODO HUB LISTA ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar plantilla por nombre, código, subsistema o clase de equipo..."
              className="pl-9 pr-8 bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={tipoFiltro} onValueChange={handleTipoFiltroChange}>
            <SelectTrigger className="w-56 bg-white">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los tipos de oferta</SelectItem>
              {tiposFiltroOpciones.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hayFiltrosActivos && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        <Button onClick={() => openStudio('create')} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva Plantilla Estándar
        </Button>
      </div>

      {/* Listado */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              No hay plantillas que coincidan con el filtro
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crea plantillas estándar (ej. Suministro de Baterías, Preventivo Multi-Equipo,
              Overhaul Especial) para cotizar en segundos con auto-escalado por equipos gemelos.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openStudio('create')}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Crear primera plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtradas.map((pl) => {
            const countServ = pl.items.filter((i) => i.tipo_linea === 'SERVICIO').length;
            const countComp = pl.items.filter((i) => i.tipo_linea === 'COMPONENTE').length;
            const countOtro = pl.items.filter((i) => i.tipo_linea === 'OTRO').length;
            const tienePreciosVivos = pl.items.some(
              (i) => i.usar_precio_catalogo && (i.id_servicio || i.id_componente),
            );
            const subtotalBase = pl.items
              .filter((i) => !i.es_opcional && i.visible_cliente !== false)
              .reduce((acc, i) => {
                let pu = Number(i.precio_unitario_fijo || 0);
                if (i.usar_precio_catalogo) {
                  if (i.tipo_linea === 'SERVICIO' && i.catalogo_servicios?.precio_base != null) {
                    pu = Number(i.catalogo_servicios.precio_base);
                  } else if (
                    i.tipo_linea === 'COMPONENTE' &&
                    i.catalogo_componentes?.precio_venta != null
                  ) {
                    pu = Number(i.catalogo_componentes.precio_venta);
                  }
                }
                return acc + Number(i.cantidad_base) * pu;
              }, 0);

            return (
              <Card
                key={pl.id_plantilla}
                className="group border-slate-200 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between bg-white"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {pl.codigo_plantilla}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug mt-0.5">
                        {pl.nombre}
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-slate-50">
                      {resolveTipoOfertaLabel(pl.tipo_cotizacion, tiposOfertaCatalogo)}
                    </Badge>
                  </div>

                  {pl.descripcion && (
                    <p className="text-xs text-slate-600 line-clamp-2">{pl.descripcion}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pl.modelos_equipo ? (
                      <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-50 text-[10px]">
                        OEM: {pl.modelos_equipo.marca} {pl.modelos_equipo.modelo}
                      </Badge>
                    ) : pl.tipos_equipo ? (
                      <Badge className="bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-50 text-[10px]">
                        {pl.tipos_equipo.nombre_tipo}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px]">
                        Universal · Todos los equipos
                      </Badge>
                    )}
                    {pl.modulos_tecnicos && (
                      <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-50 text-[10px]">
                        Subsistema: {pl.modulos_tecnicos.nombre_modulo}
                      </Badge>
                    )}
                    {pl.usa_aiu && (
                      <Badge className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50 text-[10px]">
                        AIU {pl.aiu_admin_porcentaje}/{pl.aiu_imprevistos_porcentaje}/
                        {pl.aiu_utilidad_porcentaje}%
                      </Badge>
                    )}
                    {tienePreciosVivos && (
                      <Badge className="bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-50 text-[10px]">
                        Precios vivos
                      </Badge>
                    )}
                    {pl.mostrar_desglose_precios === true && (
                      <Badge className="bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-50 text-[10px]">
                        PDF: Detallado
                      </Badge>
                    )}
                    {pl.mostrar_desglose_precios === false && (
                      <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100 text-[10px]">
                        PDF: Suma Alzada
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="rounded-md bg-slate-50 py-1.5 px-2">
                      <p className="text-[10px] text-slate-500">Servicios</p>
                      <p className="text-sm font-bold text-slate-800">{countServ}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 py-1.5 px-2">
                      <p className="text-[10px] text-slate-500">Repuestos</p>
                      <p className="text-sm font-bold text-slate-800">{countComp}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 py-1.5 px-2">
                      <p className="text-[10px] text-slate-500">Logística/Otros</p>
                      <p className="text-sm font-bold text-slate-800">{countOtro}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>
                      Base ref.:{' '}
                      <strong className="font-mono text-slate-800">
                        {formatCurrency(subtotalBase)}
                      </strong>
                    </span>
                    <span>Usada {pl.veces_usada}x</span>
                  </div>
                </CardContent>

                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openStudio('edit', pl)}
                      title="Abrir en Template Studio para editar"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openStudio('duplicate', pl)}
                      title="Duplicar en Template Studio"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => setDeleteTarget(pl)}
                      title="Desactivar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {onSelectForNewQuote && (
                    <Button size="sm" onClick={() => onSelectForNewQuote(pl)} className="gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Usar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmación de desactivación de plantilla */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Desactivar plantilla estándar</DialogTitle>
            <DialogDescription>
              La plantilla <strong>{deleteTarget?.nombre}</strong> ({deleteTarget?.codigo_plantilla}
              ) dejará de aparecer en el Hub y en las sugerencias del Studio. Las cotizaciones ya
              creadas con ella no se verán afectadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={eliminar.isPending}
              onClick={async () => {
                if (!deleteTarget) return;
                await eliminar.mutateAsync(deleteTarget.id_plantilla);
                setDeleteTarget(null);
              }}
            >
              {eliminar.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Desactivar plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
