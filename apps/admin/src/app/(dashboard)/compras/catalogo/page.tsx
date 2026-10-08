'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Catálogo Maestro y Abastecimiento (Módulo de Compras)
 * 
 * Vista Principal de Navegación, Búsqueda, Filtrado por Arquetipos y Métricas
 */

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Boxes,
  Building2,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Filter,
  HardHat,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { ArticuloMaestro, DestinoArticulo, TipoComponente } from '@/types/compras.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ComboboxWithCreate } from '@/components/ui/combobox-with-create';
import { HierarchicalCategorySelect } from '@/components/compras/hierarchical-category-select';

function CatalogoComprasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados
  const [articulos, setArticulos] = useState<ArticuloMaestro[]>([]);
  const [tiposComponente, setTiposComponente] = useState<TipoComponente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Conteos globales de arquetipos para micro-contadores certificados
  const [conteoArquetipos, setConteoArquetipos] = useState({
    total: 0,
    insumos: 0,
    repuestos: 0,
    herramientas: 0,
    dotacion: 0,
    consumibles: 0,
  });

  const cargarConteosGlobales = async () => {
    try {
      const res = await comprasService.getArticulos({ limit: 500 });
      const items = res.items || [];
      setConteoArquetipos({
        total: res.total || items.length,
        insumos: items.filter((a) => a.destino_articulo === 'INSUMO_SERVICIO').length,
        repuestos: items.filter((a) => a.destino_articulo === 'REPUESTO_CORRECTIVO').length,
        herramientas: items.filter((a) => a.destino_articulo === 'HERRAMIENTA_ACTIVO').length,
        dotacion: items.filter((a) => a.destino_articulo === 'DOTACION_EPP').length,
        consumibles: items.filter((a) => a.destino_articulo === 'CONSUMIBLE_TALLER').length,
      });
    } catch (e) {
      console.error('Error al calcular conteos de arquetipos:', e);
    }
  };

  useEffect(() => {
    cargarConteosGlobales();
  }, []);

  // Filtros activos
  const currentDestino = (searchParams.get('destino') as DestinoArticulo | null) || undefined;
  const currentSearch = searchParams.get('q') || '';
  const currentTipo = searchParams.get('tipo') ? Number(searchParams.get('tipo')) : undefined;
  const currentMarca = searchParams.get('marca') ? Number(searchParams.get('marca')) : undefined;
  const currentCategoria = searchParams.get('categoria')
    ? Number(searchParams.get('categoria'))
    : searchParams.get('id_categoria')
    ? Number(searchParams.get('id_categoria'))
    : undefined;
  const currentProveedor = searchParams.get('id_proveedor')
    ? Number(searchParams.get('id_proveedor'))
    : searchParams.get('proveedor')
    ? Number(searchParams.get('proveedor'))
    : undefined;

  const [searchTerm, setSearchTerm] = useState(currentSearch);

  // Cargar artículos del catálogo
  const cargarArticulos = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const [resArticulos, resTipos] = await Promise.all([
        comprasService.getArticulos({
          destino_articulo: currentDestino,
          q: currentSearch || undefined,
          id_tipo_componente: currentTipo,
          id_marca: currentMarca,
          id_categoria: currentCategoria,
          id_proveedor: currentProveedor,
          limit: 100,
        }),
        comprasService.getTiposComponente(),
      ]);

      setArticulos(resArticulos.items || []);
      setTotal(resArticulos.total || 0);
      setTiposComponente(resTipos || []);

      if (showToast) {
        toast.success('Catálogo actualizado');
        cargarConteosGlobales();
      }
    } catch (e: any) {
      console.error('Error al cargar artículos:', e);
      toast.error('No se pudo cargar el catálogo de compras');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarArticulos();
  }, [currentDestino, currentSearch, currentTipo, currentMarca, currentCategoria, currentProveedor]);

  // Actualizar filtros en URL
  const actualizarFiltro = (params: {
    destino?: string;
    q?: string;
    tipo?: string;
    marca?: string | null;
    categoria?: string | null;
    proveedor?: string | null;
  }) => {
    const sp = new URLSearchParams(searchParams.toString());

    if (params.destino !== undefined) {
      if (params.destino) sp.set('destino', params.destino);
      else sp.delete('destino');
    }

    if (params.q !== undefined) {
      if (params.q) sp.set('q', params.q);
      else sp.delete('q');
    }

    if (params.tipo !== undefined) {
      if (params.tipo) sp.set('tipo', params.tipo);
      else sp.delete('tipo');
    }

    if (params.marca !== undefined) {
      if (params.marca) sp.set('marca', params.marca);
      else sp.delete('marca');
    }

    if (params.categoria !== undefined) {
      if (params.categoria) {
        sp.set('categoria', params.categoria);
        sp.delete('id_categoria');
      } else {
        sp.delete('categoria');
        sp.delete('id_categoria');
      }
    }

    if (params.proveedor !== undefined) {
      if (params.proveedor) {
        sp.set('id_proveedor', params.proveedor);
        sp.delete('proveedor');
      } else {
        sp.delete('id_proveedor');
        sp.delete('proveedor');
      }
    }

    router.replace(`/compras/catalogo?${sp.toString()}`, { scroll: false });
  };

  // KPIs
  const metricas = useMemo(() => {
    const totalCount = conteoArquetipos.total || total;
    const insumosCount = conteoArquetipos.insumos;
    const herramientasCount = conteoArquetipos.herramientas;
    const conProveedores = articulos.filter(
      (a) => a.articulos_proveedores && a.articulos_proveedores.length > 0
    ).length;

    return { totalCount, insumosCount, herramientasCount, conProveedores };
  }, [conteoArquetipos, total, articulos]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Compras y Abastecimiento
            </h1>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
              Catálogo Maestro
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Administración centralizada de insumos, repuestos, herramientas y su matriz de proveedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarArticulos(true)}
            disabled={refreshing}
            className="h-10 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            asChild
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
          >
            <Link href="/compras/catalogo/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              + Nuevo Recurso / Artículo
            </Link>
          </Button>
        </div>
      </div>

      {/* METRICAS FLASH */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Recursos</span>
            <Boxes className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">{metricas.totalCount}</p>
          <span className="text-[11px] text-gray-400">En catálogo maestro neutral</span>
        </Card>

        <Card className="border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Insumos de Servicio</span>
            <Wrench className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-900">{metricas.insumosCount}</p>
          <span className="text-[11px] text-blue-600">Para clientes / OT</span>
        </Card>

        <Card className="border border-amber-100 bg-amber-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Herramientas / Activos</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">{metricas.herramientasCount}</p>
          <span className="text-[11px] text-amber-700">Activo propio de la empresa</span>
        </Card>

        <Card className="border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800">Con Fuentes Vinculadas</span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-900">{metricas.conProveedores}</p>
          <span className="text-[11px] text-indigo-600">Matriz de referencias activa</span>
        </Card>
      </div>

      {/* FILTROS POR ARQUETIPO (PESTAÑAS PILL CON MICRO-CONTADORES CERTIFICADOS) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 pb-3">
        {[
          { id: '', label: 'Todos los Recursos', icon: Boxes, count: conteoArquetipos.total },
          { id: 'INSUMO_SERVICIO', label: 'Insumos de Servicio', icon: Wrench, count: conteoArquetipos.insumos },
          { id: 'REPUESTO_CORRECTIVO', label: 'Repuestos Correctivos', icon: Boxes, count: conteoArquetipos.repuestos },
          { id: 'HERRAMIENTA_ACTIVO', label: 'Herramientas / Activos', icon: ShieldCheck, count: conteoArquetipos.herramientas },
          { id: 'DOTACION_EPP', label: 'Dotación / EPP', icon: HardHat, count: conteoArquetipos.dotacion },
          { id: 'CONSUMIBLE_TALLER', label: 'Consumibles Taller', icon: Package, count: conteoArquetipos.consumibles },
        ].map((f) => {
          const Icon = f.icon;
          const isSelected = (!currentDestino && f.id === '') || currentDestino === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => actualizarFiltro({ destino: f.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5 opacity-80" />
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-200/80 text-gray-700'
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS AVANZADOS (MARCA + CATEGORÍA TAXONÓMICA) */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 items-center">
          {/* Búsqueda por texto */}
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por SKU, referencia, nombre o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  actualizarFiltro({ q: searchTerm.trim() });
                }
              }}
              className="pl-9 pr-8 text-xs bg-white h-10"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  actualizarFiltro({ q: '' });
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por Categoría Taxonómica Jerárquica */}
          <div className="lg:col-span-4">
            <HierarchicalCategorySelect
              value={currentCategoria}
              onChange={(idCat) => actualizarFiltro({ categoria: idCat ? String(idCat) : '' })}
              placeholder="Filtrar por categoría..."
              showClearButton={true}
            />
          </div>

          {/* Filtro por Marca Normalizada */}
          <div className="lg:col-span-3">
            <ComboboxWithCreate
              value={currentMarca}
              onChange={(idMarca) => actualizarFiltro({ marca: idMarca ? String(idMarca) : '' })}
              placeholder="Filtrar por marca..."
            />
          </div>
        </div>

        {/* Resumen de Filtros Activos y Limpieza Rápida */}
        {(currentDestino || currentSearch || currentMarca || currentCategoria || currentProveedor) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Filtros aplicados:</span>
            {currentSearch && (
              <Badge variant="secondary" className="text-[11px] gap-1 bg-gray-100">
                Texto: "{currentSearch}"
                <button
                  onClick={() => {
                    setSearchTerm('');
                    actualizarFiltro({ q: '' });
                  }}
                  className="hover:text-red-600 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentCategoria && (
              <Badge variant="secondary" className="text-[11px] gap-1 bg-blue-50 text-blue-700 border-blue-200">
                Categoría #{currentCategoria}
                <button
                  onClick={() => actualizarFiltro({ categoria: '' })}
                  className="hover:text-red-600 ml-1 cursor-pointer"
                  title="Quitar filtro de categoría"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentProveedor && (
              <Badge variant="secondary" className="text-[11px] gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                Proveedor #{currentProveedor}
                <button
                  onClick={() => actualizarFiltro({ proveedor: '' })}
                  className="hover:text-red-600 ml-1 cursor-pointer"
                  title="Quitar filtro de proveedor"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentMarca && (
              <Badge variant="secondary" className="text-[11px] gap-1 bg-amber-50 text-amber-800 border-amber-200">
                Marca #{currentMarca}
                <button
                  onClick={() => actualizarFiltro({ marca: '' })}
                  className="hover:text-red-600 ml-1 cursor-pointer"
                  title="Quitar filtro de marca"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                actualizarFiltro({
                  destino: '',
                  q: '',
                  tipo: '',
                  marca: '',
                  categoria: '',
                  proveedor: '',
                });
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium ml-2 cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* TABLA PRINCIPAL DE CATÁLOGO */}
      <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-xs text-gray-500">Cargando catálogo maestro...</p>
            </div>
          ) : articulos.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Boxes className="mx-auto h-12 w-12 text-gray-300" />
              <p className="text-base font-bold text-gray-700">No se encontraron artículos</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No hay recursos que coincidan con los filtros seleccionados o el catálogo aún está vacío.
              </p>
              <Button asChild size="sm" className="mt-2 text-xs">
                <Link href="/compras/catalogo/nuevo">Crear Primer Recurso</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">SKU / Referencia</th>
                    <th className="py-3 px-4">Descripción & Categoría</th>
                    <th className="py-3 px-4">Destino Operativo</th>
                    <th className="py-3 px-4">Fuente Principal (Prov.)</th>
                    <th className="py-3 px-4 text-right">Costo Compra</th>
                    <th className="py-3 px-4 text-right">Precio Venta</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {articulos.map((art) => {
                    const fuentesActivas = art.articulos_proveedores || [];
                    const provPreferido =
                      fuentesActivas.find((f) => f.es_proveedor_preferido) || fuentesActivas[0];
                    const costoCompra = provPreferido
                      ? Number(provPreferido.costo_actual)
                      : Number(art.precio_compra || 0);

                    return (
                      <tr
                        key={art.id_componente}
                        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/compras/catalogo/${art.id_componente}`)}
                      >
                        {/* SKU e Identificación */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-blue-700">
                            {art.codigo_interno || art.referencia_fabricante}
                          </div>
                          {art.codigo_interno && (
                            <div className="font-mono text-[10px] text-gray-400">
                              Ref: {art.referencia_fabricante}
                            </div>
                          )}
                        </td>

                        {/* Descripción, Marca y Categoría Taxonómica */}
                        <td className="py-3 px-4 max-w-sm">
                          <div className="font-bold text-gray-900 truncate">
                            {art.descripcion_corta || art.referencia_fabricante}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                            {art.marcas ? (
                              <span className="flex items-center gap-1 font-semibold text-gray-800">
                                {art.marcas.nombre}
                                {art.marcas.es_fabricante_oem && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] bg-blue-50 text-blue-700 border-blue-200 px-1 py-0 font-medium"
                                  >
                                    OEM
                                  </Badge>
                                )}
                              </span>
                            ) : art.marca ? (
                              <span className="font-medium text-gray-700">{art.marca}</span>
                            ) : null}

                            {(art.marcas || art.marca) && <span>•</span>}

                            <span className="truncate">
                              {art.categorias_componente?.nombre || art.tipos_componente?.nombre_componente || 'General'}
                            </span>

                            {art.categorias_componente?.ruta_jerarquica && (
                              <span className="text-[9px] text-gray-400 font-mono hidden md:inline truncate">
                                ({art.categorias_componente.ruta_jerarquica})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Destino Operativo */}
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] font-semibold ${
                              art.destino_articulo === 'INSUMO_SERVICIO'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : art.destino_articulo === 'HERRAMIENTA_ACTIVO'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : art.destino_articulo === 'REPUESTO_CORRECTIVO'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                : art.destino_articulo === 'DOTACION_EPP'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                            }`}
                          >
                            {art.destino_articulo.replace('_', ' ')}
                          </Badge>
                        </td>

                        {/* Fuente Principal */}
                        <td className="py-3 px-4">
                          {provPreferido ? (
                            <div>
                              <div className="font-semibold text-gray-800 text-xs flex items-center gap-1">
                                {provPreferido.proveedores?.persona?.nombre_comercial ||
                                  provPreferido.proveedores?.persona?.razon_social ||
                                  `Proveedor #${provPreferido.id_proveedor}`}
                                {provPreferido.es_proveedor_preferido && (
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-gray-400">
                                SKU: {provPreferido.referencia_proveedor}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">Sin proveedor</span>
                          )}
                        </td>

                        {/* Costo de Compra */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {costoCompra > 0 ? (
                            `$${costoCompra.toLocaleString()}`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Precio de Venta */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {art.precio_venta ? (
                            `$${Number(art.precio_venta).toLocaleString()}`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Stock en Bodega */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              art.stock_actual <= art.stock_minimo
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {art.stock_actual}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Link href={`/compras/catalogo/${art.id_componente}`}>
                              Ficha 360°
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
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
    </div>
  );
}

export default function CatalogoComprasPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Cargando catálogo maestro de compras...</p>
        </div>
      </div>
    }>
      <CatalogoComprasContent />
    </Suspense>
  );
}
