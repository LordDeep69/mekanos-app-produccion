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
  precio_original: number;
  es_pactado: boolean;
  vincular_proveedor: boolean;
  codigo_proveedor?: string;
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

  // Buscador interactivo unificado de artículos con autocompletado y auto-vinculación
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [menuArticulosAbierto, setMenuArticulosAbierto] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<ArticuloMaestro | null>(null);
  const [cantidadParaAgregar, setCantidadParaAgregar] = useState<number>(1);
  const [precioParaAgregar, setPrecioParaAgregar] = useState<number>(0);
  const [precioOriginalParaAgregar, setPrecioOriginalParaAgregar] = useState<number>(0);
  const [codigoProveedorParaAgregar, setCodigoProveedorParaAgregar] = useState<string>('');
  const [obsParaAgregar, setObsParaAgregar] = useState<string>('');
  const [esPrecioPactadoItem, setEsPrecioPactadoItem] = useState<boolean>(false);
  const [vincularParaAgregar, setVincularParaAgregar] = useState<boolean>(false);

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

  // Al seleccionar un artículo del buscador, calcular precio sugerido y auto-vinculación
  const seleccionarArticuloParaAgregar = (art: ArticuloMaestro) => {
    setArticuloSeleccionado(art);
    setBusquedaArticulo(`${art.codigo_interno ? `[${art.codigo_interno}] ` : ''}${art.descripcion_corta}`);
    setMenuArticulosAbierto(false);

    const pactado = sourcingProveedor.get(art.id_componente);
    if (pactado && pactado.es_pactado) {
      setPrecioParaAgregar(pactado.costo_actual);
      setPrecioOriginalParaAgregar(pactado.costo_actual);
      setCodigoProveedorParaAgregar(pactado.referencia_proveedor || '');
      setEsPrecioPactadoItem(true);
      setVincularParaAgregar(false);
    } else {
      const precioBase = Number(art.precio_compra || 0);
      setPrecioParaAgregar(precioBase);
      setPrecioOriginalParaAgregar(precioBase);
      setCodigoProveedorParaAgregar(art.codigo_interno || art.referencia_fabricante || '');
      setEsPrecioPactadoItem(false);
      setVincularParaAgregar(true); // Base catálogo: sugerir auto-vinculación activa por defecto
    }
    setCantidadParaAgregar(1);
    setObsParaAgregar('');
  };

  // Proveedor seleccionado actualmente
  const proveedorActual = useMemo(() => {
    return proveedores.find((p) => p.id_proveedor === idProveedorSeleccionado);
  }, [proveedores, idProveedorSeleccionado]);

  // Consolidación de catálogo completo combinando catálogo general y sourcing del proveedor
  const poolArticulos = useMemo(() => {
    const mapa = new Map<number, ArticuloMaestro>();
    for (const art of catalogoArticulos) {
      mapa.set(art.id_componente, art);
    }
    for (const [id, s] of sourcingProveedor.entries()) {
      if (s.es_pactado && !mapa.has(id)) {
        mapa.set(id, {
          id_componente: s.id_componente,
          codigo_interno: s.codigo_interno,
          descripcion_corta: s.descripcion_corta,
          referencia_fabricante: s.referencia_fabricante,
          precio_compra: s.costo_actual,
          stock_actual: s.stock_actual,
          unidad_medida: s.unidad_medida,
          activo: true,
          es_comprable: true,
        } as ArticuloMaestro);
      }
    }
    return Array.from(mapa.values());
  }, [catalogoArticulos, sourcingProveedor]);

  // Segmentación predictiva jerárquica: 1. Homologado con Proveedor | 2. Catálogo General
  const { articulosPactados, articulosGenerales } = useMemo(() => {
    const q = busquedaArticulo.toLowerCase().trim();

    const coincide = (art: ArticuloMaestro) => {
      if (!q) return true;
      const cod = (art.codigo_interno || '').toLowerCase();
      const ref = (art.referencia_fabricante || '').toLowerCase();
      const desc = (art.descripcion_corta || '').toLowerCase();
      const refProv = (sourcingProveedor.get(art.id_componente)?.referencia_proveedor || '').toLowerCase();
      return cod.includes(q) || ref.includes(q) || desc.includes(q) || refProv.includes(q);
    };

    const pactados: ArticuloMaestro[] = [];
    const generales: ArticuloMaestro[] = [];

    for (const art of poolArticulos) {
      if (coincide(art)) {
        const pact = sourcingProveedor.get(art.id_componente);
        if (pact && pact.es_pactado) {
          pactados.push(art);
        } else {
          generales.push(art);
        }
      }
    }

    const maxItems = q ? 25 : 15;

    return {
      articulosPactados: pactados.slice(0, maxItems),
      articulosGenerales: generales.slice(0, maxItems),
      totalPactados: pactados.length,
      totalGenerales: generales.length,
    };
  }, [poolArticulos, sourcingProveedor, busquedaArticulo]);

  // Total global de artículos pactados para el proveedor seleccionado
  const articulosPactadosTotal = useMemo(() => {
    let count = 0;
    for (const s of sourcingProveedor.values()) {
      if (s.es_pactado) count++;
    }
    return count;
  }, [sourcingProveedor]);

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
      precio_original: precioOriginalParaAgregar,
      es_pactado: esPrecioPactadoItem,
      vincular_proveedor: vincularParaAgregar,
      codigo_proveedor: codigoProveedorParaAgregar.trim() || undefined,
      observaciones: obsParaAgregar.trim() || undefined,
    };

    setLineas((prev) => [...prev, nuevaLinea]);
    toast.success(`Añadido: ${articuloSeleccionado.descripcion_corta}`);

    // Limpiar selector
    setArticuloSeleccionado(null);
    setBusquedaArticulo('');
    setCantidadParaAgregar(1);
    setPrecioParaAgregar(0);
    setPrecioOriginalParaAgregar(0);
    setCodigoProveedorParaAgregar('');
    setObsParaAgregar('');
    setVincularParaAgregar(false);
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
      const precioSaneado = nuevoPrecio < 0 ? 0 : nuevoPrecio;
      const modificado = precioSaneado !== copy[index].precio_original;
      copy[index] = {
        ...copy[index],
        precio_unitario: precioSaneado,
        // Al modificar manualmente el precio unitario, auto-activar switch de vinculación a la matriz
        vincular_proveedor: modificado ? true : copy[index].vincular_proveedor,
      };
      return copy;
    });
  };

  // Toggle interactivo de vinculación en la tabla
  const handleToggleVincularLinea = (index: number, checked: boolean) => {
    setLineas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], vincular_proveedor: checked };
      return copy;
    });
  };

  // Modificar código/referencia del proveedor en tabla
  const handleCambiarCodigoProveedor = (index: number, nuevoCodigo: string) => {
    setLineas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], codigo_proveedor: nuevoCodigo };
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
        observaciones: observacionesGenerales ? observacionesGenerales.normalize('NFC').trim() : undefined,
        items: lineas.map((l) => ({
          id_componente: l.id_componente,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          observaciones: l.observaciones ? l.observaciones.normalize('NFC').trim() : undefined,
          vincular_proveedor: l.vincular_proveedor,
          codigo_proveedor: l.codigo_proveedor,
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
                  {articulosPactadosTotal > 0 ? (
                    <div className="text-emerald-700 font-semibold flex items-center gap-1.5 pt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{articulosPactadosTotal} artículo(s) con cotización pactada</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 font-medium flex items-center gap-1.5 pt-0.5 text-[11px]">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sin acuerdos previos (Catálogo Base)</span>
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

              {/* Menú desplegable interactivo de sugerencias segmentado jerárquicamente */}
              {menuArticulosAbierto && (
                <div
                  id="menu-articulos-dropdown"
                  className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-100"
                >
                  {articulosPactados.length === 0 && articulosGenerales.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No se encontraron artículos que coincidan con la búsqueda.
                    </div>
                  ) : (
                    <>
                      {/* GRUPO 1: CATÁLOGO HOMOLOGADO CON PROVEEDOR */}
                      {idProveedorSeleccionado && articulosPactados.length > 0 && (
                        <div>
                          <div className="sticky top-0 z-10 px-3.5 py-2 bg-emerald-50/95 backdrop-blur-xs border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Catálogo Homologado con Proveedor
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold py-0 px-1.5">
                              {articulosPactados.length} pactados
                            </Badge>
                          </div>

                          <div className="divide-y divide-emerald-50/60">
                            {articulosPactados.map((art) => {
                              const pact = sourcingProveedor.get(art.id_componente);
                              const skuProveedor = pact?.referencia_proveedor;
                              const precioPactado = pact?.costo_actual ?? Number(art.precio_compra || 0);

                              return (
                                <div
                                  key={`pactado-${art.id_componente}`}
                                  onClick={() => seleccionarArticuloParaAgregar(art)}
                                  className="p-3 hover:bg-emerald-50/50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        {art.codigo_interno || art.referencia_fabricante || `ID-${art.id_componente}`}
                                      </span>
                                      {skuProveedor && (
                                        <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          SKU Prov: {skuProveedor}
                                        </span>
                                      )}
                                      <span className="font-semibold text-slate-900 truncate">
                                        {art.descripcion_corta}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                                      <span>Unidad: {art.unidad_medida || 'UND'}</span>
                                      {art.referencia_fabricante && <span>• Ref Fab: {art.referencia_fabricante}</span>}
                                      {pact?.tiempo_entrega_dias && <span>• Entrega: {pact.tiempo_entrega_dias}d</span>}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="font-mono font-bold text-emerald-700">
                                      {formatCOP(precioPactado)}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold mt-0.5">
                                      Pactado: {formatCOP(precioPactado)}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* GRUPO 2: CATÁLOGO GENERAL DE LA EMPRESA */}
                      {articulosGenerales.length > 0 && (
                        <div>
                          <div className="sticky top-0 z-10 px-3.5 py-2 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-slate-500" />
                              Catálogo General de la Empresa
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-semibold">
                              {articulosGenerales.length} base
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {articulosGenerales.map((art) => {
                              const precioBase = Number(art.precio_compra || 0);

                              return (
                                <div
                                  key={`gral-${art.id_componente}`}
                                  onClick={() => seleccionarArticuloParaAgregar(art)}
                                  className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        {art.codigo_interno || art.referencia_fabricante || `ID-${art.id_componente}`}
                                      </span>
                                      <span className="font-semibold text-slate-800 truncate">
                                        {art.descripcion_corta}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                                      <span>Unidad: {art.unidad_medida || 'UND'}</span>
                                      {art.referencia_fabricante && <span>• Ref: {art.referencia_fabricante}</span>}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="font-mono font-bold text-slate-800">
                                      {formatCOP(precioBase)}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200 font-medium mt-0.5">
                                      Base Catálogo: {formatCOP(precioBase)}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Parámetros de la línea a agregar (Aparece cuando hay artículo seleccionado) */}
            {articuloSeleccionado && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
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
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPrecioParaAgregar(val);
                        if (val !== precioOriginalParaAgregar) {
                          setVincularParaAgregar(true);
                        }
                      }}
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

                {/* Micro-interacción: Switch de Auto-Vinculación Comercial */}
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="switch-vincular-proveedor"
                        checked={vincularParaAgregar}
                        onChange={(e) => setVincularParaAgregar(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Vincular este artículo y precio a la matriz del proveedor
                      </span>
                    </label>
                    <span className="text-[11px] text-blue-700 font-medium">
                      {vincularParaAgregar
                        ? '✓ Se actualizará articulos_proveedores y se registrará bitácora inmutable en BD'
                        : 'Cotización puntual sin actualizar matriz de compras'}
                    </span>
                  </div>

                  {/* Input dinámico: Ref. Comercial del Proveedor */}
                  {vincularParaAgregar && (
                    <div className="pt-2 border-t border-blue-200/80 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="input-ref-comercial-prov" className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-blue-600" />
                            Ref. Comercial del Proveedor: <span className="text-rose-500">*</span>
                          </Label>
                          <span className="text-[10px] text-blue-600 font-semibold bg-blue-100 px-1.5 py-0.5 rounded">
                            Homologación Comercial
                          </span>
                        </div>
                        <Input
                          id="input-ref-comercial-prov"
                          type="text"
                          placeholder="Ej: FIL-JD-884, CAT-4C4205, RE546336..."
                          value={codigoProveedorParaAgregar}
                          onChange={(e) => setCodigoProveedorParaAgregar(e.target.value)}
                          className="bg-white border-blue-300 text-slate-900 font-mono text-xs h-9 rounded-lg focus-visible:ring-blue-500 shadow-2xs"
                        />
                      </div>
                      <div className="text-[11px] text-blue-800/80 sm:max-w-xs leading-tight self-end pb-1 font-medium">
                        Código comercial con el que este suplidor identifica y factura la pieza.
                      </div>
                    </div>
                  )}
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
                          {linea.codigo_proveedor && linea.codigo_proveedor !== linea.codigo_interno && (
                            <div className="text-[10px] text-emerald-700 font-mono font-medium">
                              Prov: {linea.codigo_proveedor}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{linea.descripcion_corta}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {linea.es_pactado ? (
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cotización pactada con proveedor
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                <Tag className="w-3 h-3 text-slate-400" /> Base Catálogo General
                              </span>
                            )}
                            {linea.vincular_proveedor && (
                              <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 py-0 px-1 font-semibold">
                                Auto-vinculación activa
                              </Badge>
                            )}
                          </div>
                          {/* Micro-interacción: Switch interactivo y Referencia Comercial en la fila */}
                          <div className="mt-1.5 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] select-none group">
                                <input
                                  type="checkbox"
                                  checked={linea.vincular_proveedor}
                                  onChange={(e) => handleToggleVincularLinea(index, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                                <span className={linea.vincular_proveedor ? "text-blue-800 font-semibold group-hover:text-blue-900" : "text-slate-500 group-hover:text-slate-700"}>
                                  Vincular este artículo y precio a la matriz del proveedor
                                </span>
                              </label>
                            </div>
                            {linea.vincular_proveedor && (
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-[11px] font-semibold text-blue-900 shrink-0 flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-blue-600" /> Ref. Proveedor:
                                </span>
                                <input
                                  type="text"
                                  placeholder="Ej: FIL-JD-884..."
                                  value={linea.codigo_proveedor || ''}
                                  onChange={(e) => handleCambiarCodigoProveedor(index, e.target.value)}
                                  className="h-7 px-2.5 text-xs font-mono bg-white border border-blue-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52 shadow-2xs"
                                />
                              </div>
                            )}
                          </div>
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
