/**
 * MEKANOS S.A.S - Portal Admin
 * Ciclo 4.A: Emisión de Órdenes de Compra
 * Formulario Interactivo Amplio de Divulgación Progresiva, Sourcing de Proveedor y Liquidación Comercial en Tiempo Real
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
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

  // Selector dinámico de adición de artículos
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<number | null>(null);
  const [cantidadParaAgregar, setCantidadParaAgregar] = useState<number>(1);
  const [precioParaAgregar, setPrecioParaAgregar] = useState<number>(0);
  const [obsParaAgregar, setObsParaAgregar] = useState<string>('');
  const [esPrecioPactadoItem, setEsPrecioPactadoItem] = useState<boolean>(false);

  // Tabla reactiva de líneas
  const [lineas, setLineas] = useState<LineaOrdenCompra[]>([]);

  // Formateador COP
  const formatCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor || 0);
  };

  // Cargar catálogo inicial de proveedores y artículos
  useEffect(() => {
    const init = async () => {
      setLoadingInicial(true);
      try {
        const [resProv, resArt] = await Promise.all([
          comprasService.getProveedoresDirectorio(1, 100),
          comprasService.getArticulos({ activo: true, es_comprable: true, limit: 100 }),
        ]);

        setProveedores(resProv.data || []);
        setCatalogoArticulos(resArt.data || []);
      } catch (e) {
        console.error('Error al inicializar formulario:', e);
        toast.error('No se pudieron cargar los datos maestros');
      } finally {
        setLoadingInicial(false);
      }
    };

    init();
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

  // Al seleccionar un artículo en el dropdown de adición, calcular precio sugerido
  useEffect(() => {
    if (!articuloSeleccionadoId) {
      setPrecioParaAgregar(0);
      setEsPrecioPactadoItem(false);
      return;
    }

    const pactado = sourcingProveedor.get(articuloSeleccionadoId);
    if (pactado && pactado.es_pactado) {
      setPrecioParaAgregar(pactado.costo_actual);
      setEsPrecioPactadoItem(true);
    } else {
      const art = catalogoArticulos.find((a) => a.id_componente === articuloSeleccionadoId);
      setPrecioParaAgregar(Number(art?.precio_compra || 0));
      setEsPrecioPactadoItem(false);
    }
  }, [articuloSeleccionadoId, sourcingProveedor, catalogoArticulos]);

  // Proveedor seleccionado actualmente
  const proveedorActual = useMemo(() => {
    return proveedores.find((p) => p.id_proveedor === idProveedorSeleccionado);
  }, [proveedores, idProveedorSeleccionado]);

  // Artículos filtrados para el combobox
  const articulosFiltrados = useMemo(() => {
    if (!busquedaArticulo.trim()) return catalogoArticulos.slice(0, 15);
    const q = busquedaArticulo.toLowerCase();
    return catalogoArticulos
      .filter(
        (a) =>
          a.descripcion_corta?.toLowerCase().includes(q) ||
          a.codigo_interno?.toLowerCase().includes(q) ||
          a.referencia_fabricante?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [catalogoArticulos, busquedaArticulo]);

  // Cálculos Comerciales Transparentes
  const liquidacion = useMemo(() => {
    let subtotal = 0;
    for (const l of lineas) {
      subtotal += (l.cantidad || 0) * (l.precio_unitario || 0);
    }
    const porcentajeIva = 19;
    const baseGravable = subtotal;
    const iva = parseFloat((baseGravable * (porcentajeIva / 100)).toFixed(2));
    const totalNeto = parseFloat((baseGravable + iva).toFixed(2));

    return {
      subtotal,
      baseGravable,
      porcentajeIva,
      iva,
      totalNeto,
      totalItems: lineas.length,
    };
  }, [lineas]);

  // Agregar artículo a la tabla
  const handleAgregarLinea = () => {
    if (!articuloSeleccionadoId) {
      toast.warning('Debe seleccionar un artículo del catálogo');
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

    const art = catalogoArticulos.find((a) => a.id_componente === articuloSeleccionadoId);
    if (!art) return;

    // Verificar si ya existe en la lista
    const indexExistente = lineas.findIndex((l) => l.id_componente === articuloSeleccionadoId);
    if (indexExistente >= 0) {
      // Incrementar cantidad
      const nuevasLineas = [...lineas];
      nuevasLineas[indexExistente].cantidad += cantidadParaAgregar;
      nuevasLineas[indexExistente].precio_unitario = precioParaAgregar;
      if (obsParaAgregar) {
        nuevasLineas[indexExistente].observaciones = obsParaAgregar;
      }
      setLineas(nuevasLineas);
      toast.info(`Cantidad actualizada para ${art.descripcion_corta}`);
    } else {
      // Agregar nueva línea
      const nueva: LineaOrdenCompra = {
        id_temp: `temp-${Date.now()}-${Math.random()}`,
        id_componente: art.id_componente,
        codigo_interno: art.codigo_interno || null,
        descripcion_corta: art.descripcion_corta,
        referencia_fabricante: art.referencia_fabricante,
        unidad_medida: art.unidad_medida || 'UND',
        cantidad: cantidadParaAgregar,
        precio_unitario: precioParaAgregar,
        es_pactado: esPrecioPactadoItem,
        observaciones: obsParaAgregar.trim() || undefined,
      };
      setLineas((prev) => [...prev, nueva]);
      toast.success(`Artículo agregado a la orden`);
    }

    // Reset selector
    setArticuloSeleccionadoId(null);
    setCantidadParaAgregar(1);
    setPrecioParaAgregar(0);
    setObsParaAgregar('');
    setBusquedaArticulo('');
  };

  // Modificar cantidad en la tabla
  const handleCambiarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 0) return;
    const nuevas = [...lineas];
    nuevas[index].cantidad = nuevaCantidad;
    setLineas(nuevas);
  };

  // Modificar precio en la tabla
  const handleCambiarPrecio = (index: number, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    const nuevas = [...lineas];
    nuevas[index].precio_unitario = nuevoPrecio;
    setLineas(nuevas);
  };

  // Eliminar línea
  const handleEliminarLinea = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
    toast.info('Línea eliminada de la orden');
  };

  // Guardar Orden (Borrador o Emisión Directa)
  const handleGuardarOrden = async (emitirDirectamente = false) => {
    // Validaciones
    if (!idProveedorSeleccionado) {
      toast.warning('Debe seleccionar un proveedor para la orden');
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">Inicializando entorno de compras y cotizaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-1 sm:p-2">
      {/* Encabezado con navegación de regreso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/compras/ordenes">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Nueva Orden de Compra
              </h1>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                Emisión Comercial
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Correlativo determinista formal, sourcing de cotizaciones y liquidación comercial en vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGuardarOrden(false)}
            disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Clock className="w-4 h-4 mr-1.5 text-amber-400" />}
            Guardar Borrador
          </Button>

          <Button
            size="sm"
            onClick={() => handleGuardarOrden(true)}
            disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 font-medium"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
            Emitir y Enviar Orden
          </Button>
        </div>
      </div>

      {/* BLOQUE 1: PROVEEDOR Y CABECERA COMERCIAL */}
      <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-slate-800/80">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            1. Cabecera Comercial y Datos del Proveedor
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Seleccione el proveedor homologado y defina los términos comerciales de entrega.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Selector de Proveedor */}
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                Proveedor Homologado <span className="text-rose-400">*</span>
              </Label>
              <Select
                value={idProveedorSeleccionado ? String(idProveedorSeleccionado) : ''}
                onValueChange={(val) => setIdProveedorSeleccionado(parseInt(val, 10))}
              >
                <SelectTrigger className="bg-slate-950/80 border-slate-800 text-slate-200 text-xs">
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {proveedores.map((p) => (
                    <SelectItem key={p.id_proveedor} value={String(p.id_proveedor)}>
                      {p.persona?.razon_social || p.persona?.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {proveedorActual && (
                <div className="p-2 bg-slate-950/40 rounded border border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>NIT:</span>
                    <span className="text-slate-200 font-mono">{proveedorActual.persona?.numero_identificacion || 'N/A'}</span>
                  </div>
                  {sourcingProveedor.size > 0 && (
                    <div className="mt-1 text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {sourcingProveedor.size} artículo(s) con precios pactados
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Correlativo de Orden */}
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Número de Orden</span>
                <button
                  type="button"
                  onClick={() => setEsNumeroAutomatico(!esNumeroAutomatico)}
                  className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                >
                  {esNumeroAutomatico ? 'Usar manual' : 'Usar automático'}
                </button>
              </Label>

              {esNumeroAutomatico ? (
                <div className="h-9 px-3 rounded-md bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <FileCheck className="w-3.5 h-3.5" /> OC-2026-XXXX
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Determinista Atómico
                  </Badge>
                </div>
              ) : (
                <Input
                  placeholder="Ej: OC-MANUAL-001"
                  value={numeroOrdenPersonalizado}
                  onChange={(e) => setNumeroOrdenPersonalizado(e.target.value)}
                  className="bg-slate-950/80 border-slate-800 text-white text-xs font-mono"
                />
              )}
              <p className="text-[10px] text-slate-500">
                {esNumeroAutomatico
                  ? 'Se reservará el siguiente número correlativo libre con bloqueo atómico en BD.'
                  : 'Ingrese el correlativo exacto acordado.'}
              </p>
            </div>

            {/* Fecha de Necesidad */}
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Fecha Requerida de Entrega
              </Label>
              <Input
                type="date"
                value={fechaNecesidad}
                onChange={(e) => setFechaNecesidad(e.target.value)}
                className="bg-slate-950/80 border-slate-800 text-white text-xs"
              />
              <p className="text-[10px] text-slate-500">
                Fecha objetivo en la que el almacén debe recibir la mercancía.
              </p>
            </div>
          </div>

          {/* Observaciones generales */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-300">
              Observaciones / Justificación de Compra
            </Label>
            <Textarea
              placeholder="Ej: Repuestos críticos para mantenimiento de generadores diésel Cummins..."
              value={observacionesGenerales}
              onChange={(e) => setObservacionesGenerales(e.target.value)}
              className="bg-slate-950/80 border-slate-800 text-white text-xs min-h-[50px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 2: SOURCING Y SELECCIÓN DE ARTÍCULOS */}
      <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-slate-800/80">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            2. Selección de Artículos del Catálogo Maestro
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Busque componentes del catálogo. El sistema precargará cotizaciones pactadas o precios base de reposición.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-3 space-y-4">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Buscador de artículos */}
              <div className="sm:col-span-5 space-y-1">
                <Label className="text-xs text-slate-300">Buscar en Catálogo:</Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Filtrar por SKU o descripción..."
                    value={busquedaArticulo}
                    onChange={(e) => setBusquedaArticulo(e.target.value)}
                    className="pl-8 bg-slate-900 border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              {/* Selector de artículo */}
              <div className="sm:col-span-7 space-y-1">
                <Label className="text-xs text-slate-300">Componente a Adquirir:</Label>
                <Select
                  value={articuloSeleccionadoId ? String(articuloSeleccionadoId) : ''}
                  onValueChange={(val) => setArticuloSeleccionadoId(parseInt(val, 10))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                    <SelectValue placeholder="Seleccione un componente del catálogo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 max-h-60">
                    {articulosFiltrados.map((a) => {
                      const pact = sourcingProveedor.get(a.id_componente);
                      return (
                        <SelectItem key={a.id_componente} value={String(a.id_componente)}>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono text-slate-400 text-[11px]">
                              [{a.codigo_interno || a.referencia_fabricante}]
                            </span>
                            <span className="text-slate-200 truncate max-w-xs">{a.descripcion_corta}</span>
                            {pact?.es_pactado && (
                              <span className="text-[10px] text-emerald-400 font-semibold px-1 py-0.2 rounded bg-emerald-950/40">
                                Pactado
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parámetros de la línea a agregar */}
            {articuloSeleccionadoId && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-850 items-end">
                {/* Cantidad */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs text-slate-300">Cantidad Requerida:</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={cantidadParaAgregar}
                    onChange={(e) => setCantidadParaAgregar(parseFloat(e.target.value) || 0)}
                    className="bg-slate-900 border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                {/* Precio Unitario */}
                <div className="sm:col-span-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-300">Precio Unitario (COP):</Label>
                    {esPrecioPactadoItem ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Pactado Proveedor
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-400 border-slate-700">
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
                    className="bg-slate-900 border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                {/* Subtotal preliminar */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs text-slate-400">Subtotal Estimado:</Label>
                  <div className="h-9 px-3 rounded-md bg-slate-900/60 border border-slate-800 flex items-center font-mono text-xs text-emerald-400 font-semibold">
                    {formatCOP(cantidadParaAgregar * precioParaAgregar)}
                  </div>
                </div>

                {/* Botón agregar */}
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    onClick={handleAgregarLinea}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* TABLA DE LÍNEAS DE COMPRA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300 uppercase tracking-wider text-[11px]">
                Líneas de la Orden ({lineas.length})
              </span>
              <span>Subtotal parcial: <strong className="text-white font-mono">{formatCOP(liquidacion.subtotal)}</strong></span>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">SKU / Ref</th>
                    <th className="py-2.5 px-3">Descripción Componente</th>
                    <th className="py-2.5 px-3 text-right w-24">Cantidad</th>
                    <th className="py-2.5 px-3 text-right w-36">Precio Unit. (COP)</th>
                    <th className="py-2.5 px-3 text-right w-36">Subtotal</th>
                    <th className="py-2.5 px-3 text-center w-12">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {lineas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-500" />
                        No ha agregado artículos a la orden aún. Use el selector superior para añadir ítems.
                      </td>
                    </tr>
                  ) : (
                    lineas.map((linea, index) => (
                      <tr key={linea.id_temp} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{index + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          {linea.codigo_interno || linea.referencia_fabricante}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-200">{linea.descripcion_corta}</div>
                          {linea.es_pactado && (
                            <span className="text-[10px] text-emerald-400 font-mono">
                              • Cotización pactada
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Input
                            type="number"
                            min="1"
                            value={linea.cantidad}
                            onChange={(e) => handleCambiarCantidad(index, parseFloat(e.target.value) || 0)}
                            className="h-7 text-right font-mono text-xs bg-slate-900 border-slate-800 text-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={linea.precio_unitario}
                            onChange={(e) => handleCambiarPrecio(index, parseFloat(e.target.value) || 0)}
                            className="h-7 text-right font-mono text-xs bg-slate-900 border-slate-800 text-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                          {formatCOP(linea.cantidad * linea.precio_unitario)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminarLinea(index)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
                            title="Eliminar línea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 3: LIQUIDACIÓN COMERCIAL EN TIEMPO REAL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 p-4 bg-slate-900/40 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Info className="w-4 h-4 text-blue-400" />
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

        {/* Panel de Totales */}
        <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-2 text-xs font-mono shadow-md">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal Bruto:</span>
            <span>{formatCOP(liquidacion.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Base Gravable:</span>
            <span>{formatCOP(liquidacion.baseGravable)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>IVA ({liquidacion.porcentajeIva}%):</span>
            <span>{formatCOP(liquidacion.iva)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex justify-between text-base font-bold text-emerald-400">
            <span>Total Neto a Pagar:</span>
            <span>{formatCOP(liquidacion.totalNeto)}</span>
          </div>
        </div>
      </div>

      {/* BARRA DE ACCIONES INFERIOR */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        <Link href="/compras/ordenes">
          <Button variant="outline" className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800">
            Cancelar
          </Button>
        </Link>

        <Button
          variant="outline"
          onClick={() => handleGuardarOrden(false)}
          disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
          className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Clock className="w-4 h-4 mr-1.5 text-amber-400" />}
          Guardar como Borrador
        </Button>

        <Button
          onClick={() => handleGuardarOrden(true)}
          disabled={guardando || lineas.length === 0 || !idProveedorSeleccionado}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
          Emitir y Enviar Orden
        </Button>
      </div>
    </div>
  );
}
