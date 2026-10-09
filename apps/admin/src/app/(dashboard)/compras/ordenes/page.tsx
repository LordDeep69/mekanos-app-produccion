/**
 * MEKANOS S.A.S - Portal Admin
 * Ciclo 4.A: Gestión Comercial y Emisión de Órdenes de Compra
 * Dashboard Ejecutivo, KPI Cards, Filtros Multidimensionales y Tabla Reactiva
 * Paleta Clara Corporativa Homologada (bg-white, border-slate-200, text-slate-900)
 */

'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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
  Layers,
  Loader2,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  X,
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
import { recepcionesCompraService } from '@/lib/api/recepciones-compra.service';
import { comprasService } from '@/lib/api/compras.service';
import {
  EstadoOrdenCompra,
  OrdenCompra,
  OrdenesCompraKpis,
  RegistrarRecepcionLotePayload,
  UbicacionBodega,
} from '@/types/ordenes-compra.types';
import { ProveedorCompleto } from '@/types/compras.types';

export default function OrdenesCompraPage() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  // Helper para sanitizar nombres de usuario y erradicar textos quemados (White-label institucional)
  const sanitizarNombreUsuario = (nombre: string | null | undefined): string => {
    if (!nombre) return 'Administrador del Sistema';
    const trimmed = nombre.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower === 'admin mekanos' ||
      lower === 'admin' ||
      lower === 'administrador' ||
      lower.includes('admin')
    ) {
      return 'Administrador del Sistema';
    }
    return trimmed;
  };

  // Usuario de sesión para auditoría white-label
  const usuarioActual = sanitizarNombreUsuario(session?.user?.name);

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

  // Estados de modales (Ciclo 4.A y 4.B)
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [ordenParaEnviar, setOrdenParaEnviar] = useState<OrdenCompra | null>(null);
  const [modalEnviarOpen, setModalEnviarOpen] = useState(false);
  const [ordenParaCancelar, setOrdenParaCancelar] = useState<OrdenCompra | null>(null);
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [accionEnProgreso, setAccionEnProgreso] = useState(false);

  // Estados Modal Recepción Almacén y Control de Calidad (Ciclo 4.B)
  const [ordenParaRecibir, setOrdenParaRecibir] = useState<OrdenCompra | null>(null);
  const [modalRecepcionOpen, setModalRecepcionOpen] = useState(false);
  const [ubicacionesBodega, setUbicacionesBodega] = useState<UbicacionBodega[]>([]);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>('');
  const [guiaRemision, setGuiaRemision] = useState('');
  const [observacionesRecepcion, setObservacionesRecepcion] = useState('');
  const [itemsRecepcion, setItemsRecepcion] = useState<
    Array<{
      id_detalle: number;
      id_componente: number;
      descripcion: string;
      sku: string;
      unidad_medida: string;
      cantidad_solicitada: number;
      cantidad_recibida_previa: number;
      saldo_pendiente: number;
      cantidad_recibir: number;
      cantidad_aceptada: number;
      cantidad_rechazada: number;
      calidad: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO';
      observacion_linea: string;
    }>
  >([]);

  // Formateador de moneda colombiana COP con precisión determinista
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

  // Sanitizador y reparador UTF-8 para notas y observaciones (evita mojibake y omisiones legacy)
  const sanitizarTextoUTF8 = (texto: string | null | undefined): string => {
    if (!texto) return '';
    return texto
      .normalize('NFC')
      .replace(/\bRecepcin\b/gi, (match) => match[0] === 'R' ? 'Recepción' : 'recepción')
      .replace(/\bSegunda recepcin\b/gi, 'Segunda recepción')
      .replace(/\bPrimera recepcin\b/gi, 'Primera recepción')
      .replace(/\bUbicacin\b/gi, (match) => match[0] === 'U' ? 'Ubicación' : 'ubicación')
      .replace(/\bAprobacin\b/gi, (match) => match[0] === 'A' ? 'Aprobación' : 'aprobación')
      .replace(/\bTransaccin\b/gi, (match) => match[0] === 'T' ? 'Transacción' : 'transacción')
      .replace(/\bEdicin\b/gi, (match) => match[0] === 'E' ? 'Edición' : 'edición')
      .replace(/\bDescripcin\b/gi, (match) => match[0] === 'D' ? 'Descripción' : 'descripción')
      .replace(/\bDevolucin\b/gi, (match) => match[0] === 'D' ? 'Devolución' : 'devolución')
      .replace(/\bCondicin\b/gi, (match) => match[0] === 'C' ? 'Condición' : 'condición')
      .replace(/\bRetencin\b/gi, (match) => match[0] === 'R' ? 'Retención' : 'retención')
      .replace(/\uFFFD/g, '')
      .trim();
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

  // Badge por estado sobrio y corporativo
  const renderBadgeEstado = (estado: EstadoOrdenCompra) => {
    switch (estado) {
      case 'BORRADOR':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 font-medium">
            <Clock className="w-3 h-3 text-amber-600" /> Borrador
          </Badge>
        );
      case 'ENVIADA':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 font-medium">
            <Send className="w-3 h-3 text-blue-600" /> Enviada
          </Badge>
        );
      case 'PARCIAL':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1.5 font-medium">
            <Truck className="w-3 h-3 text-purple-600" /> Parcial
          </Badge>
        );
      case 'COMPLETADA':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completada
          </Badge>
        );
      case 'CANCELADA':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1.5 font-medium">
            <XCircle className="w-3 h-3 text-rose-600" /> Cancelada
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

  // Abrir modal de recepción física (Ciclo 4.B)
  const handleAbrirModalRecepcion = async (orden: OrdenCompra) => {
    try {
      setAccionEnProgreso(true);
      // Obtener orden completa con sus líneas y recepciones
      const ordenCompleta = await ordenesCompraService.getOrdenById(orden.id_orden_compra);
      setOrdenParaRecibir(ordenCompleta);

      // Cargar catálogo de ubicaciones de bodega si no se ha cargado
      let bodegas = ubicacionesBodega;
      if (bodegas.length === 0) {
        bodegas = await recepcionesCompraService.getUbicacionesBodega();
        setUbicacionesBodega(bodegas);
      }
      if (bodegas.length > 0 && !ubicacionSeleccionada) {
        setUbicacionSeleccionada(String(bodegas[0].id_ubicacion));
      }

      // Mapear líneas con saldos pendientes deterministas
      const lineasMapeadas = (ordenCompleta.detalles || []).map((det) => {
        const cantSolicitada = Number(det.cantidad);
        const cantRecibidaPrevia = Number(det.cantidad_recibida_acumulada || 0);
        const saldoPendiente =
          det.cantidad_pendiente !== undefined
            ? Number(det.cantidad_pendiente)
            : Math.max(0, cantSolicitada - cantRecibidaPrevia);

        return {
          id_detalle: det.id_detalle,
          id_componente: det.id_componente,
          descripcion: det.componente?.descripcion_corta || 'Componente / Repuesto',
          sku: det.componente?.codigo_interno || det.componente?.referencia_fabricante || '—',
          unidad_medida: det.componente?.unidad_medida || 'UND',
          cantidad_solicitada: cantSolicitada,
          cantidad_recibida_previa: cantRecibidaPrevia,
          saldo_pendiente: saldoPendiente,
          cantidad_recibir: saldoPendiente,
          cantidad_aceptada: saldoPendiente,
          cantidad_rechazada: 0,
          calidad: 'OK' as const,
          observacion_linea: '',
        };
      });

      setItemsRecepcion(lineasMapeadas);
      setGuiaRemision('');
      setObservacionesRecepcion('');
      setModalRecepcionOpen(true);
    } catch (e: any) {
      console.error('Error al abrir modal de recepción:', e);
      toast.error(e.response?.data?.message || 'Error al preparar la recepción de almacén');
    } finally {
      setAccionEnProgreso(false);
    }
  };

  const handleModificarCantidadRecibir = (id_detalle: number, cant: number) => {
    setItemsRecepcion((prev) =>
      prev.map((item) => {
        if (item.id_detalle !== id_detalle) return item;
        const nuevaRecibir = Math.max(0, Math.min(item.saldo_pendiente, cant));
        const nuevaAceptada = Math.max(0, nuevaRecibir - item.cantidad_rechazada);
        let cal: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO' = 'OK';
        if (item.cantidad_rechazada > 0 && nuevaAceptada === 0) cal = 'RECHAZADO';
        else if (item.cantidad_rechazada > 0 && nuevaAceptada > 0) cal = 'PARCIAL_DA_ADO';

        return {
          ...item,
          cantidad_recibir: nuevaRecibir,
          cantidad_aceptada: nuevaAceptada,
          calidad: cal,
        };
      }),
    );
  };

  const handleModificarAceptada = (id_detalle: number, cant: number) => {
    setItemsRecepcion((prev) =>
      prev.map((item) => {
        if (item.id_detalle !== id_detalle) return item;
        const nuevaAceptada = Math.max(0, Math.min(item.cantidad_recibir, cant));
        const nuevaRechazada = item.cantidad_recibir - nuevaAceptada;
        let cal: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO' = 'OK';
        if (nuevaRechazada > 0 && nuevaAceptada === 0) cal = 'RECHAZADO';
        else if (nuevaRechazada > 0 && nuevaAceptada > 0) cal = 'PARCIAL_DA_ADO';

        return {
          ...item,
          cantidad_aceptada: nuevaAceptada,
          cantidad_rechazada: nuevaRechazada,
          calidad: cal,
        };
      }),
    );
  };

  const handleModificarRechazada = (id_detalle: number, cant: number) => {
    setItemsRecepcion((prev) =>
      prev.map((item) => {
        if (item.id_detalle !== id_detalle) return item;
        const nuevaRechazada = Math.max(0, Math.min(item.cantidad_recibir, cant));
        const nuevaAceptada = item.cantidad_recibir - nuevaRechazada;
        let cal: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO' = 'OK';
        if (nuevaRechazada > 0 && nuevaAceptada === 0) cal = 'RECHAZADO';
        else if (nuevaRechazada > 0 && nuevaAceptada > 0) cal = 'PARCIAL_DA_ADO';

        return {
          ...item,
          cantidad_aceptada: nuevaAceptada,
          cantidad_rechazada: nuevaRechazada,
          calidad: cal,
        };
      }),
    );
  };

  const handleModificarNotaItem = (id_detalle: number, nota: string) => {
    setItemsRecepcion((prev) =>
      prev.map((item) =>
        item.id_detalle === id_detalle ? { ...item, observacion_linea: nota } : item,
      ),
    );
  };

  const handlePrellenarTodoPendiente = () => {
    setItemsRecepcion((prev) =>
      prev.map((item) => ({
        ...item,
        cantidad_recibir: item.saldo_pendiente,
        cantidad_aceptada: item.saldo_pendiente,
        cantidad_rechazada: 0,
        calidad: 'OK',
      })),
    );
  };

  const handleConfirmarRecepcion = async () => {
    if (!ordenParaRecibir) return;

    const itemsAProcesar = itemsRecepcion.filter((it) => it.cantidad_recibir > 0);
    if (itemsAProcesar.length === 0) {
      toast.warning('Debe ingresar una cantidad a recibir mayor a 0 en al menos una línea');
      return;
    }

    const totalAceptado = itemsAProcesar.reduce((acc, it) => acc + it.cantidad_aceptada, 0);
    if (totalAceptado > 0 && !ubicacionSeleccionada) {
      toast.warning('Debe seleccionar la bodega / ubicación de destino para el ingreso físico a inventario');
      return;
    }

    for (const it of itemsAProcesar) {
      if (it.cantidad_recibir !== it.cantidad_aceptada + it.cantidad_rechazada) {
        toast.error(`Inconsistencia en "${it.descripcion}": la cantidad recibida (${it.cantidad_recibir}) debe ser igual a aceptada (${it.cantidad_aceptada}) + rechazada (${it.cantidad_rechazada})`);
        return;
      }
      if (it.cantidad_recibir > it.saldo_pendiente) {
        toast.error(`La cantidad recibida de "${it.descripcion}" excede el saldo pendiente (${it.saldo_pendiente})`);
        return;
      }
    }

    try {
      setAccionEnProgreso(true);
      const payload: RegistrarRecepcionLotePayload = {
        id_orden_compra: ordenParaRecibir.id_orden_compra,
        id_ubicacion_destino: ubicacionSeleccionada ? parseInt(ubicacionSeleccionada, 10) : undefined,
        guia_remision: sanitizarTextoUTF8(guiaRemision) || undefined,
        observaciones: sanitizarTextoUTF8(observacionesRecepcion) || undefined,
        items: itemsAProcesar.map((it) => ({
          id_detalle_orden: it.id_detalle,
          cantidad_recibida: it.cantidad_recibir,
          cantidad_aceptada: it.cantidad_aceptada,
          cantidad_rechazada: it.cantidad_rechazada,
          calidad: it.calidad,
          observaciones: sanitizarTextoUTF8(it.observacion_linea) || undefined,
        })),
      };

      const res = await recepcionesCompraService.registrarRecepcionLote(payload);
      toast.success(
        `Recepción ${res.numero_recepcion} procesada con éxito. La orden ahora está en estado '${res.nuevo_estado_orden}'.`,
      );

      setModalRecepcionOpen(false);

      // Recargar datos de la tabla y KPIs
      await cargarDatos(paginaActual);

      // Si el modal de detalle 360° estaba abierto, recargarlo con los nuevos datos
      if (modalDetalleOpen && ordenDetalle?.id_orden_compra === ordenParaRecibir.id_orden_compra) {
        const ordenActualizada = await ordenesCompraService.getOrdenById(ordenParaRecibir.id_orden_compra);
        setOrdenDetalle(ordenActualizada);
      }
    } catch (e: any) {
      console.error('Error al registrar recepción:', e);
      toast.error(e.response?.data?.message || 'Error al procesar la recepción física');
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

  // Imprimir / Descargar Orden de Compra en formato empresarial limpio
  const handleImprimirOrden = (orden: OrdenCompra) => {
    const solicitanteStr = sanitizarNombreUsuario(orden.solicitante?.nombre_completo);
    const aprobadorStr =
      orden.estado === 'BORRADOR'
        ? 'Pendiente de Emisión'
        : sanitizarNombreUsuario(orden.aprobador?.nombre_completo);

    const filasHtml = (orden.detalles || [])
      .map((det, index) => {
        const subtotalLinea = Number(det.cantidad) * Number(det.precio_unitario);
        const sku = det.componente?.codigo_interno || det.componente?.referencia_fabricante || '—';
        const desc = det.componente?.descripcion_corta || 'Artículo';
        const und = det.componente?.unidad_medida || 'UND';
        return `
          <tr>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">${index + 1}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; font-weight: 600; color: #334155;">${sku}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
              <div style="font-weight: 600; color: #0f172a;">${desc}</div>
              ${det.observaciones ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">Nota: ${det.observaciones}</div>` : ''}
            </td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 12px; font-weight: 600; white-space: nowrap;">${det.cantidad} ${und}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 12px; color: #475569;">${formatCOP(det.precio_unitario)}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${formatCOP(subtotalLinea)}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Orden de Compra ${orden.numero_orden_compra} - MEKANOS S.A.S.</title>
        <style>
          @page {
            size: letter portrait;
            margin: 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .company-title {
            font-size: 24px;
            font-weight: 900;
            color: #1e3a8a;
            letter-spacing: -0.5px;
          }
          .company-sub {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-type {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
          }
          .doc-number {
            font-family: monospace;
            font-size: 16px;
            font-weight: 700;
            color: #2563eb;
            margin-top: 2px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            font-size: 11px;
          }
          .info-box-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            margin-bottom: 6px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 9px 12px;
            border-bottom: 2px solid #cbd5e1;
          }
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .totals-box {
            width: 300px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            font-size: 12px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            color: #475569;
            font-family: monospace;
          }
          .totals-total {
            display: flex;
            justify-content: space-between;
            padding: 8px 0 4px 0;
            border-top: 2px solid #cbd5e1;
            color: #1e3a8a;
            font-size: 15px;
            font-weight: 800;
            font-family: monospace;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 50px;
            padding-top: 10px;
          }
          .sig-box {
            border-top: 1px dashed #94a3b8;
            text-align: center;
            padding-top: 8px;
            font-size: 11px;
            color: #475569;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">MEKANOS S.A.S.</div>
            <div class="company-sub">Mantenimiento Electromecánico, Plantas Diésel e Ingeniería Industrial</div>
            <div class="company-sub">NIT: 900.489.584-1 • Bucaramanga, Colombia</div>
          </div>
          <div class="doc-badge">
            <div class="doc-type">ORDEN DE COMPRA</div>
            <div class="doc-number">${orden.numero_orden_compra}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Estado: <strong>${orden.estado}</strong></div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="info-box-title">Datos del Proveedor</div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${orden.proveedor?.razon_social || orden.proveedor?.nombre_completo || 'Proveedor General'}</div>
            ${orden.proveedor?.numero_identificacion ? `<div style="color: #64748b; margin-top: 2px;">NIT / Identificación: <strong>${orden.proveedor.numero_identificacion}</strong></div>` : ''}
            <div style="color: #64748b; margin-top: 2px;">Condición: Proveedor Homologado</div>
          </div>

          <div class="info-box">
            <div class="info-box-title">Condiciones y Responsables</div>
            <div>Fecha de Emisión: <strong>${formatFecha(orden.fecha_solicitud)}</strong></div>
            <div>Fecha Requerida Entrega: <strong>${formatFecha(orden.fecha_necesidad) || 'Inmediata'}</strong></div>
            <div style="margin-top: 4px;">Solicitado por: <strong>${solicitanteStr}</strong></div>
            <div>Aprobado por: <strong>${aprobadorStr}</strong></div>
          </div>
        </div>

        ${orden.observaciones ? `
          <div class="info-box" style="margin-bottom: 20px;">
            <div class="info-box-title">Observaciones / Justificación de Compra</div>
            <div style="font-size: 12px; color: #334155;">${orden.observaciones}</div>
          </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 120px; text-align: left;">SKU / REF</th>
              <th style="text-align: left;">DESCRIPCIÓN DEL COMPONENTE</th>
              <th style="width: 100px; text-align: right;">CANTIDAD</th>
              <th style="width: 130px; text-align: right;">PRECIO UNITARIO</th>
              <th style="width: 130px; text-align: right;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal Bruto:</span>
              <span>${formatCOP(orden.subtotal)}</span>
            </div>
            <div class="totals-row">
              <span>IVA (${orden.porcentaje_iva || 19}%):</span>
              <span>${formatCOP(orden.iva)}</span>
            </div>
            <div class="totals-total">
              <span>TOTAL NETO:</span>
              <span>${formatCOP(orden.total)}</span>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <strong>${solicitanteStr}</strong><br>
            Responsable Solicitante
          </div>
          <div class="sig-box">
            <strong>${aprobadorStr}</strong><br>
            Aprobación Compras / Gerencia
          </div>
          <div class="sig-box">
            <strong>${orden.proveedor?.razon_social || orden.proveedor?.nombre_completo || 'Proveedor'}</strong><br>
            Firma y Sello de Recepción
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      toast.error('Permita las ventanas emergentes en el navegador para imprimir la orden de compra');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* HEADER DE SECCIÓN CORPORATIVO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Órdenes de Compra
                </h1>
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold text-xs shadow-2xs">
                  Gestión Transaccional
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Gestión comercial, emisión formal determinista y trazabilidad de abastecimiento.
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
            className="h-10 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>

          <Link href="/compras/ordenes/nueva">
            <Button
              size="sm"
              className="h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Orden de Compra
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI CARDS EJECUTIVAS: HOMOLOGADAS AL PATRÓN PROVEEDORES / CATÁLOGO (CONTORNO UNIFORME BORDER-SLATE-200) */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Órdenes */}
        <Card className="border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Órdenes</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{kpis.total_ordenes}</p>
          <span className="text-[11px] text-slate-400">Histórico global</span>
        </Card>

        {/* Borradores */}
        <Card className="border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Borradores</span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{kpis.borradores}</p>
          <span className="text-[11px] text-slate-400">Pendientes de emisión</span>
        </Card>

        {/* Enviadas */}
        <Card className="border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enviadas</span>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{kpis.enviadas}</p>
          <span className="text-[11px] text-slate-400">En tránsito proveedor</span>
        </Card>

        {/* Parciales */}
        <Card className="border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parciales</span>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{kpis.parciales}</p>
          <span className="text-[11px] text-slate-400">Entregas en curso</span>
        </Card>

        {/* Completadas */}
        <Card className="border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completadas</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{kpis.completadas}</p>
          <span className="text-[11px] text-slate-400">Recibidas al 100%</span>
        </Card>

        {/* Monto Comprometido */}
        <Card className="border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all rounded-xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comprometido</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-base sm:text-lg font-extrabold text-emerald-700 truncate" title={formatCOP(kpis.monto_total_comprometido)}>
            {formatCOP(kpis.monto_total_comprometido)}
          </p>
          <span className="text-[11px] text-slate-400">En órdenes activas</span>
        </Card>
      </div>

      {/* BARRA DE HERRAMIENTAS, FILTROS Y BÚSQUEDA */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Buscador de texto */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por correlativo (ej: OC-2026-0001)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm h-10 rounded-lg focus-visible:ring-blue-500"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Selector de Estado */}
            <div className="sm:col-span-3">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-800 text-sm h-10 rounded-lg">
                  <SelectValue placeholder="Estado de Orden" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-md">
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
                <SelectTrigger className="bg-white border-slate-200 text-slate-800 text-sm h-10 rounded-lg">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-md">
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
                  className="text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-10 px-2.5"
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLA PRINCIPAL DE ÓRDENES DE COMPRA */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Correlativo</th>
                <th className="py-3.5 px-4">Proveedor</th>
                <th className="py-3.5 px-4">Emisión / Necesidad</th>
                <th className="py-3.5 px-4 text-center">Ítems</th>
                <th className="py-3.5 px-4 text-right">Subtotal</th>
                <th className="py-3.5 px-4 text-right">IVA (19%)</th>
                <th className="py-3.5 px-4 text-right">Total Neto</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-800">No se encontraron órdenes de compra</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ajuste los filtros o emita una nueva orden de compra para abastecer inventario.
                    </p>
                  </td>
                </tr>
              ) : (
                ordenes.map((orden) => (
                  <tr
                    key={orden.id_orden_compra}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => handleVerDetalle(orden)}
                  >
                    {/* Correlativo */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 text-xs">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                        <span>{orden.numero_orden_compra}</span>
                      </div>
                    </td>

                    {/* Proveedor */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {orden.proveedor?.razon_social || orden.proveedor?.nombre_completo || 'Proveedor N/A'}
                      </div>
                      {orden.proveedor?.numero_identificacion && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NIT: {orden.proveedor.numero_identificacion}
                        </div>
                      )}
                    </td>

                    {/* Fechas */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-slate-700 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatFecha(orden.fecha_solicitud)}</span>
                      </div>
                      {orden.fecha_necesidad && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Req: {formatFecha(orden.fecha_necesidad)}</span>
                        </div>
                      )}
                    </td>

                    {/* Ítems */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {orden.total_items || orden.detalles?.length || 0}
                      </span>
                    </td>

                    {/* Subtotal */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatCOP(orden.subtotal)}
                    </td>

                    {/* IVA */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500 tabular-nums">
                      {formatCOP(orden.iva)}
                    </td>

                    {/* Total Neto */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCOP(orden.total)}
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4 text-center">
                      {renderBadgeEstado(orden.estado)}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Ver detalle 360°"
                          onClick={() => handleVerDetalle(orden)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Imprimir / Descargar OC (PDF)"
                          onClick={() => handleImprimirOrden(orden)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>

                        {orden.estado === 'BORRADOR' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Emitir / Enviar Orden al Proveedor"
                            onClick={() => {
                              setOrdenParaEnviar(orden);
                              setModalEnviarOpen(true);
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}

                        {(orden.estado === 'ENVIADA' || orden.estado === 'PARCIAL') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Registrar Recepción Física en Almacén (Ciclo 4.B)"
                            onClick={() => handleAbrirModalRecepcion(orden)}
                          >
                            <PackageCheck className="w-4 h-4" />
                          </Button>
                        )}

                        {orden.estado !== 'COMPLETADA' && orden.estado !== 'CANCELADA' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Mostrando{' '}
            <span className="font-semibold text-slate-900">
              {ordenes.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{' '}
            de <span className="font-semibold text-slate-900">{meta.total}</span> órdenes
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cambiarPagina(meta.page - 1)}
              disabled={meta.page <= 1 || loading}
              className="h-8 px-3 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              Anterior
            </Button>
            <span className="px-2 font-mono text-slate-700 font-medium">
              Página {meta.page} de {meta.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cambiarPagina(meta.page + 1)}
              disabled={meta.page >= meta.totalPages || loading}
              className="h-8 px-3 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      {/* MODAL DETALLE 360° DE LA ORDEN (TEMA CLARO CORPORATIVO ENTERPRISE) */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl w-full bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl p-6 pr-6 sm:pr-8">
          {ordenDetalle && (
            <>
              <DialogHeader className="border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Orden de Compra: {ordenDetalle.numero_orden_compra}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 mt-0.5">
                        ID Sistema #{ordenDetalle.id_orden_compra} • Emitida el {formatFecha(ordenDetalle.fecha_solicitud)}
                      </DialogDescription>
                    </div>
                  </div>
                  <div>{renderBadgeEstado(ordenDetalle.estado)}</div>
                </div>
              </DialogHeader>

              {/* Información de Cabecera */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold">Proveedor:</span>
                  <p className="text-slate-900 font-bold mt-0.5">
                    {ordenDetalle.proveedor?.razon_social || ordenDetalle.proveedor?.nombre_completo}
                  </p>
                  {ordenDetalle.proveedor?.numero_identificacion && (
                    <p className="text-slate-500 font-mono mt-0.5">
                      NIT: {ordenDetalle.proveedor.numero_identificacion}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold">Responsables:</span>
                  <p className="text-slate-800 mt-0.5">
                    <span className="text-slate-500 font-medium">Solicitado:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {sanitizarNombreUsuario(ordenDetalle.solicitante?.nombre_completo)}
                    </span>
                  </p>
                  <p className="text-slate-800 mt-0.5">
                    <span className="text-slate-500 font-medium">Aprobado:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {ordenDetalle.estado === 'BORRADOR'
                        ? 'Pendiente de Aprobación'
                        : sanitizarNombreUsuario(ordenDetalle.aprobador?.nombre_completo)}
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold">Fechas Críticas:</span>
                  <p className="text-slate-800 mt-0.5">
                    <span className="text-slate-500 font-medium">Emisión:</span> {formatFecha(ordenDetalle.fecha_solicitud)}
                  </p>
                  <p className="text-slate-800 mt-0.5">
                    <span className="text-slate-500 font-medium">Necesidad:</span>{' '}
                    <span className="font-medium text-slate-700">{formatFecha(ordenDetalle.fecha_necesidad) || 'Inmediata'}</span>
                  </p>
                </div>
              </div>

              {/* Observaciones si existen */}
              {ordenDetalle.observaciones && (
                <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/80 text-xs">
                  <span className="text-amber-900 font-semibold block mb-1">Observaciones / Notas:</span>
                  <p className="text-amber-950 whitespace-pre-line">{sanitizarTextoUTF8(ordenDetalle.observaciones)}</p>
                </div>
              )}

              {/* Tabla de Líneas / Ítems Holgada y Respirable con Saldos Físicos (Ciclo 4.B) */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Líneas de la Orden ({ordenDetalle.detalles?.length || 0})</span>
                  <span className="text-[11px] font-normal text-slate-500 lowercase">
                    Cantidades solicitadas vs recibidas en muelle
                  </span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-28">SKU / Ref</th>
                        <th className="py-2.5 px-3">Descripción Componente</th>
                        <th className="py-2.5 px-3 text-right w-24">Solicitado</th>
                        <th className="py-2.5 px-3 text-right w-24">Recibido</th>
                        <th className="py-2.5 px-3 text-right w-24">Pendiente</th>
                        <th className="py-2.5 px-3 text-right w-28">P. Unitario</th>
                        <th className="py-2.5 px-3 text-right w-32">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {ordenDetalle.detalles?.map((det, idx) => {
                        const subtotalCalculado = Number(det.cantidad) * Number(det.precio_unitario);
                        const recibidaPrevia = Number(det.cantidad_recibida_acumulada || 0);
                        const saldoPendiente =
                          det.cantidad_pendiente !== undefined
                            ? Number(det.cantidad_pendiente)
                            : Math.max(0, Number(det.cantidad) - recibidaPrevia);
                        const estaCompleto = saldoPendiente === 0 && recibidaPrevia > 0;

                        return (
                          <tr key={det.id_detalle} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                              {det.componente?.codigo_interno || det.componente?.referencia_fabricante || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{det.componente?.descripcion_corta || 'Artículo'}</span>
                                {estaCompleto && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5">
                                    Recibido 100%
                                  </Badge>
                                )}
                              </div>
                              {det.observaciones && (
                                <div className="text-[11px] text-slate-500 italic mt-0.5">
                                  Nota: {det.observaciones}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap text-slate-700">
                              {det.cantidad} {det.componente?.unidad_medida || 'UND'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap text-emerald-700">
                              {recibidaPrevia} {det.componente?.unidad_medida || 'UND'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                              <span
                                className={
                                  saldoPendiente > 0
                                    ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'
                                    : 'text-slate-400'
                                }
                              >
                                {saldoPendiente} {det.componente?.unidad_medida || 'UND'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                              {formatCOP(det.precio_unitario)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                              {formatCOP(subtotalCalculado)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Trazabilidad Histórica de Recepciones Físicas y Control de Calidad (Ciclo 4.B) */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    Historial de Recepciones Físicas y Control de Calidad ({ordenDetalle.recepciones?.length || 0})
                  </span>
                  {(ordenDetalle.estado === 'ENVIADA' || ordenDetalle.estado === 'PARCIAL') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/40"
                      onClick={() => {
                        setModalDetalleOpen(false);
                        handleAbrirModalRecepcion(ordenDetalle);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Registrar Nueva Recepción
                    </Button>
                  )}
                </h4>

                {ordenDetalle.recepciones && ordenDetalle.recepciones.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-32">N° Recepción</th>
                          <th className="py-2.5 px-3 w-36">Fecha / Hora</th>
                          <th className="py-2.5 px-3 text-right w-24">Cant. Recibida</th>
                          <th className="py-2.5 px-3 text-right w-24 text-emerald-700">Aceptada</th>
                          <th className="py-2.5 px-3 text-right w-24 text-rose-700">Rechazada</th>
                          <th className="py-2.5 px-3 text-center w-28">Calidad</th>
                          <th className="py-2.5 px-3 w-32">Bodega Destino</th>
                          <th className="py-2.5 px-3">Observaciones / Guía</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {ordenDetalle.recepciones.map((rec) => {
                          const badgeCalidad = () => {
                            if (rec.calidad === 'OK') {
                              return (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  Conforme (OK)
                                </Badge>
                              );
                            }
                            if (rec.calidad === 'PARCIAL_DA_ADO' || rec.calidad === 'PARCIAL_DAÑADO') {
                              return (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                  Parcial Dañado
                                </Badge>
                              );
                            }
                            return (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                Rechazado
                              </Badge>
                            );
                          };

                          return (
                            <tr key={rec.id_recepcion} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {rec.numero_recepcion}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                {formatFecha(rec.fecha_recepcion)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                                {rec.cantidad_recibida}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {rec.cantidad_aceptada}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                                {rec.cantidad_rechazada}
                              </td>
                              <td className="py-2.5 px-3 text-center">{badgeCalidad()}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">
                                {rec.ubicacion_nombre || 'BODEGA-PRUEBA'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 italic">
                                {sanitizarTextoUTF8(rec.observaciones) || 'Ingreso conforme sin novedades'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    <Truck className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <span>Aún no se registran recepciones físicas para esta orden de compra. La mercancía está pendiente de arribo a almacén.</span>
                  </div>
                )}
              </div>

              {/* Liquidación Financiera Total */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-80 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCOP(ordenDetalle.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA ({ordenDetalle.porcentaje_iva || 19}%):</span>
                    <span className="font-semibold">{formatCOP(ordenDetalle.iva)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-blue-600">
                    <span>Total Neto:</span>
                    <span>{formatCOP(ordenDetalle.total)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-200 pt-3 gap-2 flex flex-wrap sm:justify-between items-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5"
                    onClick={() => handleImprimirOrden(ordenDetalle)}
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    Imprimir / Descargar PDF
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {(ordenDetalle.estado === 'ENVIADA' || ordenDetalle.estado === 'PARCIAL') && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
                      onClick={() => {
                        setModalDetalleOpen(false);
                        handleAbrirModalRecepcion(ordenDetalle);
                      }}
                    >
                      <PackageCheck className="w-3.5 h-3.5 mr-1" />
                      Registrar Recepción Física
                    </Button>
                  )}
                  {ordenDetalle.estado === 'BORRADOR' && (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
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
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                    onClick={() => setModalDetalleOpen(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR EMISIÓN / ENVÍO */}
      <Dialog open={modalEnviarOpen} onOpenChange={setModalEnviarOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-blue-600 mb-1">
              <Send className="w-5 h-5" />
              <DialogTitle className="text-slate-900 font-bold">Emitir Orden de Compra</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              ¿Está seguro de emitir formalmente la orden{' '}
              <span className="font-semibold text-slate-900">{ordenParaEnviar?.numero_orden_compra}</span> al proveedor?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <p>• La orden cambiará de estado a <strong>ENVIADA</strong>.</p>
            <p>• Quedará habilitada para recepción física en almacén (Ciclo 4.B).</p>
            <p>• Monto total comprometido: <strong>{formatCOP(ordenParaEnviar?.total)}</strong>.</p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => setModalEnviarOpen(false)}
              disabled={accionEnProgreso}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600 mb-1">
              <XCircle className="w-5 h-5" />
              <DialogTitle className="text-slate-900 font-bold">Cancelar Orden de Compra</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Esta acción invalidará la orden{' '}
              <span className="font-semibold text-slate-900">{ordenParaCancelar?.numero_orden_compra}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-700">Motivo de Cancelación (Requerido):</label>
            <Textarea
              placeholder="Ej: Proveedor sin disponibilidad inmediata, cotización modificada..."
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 text-xs min-h-[80px] rounded-lg focus-visible:ring-rose-500"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => setModalCancelarOpen(false)}
              disabled={accionEnProgreso}
            >
              Volver
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
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

      {/* MODAL RECEPCIÓN FÍSICA EN ALMACÉN, CONTROL DE CALIDAD Y KARDEX (CICLO 4.B) */}
      <Dialog open={modalRecepcionOpen} onOpenChange={setModalRecepcionOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl w-full bg-white border-slate-200 text-slate-900 max-h-[92vh] overflow-y-auto shadow-2xl rounded-2xl p-6 pr-6 sm:pr-8">
          {ordenParaRecibir && (
            <>
              <DialogHeader className="border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                      <PackageCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Recepción Física de Mercancías en Almacén
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 mt-0.5">
                        Orden de Compra: <span className="font-semibold text-slate-800">{ordenParaRecibir.numero_orden_compra}</span> • Proveedor:{' '}
                        <span className="font-semibold text-slate-800">
                          {ordenParaRecibir.proveedor?.razon_social || ordenParaRecibir.proveedor?.nombre_completo}
                        </span>
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-1 px-2.5 font-medium">
                      Control de Calidad & Kardex
                    </Badge>
                    {renderBadgeEstado(ordenParaRecibir.estado)}
                  </div>
                </div>
              </DialogHeader>

              {/* Formulario Superior: Parámetros del Despacho y Bodega */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Bodega Destino (Ingreso Físico): <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={ubicacionSeleccionada}
                    onValueChange={(val) => setUbicacionSeleccionada(val)}
                  >
                    <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900 text-xs h-9">
                      <SelectValue placeholder="Seleccionar bodega..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {ubicacionesBodega.map((bod) => (
                        <SelectItem key={bod.id_ubicacion} value={String(bod.id_ubicacion)}>
                          {bod.codigo_ubicacion} - {bod.zona}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Guía de Remisión / Factura Proveedor:
                  </label>
                  <Input
                    placeholder="Ej: REM-2026-991, FAC-8840"
                    value={guiaRemision}
                    onChange={(e) => setGuiaRemision(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 text-xs h-9"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Observaciones / Condiciones de Empaque:
                  </label>
                  <Input
                    placeholder="Ej: Embalaje sellado, inspeccionado en muelle..."
                    value={observacionesRecepcion}
                    onChange={(e) => setObservacionesRecepcion(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 text-xs h-9"
                  />
                </div>
              </div>

              {/* Barra de utilidades de selección rápida */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Líneas de la Orden para Inspección ({itemsRecepcion.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={handlePrellenarTodoPendiente}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Prellenar Todo Pendiente (100% Conforme)
                  </Button>
                </div>
              </div>

              {/* Tabla Interactiva de Control de Calidad por Renglón */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Componente / SKU</th>
                      <th className="py-2.5 px-3 text-right w-24">Pendiente</th>
                      <th className="py-2.5 px-3 text-center w-28">Cant. Recibida</th>
                      <th className="py-2.5 px-3 text-center w-28 text-emerald-700">Aceptada (OK)</th>
                      <th className="py-2.5 px-3 text-center w-28 text-rose-700">Rechazada</th>
                      <th className="py-2.5 px-3 text-center w-32">Calidad</th>
                      <th className="py-2.5 px-3 w-40">Nota / Causa Daño</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {itemsRecepcion.map((item, idx) => {
                      const tieneErrorConsistencia =
                        item.cantidad_recibir !== item.cantidad_aceptada + item.cantidad_rechazada;
                      const sobregiro = item.cantidad_recibir > item.saldo_pendiente;

                      return (
                        <tr
                          key={item.id_detalle}
                          className={`hover:bg-slate-50/60 ${
                            tieneErrorConsistencia || sobregiro ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.descripcion}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Ref: {item.sku} • Solicitado: {item.cantidad_solicitada} {item.unidad_medida} (Recibido prev: {item.cantidad_recibida_previa})
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-amber-700">
                            {item.saldo_pendiente} {item.unidad_medida}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max={item.saldo_pendiente}
                              step="any"
                              value={item.cantidad_recibir}
                              onChange={(e) =>
                                handleModificarCantidadRecibir(
                                  item.id_detalle,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-8 text-center font-mono font-bold text-xs bg-white border-slate-200"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max={item.cantidad_recibir}
                              step="any"
                              value={item.cantidad_aceptada}
                              onChange={(e) =>
                                handleModificarAceptada(
                                  item.id_detalle,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-8 text-center font-mono font-bold text-xs bg-emerald-50/50 border-emerald-300 text-emerald-800"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max={item.cantidad_recibir}
                              step="any"
                              value={item.cantidad_rechazada}
                              onChange={(e) =>
                                handleModificarRechazada(
                                  item.id_detalle,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-8 text-center font-mono font-bold text-xs bg-rose-50/50 border-rose-300 text-rose-800"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.cantidad_recibir === 0 ? (
                              <span className="text-slate-400 text-[11px]">Sin ingreso</span>
                            ) : item.calidad === 'OK' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                Conforme (OK)
                              </Badge>
                            ) : item.calidad === 'PARCIAL_DA_ADO' ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                Parcial Dañado
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                Rechazado
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              placeholder="Opcional: motivo o detalle..."
                              value={item.observacion_linea}
                              onChange={(e) =>
                                handleModificarNotaItem(item.id_detalle, e.target.value)
                              }
                              className="h-8 text-xs bg-white border-slate-200"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen de Impacto en Inventario y Transición de la Orden */}
              {(() => {
                const totalRecibiendo = itemsRecepcion.reduce((a, b) => a + b.cantidad_recibir, 0);
                const totalAceptado = itemsRecepcion.reduce((a, b) => a + b.cantidad_aceptada, 0);
                const totalRechazado = itemsRecepcion.reduce((a, b) => a + b.cantidad_rechazada, 0);
                const todasLasLineasCompletas = itemsRecepcion.every(
                  (it) => it.cantidad_recibida_previa + it.cantidad_recibir >= it.cantidad_solicitada,
                );

                return (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <span className="text-slate-500 block">Total Unidades Recibidas:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {totalRecibiendo} UND
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ingreso a Kardex (Stock Actual):</span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          +{totalAceptado} UND
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Devolución por Rechazo:</span>
                        <span className="font-mono font-bold text-rose-700 text-sm">
                          {totalRechazado} UND
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-500 block font-medium">Estado Resultante Proyectado:</span>
                      <span className="font-bold flex items-center gap-1.5 mt-0.5">
                        {todasLasLineasCompletas ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700">COMPLETADA (100% Recibido)</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-700">PARCIAL (Entregas Pendientes)</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter className="border-t border-slate-200 pt-3 gap-2 flex flex-wrap sm:justify-between items-center">
                <Button
                  variant="outline"
                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                  onClick={() => setModalRecepcionOpen(false)}
                  disabled={accionEnProgreso}
                >
                  Cancelar
                </Button>

                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  onClick={handleConfirmarRecepcion}
                  disabled={
                    accionEnProgreso ||
                    itemsRecepcion.reduce((a, b) => a + b.cantidad_recibir, 0) === 0
                  }
                >
                  {accionEnProgreso ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Procesando Entrada en Almacén...
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4 mr-1" />
                      Confirmar Entrada a Almacén e Impactar Kardex
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
