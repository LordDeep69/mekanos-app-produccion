/**
 * MEKANOS S.A.S - Portal Admin
 * Ciclo 4.A: Gestión Comercial y Emisión de Órdenes de Compra
 * Dashboard Ejecutivo, KPI Cards, Filtros Multidimensionales y Tabla Reactiva
 */

'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  TrendingUp,
  Truck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  FiltrosOrdenesCompra,
  ordenesCompraService,
} from '@/lib/api/ordenes-compra.service';
import { comprasService } from '@/lib/api/compras.service';
import {
  EstadoOrdenCompra,
  OrdenCompra,
  OrdenesCompraKpis,
} from '@/types/ordenes-compra.types';
import { ProveedorCompleto } from '@/types/compras.types';

export default function OrdenesCompraPage() {
  const [isPending, startTransition] = useTransition();

  // Estados de datos
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [kpis, setKpis] = useState<OrdenesCompraKpis>({
    total_ordenes: 0,
    borradores: 0,
    enviadas: 0,
    parciales: 0,
    completadas: 0,
    canceladas: 0,
    monto_total_comprometido: 0,
  });
  const [proveedores, setProveedores] = useState<ProveedorCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Filtros reactivos
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroProveedor, setFiltroProveedor] = useState<string>('TODOS');
  const [paginaActual, setPaginaActual] = useState(1);

  // Estados de modales
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [ordenParaEnviar, setOrdenParaEnviar] = useState<OrdenCompra | null>(null);
  const [modalEnviarOpen, setModalEnviarOpen] = useState(false);
  const [ordenParaCancelar, setOrdenParaCancelar] = useState<OrdenCompra | null>(null);
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [accionEnProgreso, setAccionEnProgreso] = useState(false);

  // Formateador de moneda colombiana COP
  const formatCOP = (valor: number | null | undefined) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor || 0);
  };

  // Formateador de fecha
  const formatFecha = (fechaStr: string | null | undefined) => {
    if (!fechaStr) return '—';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return fechaStr;
    }
  };

  // Cargar datos iniciales
  const cargarDatos = async (pagina = paginaActual) => {
    setLoading(true);
    try {
      const filtros: FiltrosOrdenesCompra = {
        page: pagina,
        limit: 10,
      };

      if (busqueda.trim()) {
        filtros.numero_orden = busqueda.trim();
      }
      if (filtroEstado !== 'TODOS') {
        filtros.estado = filtroEstado;
      }
      if (filtroProveedor !== 'TODOS') {
        filtros.id_proveedor = parseInt(filtroProveedor, 10);
      }

      const [resOrdenes, resKpis, resProveedores] = await Promise.all([
        ordenesCompraService.getOrdenes(filtros),
        ordenesCompraService.getResumenKpis(),
        comprasService.getProveedoresDirectorio(1, 100),
      ]);

      setOrdenes(resOrdenes.data || []);
      setMeta(resOrdenes.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
      setKpis(resKpis);
      setProveedores(resProveedores.data || []);
    } catch (err: any) {
      console.error('Error al cargar órdenes de compra:', err);
      toast.error('No se pudieron cargar las órdenes de compra');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos(1);
    setPaginaActual(1);
  }, [busqueda, filtroEstado, filtroProveedor]);

  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina < 1 || nuevaPagina > meta.totalPages) return;
    setPaginaActual(nuevaPagina);
    cargarDatos(nuevaPagina);
  };

  // Badge por estado
  const renderBadgeEstado = (estado: EstadoOrdenCompra) => {
    switch (estado) {
      case 'BORRADOR':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1.5 font-medium">
            <Clock className="w-3 h-3" /> Borrador
          </Badge>
        );
      case 'ENVIADA':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1.5 font-medium">
            <Send className="w-3 h-3" /> Enviada
          </Badge>
        );
      case 'PARCIAL':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 gap-1.5 font-medium">
            <Truck className="w-3 h-3" /> Parcial
          </Badge>
        );
      case 'COMPLETADA':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Completada
          </Badge>
        );
      case 'CANCELADA':
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 gap-1.5 font-medium">
            <XCircle className="w-3 h-3" /> Cancelada
          </Badge>
        );
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Manejar acción Enviar Orden
  const handleConfirmarEnvio = async () => {
    if (!ordenParaEnviar) return;
    setAccionEnProgreso(true);
    try {
      await ordenesCompraService.enviarOrden(ordenParaEnviar.id_orden_compra);
      toast.success(`Orden ${ordenParaEnviar.numero_orden_compra} emitida y enviada exitosamente`);
      setModalEnviarOpen(false);
      setOrdenParaEnviar(null);
      await cargarDatos(paginaActual);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al emitir la orden de compra');
    } finally {
      setAccionEnProgreso(false);
    }
  };

  // Manejar acción Cancelar Orden
  const handleConfirmarCancelacion = async () => {
    if (!ordenParaCancelar) return;
    if (!motivoCancelacion.trim()) {
      toast.warning('Debe ingresar un motivo para cancelar la orden');
      return;
    }
    setAccionEnProgreso(true);
    try {
      await ordenesCompraService.cancelarOrden(
        ordenParaCancelar.id_orden_compra,
        motivoCancelacion.trim(),
      );
      toast.success(`Orden ${ordenParaCancelar.numero_orden_compra} cancelada exitosamente`);
      setModalCancelarOpen(false);
      setOrdenParaCancelar(null);
      setMotivoCancelacion('');
      await cargarDatos(paginaActual);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al cancelar la orden de compra');
    } finally {
      setAccionEnProgreso(false);
    }
  };

  // Abrir modal de detalle
  const handleVerDetalle = async (orden: OrdenCompra) => {
    try {
      const detalleCompleto = await ordenesCompraService.getOrdenById(orden.id_orden_compra);
      setOrdenDetalle(detalleCompleto);
      setModalDetalleOpen(true);
    } catch (e) {
      setOrdenDetalle(orden);
      setModalDetalleOpen(true);
    }
  };

  return (
    <div className="space-y-6 p-1 sm:p-2">
      {/* Header Empresarial */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Órdenes de Compra
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  Ciclo 4.A
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Gestión comercial, emisión formal determinista y trazabilidad de abastecimiento
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarDatos(paginaActual)}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>

          <Link href="/compras/ordenes/nueva">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Orden de Compra
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Ejecutivas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-900/70 border-slate-800/80 shadow-sm">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Total Órdenes
              <FileText className="w-4 h-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-white">{kpis.total_ordenes}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Histórico global</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800/80 shadow-sm">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-amber-400/90 uppercase tracking-wider flex items-center justify-between">
              Borradores
              <Clock className="w-4 h-4 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-amber-400">{kpis.borradores}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Pendientes de emisión</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800/80 shadow-sm">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-blue-400/90 uppercase tracking-wider flex items-center justify-between">
              Enviadas
              <Send className="w-4 h-4 text-blue-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-blue-400">{kpis.enviadas}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">En tránsito proveedor</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800/80 shadow-sm">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-purple-400/90 uppercase tracking-wider flex items-center justify-between">
              Parciales
              <Truck className="w-4 h-4 text-purple-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-purple-400">{kpis.parciales}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Entregas en curso</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800/80 shadow-sm">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-emerald-400/90 uppercase tracking-wider flex items-center justify-between">
              Completadas
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold text-emerald-400">{kpis.completadas}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Recibidas al 100%</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800/80 shadow-sm col-span-2 sm:col-span-1">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-emerald-300 uppercase tracking-wider flex items-center justify-between">
              Comprometido
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-base sm:text-lg font-bold text-emerald-400 truncate" title={formatCOP(kpis.monto_total_comprometido)}>
              {formatCOP(kpis.monto_total_comprometido)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">En órdenes activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="bg-slate-900/60 border-slate-800 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Buscador de texto */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por correlativo (ej: OC-2026-0001)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
            </div>

            {/* Selector de Estado */}
            <div className="sm:col-span-3">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Estado de Orden" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="TODOS">Todos los Estados</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="ENVIADA">Enviada</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                  <SelectItem value="COMPLETADA">Completada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Proveedor */}
            <div className="sm:col-span-3">
              <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="TODOS">Todos los Proveedores</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id_proveedor} value={String(p.id_proveedor)}>
                      {p.persona?.razon_social || p.persona?.nombre_completo || `Proveedor #${p.id_proveedor}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset de Filtros */}
            <div className="sm:col-span-1 flex items-center justify-end">
              {(busqueda || filtroEstado !== 'TODOS' || filtroProveedor !== 'TODOS') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBusqueda('');
                    setFiltroEstado('TODOS');
                    setFiltroProveedor('TODOS');
                  }}
                  className="text-xs text-slate-400 hover:text-white h-9 px-2"
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Órdenes de Compra */}
      <Card className="bg-slate-900/60 border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Correlativo</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Emisión / Necesidad</th>
                <th className="py-3 px-4 text-center">Ítems</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">IVA (19%)</th>
                <th className="py-3 px-4 text-right">Total Neto</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="font-medium text-slate-300">No se encontraron órdenes de compra</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ajuste los filtros o emita una nueva orden de compra para abastecer inventario.
                    </p>
                  </td>
                </tr>
              ) : (
                ordenes.map((orden) => (
                  <tr
                    key={orden.id_orden_compra}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleVerDetalle(orden)}
                  >
                    {/* Correlativo */}
                    <td className="py-3.5 px-4 font-mono font-medium text-white flex items-center gap-2">
                      <span className="p-1 rounded bg-slate-800 border border-slate-700 text-blue-400 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      <span>{orden.numero_orden_compra}</span>
                    </td>

                    {/* Proveedor */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {orden.proveedor?.razon_social || orden.proveedor?.nombre_completo || 'Proveedor N/A'}
                      </div>
                      {orden.proveedor?.numero_identificacion && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          NIT: {orden.proveedor.numero_identificacion}
                        </div>
                      )}
                    </td>

                    {/* Fechas */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatFecha(orden.fecha_solicitud)}
                      </div>
                      {orden.fecha_necesidad && (
                        <div className="text-[11px] text-amber-400/90 mt-0.5">
                          Req: {formatFecha(orden.fecha_necesidad)}
                        </div>
                      )}
                    </td>

                    {/* Ítems */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {orden.total_items || orden.detalles?.length || 0}
                      </span>
                    </td>

                    {/* Subtotal */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300">
                      {formatCOP(orden.subtotal)}
                    </td>

                    {/* IVA */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400">
                      {formatCOP(orden.iva)}
                    </td>

                    {/* Total Neto */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCOP(orden.total)}
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4 text-center">
                      {renderBadgeEstado(orden.estado)}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                          title="Ver detalle 360°"
                          onClick={() => handleVerDetalle(orden)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {orden.estado === 'BORRADOR' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                            title="Emitir / Enviar Orden al Proveedor"
                            onClick={() => {
                              setOrdenParaEnviar(orden);
                              setModalEnviarOpen(true);
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}

                        {orden.estado !== 'COMPLETADA' && orden.estado !== 'CANCELADA' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30"
                            title="Cancelar Orden"
                            onClick={() => {
                              setOrdenParaCancelar(orden);
                              setModalCancelarOpen(true);
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Mostrando{' '}
            <span className="font-semibold text-slate-200">
              {ordenes.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-slate-200">
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{' '}
            de <span className="font-semibold text-slate-200">{meta.total}</span> órdenes
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cambiarPagina(meta.page - 1)}
              disabled={meta.page <= 1 || loading}
              className="h-8 px-2.5 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              Anterior
            </Button>
            <span className="px-2 font-mono text-slate-300">
              Página {meta.page} de {meta.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cambiarPagina(meta.page + 1)}
              disabled={meta.page >= meta.totalPages || loading}
              className="h-8 px-2.5 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      {/* MODAL DETALLE 360° DE LA ORDEN */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-slate-200 max-h-[90vh] overflow-y-auto">
          {ordenDetalle && (
            <>
              <DialogHeader className="border-b border-slate-800 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                        Orden de Compra: {ordenDetalle.numero_orden_compra}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-400">
                        ID Sistema #{ordenDetalle.id_orden_compra} • Emitida el {formatFecha(ordenDetalle.fecha_solicitud)}
                      </DialogDescription>
                    </div>
                  </div>
                  <div>{renderBadgeEstado(ordenDetalle.estado)}</div>
                </div>
              </DialogHeader>

              {/* Información de Cabecera */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Proveedor:</span>
                  <p className="text-slate-200 font-semibold mt-0.5">
                    {ordenDetalle.proveedor?.razon_social || ordenDetalle.proveedor?.nombre_completo}
                  </p>
                  {ordenDetalle.proveedor?.numero_identificacion && (
                    <p className="text-slate-400 font-mono mt-0.5">
                      NIT: {ordenDetalle.proveedor.numero_identificacion}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Responsables:</span>
                  <p className="text-slate-200 mt-0.5">
                    <span className="text-slate-500">Solicitado:</span> {ordenDetalle.solicitante?.nombre_completo || 'Usuario Sistema'}
                  </p>
                  {ordenDetalle.aprobador && (
                    <p className="text-slate-200 mt-0.5">
                      <span className="text-slate-500">Aprobado:</span> {ordenDetalle.aprobador.nombre_completo}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Fechas Críticas:</span>
                  <p className="text-slate-200 mt-0.5">
                    <span className="text-slate-500">Emisión:</span> {formatFecha(ordenDetalle.fecha_solicitud)}
                  </p>
                  <p className="text-amber-400 mt-0.5 font-medium">
                    <span className="text-slate-500">Necesidad:</span> {formatFecha(ordenDetalle.fecha_necesidad) || 'Inmediata'}
                  </p>
                </div>
              </div>

              {/* Observaciones si existen */}
              {ordenDetalle.observaciones && (
                <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/60 text-xs">
                  <span className="text-slate-400 font-medium block mb-1">Observaciones / Notas:</span>
                  <p className="text-slate-300 whitespace-pre-line">{ordenDetalle.observaciones}</p>
                </div>
              )}

              {/* Tabla de Líneas / Ítems */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Líneas de la Orden ({ordenDetalle.detalles?.length || 0})</span>
                </h4>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">SKU / Ref</th>
                        <th className="py-2.5 px-3">Descripción Componente</th>
                        <th className="py-2.5 px-3 text-right">Cantidad</th>
                        <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {ordenDetalle.detalles?.map((det) => (
                        <tr key={det.id_detalle} className="hover:bg-slate-900/30">
                          <td className="py-2 px-3 font-mono text-slate-400">
                            {det.componente?.codigo_interno || det.componente?.referencia_fabricante || '—'}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-slate-200">
                              {det.componente?.descripcion_corta || 'Artículo'}
                            </div>
                            {det.observaciones && (
                              <div className="text-[11px] text-slate-500 italic">
                                Nota: {det.observaciones}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {det.cantidad} {det.componente?.unidad_medida || 'UND'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatCOP(det.precio_unitario)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-400">
                            {formatCOP(det.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Liquidación Financiera Total */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>{formatCOP(ordenDetalle.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IVA ({ordenDetalle.porcentaje_iva || 19}%):</span>
                    <span>{formatCOP(ordenDetalle.iva)}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-1.5 flex justify-between text-sm font-bold text-emerald-400">
                    <span>Total Neto:</span>
                    <span>{formatCOP(ordenDetalle.total)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-800 pt-3 gap-2">
                {ordenDetalle.estado === 'BORRADOR' && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                    onClick={() => {
                      setModalDetalleOpen(false);
                      setOrdenParaEnviar(ordenDetalle);
                      setModalEnviarOpen(true);
                    }}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Emitir Orden
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-900 text-slate-300 text-xs"
                  onClick={() => setModalDetalleOpen(false)}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR EMISIÓN / ENVÍO */}
      <Dialog open={modalEnviarOpen} onOpenChange={setModalEnviarOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-blue-400 mb-1">
              <Send className="w-5 h-5" />
              <DialogTitle className="text-white">Emitir Orden de Compra</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              ¿Está seguro de emitir formalmente la orden{' '}
              <span className="font-semibold text-white">{ordenParaEnviar?.numero_orden_compra}</span> al proveedor?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg text-xs text-blue-300 space-y-1">
            <p>• La orden cambiará de estado a <strong>ENVIADA</strong>.</p>
            <p>• Quedará habilitada para recepción física en almacén (Ciclo 4.B).</p>
            <p>• Monto total comprometido: <strong>{formatCOP(ordenParaEnviar?.total)}</strong>.</p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900 text-slate-300"
              onClick={() => setModalEnviarOpen(false)}
              disabled={accionEnProgreso}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
              onClick={handleConfirmarEnvio}
              disabled={accionEnProgreso}
            >
              {accionEnProgreso ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Emitiendo...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Confirmar Emisión
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CANCELAR ORDEN */}
      <Dialog open={modalCancelarOpen} onOpenChange={setModalCancelarOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-400 mb-1">
              <XCircle className="w-5 h-5" />
              <DialogTitle className="text-white">Cancelar Orden de Compra</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Esta acción invalidará la orden{' '}
              <span className="font-semibold text-white">{ordenParaCancelar?.numero_orden_compra}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-medium text-slate-300">Motivo de Cancelación (Requerido):</label>
            <Textarea
              placeholder="Ej: Proveedor sin disponibilidad inmediata, cotización modificada..."
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              className="bg-slate-900 border-slate-800 text-white text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900 text-slate-300"
              onClick={() => setModalCancelarOpen(false)}
              disabled={accionEnProgreso}
            >
              Volver
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white"
              onClick={handleConfirmarCancelacion}
              disabled={accionEnProgreso || !motivoCancelacion.trim()}
            >
              {accionEnProgreso ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
