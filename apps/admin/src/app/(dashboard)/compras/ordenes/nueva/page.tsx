/**
 * MEKANOS S.A.S - Portal Admin
 * Ciclo 4.A: Emisión de Órdenes de Compra
 * Formulario Interactivo Amplio de Divulgación Progresiva, Sourcing de Proveedor y Liquidación Comercial en Tiempo Real
 * Paleta Clara Corporativa Homologada Oficial (bg-white, border-slate-200, text-slate-900)
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FilePlus,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Package,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { comprasService } from '@/lib/api/compras.service';
import { ordenesCompraService } from '@/lib/api/ordenes-compra.service';
import { ArticuloMaestro, ProveedorCompleto } from '@/types/compras.types';
import { ArticuloSourcing, CrearOrdenCompraPayload } from '@/types/ordenes-compra.types';

interface LineaOrdenCompra {
  id_temp: string;
  id_componente: number;
  codigo_interno: string | null;
  descripcion_corta: string;
  referencia_fabricante: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  es_pactado: boolean;
  observaciones?: string;
}

export default function NuevaOrdenCompraPage() {
  const router = useRouter();

  // Estados de carga
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Datos maestros
  const [proveedores, setProveedores] = useState<ProveedorCompleto[]>([]);
  const [catalogoArticulos, setCatalogoArticulos] = useState<ArticuloMaestro[]>([]);
  const [sourcingProveedor, setSourcingProveedor] = useState<Map<number, ArticuloSourcing>>(new Map());

  // Formulario cabecera
  const [idProveedorSeleccionado, setIdProveedorSeleccionado] = useState<number | null>(null);
  const [numeroOrdenPersonalizado, setNumeroOrdenPersonalizado] = useState<string>('');
  const [esNumeroAutomatico, setEsNumeroAutomatico] = useState<boolean>(true);
  const [fechaNecesidad, setFechaNecesidad] = useState<string>('');
  const [observacionesGenerales, setObservacionesGenerales] = useState<string>('');

  // Buscador interactivo unificado de artículos con autocompletado
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [menuArticulosAbierto, setMenuArticulosAbierto] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<ArticuloMaestro | null>(null);
  const [cantidadParaAgregar, setCantidadParaAgregar] = useState<number>(1);
  const [precioParaAgregar, setPrecioParaAgregar] = useState<number>(0);
  const [obsParaAgregar, setObsParaAgregar] = useState<string>('');
  const [esPrecioPactadoItem, setEsPrecioPactadoItem] = useState<boolean>(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Tabla reactiva de líneas
  const [lineas, setLineas] = useState<LineaOrdenCompra[]>([]);

  // Formateador COP con precisión determinista
  const formatCOP = (valor: number | null | undefined, forceDecimals = false) => {
    if (valor === null || valor === undefined) return '$ 0';
    const num = Number(valor);
    const hasDecimals = !Number.isInteger(num);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: (forceDecimals || hasDecimals) ? 2 : 0,
      maximumFractionDigits: (forceDecimals || hasDecimals) ? 2 : 0,
    }).format(num);
  };

  // Cargar catálogo inicial de proveedores y artículos
  useEffect(() => {
    const init = async () => {
      setLoadingInicial(true);
      try {
        const [resProv, resArt] = await Promise.all([
          comprasService.getProveedoresDirectorio(1, 100),
          comprasService.getArticulos({ activo: true, es_comprable: true, limit: 200 }),
        ]);

        setProveedores(resProv.data || []);
        const articulos = (resArt as any)?.items || (resArt as any)?.data || [];
        setCatalogoArticulos(articulos);
      } catch (e) {
        console.error('Error al inicializar formulario:', e);
        toast.error('No se pudieron cargar los datos maestros');
      } finally {
        setLoadingInicial(false);
      }
    };

    init();
  }, []);

  // Cerrar menú de autocompletado si hace clic afuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setMenuArticulosAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  // Al seleccionar proveedor, cargar su sourcing de precios pactados
  useEffect(() => {
    if (!idProveedorSeleccionado) {
      setSourcingProveedor(new Map());
      return;
    }

    const cargarSourcing = async () => {
      try {
        const items = await ordenesCompraService.getSourcingProveedor(idProveedorSeleccionado);
        const mapa = new Map<number, ArticuloSourcing>();
        for (const item of items) {
          mapa.set(item.id_componente, item);
        }
        setSourcingProveedor(mapa);
      } catch (e) {
        console.error('Error al obtener sourcing:', e);
      }
    };

    cargarSourcing();
  }, [idProveedorSeleccionado]);

  // Al seleccionar un artículo del buscador, calcular precio sugerido
  const seleccionarArticuloParaAgregar = (art: ArticuloMaestro) => {
    setArticuloSeleccionado(art);
    setBusquedaArticulo(`${art.codigo_interno ? `[${art.codigo_interno}] ` : ''}${art.descripcion_corta}`);
    setMenuArticulosAbierto(false);

    const pactado = sourcingProveedor.get(art.id_componente);
    if (pactado && pactado.es_pactado) {
      setPrecioParaAgregar(pactado.costo_actual);
      setEsPrecioPactadoItem(true);
    } else {
      setPrecioParaAgregar(Number(art.precio_compra || 0));
      setEsPrecioPactadoItem(false);
    }
    setCantidadParaAgregar(1);
    setObsParaAgregar('');
  };

  // Proveedor seleccionado actualmente
  const proveedorActual = useMemo(() => {
    return proveedores.find((p) => p.id_proveedor === idProveedorSeleccionado);
  }, [proveedores, idProveedorSeleccionado]);

  // Artículos filtrados para el buscador unificado
  const articulosFiltrados = useMemo(() => {
    if (!busquedaArticulo.trim()) {
      return catalogoArticulos.slice(0, 15);
    }
    const q = busquedaArticulo.toLowerCase().trim();
    return catalogoArticulos
      .filter((a) => {
        const cod = (a.codigo_interno || '').toLowerCase();
        const ref = (a.referencia_fabricante || '').toLowerCase();
        const desc = (a.descripcion_corta || '').toLowerCase();
        return cod.includes(q) || ref.includes(q) || desc.includes(q);
      })
      .slice(0, 20);
  }, [catalogoArticulos, busquedaArticulo]);

  // Agregar línea a la tabla
  const handleAgregarLinea = () => {
    if (!articuloSeleccionado) {
      toast.warning('Seleccione un artículo del catálogo');
      return;
    }
    if (cantidadParaAgregar <= 0) {
      toast.warning('La cantidad debe ser mayor a 0');
      return;
    }
    if (precioParaAgregar < 0) {
      toast.warning('El precio unitario no puede ser negativo');
      return;
    }

    // Verificar si ya está en la orden
    const yaExiste = lineas.some((l) => l.id_componente === articuloSeleccionado.id_componente);
    if (yaExiste) {
      toast.info('El artículo ya se encuentra en la orden. Modifique su cantidad en la tabla.');
      return;
    }

    const nuevaLinea: LineaOrdenCompra = {
      id_temp: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      id_componente: articuloSeleccionado.id_componente,
      codigo_interno: articuloSeleccionado.codigo_interno,
      descripcion_corta: articuloSeleccionado.descripcion_corta,
      referencia_fabricante: articuloSeleccionado.referencia_fabricante || '',
      unidad_medida: articuloSeleccionado.unidad_medida || 'UND',
      cantidad: cantidadParaAgregar,
      precio_unitario: precioParaAgregar,
      es_pactado: esPrecioPactadoItem,
      observaciones: obsParaAgregar.trim() || undefined,
    };

    setLineas((prev) => [...prev, nuevaLinea]);
    toast.success(`Añadido: ${articuloSeleccionado.descripcion_corta}`);

    // Limpiar selector
    setArticuloSeleccionado(null);
    setBusquedaArticulo('');
    setCantidadParaAgregar(1);
    setPrecioParaAgregar(0);
    setObsParaAgregar('');
  };

  // Modificar cantidad en tabla
  const handleCambiarCantidad = (index: number, nuevaCant: number) => {
    setLineas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], cantidad: nuevaCant < 0 ? 0 : nuevaCant };
      return copy;
    });
  };

  // Modificar precio en tabla
  const handleCambiarPrecio = (index: number, nuevoPrecio: number) => {
    setLineas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], precio_unitario: nuevoPrecio < 0 ? 0 : nuevoPrecio };
      return copy;
    });
  };

  // Eliminar línea
  const handleEliminarLinea = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
    toast.info('Línea eliminada de la orden');
  };

  // Liquidación Financiera en vivo
  const liquidacion = useMemo(() => {
    const subtotal = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0);
    const porcentajeIva = 19;
    const baseGravable = subtotal;
    const iva = Math.round(baseGravable * (porcentajeIva / 100));
    const totalNeto = subtotal + iva;

    return {
      subtotal,
      baseGravable,
      porcentajeIva,
      iva,
      totalNeto,
    };
  }, [lineas]);

  // Guardar Orden (Borrador o Emisión Inmediata)
  const handleGuardarOrden = async (emitirDirectamente = false) => {
    if (!idProveedorSeleccionado) {
      toast.warning('Debe seleccionar un proveedor homologado');
      return;
    }
    if (lineas.length === 0) {
      toast.warning('Debe agregar al menos un artículo a la orden de compra');
      return;
    }
    for (const l of lineas) {
      if (l.cantidad <= 0) {
        toast.warning(`La cantidad para ${l.descripcion_corta} debe ser mayor a 0`);
        return;
      }
    }

    setGuardando(true);
    try {
      const payload: CrearOrdenCompraPayload = {
        id_proveedor: idProveedorSeleccionado,
        fecha_necesidad: fechaNecesidad ? fechaNecesidad : undefined,
        observaciones: observacionesGenerales.trim() || undefined,
        items: lineas.map((l) => ({
          id_componente: l.id_componente,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          observaciones: l.observaciones,
        })),
      };

      if (!esNumeroAutomatico && numeroOrdenPersonalizado.trim()) {
        payload.numero_orden_compra = numeroOrdenPersonalizado.trim();
      }

      // 1. Crear Orden en estado BORRADOR
      const ordenCreada = await ordenesCompraService.createOrden(payload);

      // 2. Si se solicitó emitir inmediatamente:
      if (emitirDirectamente) {
        await ordenesCompraService.enviarOrden(ordenCreada.id_orden_compra);
        toast.success(
          `Orden ${ordenCreada.numero_orden_compra} emitida formalmente y enviada al proveedor`,
        );
      } else {
        toast.success(
          `Orden ${ordenCreada.numero_orden_compra} guardada como Borrador exitosamente`,
        );
      }

      // Redirigir al listado
      router.push('/compras/ordenes');
    } catch (e: any) {
      console.error('Error al guardar orden:', e);
      const msg = e.response?.data?.message || 'Error al procesar la orden de compra';
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  if (loadingInicial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Inicializando entorno de compras y cotizaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* ENCABEZADO CON NAVEGACIÓN Y ACCIONES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/compras/ordenes">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
              title="Volver a Órdenes"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Nueva Orden de Compra
              </h1>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                Emisión Comercial
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Correlativo determinista formal, sourcing de cotizaciones y liquidación comercial en vivo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGuardarOrden(false)}
            disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
            className="h-10 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            {guardando ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
            )}
            Guardar Borrador
          </Button>

          <Button
            size="sm"
            onClick={() => handleGuardarOrden(true)}
            disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
            className="h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {guardando ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Emitir y Enviar Orden
          </Button>
        </div>
      </div>

      {/* BLOQUE 1: PROVEEDOR Y CABECERA COMERCIAL */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl p-6">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            1. Cabecera Comercial y Datos del Proveedor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Seleccione el proveedor homologado y defina los términos comerciales de entrega.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Selector de Proveedor */}
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                Proveedor Homologado <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={idProveedorSeleccionado ? String(idProveedorSeleccionado) : ''}
                onValueChange={(val) => setIdProveedorSeleccionado(parseInt(val, 10))}
              >
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-sm h-10 rounded-lg">
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-lg max-h-60">
                  {proveedores.map((p) => (
                    <SelectItem key={p.id_proveedor} value={String(p.id_proveedor)}>
                      {p.persona?.razon_social || p.persona?.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {proveedorActual && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">NIT:</span>
                    <span className="text-slate-900 font-mono font-semibold">
                      {proveedorActual.persona?.numero_identificacion || 'N/A'}
                    </span>
                  </div>
                  {sourcingProveedor.size > 0 && (
                    <div className="text-emerald-700 font-semibold flex items-center gap-1.5 pt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{sourcingProveedor.size} artículo(s) con cotización pactada</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Correlativo de Orden */}
            <div className="space-y-1.5 md:col-span-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Número de Orden</Label>
                <button
                  type="button"
                  onClick={() => setEsNumeroAutomatico(!esNumeroAutomatico)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  {esNumeroAutomatico ? 'Usar manual' : 'Usar automático'}
                </button>
              </div>

              {esNumeroAutomatico ? (
                <div className="h-10 px-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between font-mono text-xs text-slate-700">
                  <span className="flex items-center gap-2 font-bold text-blue-700">
                    <FileCheck className="w-4 h-4 text-blue-600" /> OC-2026-XXXX
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                    Determinista Atómico
                  </Badge>
                </div>
              ) : (
                <Input
                  placeholder="Ej: OC-MANUAL-001"
                  value={numeroOrdenPersonalizado}
                  onChange={(e) => setNumeroOrdenPersonalizado(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 text-sm font-mono h-10 rounded-lg"
                />
              )}
              <p className="text-[11px] text-slate-400">
                {esNumeroAutomatico
                  ? 'Se reservará el siguiente número correlativo libre con bloqueo atómico en BD.'
                  : 'Ingrese el correlativo acordado formalmente.'}
              </p>
            </div>

            {/* Fecha de Necesidad */}
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Fecha Requerida de Entrega
              </Label>
              <Input
                type="date"
                value={fechaNecesidad}
                onChange={(e) => setFechaNecesidad(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 text-sm h-10 rounded-lg"
              />
              <p className="text-[11px] text-slate-400">
                Fecha objetivo en la que el almacén debe recibir la mercancía.
              </p>
            </div>
          </div>

          {/* Observaciones generales */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold text-slate-700">
              Observaciones / Justificación de Compra
            </Label>
            <Textarea
              placeholder="Ej: Repuestos críticos para mantenimiento preventivo de generadores diésel Cummins..."
              value={observacionesGenerales}
              onChange={(e) => setObservacionesGenerales(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 text-xs min-h-[55px] rounded-lg"
            />
          </div>
        </div>
      </Card>

      {/* BLOQUE 2: SOURCING Y BÚSQUEDA UNIFICADA DE ARTÍCULOS */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl p-6">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            2. Selección de Artículos del Catálogo Maestro
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Buscador interactivo unificado por SKU, referencia o descripción. El sistema precarga cotizaciones pactadas o precios base.
          </p>
        </div>

        <div className="space-y-4">
          {/* Buscador Autocompletado Unificado */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            <div className="relative" ref={searchContainerRef}>
              <Label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Buscar Componente en Catálogo:
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Escriba SKU, referencia o nombre (ej: Filtro de aceite, Bomba, Cummins)..."
                  value={busquedaArticulo}
                  onChange={(e) => {
                    setBusquedaArticulo(e.target.value);
                    setMenuArticulosAbierto(true);
                  }}
                  onFocus={() => setMenuArticulosAbierto(true)}
                  className="pl-9 bg-white border-slate-200 text-slate-900 text-sm h-10 rounded-lg focus-visible:ring-blue-500 shadow-xs"
                />
                {busquedaArticulo && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaArticulo('');
                      setArticuloSeleccionado(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Menú desplegable interactivo de sugerencias */}
              {menuArticulosAbierto && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {articulosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No se encontraron artículos que coincidan con la búsqueda.
                    </div>
                  ) : (
                    articulosFiltrados.map((art) => {
                      const pact = sourcingProveedor.get(art.id_componente);
                      const tienePrecioPactado = pact && pact.es_pactado;
                      const precioSugerido = tienePrecioPactado ? pact.costo_actual : Number(art.precio_compra || 0);

                      return (
                        <div
                          key={art.id_componente}
                          onClick={() => seleccionarArticuloParaAgregar(art)}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {art.codigo_interno || art.referencia_fabricante || `ID-${art.id_componente}`}
                              </span>
                              <span className="font-semibold text-slate-900 truncate">
                                {art.descripcion_corta}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>Unidad: {art.unidad_medida || 'UND'}</span>
                              {art.referencia_fabricante && <span>• Ref: {art.referencia_fabricante}</span>}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-slate-900">
                              {formatCOP(precioSugerido)}
                            </div>
                            {tienePrecioPactado ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                                Pactado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                                Base Catálogo
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Parámetros de la línea a agregar (Aparece cuando hay artículo seleccionado) */}
            {articuloSeleccionado && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-200 items-end">
                {/* Cantidad */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Cantidad Requerida:</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={cantidadParaAgregar}
                    onChange={(e) => setCantidadParaAgregar(parseFloat(e.target.value) || 0)}
                    className="bg-white border-slate-200 text-slate-900 text-xs font-mono h-10 rounded-lg"
                  />
                </div>

                {/* Precio Unitario */}
                <div className="sm:col-span-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Precio Unitario (COP):</Label>
                    {esPrecioPactadoItem ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                        Pactado Proveedor
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                        Base Catálogo
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={precioParaAgregar}
                    onChange={(e) => setPrecioParaAgregar(parseFloat(e.target.value) || 0)}
                    className="bg-white border-slate-200 text-slate-900 text-xs font-mono h-10 rounded-lg"
                  />
                </div>

                {/* Subtotal preliminar */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-semibold text-slate-500">Subtotal Estimado:</Label>
                  <div className="h-10 px-3 rounded-lg bg-white border border-slate-200 flex items-center font-mono text-xs font-bold text-slate-900 shadow-xs">
                    {formatCOP(cantidadParaAgregar * precioParaAgregar)}
                  </div>
                </div>

                {/* Botón agregar */}
                <div className="sm:col-span-2">
                  <Button
                    id="btn-agregar-linea"
                    type="button"
                    onClick={handleAgregarLinea}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 rounded-lg shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Añadir
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* TABLA DE LÍNEAS DE COMPRA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Líneas de la Orden ({lineas.length})
              </span>
              <span>
                Subtotal parcial:{' '}
                <strong className="text-slate-900 font-mono text-sm">{formatCOP(liquidacion.subtotal)}</strong>
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10">#</th>
                    <th className="py-3 px-3">SKU / Ref</th>
                    <th className="py-3 px-3">Descripción Componente</th>
                    <th className="py-3 px-3 text-right w-28">Cantidad</th>
                    <th className="py-3 px-3 text-right w-36">Precio Unit. (COP)</th>
                    <th className="py-3 px-3 text-right w-36">Subtotal</th>
                    <th className="py-3 px-3 text-center w-12">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lineas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        <ShoppingBag className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">No ha agregado artículos a la orden aún</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Use el buscador superior para buscar y añadir componentes del catálogo.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    lineas.map((linea, index) => (
                      <tr key={linea.id_temp} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-400">{index + 1}</td>
                        <td className="py-3 px-3 font-mono text-slate-700 font-semibold text-xs">
                          {linea.codigo_interno || linea.referencia_fabricante || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{linea.descripcion_corta}</div>
                          {linea.es_pactado && (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                              <Sparkles className="w-3 h-3" /> Cotización pactada con proveedor
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Input
                            type="number"
                            min="1"
                            value={linea.cantidad}
                            onChange={(e) => handleCambiarCantidad(index, parseFloat(e.target.value) || 0)}
                            className="h-8 text-right font-mono text-xs bg-white border-slate-200 text-slate-900 rounded-md focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={linea.precio_unitario}
                            onChange={(e) => handleCambiarPrecio(index, parseFloat(e.target.value) || 0)}
                            className="h-8 text-right font-mono text-xs bg-white border-slate-200 text-slate-900 rounded-md focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCOP(linea.cantidad * linea.precio_unitario)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminarLinea(index)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Eliminar línea"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      {/* BLOQUE 3: LIQUIDACIÓN COMERCIAL CORPORATIVA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-7 p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Info className="w-4 h-4 text-blue-600" />
            Condiciones del Ciclo Comercial
          </div>
          <p>
            • Los valores financieros se calculan con base en las cantidades pactadas y el IVA estándar vigente (19%).
          </p>
          <p>
            • Guardar como <strong>Borrador</strong> permite modificaciones posteriores antes de la notificación formal al proveedor.
          </p>
          <p>
            • Al presionar <strong>Emitir y Enviar</strong>, la orden se sella atómicamente, reserva su número formal en <code>sequence_counter</code> y queda disponible para recepción en almacén.
          </p>
        </div>

        {/* Panel de Totales Corporativo Limpio */}
        <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2.5 text-xs font-mono shadow-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal Bruto:</span>
            <span className="font-semibold text-slate-800">{formatCOP(liquidacion.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Base Gravable:</span>
            <span className="font-semibold text-slate-800">{formatCOP(liquidacion.baseGravable)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>IVA ({liquidacion.porcentajeIva}%):</span>
            <span className="font-semibold text-slate-800">{formatCOP(liquidacion.iva)}</span>
          </div>
          <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total Neto a Pagar:</span>
            <span className="text-xl font-bold text-blue-600 tabular-nums">
              {formatCOP(liquidacion.totalNeto)}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE ACCIONES INFERIOR */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link href="/compras/ordenes">
          <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs">
            Cancelar
          </Button>
        </Link>

        <Button
          variant="outline"
          onClick={() => handleGuardarOrden(false)}
          disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
          className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          {guardando ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : (
            <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
          )}
          Guardar como Borrador
        </Button>

        <Button
          onClick={() => handleGuardarOrden(true)}
          disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
        >
          {guardando ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : (
            <Send className="w-4 h-4 mr-1.5" />
          )}
          Emitir y Enviar Orden
        </Button>
      </div>
    </div>
  );
}
