'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Ficha 360° del Recurso / Artículo Maestro (Abastecimiento y Catálogo)
 * 
 * Interfaz Prémium basada en Vistas Contextuales con estados de URL (?tab=...)
 * Dividida en 4 Pestañas Funcionales:
 * 1. Ficha Técnica & Identidad
 * 2. Fuentes de Suministro (Cross-Referencing Matrix)
 * 3. Historial de Costos & Auditoría Inmutable (con Gráfica de Tendencia)
 * 4. Existencias y Bodega (Kardex)
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HardHat,
  History,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Wrench,
  X,
  AlertTriangle,
} from 'lucide-react';

import { comprasService } from '@/lib/api/compras.service';
import {
  ActualizarPrecioProveedorPayload,
  ArticuloMaestro,
  ArticuloProveedor,
  HistorialCostoCompra,
  OrigenCosto,
  VincularProveedorPayload,
} from '@/types/compras.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ComboboxWithCreate } from '@/components/ui/combobox-with-create';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArticuloForm, ArticuloFormValues } from '@/components/compras/articulo-form';

export default function FichaArticulo360Page() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idComponente = Number(params?.id);

  // Pestaña activa sincronizada con la URL
  const activeTab = searchParams.get('tab') || 'ficha';

  // Estados
  const [articulo, setArticulo] = useState<ArticuloMaestro | null>(null);
  const [fuentes, setFuentes] = useState<ArticuloProveedor[]>([]);
  const [historial, setHistorial] = useState<HistorialCostoCompra[]>([]);
  const [proveedoresCatalogo, setProveedoresCatalogo] = useState<any[]>([]);
  const [movimientosKardex, setMovimientosKardex] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de Modales
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [dialogDesactivarOpen, setDialogDesactivarOpen] = useState(false);
  const [isProcessingEstado, setIsProcessingEstado] = useState(false);
  const [modalVincularOpen, setModalVincularOpen] = useState(false);
  const [modalActualizarPrecioOpen, setModalActualizarPrecioOpen] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ArticuloProveedor | null>(null);

  // Formulario Vincular Proveedor
  const [nuevoProveedor, setNuevoProveedor] = useState<VincularProveedorPayload>({
    id_proveedor: 1,
    referencia_proveedor: '',
    marca_ofrecida: '',
    costo_actual: 0,
    moneda: 'COP',
    tiempo_entrega_dias: 1,
    cantidad_minima_compra: 1,
    es_proveedor_preferido: false,
    url_producto_proveedor: '',
    notas: '',
  });

  // Formulario Actualizar Precio
  const [actualizacionPrecio, setActualizacionPrecio] = useState<ActualizarPrecioProveedorPayload>({
    nuevo_costo: 0,
    moneda: 'COP',
    numero_factura_oc: '',
    origen_cambio: 'ACTUALIZACION_PROVEEDOR',
    observaciones: '',
  });

  // Cargar datos del artículo
  const cargarDatos = async (showToast = false) => {
    if (!idComponente || isNaN(idComponente)) return;
    try {
      if (showToast) setRefreshing(true);
      const [artRes, fuentesRes, histRes, provsRes, kardexRes] = await Promise.all([
        comprasService.getArticuloById(idComponente),
        comprasService.getFuentesSuministro(idComponente),
        comprasService.getHistorialCostos(idComponente),
        comprasService.getProveedores(),
        comprasService.getKardexComponente(idComponente),
      ]);

      setArticulo(artRes);
      setFuentes(fuentesRes || []);
      setHistorial(histRes || []);
      setProveedoresCatalogo(provsRes || []);
      setMovimientosKardex(kardexRes || []);

      if (provsRes && provsRes.length > 0) {
        setNuevoProveedor((prev) => ({
          ...prev,
          id_proveedor: provsRes[0].id_proveedor,
        }));
      }

      if (showToast) toast.success('Datos actualizados');
    } catch (error: any) {
      console.error('Error al cargar ficha del artículo:', error);
      toast.error('No se pudo cargar la información del artículo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [idComponente]);

  // Manejar cambio de pestaña y reflejar en URL
  const handleTabChange = (value: string) => {
    router.replace(`/compras/catalogo/${idComponente}?tab=${value}`, { scroll: false });
  };

  // Handler para Actualizar Recurso (ArticuloForm en modo edit)
  const handleActualizarArticulo = async (values: ArticuloFormValues) => {
    try {
      setIsSubmittingEdit(true);
      toast.loading('Actualizando recurso maestro...', { id: 'edit-articulo' });

      // Sanitizar payload: NUNCA enviar stock_actual en update (regla inmutable Zero-Trust)
      const payload: any = {
        id_categoria: values.id_categoria ? Number(values.id_categoria) : undefined,
        codigo_interno: values.codigo_interno || undefined,
        referencia_fabricante: values.referencia_fabricante,
        marca: values.marca || undefined,
        id_marca: values.id_marca ? Number(values.id_marca) : null,
        descripcion_corta: values.descripcion_corta,
        descripcion_detallada: values.descripcion_detallada || undefined,
        unidad_medida: values.unidad_medida,
        codigo_unidad_medida: values.codigo_unidad_medida || null,
        tipo_comercial: values.tipo_comercial,
        destino_articulo: values.destino_articulo,
        es_comprable: Boolean(values.es_comprable),
        es_inventariable: Boolean(values.es_inventariable),
        es_facturable: Boolean(values.es_facturable),
        requiere_serializacion: Boolean(values.requiere_serializacion),
        es_activo_fijo: Boolean(values.es_activo_fijo),
        numero_serie_activo: values.numero_serie_activo || undefined,
        placa_inventario: values.placa_inventario || undefined,
        frecuencia_mantenimiento_meses: values.frecuencia_mantenimiento_meses
          ? Number(values.frecuencia_mantenimiento_meses)
          : null,
        stock_minimo: Number(values.stock_minimo || 0),
        precio_compra:
          values.precio_compra !== null && values.precio_compra !== undefined
            ? Number(values.precio_compra)
            : null,
        precio_venta:
          values.precio_venta !== null && values.precio_venta !== undefined
            ? Number(values.precio_venta)
            : null,
        margen_utilidad_porcentaje:
          values.margen_utilidad_porcentaje !== null && values.margen_utilidad_porcentaje !== undefined
            ? Number(values.margen_utilidad_porcentaje)
            : null,
        moneda: values.moneda || 'COP',
        observaciones: values.observaciones || undefined,
        notas_instalacion: values.notas_instalacion || undefined,
      };

      await comprasService.updateArticulo(idComponente, payload);
      toast.success('Recurso maestro actualizado con éxito', { id: 'edit-articulo' });
      setModalEditarOpen(false);
      cargarDatos(true);
    } catch (error: any) {
      console.error('Error al actualizar artículo:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al actualizar el recurso.';
      toast.error('No se pudo actualizar el artículo', {
        id: 'edit-articulo',
        description: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handler para Desactivar / Reactivar Recurso con Guardas de Integridad Zero-Trust
  const handleToggleEstado = async () => {
    try {
      setIsProcessingEstado(true);
      if (articulo?.activo) {
        toast.loading('Validando integridad y desactivando recurso...', { id: 'toggle-estado' });
        await comprasService.deleteArticulo(idComponente);
        toast.success('Recurso desactivado y archivado correctamente', { id: 'toggle-estado' });
        setDialogDesactivarOpen(false);
      } else {
        toast.loading('Reactivando recurso maestro...', { id: 'toggle-estado' });
        await comprasService.reactivarArticulo(idComponente);
        toast.success('Recurso reactivado con éxito en el catálogo operativo', { id: 'toggle-estado' });
      }
      cargarDatos(true);
    } catch (error: any) {
      console.error('Error al modificar estado del artículo:', error);
      const msg = error?.response?.data?.message || error?.message || 'Operación denegada por integridad.';
      toast.error('Guarda de Integridad Bloqueó la Acción', {
        id: 'toggle-estado',
        description: Array.isArray(msg) ? msg.join(', ') : msg,
        duration: 5000,
      });
    } finally {
      setIsProcessingEstado(false);
    }
  };

  // Proveedor Preferido
  const proveedorPreferido = useMemo(() => {
    return fuentes.find((f) => f.es_proveedor_preferido) || fuentes[0];
  }, [fuentes]);

  // Estadísticas del Historial
  const metricasCostos = useMemo(() => {
    if (!historial || historial.length === 0) {
      return {
        min: Number(articulo?.precio_compra || 0),
        max: Number(articulo?.precio_compra || 0),
        ultimo: Number(articulo?.precio_compra || 0),
        variacionTotal: 0,
      };
    }
    const costos = historial.map((h) => Number(h.costo_unitario)).filter((c) => !isNaN(c) && c > 0);
    if (costos.length === 0) return { min: 0, max: 0, ultimo: 0, variacionTotal: 0 };

    const min = Math.min(...costos);
    const max = Math.max(...costos);
    const ultimo = costos[0];
    const inicial = costos[costos.length - 1];
    const variacionTotal = inicial > 0 ? ((ultimo - inicial) / inicial) * 100 : 0;

    return { min, max, ultimo, variacionTotal };
  }, [historial, articulo]);

  // Handler para Vincular Proveedor
  const handleVincularProveedor = async () => {
    try {
      if (!nuevoProveedor.referencia_proveedor.trim()) {
        toast.error('El SKU o referencia del proveedor es obligatorio');
        return;
      }
      toast.loading('Vinculando fuente de suministro...', { id: 'vincular' });
      await comprasService.vincularProveedor(idComponente, nuevoProveedor);
      toast.success('Fuente de suministro vinculada exitosamente', { id: 'vincular' });
      setModalVincularOpen(false);
      cargarDatos();
    } catch (e: any) {
      toast.error('Error al vincular proveedor', {
        id: 'vincular',
        description: e?.response?.data?.message || e?.message,
      });
    }
  };

  // Handler para Actualizar Precio
  const handleActualizarPrecio = async () => {
    if (!proveedorSeleccionado) return;
    try {
      if (Number(actualizacionPrecio.nuevo_costo) <= 0) {
        toast.error('El nuevo costo debe ser mayor a 0');
        return;
      }
      toast.loading('Registrando nuevo costo en bitácora inmutable...', { id: 'act-precio' });
      const res = await comprasService.actualizarPrecioProveedor(
        idComponente,
        proveedorSeleccionado.id_proveedor,
        actualizacionPrecio
      );
      toast.success(
        `Precio actualizado (${res.variacion_porcentual > 0 ? '+' : ''}${res.variacion_porcentual}%)`,
        { id: 'act-precio' }
      );
      setModalActualizarPrecioOpen(false);
      cargarDatos();
    } catch (e: any) {
      toast.error('Error al actualizar precio', {
        id: 'act-precio',
        description: e?.response?.data?.message || e?.message,
      });
    }
  };

  // Handler para Desvincular Proveedor
  const handleDesvincular = async (idProveedor: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de desvincular a '${nombre}' como proveedor de este artículo?`)) {
      return;
    }
    try {
      await comprasService.desvincularProveedor(idComponente, idProveedor);
      toast.success('Proveedor desvinculado');
      cargarDatos();
    } catch (e: any) {
      toast.error('No se pudo desvincular el proveedor');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm font-medium text-gray-500">Cargando ficha 360° del recurso...</p>
      </div>
    );
  }

  if (!articulo) {
    return (
      <div className="mx-auto max-w-md text-center py-16 space-y-4">
        <Boxes className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-800">Recurso No Encontrado</h2>
        <p className="text-sm text-gray-500">
          El artículo con ID {idComponente} no existe o fue eliminado del catálogo.
        </p>
        <Button asChild>
          <Link href="/compras/catalogo">Volver al Catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* NAVEGACIÓN Y BREADCRUMB */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/compras/catalogo"
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Catálogo Maestro
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-mono text-xs font-semibold text-gray-700">
            {articulo.codigo_interno || articulo.referencia_fabricante}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Principal: Editar Recurso Maestro */}
          <Button
            onClick={() => setModalEditarOpen(true)}
            size="sm"
            className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Editar Recurso
          </Button>

          {/* Botón de Ciclo de Vida: Desactivar / Reactivar */}
          {articulo.activo ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogDesactivarOpen(true)}
              disabled={isProcessingEstado}
              className="h-9 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Desactivar Recurso
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleEstado}
              disabled={isProcessingEstado}
              className="h-9 text-xs border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Reactivar Recurso
            </Button>
          )}

          <Button variant="outline" size="sm" asChild className="h-9 text-xs">
            <Link href={`/inventario?q=${articulo.referencia_fabricante}`}>
              <Boxes className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              Ver en Kardex
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarDatos(true)}
            disabled={refreshing}
            className="h-9 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* BANNER INFORMATIVO SI EL RECURSO ESTÁ INACTIVO */}
      {!articulo.activo && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-800">Recurso Desactivado / Archivado en Catálogo Maestro</p>
              <p className="text-red-700">
                Este artículo se encuentra bloqueado para cotizaciones y nuevas órdenes de compra. Su histórico contable y Kardex se mantienen inmutables.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleToggleEstado}
            disabled={isProcessingEstado}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold self-start sm:self-auto shadow-sm"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Reactivar Ahora
          </Button>
        </div>
      )}

      {/* HERO HEADER: FICHA DE IMPACTO 360° */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {/* BLOQUE SUPERIOR DE IDENTIDAD Y TAXONOMÍA */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Badge de Arquetipo */}
            <Badge
              className={
                articulo.destino_articulo === 'INSUMO_SERVICIO'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : articulo.destino_articulo === 'HERRAMIENTA_ACTIVO'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : articulo.destino_articulo === 'REPUESTO_CORRECTIVO'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  : articulo.destino_articulo === 'DOTACION_EPP'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-purple-100 text-purple-800 border-purple-200'
              }
            >
              {articulo.destino_articulo === 'INSUMO_SERVICIO' && <Wrench className="mr-1 h-3 w-3" />}
              {articulo.destino_articulo === 'HERRAMIENTA_ACTIVO' && <ShieldCheck className="mr-1 h-3 w-3" />}
              {articulo.destino_articulo === 'DOTACION_EPP' && <HardHat className="mr-1 h-3 w-3" />}
              {articulo.destino_articulo.replace('_', ' ')}
            </Badge>

            {/* Badges de Atributos */}
            {articulo.es_comprable && (
              <Badge variant="outline" className="border-gray-300 text-gray-700 text-[11px]">
                Comprable
              </Badge>
            )}
            {articulo.es_inventariable && (
              <Badge variant="outline" className="border-gray-300 text-gray-700 text-[11px]">
                Inventariable
              </Badge>
            )}
            {articulo.requiere_serializacion && (
              <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[11px]">
                Serializado
              </Badge>
            )}
            {articulo.activo ? (
              <Badge className="bg-emerald-600 text-white text-[11px]">Activo</Badge>
            ) : (
              <Badge variant="destructive" className="text-[11px]">Inactivo</Badge>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
              {articulo.descripcion_corta || articulo.referencia_fabricante}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
              <span>
                Ref. Fabricante: <strong className="font-mono text-gray-800">{articulo.referencia_fabricante}</strong>
              </span>
              {articulo.codigo_interno && (
                <span>
                  SKU Interno: <strong className="font-mono text-blue-700">{articulo.codigo_interno}</strong>
                </span>
              )}
              {articulo.marcas ? (
                <span className="flex items-center gap-1.5">
                  Marca: <strong className="text-gray-900">{articulo.marcas.nombre}</strong>
                  {articulo.marcas.es_fabricante_oem && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 font-semibold">
                      OEM
                    </Badge>
                  )}
                  {articulo.marcas.pais_origen && (
                    <span className="text-[11px] text-gray-400">({articulo.marcas.pais_origen})</span>
                  )}
                </span>
              ) : articulo.marca ? (
                <span>
                  Marca: <strong className="text-gray-800">{articulo.marca}</strong>
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                Categoría: <strong className="text-gray-900">{articulo.categorias_componente?.nombre || articulo.tipos_componente?.nombre_componente || 'General'}</strong>
                {articulo.categorias_componente?.ruta_jerarquica && (
                  <Badge variant="outline" className="text-[10px] text-gray-600 bg-gray-50 border-gray-200 font-mono">
                    {articulo.categorias_componente.ruta_jerarquica}
                  </Badge>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* FLASH METRICS CARDS: FILA DEDICADA DE ANCHO COMPLETO CON MÁXIMA HOLGURA TIPOGRÁFICA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full pt-4 mt-4 border-t border-slate-100">
          {/* Costo Preferido */}
          <div className="rounded-xl border border-gray-200/90 bg-gray-50/70 p-3.5 text-left transition-all hover:bg-gray-50">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Costo Adquisición</span>
            <p className="mt-1 font-mono text-xl font-bold text-gray-900 truncate" title={`$${Number(proveedorPreferido?.costo_actual || articulo.precio_compra || 0).toLocaleString()}`}>
              ${Number(proveedorPreferido?.costo_actual || articulo.precio_compra || 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
              {proveedorPreferido ? 'Prov. preferido' : 'Costo base'}
            </span>
          </div>

          {/* Precio Venta / Margen */}
          <div className="rounded-xl border border-blue-200/70 bg-blue-50/40 p-3.5 text-left transition-all hover:bg-blue-50/70">
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">Precio Venta Sug.</span>
            <p className="mt-1 font-mono text-xl font-bold text-blue-700 truncate" title={`$${Number(articulo.precio_venta || 0).toLocaleString()}`}>
              ${Number(articulo.precio_venta || 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-blue-600 font-medium block mt-0.5">
              {articulo.margen_utilidad_porcentaje ? `${articulo.margen_utilidad_porcentaje}% margen comercial` : 'Sin margen definido'}
            </span>
          </div>

          {/* Stock Actual */}
          <div className="rounded-xl border border-gray-200/90 bg-gray-50/70 p-3.5 text-left transition-all hover:bg-gray-50">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Stock en Bodega</span>
            <p className="mt-1 font-mono text-xl font-bold text-gray-900">
              {articulo.stock_actual} <span className="text-xs font-medium text-gray-500">{articulo.unidad_medida}</span>
            </p>
            <span className="text-[11px] text-gray-400 font-medium block mt-0.5">Stock mín: {articulo.stock_minimo}</span>
          </div>

          {/* Fuentes Suministro */}
          <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3.5 text-left transition-all hover:bg-indigo-50/70">
            <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">Fuentes Suministro</span>
            <p className="mt-1 font-mono text-xl font-bold text-indigo-700">
              {fuentes.length}
            </p>
            <span className="text-[11px] text-indigo-600 font-medium block mt-0.5">
              {fuentes.length === 1 ? '1 proveedor homologado' : `${fuentes.length} proveedores homologados`}
            </span>
          </div>
        </div>
      </div>

      {/* PESTAÑAS 360° SINCRONIZADAS CON URL */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-100/80 p-1 rounded-xl h-auto border border-gray-200">
          <TabsTrigger
            value="ficha"
            className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg"
          >
            <FileText className="h-4 w-4" />
            1. Ficha Técnica e Identidad
          </TabsTrigger>

          <TabsTrigger
            value="fuentes"
            className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg"
          >
            <Truck className="h-4 w-4" />
            2. Fuentes de Suministro ({fuentes.length})
          </TabsTrigger>

          <TabsTrigger
            value="historial"
            className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg"
          >
            <History className="h-4 w-4" />
            3. Historial de Costos ({historial.length})
          </TabsTrigger>

          <TabsTrigger
            value="existencias"
            className="flex items-center gap-2 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg"
          >
            <Boxes className="h-4 w-4" />
            4. Existencias y Bodega
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 1: FICHA TÉCNICA E IDENTIDAD */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="ficha" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Especificaciones y Datos Neutrales */}
            <Card className="border border-gray-200 shadow-sm lg:col-span-2 bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-900">
                  Especificaciones Técnicas del Fabricante
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Información técnica neutral y descripción detallada del recurso.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Descripción Detallada
                  </h4>
                  <p className="mt-1 text-sm text-gray-800 leading-relaxed">
                    {articulo.descripcion_detallada ||
                      articulo.descripcion_corta ||
                      'Sin descripción técnica registrada.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 pt-4 border-t border-gray-100">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-xs text-gray-400">Categoría Taxonómica</span>
                    <p className="font-semibold text-sm text-gray-900">
                      {articulo.categorias_componente?.nombre || articulo.tipos_componente?.nombre_componente || 'N/A'}
                    </p>
                    {articulo.categorias_componente?.ruta_jerarquica && (
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        {articulo.categorias_componente.ruta_jerarquica}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Marca del Fabricante</span>
                    {articulo.marcas ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-sm text-gray-900">{articulo.marcas.nombre}</span>
                        {articulo.marcas.es_fabricante_oem && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1 py-0 font-semibold">
                            OEM
                          </Badge>
                        )}
                        {articulo.marcas.pais_origen && (
                          <span className="text-[10px] text-gray-400">({articulo.marcas.pais_origen})</span>
                        )}
                      </div>
                    ) : (
                      <p className="font-semibold text-sm text-gray-900">{articulo.marca || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Unidad de Medida</span>
                    <p className="font-semibold text-sm text-gray-900">
                      {articulo.unidades_medida
                        ? `${articulo.unidades_medida.nombre} (${articulo.unidades_medida.simbolo})`
                        : articulo.unidad_medida}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Clase Comercial</span>
                    <p className="font-semibold text-sm text-gray-900">{articulo.tipo_comercial || 'ORIGINAL'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Moneda Base</span>
                    <p className="font-semibold text-sm text-gray-900">{articulo.moneda}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Fecha de Alta</span>
                    <p className="font-semibold text-sm text-gray-900">
                      {new Date(articulo.fecha_creacion).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {articulo.notas_instalacion && (
                  <div className="rounded-lg bg-amber-50/60 border border-amber-200 p-4 space-y-1">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-amber-700" />
                      Instrucciones de Instalación / Seguridad
                    </span>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {articulo.notas_instalacion}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Panel Lateral: Roles, Herramientas y Control Interno */}
            <div className="space-y-6">
              {articulo.destino_articulo === 'HERRAMIENTA_ACTIVO' && (
                <Card className="border-2 border-amber-400 bg-amber-50/20 shadow-sm">
                  <CardHeader className="border-b border-amber-200/60 pb-3 bg-amber-100/40">
                    <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-700" />
                      Ficha de Activo / Herramienta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div>
                      <span className="text-gray-500">Número de Serie:</span>
                      <p className="font-mono font-bold text-gray-900 text-sm">
                        {articulo.numero_serie_activo || 'Sin serial asignado'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Placa de Inventario:</span>
                      <p className="font-mono font-bold text-gray-900">
                        {articulo.placa_inventario || 'Sin placa'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Frecuencia de Mantenimiento:</span>
                      <p className="font-semibold text-gray-900">
                        {articulo.frecuencia_mantenimiento_meses
                          ? `Cada ${articulo.frecuencia_mantenimiento_meses} meses`
                          : 'No definida'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-amber-200/50 flex items-center justify-between">
                      <span className="text-gray-500">Activo Fijo Contable:</span>
                      <Badge variant="outline" className="border-amber-400 text-amber-900">
                        {articulo.es_activo_fijo ? 'Sí (Depreciable)' : 'Herramienta menor'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card de Reglas de Negocio */}
              <Card className="border border-gray-200 shadow-sm bg-white">
                <CardHeader className="border-b border-gray-100 pb-3 bg-gray-50/50">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-blue-600" />
                    Reglas Operativas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Aprovisionable por Compras:</span>
                    <Badge variant={articulo.es_comprable ? 'default' : 'secondary'} className="text-[10px]">
                      {articulo.es_comprable ? 'Habilitado' : 'Deshabilitado'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Maneja Stock en Bodega:</span>
                    <Badge variant={articulo.es_inventariable ? 'default' : 'secondary'} className="text-[10px]">
                      {articulo.es_inventariable ? 'Sí (Kardex)' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-600">Facturable a Clientes:</span>
                    <Badge variant={articulo.es_facturable ? 'default' : 'secondary'} className="text-[10px]">
                      {articulo.es_facturable ? 'Sí (OT / Servicio)' : 'No (Uso interno)'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 2: FUENTES DE SUMINISTRO (CROSS-REFERENCING MATRIX) */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="fuentes" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-indigo-600" />
                    Matriz de Referencias Cruzadas (Cross-Referencing)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Proveedores que comercializan este artículo, con sus códigos específicos, costos negociados y condiciones de entrega.
                  </CardDescription>
                </div>

                <Button
                  onClick={() => {
                    setNuevoProveedor({
                      id_proveedor: proveedoresCatalogo[0]?.id_proveedor || 1,
                      referencia_proveedor: '',
                      marca_ofrecida: articulo.marca || '',
                      costo_actual: Number(proveedorPreferido?.costo_actual || articulo.precio_compra || 0),
                      moneda: 'COP',
                      tiempo_entrega_dias: 1,
                      cantidad_minima_compra: 1,
                      es_proveedor_preferido: fuentes.length === 0,
                      escalas_precios: [],
                    });
                    setModalVincularOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm h-9"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  + Vincular Nueva Fuente
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fuentes.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Truck className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">
                    No hay proveedores vinculados a este artículo
                  </p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Vincula el primer proveedor para activar la matriz de compras, comparar costos y llevar trazabilidad histórica.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Proveedor</th>
                        <th className="py-3 px-4">Referencia / SKU Proveedor</th>
                        <th className="py-3 px-4">Marca Ofrecida</th>
                        <th className="py-3 px-4 text-right">Costo Unitario</th>
                        <th className="py-3 px-4 text-center">Entrega</th>
                        <th className="py-3 px-4 text-center">MOQ</th>
                        <th className="py-3 px-4 text-center">Escalas</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fuentes.map((f) => {
                        const provPersona = f.proveedores?.persona;
                        const nombreProveedor =
                          provPersona?.nombre_comercial ||
                          provPersona?.razon_social ||
                          `Proveedor #${f.id_proveedor}`;
                        const nit = provPersona?.numero_identificacion;

                        return (
                          <tr key={`${f.id_componente}-${f.id_proveedor}`} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-900">{nombreProveedor}</div>
                              {nit && <span className="text-[10px] text-gray-400 font-mono">NIT: {nit}</span>}
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {f.referencia_proveedor}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-gray-700">
                              {f.marcas ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-gray-900">{f.marcas.nombre}</span>
                                  {f.marcas.es_fabricante_oem && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 px-1 py-0 font-medium"
                                    >
                                      OEM
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                f.marca_ofrecida || 'Original'
                              )}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                              ${Number(f.costo_actual).toLocaleString()} {f.moneda}
                            </td>

                            <td className="py-3 px-4 text-center text-gray-600">
                              {f.tiempo_entrega_dias ? `${f.tiempo_entrega_dias} d` : 'Inmediata'}
                            </td>

                            <td className="py-3 px-4 text-center text-gray-600">
                              {f.cantidad_minima_compra ? `${f.cantidad_minima_compra} uds` : '1 ud'}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {f.escalas_precios && f.escalas_precios.length > 0 ? (
                                <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700">
                                  {f.escalas_precios.length} niveles
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {f.es_proveedor_preferido ? (
                                <Badge className="bg-amber-500 text-white font-semibold text-[10px]">
                                  <Star className="mr-1 h-3 w-3 fill-white" />
                                  Preferido
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-gray-400">Alternativo</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setProveedorSeleccionado(f);
                                    setActualizacionPrecio({
                                      nuevo_costo: Number(f.costo_actual),
                                      moneda: f.moneda,
                                      numero_factura_oc: '',
                                      origen_cambio: 'ACTUALIZACION_PROVEEDOR',
                                      observaciones: '',
                                    });
                                    setModalActualizarPrecioOpen(true);
                                  }}
                                  className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                >
                                  <DollarSign className="h-3 w-3 mr-0.5" />
                                  Ajustar Costo
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDesvincular(f.id_proveedor, nombreProveedor)}
                                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 3: HISTORIAL DE COSTOS Y AUDITORÍA INMUTABLE */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="historial" className="space-y-6">
          {/* Tarjetas KPI de Precios Históricos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card className="border border-gray-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Último Costo Pactado</span>
              <p className="mt-1 font-mono text-xl font-extrabold text-gray-900">
                ${metricasCostos.ultimo.toLocaleString()}
              </p>
              <span className="text-[11px] text-gray-400">Vigente en abastecimiento</span>
            </Card>

            <Card className="border border-gray-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Costo Mínimo Histórico</span>
              <p className="mt-1 font-mono text-xl font-extrabold text-emerald-600">
                ${metricasCostos.min.toLocaleString()}
              </p>
              <span className="text-[11px] text-gray-400">Mejor cotización registrada</span>
            </Card>

            <Card className="border border-gray-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Costo Máximo Histórico</span>
              <p className="mt-1 font-mono text-xl font-extrabold text-red-600">
                ${metricasCostos.max.toLocaleString()}
              </p>
              <span className="text-[11px] text-gray-400">Pico más alto pagado</span>
            </Card>

            <Card className="border border-gray-200 p-4 bg-white shadow-sm">
              <span className="text-xs font-semibold text-gray-500">Variación Acumulada</span>
              <div className="mt-1 flex items-center gap-1.5">
                {metricasCostos.variacionTotal > 0 ? (
                  <TrendingUp className="h-5 w-5 text-red-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-emerald-500" />
                )}
                <p
                  className={`font-mono text-xl font-extrabold ${
                    metricasCostos.variacionTotal > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {metricasCostos.variacionTotal > 0 ? '+' : ''}
                  {metricasCostos.variacionTotal.toFixed(1)}%
                </p>
              </div>
              <span className="text-[11px] text-gray-400">Frente al costo inicial de alta</span>
            </Card>
          </div>

          {/* Gráfico Visual de Tendencia de Costos */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Tendencia Temporal de Precios de Adquisición
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {historial.length <= 1 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Se requiere al menos 2 registros en la bitácora para proyectar la curva temporal de costos.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-40 w-full relative flex items-end gap-2 pt-6 pb-2 border-b border-gray-200">
                    {historial
                      .slice()
                      .reverse()
                      .map((h, i) => {
                        const val = Number(h.costo_unitario);
                        const min = metricasCostos.min || 1;
                        const max = metricasCostos.max || 1;
                        const range = max - min || 1;
                        const heightPct = Math.max(15, Math.min(100, ((val - min) / range) * 85 + 15));
                        const fecha = new Date(h.fecha_registro).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <div
                            key={h.id_historial_costo}
                            className="flex-1 flex flex-col items-center justify-end h-full group"
                          >
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold text-gray-800 bg-white shadow border rounded px-1.5 py-0.5 mb-1 whitespace-nowrap z-10">
                              ${val.toLocaleString()}
                            </div>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full max-w-[36px] bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md hover:from-blue-700 hover:to-indigo-600 transition-all shadow-sm"
                            />
                            <span className="text-[10px] text-gray-500 mt-2 font-mono">{fecha}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla de Auditoría Inmutable (Append-Only Log) */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-700" />
                Bitácora Inmutable de Cambios de Costo
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Registro permanente de cada alza, cotización o recepción de factura para auditorías contables.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Proveedor</th>
                      <th className="py-3 px-4 text-right">Costo Registrado</th>
                      <th className="py-3 px-4 text-right">Variación</th>
                      <th className="py-3 px-4">Evento Origen</th>
                      <th className="py-3 px-4">Doc. Soporte</th>
                      <th className="py-3 px-4">Auditor / Usuario</th>
                      <th className="py-3 px-4">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-normal">
                    {historial.map((h) => {
                      const variacion = Number(h.porcentaje_variacion || 0);
                      const nombreProv =
                        h.proveedores?.persona?.nombre_comercial ||
                        h.proveedores?.persona?.razon_social ||
                        (h.id_proveedor ? `Proveedor #${h.id_proveedor}` : 'Ajuste Interno');

                      return (
                        <tr key={h.id_historial_costo} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-gray-600 text-[11px] whitespace-nowrap">
                            {new Date(h.fecha_registro).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 font-semibold text-gray-800">
                            {nombreProv}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 text-xs">
                            ${Number(h.costo_unitario).toLocaleString()} {h.moneda}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {h.costo_unitario_anterior ? (
                              <Badge
                                variant="outline"
                                className={`font-mono text-[10px] ${
                                  variacion > 0
                                    ? 'border-red-300 text-red-700 bg-red-50'
                                    : variacion < 0
                                    ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                    : 'border-gray-200 text-gray-500'
                                }`}
                              >
                                {variacion > 0 ? `+${variacion}%` : `${variacion}%`}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-mono">Base</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              {h.origen_cambio.replace('_', ' ')}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-blue-700">
                            {h.numero_factura_oc || '-'}
                          </td>

                          <td className="py-3 px-4 text-gray-600">
                            {h.usuarios?.username || 'Sistema'}
                          </td>

                          <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={h.observaciones || ''}>
                            {h.observaciones || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* PESTAÑA 4: EXISTENCIAS Y BODEGA (CONECTADA A KARDEX REAL) */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="existencias" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Tarjeta 1: Estado Físico y Nivel de Existencia */}
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-blue-600" />
                    Estado Físico en Inventario
                  </div>
                  <Badge
                    className={`text-[10px] font-bold ${
                      articulo.stock_actual <= 0
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : articulo.stock_actual <= articulo.stock_minimo
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {articulo.stock_actual <= 0
                      ? 'Sin Existencias'
                      : articulo.stock_actual <= articulo.stock_minimo
                      ? 'Bajo Mínimo'
                      : 'Stock Saludable'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Saldo físico consolidado a partir de movimientos auditados en Kardex.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock Actual en Bodega:</span>
                  <span className="font-mono text-2xl font-extrabold text-gray-900">
                    {articulo.stock_actual} <span className="text-sm font-normal text-gray-500">{articulo.unidad_medida}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Punto de Reorden / Stock Mínimo:</span>
                  <span className="font-mono text-base font-bold text-gray-700">
                    {articulo.stock_minimo} <span className="text-xs font-normal text-gray-500">{articulo.unidad_medida}</span>
                  </span>
                </div>

                {/* Barra de salud de stock */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Nivel de Disponibilidad</span>
                    <span>
                      {articulo.stock_actual <= 0 ? (
                        <strong className="text-red-600">Agotado Físicamente</strong>
                      ) : articulo.stock_actual <= articulo.stock_minimo ? (
                        <strong className="text-amber-600">Alerta de Reposición Inmediata</strong>
                      ) : (
                        <strong className="text-emerald-600">Operación Óptima</strong>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          articulo.stock_minimo > 0
                            ? (articulo.stock_actual / (articulo.stock_minimo * 2)) * 100
                            : articulo.stock_actual > 0
                            ? 100
                            : 0
                        )}%`,
                      }}
                      className={`h-full rounded-full transition-all ${
                        articulo.stock_actual <= 0
                          ? 'bg-red-500'
                          : articulo.stock_actual <= articulo.stock_minimo
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Total movimientos: {movimientosKardex.length}</span>
                  <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    <Link href={`/inventario?q=${articulo.referencia_fabricante}`}>
                      <Boxes className="mr-1.5 h-3.5 w-3.5" />
                      Ir al Módulo de Kardex
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 2: Bodega y Ubicaciones Físicas Reales */}
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-700" />
                  Almacén y Ubicación de Almacenamiento
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Ubicación física identificada a través de las operaciones de Kardex.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-xs text-gray-600">
                {(() => {
                  const ubicacionesSet = new Map<number, any>();
                  movimientosKardex.forEach((m) => {
                    if (m.ubicaciones_bodega) {
                      ubicacionesSet.set(m.ubicaciones_bodega.id_ubicacion, m.ubicaciones_bodega);
                    }
                  });
                  const ubicacionesReales = Array.from(ubicacionesSet.values());

                  if (ubicacionesReales.length > 0) {
                    return (
                      <div className="space-y-3">
                        {ubicacionesReales.map((u) => (
                          <div
                            key={u.id_ubicacion}
                            className="rounded-xl bg-gray-50/80 p-4 border border-gray-200 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 text-sm">{u.zona || 'Bodega Principal'}</span>
                              <Badge variant="outline" className="font-mono text-[11px] bg-blue-50 text-blue-700 border-blue-200">
                                {u.codigo_ubicacion}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                              <div>
                                <span className="text-gray-400 block">Pasillo:</span>
                                <strong className="text-gray-800">{u.pasillo || 'N/A'}</strong>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Estante:</span>
                                <strong className="text-gray-800">{u.estante || 'N/A'}</strong>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Nivel:</span>
                                <strong className="text-gray-800">{u.nivel || 'N/A'}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-xl bg-gray-50/80 p-4 border border-gray-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Bodega / Almacén:</span>
                        <span className="font-medium text-gray-900">Almacén Central</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Estado de Ubicación:</span>
                        <Badge variant="outline" className="border-gray-300 text-gray-700 bg-white text-[10px]">
                          Ubicación General
                        </Badge>
                      </div>
                      <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                        Para asignar un pasillo, estante o nivel específico, asigne la ubicación durante la recepción de orden o traslado de bodega.
                      </p>
                    </div>
                  );
                })()}

                <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-[11px] text-blue-800">
                  🔒 <strong>Gobernanza de Existencias:</strong> Las modificaciones físicas de stock están restringidas a movimientos auditados con justificación documental obligatoria.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tarjeta 3: Mini-Historial de Movimientos de Kardex Inmutable */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <History className="h-4 w-4 text-blue-600" />
                    Trazabilidad Inmutable de Kardex (Movimientos Auditados)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Historial cronológico de entradas, salidas, traslados y aperturas registradas en la base de datos.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="text-xs h-8">
                  <Link href={`/inventario?q=${articulo.referencia_fabricante}`}>
                    Ver Kardex Completo
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {movimientosKardex.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Boxes className="h-10 w-10 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">Sin Movimientos de Inventario Registrados</p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Este recurso aún no tiene entradas ni salidas en Kardex. Las existencias se actualizarán automáticamente al recepcionar compras o ejecutar movimientos de almacén.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Fecha y Hora</th>
                        <th className="py-3 px-4">Tipo Movimiento</th>
                        <th className="py-3 px-4">Origen</th>
                        <th className="py-3 px-4 text-right">Cantidad</th>
                        <th className="py-3 px-4 text-right">Saldo Resultante</th>
                        <th className="py-3 px-4">Ubicación / Bodega</th>
                        <th className="py-3 px-4">Documento / Soporte</th>
                        <th className="py-3 px-4">Justificación / Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-normal">
                      {movimientosKardex.map((m: any) => {
                        const esEntrada = m.tipo_movimiento === 'ENTRADA';
                        const esSalida = m.tipo_movimiento === 'SALIDA';
                        const cantidadNum = Math.abs(parseFloat(m.cantidad || 0));

                        return (
                          <tr key={m.id_movimiento} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-gray-600 text-[11px] whitespace-nowrap">
                              {new Date(m.fecha_movimiento).toLocaleString()}
                            </td>

                            <td className="py-3 px-4">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  esEntrada
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : esSalida
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {m.tipo_movimiento}
                              </Badge>
                            </td>

                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-[10px] font-mono text-gray-700 bg-gray-50">
                                {m.origen_movimiento?.replace('_', ' ') || 'MOVIMIENTO'}
                              </Badge>
                            </td>

                            <td
                              className={`py-3 px-4 text-right font-mono font-bold text-xs ${
                                esEntrada ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {esEntrada ? `+${cantidadNum}` : `-${cantidadNum}`}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-extrabold text-gray-900 text-xs">
                              {m.saldo_acumulado !== undefined ? m.saldo_acumulado : '-'}
                            </td>

                            <td className="py-3 px-4 text-gray-700">
                              {m.ubicaciones_bodega ? (
                                <span className="font-mono text-[11px]">
                                  {m.ubicaciones_bodega.zona || m.ubicaciones_bodega.codigo_ubicacion}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Bodega General</span>
                              )}
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-blue-700">
                              {m.ordenes_compra?.numero_orden_compra ||
                                m.ordenes_servicio?.numero_orden ||
                                m.remisiones?.numero_remision ||
                                '-'}
                            </td>

                            <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={m.justificacion || m.observaciones || ''}>
                              {m.justificacion || m.observaciones || '-'}
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
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: VINCULAR NUEVA FUENTE DE SUMINISTRO */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {modalVincularOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Vincular Proveedor (Cross-Reference)</h3>
              </div>
              <button
                onClick={() => setModalVincularOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Seleccionar Proveedor *</Label>
                <select
                  value={nuevoProveedor.id_proveedor}
                  onChange={(e) =>
                    setNuevoProveedor({ ...nuevoProveedor, id_proveedor: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {proveedoresCatalogo.map((p) => (
                    <option key={p.id_proveedor} value={p.id_proveedor}>
                      {p.persona?.nombre_comercial || p.persona?.razon_social || `Proveedor #${p.id_proveedor}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Referencia / SKU Proveedor *</Label>
                  <Input
                    placeholder="Ej: FLT-MN-712"
                    value={nuevoProveedor.referencia_proveedor}
                    onChange={(e) =>
                      setNuevoProveedor({ ...nuevoProveedor, referencia_proveedor: e.target.value })
                    }
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Marca Ofrecida</Label>
                  <ComboboxWithCreate
                    value={nuevoProveedor.id_marca_ofrecida}
                    onChange={(idM, mObj) =>
                      setNuevoProveedor({
                        ...nuevoProveedor,
                        id_marca_ofrecida: idM || undefined,
                        marca_ofrecida: mObj ? mObj.nombre : '',
                      })
                    }
                    placeholder="Marca suministrada..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Costo Actual ($ COP) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={nuevoProveedor.costo_actual}
                    onChange={(e) =>
                      setNuevoProveedor({ ...nuevoProveedor, costo_actual: Number(e.target.value) })
                    }
                    className="font-mono font-bold text-emerald-700 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Tiempo de Entrega (Días)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={nuevoProveedor.tiempo_entrega_dias || 1}
                    onChange={(e) =>
                      setNuevoProveedor({
                        ...nuevoProveedor,
                        tiempo_entrega_dias: Number(e.target.value),
                      })
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="modal-pref"
                  checked={nuevoProveedor.es_proveedor_preferido}
                  onCheckedChange={(checked) =>
                    setNuevoProveedor({ ...nuevoProveedor, es_proveedor_preferido: checked })
                  }
                />
                <Label htmlFor="modal-pref" className="text-xs text-gray-700 cursor-pointer">
                  Marcar como Proveedor Preferido para este artículo
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setModalVincularOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleVincularProveedor}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Vincular Fuente de Suministro
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ACTUALIZAR COSTO DE PROVEEDOR CON AUDITORÍA INMUTABLE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {modalActualizarPrecioOpen && proveedorSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-gray-900">Actualizar Costo de Adquisición</h3>
                  <p className="text-xs text-gray-500">
                    Proveedor:{' '}
                    <strong>
                      {proveedorSeleccionado.proveedores?.persona?.nombre_comercial ||
                        proveedorSeleccionado.proveedores?.persona?.razon_social}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalActualizarPrecioOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200 flex justify-between items-center">
                <span className="text-gray-500">Costo Actual Pactado:</span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  ${Number(proveedorSeleccionado.costo_actual).toLocaleString()}{' '}
                  {proveedorSeleccionado.moneda}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Nuevo Costo Pactado ($ COP) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={actualizacionPrecio.nuevo_costo}
                  onChange={(e) =>
                    setActualizacionPrecio({
                      ...actualizacionPrecio,
                      nuevo_costo: Number(e.target.value),
                    })
                  }
                  className="font-mono font-extrabold text-base text-blue-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Evento de Origen *</Label>
                  <select
                    value={actualizacionPrecio.origen_cambio}
                    onChange={(e) =>
                      setActualizacionPrecio({
                        ...actualizacionPrecio,
                        origen_cambio: e.target.value as OrigenCosto,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none"
                  >
                    <option value="ACTUALIZACION_PROVEEDOR">Negociación / Tarifa Proveedor</option>
                    <option value="RECEPCION_FACTURA">Recepción Factura de Compra</option>
                    <option value="ORDEN_COMPRA">Orden de Compra Aprobada</option>
                    <option value="AJUSTE_AUDITORIA">Ajuste de Auditoría</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">No. Factura / OC (Opcional)</Label>
                  <Input
                    placeholder="Ej: FAC-98214"
                    value={actualizacionPrecio.numero_factura_oc || ''}
                    onChange={(e) =>
                      setActualizacionPrecio({
                        ...actualizacionPrecio,
                        numero_factura_oc: e.target.value,
                      })
                    }
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">
                  Justificación / Observaciones de Auditoría
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Motivo del cambio: incremento de fabricante, fletes, descuento pactado..."
                  value={actualizacionPrecio.observaciones || ''}
                  onChange={(e) =>
                    setActualizacionPrecio({
                      ...actualizacionPrecio,
                      observaciones: e.target.value,
                    })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setModalActualizarPrecioOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleActualizarPrecio}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirmar y Registrar en Bitácora
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL PRINCIPAL: EDITAR RECURSO MAESTRO (ENTERPRISE MAX-W-4XL) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalEditarOpen} onOpenChange={setModalEditarOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Editar Recurso Maestro: {articulo.codigo_interno || articulo.referencia_fabricante}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Actualiza la taxonomía, parámetros técnicos y política de precios. El stock físico está protegido por Kardex y no es editable directamente.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4">
            <ArticuloForm
              mode="edit"
              initialData={articulo}
              onSubmit={handleActualizarArticulo}
              onCancel={() => setModalEditarOpen(false)}
              isSubmitting={isSubmittingEdit}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIÁLOGO: CONFIRMACIÓN DE DESACTIVACIÓN CON GUARDAS ZERO-TRUST */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogDesactivarOpen} onOpenChange={setDialogDesactivarOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Desactivar Recurso del Catálogo
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 space-y-2 pt-2">
              <p>
                ¿Confirmas que deseas archivar y desactivar el recurso{' '}
                <strong className="text-gray-900">{articulo.descripcion_corta || articulo.referencia_fabricante}</strong>?
              </p>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  Guarda de Integridad Contable (Zero-Trust):
                </p>
                <p>
                  El sistema validará que este recurso tenga <strong>0 existencias físicas en almacén</strong> (Stock actual: {articulo.stock_actual} {articulo.unidad_medida}) y que no cuente con órdenes de compra activas en tránsito.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogDesactivarOpen(false)}
              disabled={isProcessingEstado}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleToggleEstado}
              disabled={isProcessingEstado}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {isProcessingEstado ? 'Verificando Integridad...' : 'Confirmar Desactivación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
