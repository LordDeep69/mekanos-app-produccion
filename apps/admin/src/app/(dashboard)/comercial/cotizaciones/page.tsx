'use client';

import { CotizacionPdfPreviewModal } from '@/components/comercial/cotizacion-pdf-preview-modal';
import { PlantillasCotizacionManager } from '@/components/comercial/plantillas-cotizacion-manager';
import { resolveTipoOfertaLabel } from '@/components/comercial/tipos-oferta-manager-modal';
import { useSidebar } from '@/components/layout/sidebar-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ESTADO_LABELS_COTIZACION,
  getEstadoCodigoCotizacion,
  TIPO_COTIZACION_PRESETS,
  type CotizacionRecord,
} from '@/features/comercial/api/comercial.service';
import {
  useAprobacionesPendientes,
  useCotizaciones,
  useCotizacionWorkflowActions,
  usePlantillasCotizacion,
  useTiposOfertaCotizacion,
} from '@/features/comercial/hooks/use-comercial';
import { useClientesSelector } from '@/features/ordenes/hooks/use-catalogos';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Cpu,
  FileText,
  History,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ESTADO_STYLE: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700 border-slate-200',
  EN_REVISION: 'bg-amber-100 text-amber-800 border-amber-200',
  APROBADA_INTERNA: 'bg-blue-100 text-blue-800 border-blue-200',
  ENVIADA: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  APROBADA_CLIENTE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECHAZADA: 'bg-rose-100 text-rose-800 border-rose-200',
  VENCIDA: 'bg-slate-200 text-slate-600 border-slate-300',
};

type CotizacionesTab = 'listado' | 'aprobaciones' | 'plantillas';

function CotizacionesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatCurrency, formatDate } = useOrgFormatters();
  const { isCollapsed } = useSidebar();

  // Hidratación y sincronización en tiempo real desde Query Params de URL
  const rawTab = searchParams.get('tab');
  const tab: CotizacionesTab =
    rawTab === 'aprobaciones' || rawTab === 'plantillas' ? rawTab : 'listado';
  const urlSearch = searchParams.get('q') || '';
  const estadoFiltro = searchParams.get('estado') || 'TODOS';
  const tipoFiltro = searchParams.get('tipo') || 'TODOS';

  const [draftSearch, setDraftSearch] = useState<{ base: string; value: string }>({
    base: urlSearch,
    value: urlSearch,
  });
  const search = draftSearch.base === urlSearch ? draftSearch.value : urlSearch;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pdfPreviewTarget, setPdfPreviewTarget] = useState<{
    id: number;
    numero?: string;
    version?: number | null;
    estadoLabel?: string;
    cacheKey?: string;
    mostrarDesglosePrecios?: boolean;
  } | null>(null);

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

  const setTab = (nextTab: CotizacionesTab) => {
    router.replace(buildUrl({ tab: nextTab === 'listado' ? null : nextTab }), { scroll: false });
  };

  const handleSearchChange = (nextVal: string) => {
    setDraftSearch({ base: urlSearch, value: nextVal });
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const cleaned = nextVal.trim() ? nextVal : null;
      router.replace(buildUrl({ q: cleaned }), { scroll: false });
    }, 180);
  };

  const setEstadoFiltro = (nextEstado: string) => {
    router.replace(buildUrl({ estado: nextEstado === 'TODOS' ? null : nextEstado }), {
      scroll: false,
    });
  };

  const setTipoFiltro = (nextTipo: string) => {
    router.replace(buildUrl({ tipo: nextTipo === 'TODOS' ? null : nextTipo }), {
      scroll: false,
    });
  };

  const clearListadoFilters = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setDraftSearch({ base: '', value: '' });
    router.replace(buildUrl({ q: null, estado: null, tipo: null }), { scroll: false });
  };

  const hayFiltrosListado =
    Boolean(search.trim()) || estadoFiltro !== 'TODOS' || tipoFiltro !== 'TODOS';

  const { data: cotData, isLoading, refetch } = useCotizaciones({ take: 150 });
  const { data: aprobacionesData } = useAprobacionesPendientes();
  const { data: plantillas = [] } = usePlantillasCotizacion();
  const { data: tiposOfertaCatalogo = [] } = useTiposOfertaCotizacion();
  const { data: clientes = [] } = useClientesSelector();
  const workflow = useCotizacionWorkflowActions();

  const cotizaciones = useMemo(() => cotData?.cotizaciones || [], [cotData]);
  const aprobacionesPendientes = aprobacionesData?.aprobaciones || aprobacionesData?.data || [];

  const clientesMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clientes) {
      m.set(
        c.id_cliente,
        c.nombre_sede ||
          c.persona?.nombre_comercial ||
          c.persona?.razon_social ||
          `Cliente #${c.id_cliente}`,
      );
    }
    return m;
  }, [clientes]);

  const getClienteNombre = useCallback(
    (c: CotizacionRecord): string => {
      const p = c.cliente?.persona;
      return (
        p?.razon_social ||
        p?.nombre_comercial ||
        p?.nombre_completo ||
        clientesMap.get(c.id_cliente) ||
        `Cliente #${c.id_cliente}`
      );
    },
    [clientesMap],
  );

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
    for (const c of cotizaciones) {
      if (c.tipo_cotizacion && !map.has(c.tipo_cotizacion)) {
        map.set(c.tipo_cotizacion, resolveTipoOfertaLabel(c.tipo_cotizacion, tiposOfertaCatalogo));
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [cotizaciones, tiposOfertaCatalogo]);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cotizaciones.filter((c) => {
      const est = getEstadoCodigoCotizacion(c);
      if (estadoFiltro !== 'TODOS' && est !== estadoFiltro) return false;
      if (tipoFiltro !== 'TODOS' && (c.tipo_cotizacion || 'SERVICIO_TECNICO') !== tipoFiltro) {
        return false;
      }
      if (!q) return true;
      const cliName = getClienteNombre(c).toLowerCase();
      return (
        c.numero_cotizacion.toLowerCase().includes(q) ||
        (c.asunto || '').toLowerCase().includes(q) ||
        cliName.includes(q) ||
        (c.orden_compra_cliente || '').toLowerCase().includes(q) ||
        (c.propuesta_origen?.numero_propuesta || '').toLowerCase().includes(q)
      );
    });
  }, [cotizaciones, search, estadoFiltro, tipoFiltro, getClienteNombre]);

  const kpis = useMemo(() => {
    let enElaboracion = 0;
    let enviadas = 0;
    let aprobadas = 0;
    let rechazadas = 0;
    let montoActivo = 0;
    let margenSum = 0;
    let margenCount = 0;

    for (const c of cotizaciones) {
      const est = getEstadoCodigoCotizacion(c);
      if (est === 'BORRADOR' || est === 'EN_REVISION' || est === 'APROBADA_INTERNA') {
        enElaboracion++;
      }
      if (est === 'ENVIADA') enviadas++;
      if (est === 'APROBADA_CLIENTE') aprobadas++;
      if (est === 'RECHAZADA') rechazadas++;
      if (est !== 'RECHAZADA' && est !== 'VENCIDA') {
        montoActivo += Number(c.total_cotizacion || 0);
      }
      if (Number(c.costo_total_estimado || 0) > 0 && Number(c.total_cotizacion || 0) > 0) {
        margenSum += Number(c.margen_bruto_porcentaje || 0);
        margenCount++;
      }
    }

    const cerradas = aprobadas + rechazadas;
    const tasaConversion = cerradas > 0 ? Math.round((aprobadas / cerradas) * 100) : null;
    const margenPromedio = margenCount > 0 ? Math.round((margenSum / margenCount) * 10) / 10 : null;

    return {
      total: cotizaciones.length,
      enElaboracion,
      enviadas,
      aprobadas,
      montoActivo,
      tasaConversion,
      margenPromedio,
    };
  }, [cotizaciones]);

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-primary shrink-0" />
            <span className="truncate">Hub Comercial de Cotizaciones (CPQ)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ofertas multi-equipo, plantillas estándar inteligentes, logística/viáticos/pólizas,
            rentabilidad y conversión directa a Orden de Servicio.
          </p>
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/comercial/cotizaciones/plantillas">
              <Layers className="h-4 w-4 mr-1.5" />
              Plantillas ({plantillas.length})
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/comercial/cotizaciones/nueva">
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva Cotización
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs Reales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Total Cotizaciones
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {kpis.enElaboracion} en elaboración / revisión
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Enviadas al Cliente
            </p>
            <p className="text-2xl font-extrabold text-indigo-700 mt-1">{kpis.enviadas}</p>
            <p className="text-xs text-slate-500 mt-0.5">Pendientes de respuesta comercial</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Aprobadas Cliente
            </p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{kpis.aprobadas}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {kpis.tasaConversion != null
                ? `Conversión: ${kpis.tasaConversion}%`
                : 'Listas para Orden de Servicio'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center justify-between">
              <span>Pipeline Activo</span>
              {kpis.margenPromedio != null && (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-mono">
                  <TrendingUp className="h-3 w-3" />
                  {kpis.margenPromedio}%
                </span>
              )}
            </p>
            <p className="text-xl font-extrabold font-mono text-slate-900 mt-1">
              {formatCurrency(kpis.montoActivo)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {kpis.margenPromedio != null
                ? `Margen bruto promedio: ${kpis.margenPromedio}%`
                : 'Acumulado vigente (sin rechazadas)'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <Button
          size="sm"
          variant={tab === 'listado' ? 'default' : 'ghost'}
          onClick={() => setTab('listado')}
        >
          Listado General ({cotizaciones.length})
        </Button>
        <Button
          size="sm"
          variant={tab === 'aprobaciones' ? 'default' : 'ghost'}
          onClick={() => setTab('aprobaciones')}
        >
          <ShieldCheck className="h-4 w-4 mr-1.5" />
          Aprobaciones Pendientes
          {aprobacionesPendientes.length > 0 && (
            <Badge className="ml-1.5 bg-amber-500 text-white hover:bg-amber-500 text-[10px] px-1.5">
              {aprobacionesPendientes.length}
            </Badge>
          )}
        </Button>
        <Button
          size="sm"
          variant={tab === 'plantillas' ? 'default' : 'ghost'}
          onClick={() => setTab('plantillas')}
        >
          <Layers className="h-4 w-4 mr-1.5" />
          Hub de Plantillas ({plantillas.length})
        </Button>
      </div>

      {/* TAB 1: LISTADO GENERAL */}
      {tab === 'listado' && (
        <Card className="border-slate-200 min-w-0">
          <CardHeader className="pb-3 px-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar por número, asunto, cliente u orden de compra (PO)..."
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
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="w-44 lg:w-48 bg-white">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los estados</SelectItem>
                  {Object.entries(ESTADO_LABELS_COTIZACION).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="w-48 lg:w-52 bg-white">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los tipos</SelectItem>
                  {tiposFiltroOpciones.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hayFiltrosListado && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearListadoFilters}
                  className="h-9 text-xs text-slate-500 hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-4 sm:px-5">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : filtradas.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  No se encontraron cotizaciones con los filtros aplicados
                </p>
                <Button size="sm" asChild className="mt-2">
                  <Link href="/comercial/cotizaciones/nueva">
                    <Plus className="h-4 w-4 mr-1" />
                    Crear Nueva Cotización
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] table-fixed text-sm text-left">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b">
                    <tr>
                      <th
                        className={cn(
                          'py-3',
                          isCollapsed ? 'px-3 w-[164px]' : 'px-2 2xl:px-3 w-[136px] 2xl:w-[164px]',
                        )}
                      >
                        Número / Tipo
                      </th>
                      <th
                        className={cn(
                          'py-3',
                          isCollapsed ? 'px-3 w-[20%]' : 'px-2 2xl:px-3 w-[18%] 2xl:w-[20%]',
                        )}
                      >
                        Cliente / Equipos
                      </th>
                      <th className={cn('py-3', isCollapsed ? 'px-3' : 'px-2 2xl:px-3')}>Asunto</th>
                      <th
                        className={cn(
                          'py-3',
                          isCollapsed ? 'px-3 w-[142px]' : 'px-2 2xl:px-3 w-[124px] 2xl:w-[142px]',
                        )}
                      >
                        Fechas
                      </th>
                      <th
                        className={cn(
                          'py-3',
                          isCollapsed ? 'px-3 w-[128px]' : 'px-2 2xl:px-3 w-[112px] 2xl:w-[128px]',
                        )}
                      >
                        Estado
                      </th>
                      <th
                        className={cn(
                          'py-3 text-right',
                          isCollapsed ? 'px-3 w-[116px]' : 'px-2 2xl:px-3 w-[98px] 2xl:w-[116px]',
                        )}
                      >
                        Total / Margen
                      </th>
                      <th
                        className={cn(
                          'py-3 text-right',
                          isCollapsed ? 'px-3 w-[180px]' : 'px-2 2xl:px-3 w-[150px] 2xl:w-[180px]',
                        )}
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtradas.map((c) => {
                      const estCode = getEstadoCodigoCotizacion(c);
                      const eqCount = c.equipos_vinculados?.length || (c.id_equipo ? 1 : 0);
                      const tieneCosto = Number(c.costo_total_estimado || 0) > 0;
                      const margen = Number(c.margen_bruto_porcentaje || 0);
                      const clienteNombre = getClienteNombre(c);
                      const tipoLabel = resolveTipoOfertaLabel(
                        c.tipo_cotizacion,
                        tiposOfertaCatalogo,
                      );
                      const cellPad = isCollapsed ? 'py-3 px-3' : 'py-2.5 px-2 2xl:py-3 2xl:px-3';

                      return (
                        <tr
                          key={c.id_cotizacion}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className={cn(cellPad, 'align-middle')}>
                            <div className="flex items-center gap-1 min-w-0">
                              <Link
                                href={`/comercial/cotizaciones/${c.id_cotizacion}`}
                                className="font-mono font-bold text-[13px] text-slate-900 hover:text-primary truncate"
                                title={c.numero_cotizacion}
                              >
                                {c.numero_cotizacion}
                              </Link>
                              {(c.version || 1) >= 2 && (
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 h-4 font-mono text-[9px] font-bold bg-amber-100 text-amber-800 border-amber-200 inline-flex items-center gap-0.5 shrink-0"
                                  title={`Versión ${c.version} — derivada de una negociación previa`}
                                >
                                  <History className="h-2.5 w-2.5 shrink-0" />v{c.version}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 min-w-0">
                              <span
                                className="text-[10px] font-semibold text-slate-500 truncate"
                                title={tipoLabel}
                              >
                                {tipoLabel}
                              </span>
                              {c.usa_aiu && (
                                <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                                  AIU
                                </span>
                              )}
                            </div>
                          </td>

                          <td className={cn(cellPad, 'align-middle')}>
                            <p
                              className="font-medium text-[13px] text-slate-800 truncate"
                              title={clienteNombre}
                            >
                              {clienteNombre}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 min-w-0">
                              <Cpu className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="shrink-0">
                                {eqCount > 0
                                  ? `${eqCount} equipo${eqCount > 1 ? 's' : ''}`
                                  : 'Sin equipo asignado'}
                              </span>
                              {c.orden_compra_cliente && (
                                <span
                                  className="font-mono text-[10px] text-emerald-700 font-semibold truncate"
                                  title={`PO ${c.orden_compra_cliente}`}
                                >
                                  · PO {c.orden_compra_cliente}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className={cn(cellPad, 'align-middle')}>
                            <p
                              className="text-[13px] text-slate-800 truncate font-medium"
                              title={c.asunto}
                            >
                              {c.asunto}
                            </p>
                            {c.plantilla_origen && (
                              <p
                                className="text-[10px] text-primary truncate"
                                title={`Plantilla: ${c.plantilla_origen.nombre}`}
                              >
                                Plantilla: {c.plantilla_origen.nombre}
                              </p>
                            )}
                            {c.propuesta_origen && (
                              <p
                                className="text-[10px] font-mono font-semibold text-amber-700 truncate"
                                title={`Escalada desde propuesta ${c.propuesta_origen.numero_propuesta}`}
                              >
                                Desde {c.propuesta_origen.numero_propuesta}
                              </p>
                            )}
                          </td>

                          <td className={cn(cellPad, 'align-middle text-[11px] whitespace-nowrap')}>
                            <div className="text-slate-700 truncate">
                              {formatDate(c.fecha_cotizacion)}
                            </div>
                            <div className="text-slate-400 truncate">
                              Vence: {formatDate(c.fecha_vencimiento)}
                            </div>
                          </td>

                          <td className={cn(cellPad, 'align-middle whitespace-nowrap')}>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px]',
                                !isCollapsed && 'px-1.5 py-0.5 2xl:px-2.5',
                                ESTADO_STYLE[estCode] || 'bg-slate-100 text-slate-700',
                              )}
                            >
                              {ESTADO_LABELS_COTIZACION[estCode] || estCode}
                            </Badge>
                            {c.id_orden_servicio_generada && (
                              <div className="mt-1">
                                <Link
                                  href={`/ordenes/${c.id_orden_servicio_generada}`}
                                  className="text-[10px] font-mono font-bold text-primary hover:underline"
                                >
                                  OS #{c.id_orden_servicio_generada} ↗
                                </Link>
                              </div>
                            )}
                          </td>

                          <td className={cn(cellPad, 'align-middle text-right whitespace-nowrap')}>
                            <div className="font-mono font-bold text-[13px] text-slate-900">
                              {formatCurrency(c.total_cotizacion || 0)}
                            </div>
                            {tieneCosto && (
                              <div
                                className={`text-[10px] font-mono font-semibold ${
                                  margen >= 25
                                    ? 'text-emerald-700'
                                    : margen >= 18
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                }`}
                              >
                                Margen: {margen.toFixed(1)}%
                              </div>
                            )}
                          </td>

                          <td className={cn(cellPad, 'align-middle text-right whitespace-nowrap')}>
                            <div
                              className={cn(
                                'inline-flex items-center justify-end',
                                isCollapsed ? 'gap-1' : 'gap-0.5 2xl:gap-1',
                              )}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  'text-xs',
                                  isCollapsed ? 'h-8 px-2.5' : 'h-7 px-2 2xl:h-8 2xl:px-2.5',
                                )}
                                title="Abrir Studio de cotización"
                                asChild
                              >
                                <Link href={`/comercial/cotizaciones/${c.id_cotizacion}`}>
                                  <span className={isCollapsed ? 'inline' : 'hidden 2xl:inline'}>
                                    Abrir&nbsp;
                                  </span>
                                  Studio
                                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'p-0',
                                  isCollapsed ? 'h-8 w-8' : 'h-7 w-7 2xl:h-8 2xl:w-8',
                                )}
                                title="Duplicar cotización"
                                onClick={async () => {
                                  const copia = await workflow.duplicar.mutateAsync(
                                    c.id_cotizacion,
                                  );
                                  if (copia?.id_cotizacion) {
                                    router.push(`/comercial/cotizaciones/${copia.id_cotizacion}`);
                                  }
                                }}
                              >
                                <Copy className="h-4 w-4 text-slate-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'p-0',
                                  isCollapsed ? 'h-8 w-8' : 'h-7 w-7 2xl:h-8 2xl:w-8',
                                )}
                                title="Previsualizar y descargar PDF corporativo"
                                onClick={() =>
                                  setPdfPreviewTarget({
                                    id: c.id_cotizacion,
                                    numero: c.numero_cotizacion,
                                    version: c.version,
                                    estadoLabel: ESTADO_LABELS_COTIZACION[estCode] || estCode,
                                    cacheKey: `${c.fecha_modificacion ?? ''}-${c.version ?? 1}-${c.total_cotizacion ?? 0}-${c.id_estado ?? 0}-fa:${c.id_firma_asesor ?? 0}-fc:${c.id_firma_cliente ?? 0}`,
                                    mostrarDesglosePrecios: Boolean(
                                      c.mostrar_desglose_precios ?? false,
                                    ),
                                  })
                                }
                              >
                                <FileText className="h-4 w-4 text-slate-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: APROBACIONES PENDIENTES */}
      {tab === 'aprobaciones' && (
        <Card className="border-slate-200">
          <CardContent className="p-5">
            {aprobacionesPendientes.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No hay solicitudes de aprobación comercial pendientes.
              </div>
            ) : (
              <div className="space-y-3">
                {aprobacionesPendientes.map((ap) => (
                  <div
                    key={ap.id_aprobacion}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/comercial/cotizaciones/${ap.id_cotizacion}`}
                          className="font-mono font-bold text-slate-900 hover:text-primary"
                        >
                          {ap.cotizaciones?.numero_cotizacion || `COT #${ap.id_cotizacion}`}
                        </Link>
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100">
                          Nivel: {ap.nivel_aprobacion || 'SUPERVISOR'}
                        </Badge>
                        {ap.cotizaciones?.total_cotizacion && (
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {formatCurrency(ap.cotizaciones.total_cotizacion)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        {ap.cotizaciones?.asunto || 'Cotización pendiente de revisión'}
                      </p>
                      {ap.razon_nivel && (
                        <p className="text-xs text-amber-800 font-medium">{ap.razon_nivel}</p>
                      )}
                      {ap.observaciones_solicitante && (
                        <p className="text-xs text-slate-500">
                          Nota asesor: {ap.observaciones_solicitante}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/comercial/cotizaciones/${ap.id_cotizacion}`}>
                          Revisar Studio
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={workflow.procesar.isPending}
                        onClick={() =>
                          workflow.procesar.mutate({
                            idAprobacion: ap.id_aprobacion,
                            decision: 'APROBADA',
                            observaciones: 'Aprobada internamente desde Hub Comercial',
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={workflow.procesar.isPending}
                        onClick={() =>
                          workflow.procesar.mutate({
                            idAprobacion: ap.id_aprobacion,
                            decision: 'RECHAZADA',
                            observaciones: 'Devuelta a borrador para ajustes comerciales',
                          })
                        }
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Devolver a Borrador
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: HUB DE PLANTILLAS CPQ */}
      {tab === 'plantillas' && (
        <PlantillasCotizacionManager
          queryPrefix="pl_"
          onSelectForNewQuote={(pl) =>
            router.push(`/comercial/cotizaciones/nueva?plantilla=${pl.id_plantilla}`)
          }
        />
      )}

      <CotizacionPdfPreviewModal
        open={Boolean(pdfPreviewTarget)}
        onOpenChange={(open) => {
          if (!open) setPdfPreviewTarget(null);
        }}
        cotizacionId={pdfPreviewTarget?.id ?? null}
        numeroCotizacion={pdfPreviewTarget?.numero}
        version={pdfPreviewTarget?.version}
        estadoLabel={pdfPreviewTarget?.estadoLabel}
        cacheKey={pdfPreviewTarget?.cacheKey}
        mostrarDesglosePrecios={pdfPreviewTarget?.mostrarDesglosePrecios}
        onDesgloseChange={(nextVal) =>
          setPdfPreviewTarget((prev) =>
            prev ? { ...prev, mostrarDesglosePrecios: nextVal } : prev,
          )
        }
      />
    </div>
  );
}

export default function CotizacionesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <CotizacionesPageContent />
    </Suspense>
  );
}
