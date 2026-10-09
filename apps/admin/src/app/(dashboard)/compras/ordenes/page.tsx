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
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
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
import { comprasService } from '@/lib/api/compras.service';
import {
  EstadoOrdenCompra,
  OrdenCompra,
  OrdenesCompraKpis,
} from '@/types/ordenes-compra.types';
import { ProveedorCompleto } from '@/types/compras.types';

export default function OrdenesCompraPage() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  // Helper para sanitizar nombres de usuario y erradicar textos quemados (White-label institucional)
  const sanitizarNombreUsuario = (nombre: string | null | undefined) => {
    if (!nombre) return 'Administrador del Sistema';
    if (nombre.trim().toLowerCase() === 'admin mekanos') return 'Administrador del Sistema';
    return nombre;
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

  // Estados de modales
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [ordenParaEnviar, setOrdenParaEnviar] = useState<OrdenCompra | null>(null);
  const [modalEnviarOpen, setModalEnviarOpen] = useState(false);
  const [ordenParaCancelar, setOrdenParaCancelar] = useState<OrdenCompra | null>(null);
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [accionEnProgreso, setAccionEnProgreso] = useState(false);

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
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                  Ciclo 4.A
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
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl w-full bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl p-6 pr-5">
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
                  <p className="text-amber-950 whitespace-pre-line">{ordenDetalle.observaciones}</p>
                </div>
              )}

              {/* Tabla de Líneas / Ítems Holgada y Respirable */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Líneas de la Orden ({ordenDetalle.detalles?.length || 0})</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3 w-32">SKU / Ref</th>
                        <th className="py-2.5 px-3">Descripción Componente</th>
                        <th className="py-2.5 px-3 text-right w-28">Cantidad</th>
                        <th className="py-2.5 px-3 text-right w-36">Precio Unitario</th>
                        <th className="py-2.5 px-3 text-right w-36">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {ordenDetalle.detalles?.map((det, idx) => {
                        const subtotalCalculado = Number(det.cantidad) * Number(det.precio_unitario);
                        return (
                          <tr key={det.id_detalle} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                              {det.componente?.codigo_interno || det.componente?.referencia_fabricante || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">
                                {det.componente?.descripcion_corta || 'Artículo'}
                              </div>
                              {det.observaciones && (
                                <div className="text-[11px] text-slate-500 italic mt-0.5">
                                  Nota: {det.observaciones}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap text-slate-900">
                              {det.cantidad} {det.componente?.unidad_medida || 'UND'}
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
    </div>
  );
}
