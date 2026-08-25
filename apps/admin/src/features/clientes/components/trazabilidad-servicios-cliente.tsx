/**
 * MEKANOS S.A.S - Portal de Administración
 * Componente: Trazabilidad y Bitácora Estratégica de Servicios por Cliente
 * 
 * Data Grid Corporativo y Analítico de Alta Densidad para presentación ante
 * Consejos de Administración, Asambleas de Copropietarios y Auditorías Técnicas.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDateSafe } from '@/lib/utils';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Gauge,
  History,
  Info,
  Layers,
  LayoutGrid,
  RotateCcw,
  Search,
  Table as TableIcon,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { TrazabilidadItem } from '../api/clientes.service';
import { useTrazabilidadCliente } from '../hooks/use-clientes';
import { ModalVistaPreviaTrazabilidadPdf } from './modal-vista-previa-trazabilidad-pdf';

interface TrazabilidadServiciosClienteProps {
  clienteId: number;
  clienteNombre: string;
}

type ViewMode = 'table' | 'timeline';
type DatePreset = 'all' | '30d' | 'quarter' | 'ytd' | 'custom';

/**
 * Utilidad robusta para convertir fragmentos HTML enriquecidos en texto plano legible
 */
function stripHtmlToPlainText(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, ' • ')
    .replace(/<\/?(h[1-6]|div|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Helper para formatear de forma segura y completa el nombre del técnico
 */
function formatNombreTecnico(empleado?: any): string {
  if (!empleado?.persona) return 'Sin asignar';
  const p = empleado.persona;
  if (p.nombre_completo && p.nombre_completo.trim()) {
    return p.nombre_completo.trim();
  }
  const parts = [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ').trim();
  }
  if (p.razon_social && p.razon_social.trim()) {
    return p.razon_social.trim();
  }
  return 'Técnico Asignado';
}

/**
 * Helper para extraer iniciales del técnico
 */
function getInicialesTecnico(empleado?: any): string {
  if (!empleado?.persona) return 'T';
  const p = empleado.persona;
  const i1 = (p.primer_nombre?.[0] || p.nombre_completo?.[0] || 'T').toUpperCase();
  const i2 = (p.primer_apellido?.[0] || p.segundo_nombre?.[0] || '').toUpperCase();
  return `${i1}${i2}`;
}

/**
 * Helper para extraer lista unificada de equipos
 */
function getEquiposList(orden: TrazabilidadItem) {
  if (orden.ordenes_equipos && orden.ordenes_equipos.length > 0) {
    return orden.ordenes_equipos.map((oe) => ({
      id_equipo: oe.id_equipo,
      nombre_equipo: oe.equipos?.nombre_equipo || oe.equipos?.codigo_equipo || `Equipo #${oe.id_equipo}`,
      codigo_equipo: oe.equipos?.codigo_equipo,
      tipo_nombre: oe.equipos?.tipos_equipo?.nombre_tipo || '',
      horas_actuales: oe.equipos?.horas_actuales,
      ubicacion: oe.equipos?.ubicacion_texto,
    }));
  }
  if (orden.equipos) {
    return [{
      id_equipo: orden.equipos.id_equipo,
      nombre_equipo: orden.equipos.nombre_equipo || orden.equipos.codigo_equipo || `Equipo #${orden.equipos.id_equipo}`,
      codigo_equipo: orden.equipos.codigo_equipo,
      tipo_nombre: orden.equipos.tipos_equipo?.nombre_tipo || '',
      horas_actuales: orden.equipos.horas_actuales,
      ubicacion: orden.equipos.ubicacion_texto,
    }];
  }
  return [];
}

export function TrazabilidadServiciosCliente({
  clienteId,
  clienteNombre,
}: TrazabilidadServiciosClienteProps) {
  // Estados de Filtros y Navegación
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODOS');
  const [search, setSearch] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [modalOrden, setModalOrden] = useState<TrazabilidadItem | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Consulta al backend
  const { data, isLoading, isError, error, refetch } = useTrazabilidadCliente(clienteId, {
    categoria: categoriaFiltro !== 'TODOS' ? categoriaFiltro : undefined,
    search: search.trim() !== '' ? search.trim() : undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const ordenes: TrazabilidadItem[] = useMemo(() => data?.ordenes || [], [data]);

  // Manejador de Presets de Fecha
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setFechaDesde('');
      setFechaHasta('');
    } else if (preset === '30d') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      setFechaDesde(formatDate(past30));
      setFechaHasta(formatDate(now));
    } else if (preset === 'quarter') {
      const past90 = new Date();
      past90.setDate(now.getDate() - 90);
      setFechaDesde(formatDate(past90));
      setFechaHasta(formatDate(now));
    } else if (preset === 'ytd') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setFechaDesde(formatDate(startOfYear));
      setFechaHasta(formatDate(now));
    }
  };

  // Toggle de Expansión de Filas
  const toggleRowExpansion = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllRows = () => {
    if (expandedRows.size === ordenes.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(ordenes.map((o) => o.id_orden_servicio)));
    }
  };

  // Helper para extraer URL de PDF
  const getPdfUrl = (orden: TrazabilidadItem): string | null => {
    const docGen: any = orden.informes?.[0]?.documentos_generados;
    if (!docGen) return null;
    if (Array.isArray(docGen)) {
      return docGen[0]?.ruta_archivo || docGen[0]?.url_documento || null;
    }
    return docGen.ruta_archivo || docGen.url_documento || null;
  };

  // Exportar a CSV limpio para informes y juntas de consejo
  const handleExportCSV = () => {
    if (ordenes.length === 0) return;

    const headers = [
      'ID Orden',
      'Número Orden',
      'Fecha Programada',
      'Estado',
      'Categoría',
      'Tipo de Servicio',
      'Servicios Específicos',
      'Equipos Intervenidos',
      'Horómetros',
      'Técnico Asignado',
      'Descripción / Falla',
      'Trabajo Realizado',
      'Observaciones Cierre',
    ];

    const rows = ordenes.map((o) => {
      const serviciosHijos = o.detalle_servicios_orden
        ?.map((d) => d.catalogo_servicios?.nombre_servicio || '')
        .filter(Boolean)
        .join(' | ') || '';

      const eqList = getEquiposList(o);
      const equipos = eqList.map((eq) => eq.nombre_equipo).join(', ');
      const horometros = eqList.map((eq) => eq.horas_actuales != null ? `${eq.horas_actuales} hrs` : 'N/A').join(', ');
      const tecnico = formatNombreTecnico(o.empleados_ordenes_servicio_id_tecnico_asignadoToempleados);

      return [
        o.id_orden_servicio,
        o.numero_orden,
        o.fecha_programada ? o.fecha_programada.substring(0, 10) : '',
        o.estados_orden?.nombre_estado || '',
        o.tipos_servicio?.categoria || '',
        o.tipos_servicio?.nombre_tipo || '',
        `"${serviciosHijos.replace(/"/g, '""')}"`,
        `"${equipos.replace(/"/g, '""')}"`,
        `"${horometros}"`,
        `"${tecnico.replace(/"/g, '""')}"`,
        `"${stripHtmlToPlainText(o.descripcion_inicial).replace(/"/g, '""')}"`,
        `"${stripHtmlToPlainText(o.trabajo_realizado).replace(/"/g, '""')}"`,
        `"${stripHtmlToPlainText(o.observaciones_cierre || o.observaciones_tecnico).replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bitacora_servicios_${clienteNombre.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Métricas calculadas
  const totalPreventivos = ordenes.filter((o) => o.tipos_servicio?.categoria === 'PREVENTIVO').length;
  const totalCorrectivos = ordenes.filter((o) => o.tipos_servicio?.categoria === 'CORRECTIVO').length;
  const totalEmergencias = ordenes.filter((o) => o.tipos_servicio?.categoria === 'EMERGENCIA').length;
  const totalEspecializados = ordenes.filter((o) => o.tipos_servicio?.categoria === 'ESPECIALIZADO').length;
  const totalServicios = ordenes.length;

  const pctPreventivos = totalServicios > 0 ? Math.round((totalPreventivos / totalServicios) * 100) : 0;
  const pctCorrectivos = totalServicios > 0 ? Math.round((totalCorrectivos / totalServicios) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header de Métricas de Confiabilidad y Rendimiento Operativo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total General */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">Total Intervenciones</p>
              <h3 className="text-3xl font-black mt-1 text-white tracking-tight">{totalServicios}</h3>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs text-white">
              <History className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Bitácora histórica auditada</span>
          </div>
        </div>

        {/* Preventivos */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">Preventivos</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-black text-slate-900">{totalPreventivos}</h3>
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {pctPreventivos}%
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${pctPreventivos}%` }} />
          </div>
        </div>

        {/* Correctivos */}
        <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-orange-600 uppercase">Correctivos Específicos</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-black text-slate-900">{totalCorrectivos}</h3>
                <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  {pctCorrectivos}%
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${pctCorrectivos}%` }} />
          </div>
        </div>

        {/* Emergencias / Especializados */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs hover:border-red-200 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-red-600 uppercase">Emergencias / Esp.</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-black text-slate-900">{totalEmergencias + totalEspecializados}</h3>
                <span className="text-xs font-bold text-slate-400">
                  {totalEmergencias} urg / {totalEspecializados} esp
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 font-medium">Atención prioritaria inmediata</p>
        </div>
      </div>

      {/* 2. Barra de Control, Presets Temporales y Filtros */}
      <Card className="border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-5 space-y-4">
          {/* Fila Superior: Buscador y Rango de Fechas */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Buscador Universal */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por # orden, falla, equipo, técnico o servicio específico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm outline-hidden transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector de Fechas y Presets */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Presets Rápidos */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => applyDatePreset('all')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all',
                    datePreset === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  )}
                >
                  Histórico
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('30d')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all',
                    datePreset === '30d' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  )}
                >
                  30 Días
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('quarter')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all',
                    datePreset === 'quarter' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  )}
                >
                  Trimestre (Q)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('ytd')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all',
                    datePreset === 'ytd' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  )}
                >
                  Año (YTD)
                </button>
              </div>

              {/* Input Custom Date */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => {
                    setFechaDesde(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent outline-hidden text-slate-800 font-medium"
                  title="Fecha Inicial"
                />
                <span className="text-slate-300">—</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => {
                    setFechaHasta(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent outline-hidden text-slate-800 font-medium"
                  title="Fecha Final"
                />
              </div>

              {/* Botón Exportar PDF Corporativo (con Vista Previa) */}
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsPdfModalOpen(true)}
                disabled={ordenes.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-9 rounded-xl shadow-xs transition-all active:scale-95"
                title="Generar y previsualizar Informe Ejecutivo PDF"
              >
                <FileText className="h-4 w-4 text-white" />
                <span>Exportar PDF</span>
              </Button>

              {/* Botón Exportar CSV */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={ordenes.length === 0}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs gap-1.5 h-9"
                title="Exportar Bitácora a Excel/CSV"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </div>
          </div>

          {/* Fila Inferior: Filtros de Categoría y Switch de Vistas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Categorías Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'TODOS', label: 'Todos los Servicios', count: totalServicios },
                { key: 'PREVENTIVO', label: 'Preventivos', count: totalPreventivos },
                { key: 'CORRECTIVO', label: 'Correctivos', count: totalCorrectivos },
                { key: 'EMERGENCIA', label: 'Emergencias', count: totalEmergencias },
                { key: 'ESPECIALIZADO', label: 'Especializados', count: totalEspecializados },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoriaFiltro(cat.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                    categoriaFiltro === cat.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  <span>{cat.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black',
                      categoriaFiltro === cat.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Alternador de Vistas (Tabla / Timeline) & Expandir Todo */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {viewMode === 'table' && ordenes.length > 0 && (
                <button
                  type="button"
                  onClick={expandAllRows}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1"
                >
                  {expandedRows.size === ordenes.length ? 'Colapsar todo' : 'Expandir todo'}
                </button>
              )}

              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all',
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="Vista Tabla Estratégica (Matriz)"
                >
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden md:inline">Tabla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all',
                    viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="Vista Línea de Tiempo"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden md:inline">Cronograma</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Contenido Principal: Data Grid Corporativo o Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 text-red-700">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="font-bold">Error al cargar la trazabilidad de servicios</p>
          <p className="text-xs text-red-600 mt-1">{(error as Error)?.message || 'Error desconocido'}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 bg-white font-bold">
            Reintentar
          </Button>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-3">
          <History className="h-12 w-12 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-800 text-base">No hay registros de servicios para los filtros seleccionados</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Prueba ajustando el rango de fecha o los términos de búsqueda para visualizar las intervenciones de este cliente.
          </p>
          {(search || fechaDesde || fechaHasta || categoriaFiltro !== 'TODOS') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setCategoriaFiltro('TODOS');
                applyDatePreset('all');
              }}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ================= VISTA DATA GRID ESTRATÉGICO ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-10 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[130px]">Fecha & Orden</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Naturaleza / Servicio</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Equipo(s) Intervenido(s)</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Alcance & Servicios Específicos</th>
                  <th className="py-3.5 px-4 min-w-[320px]">Diagnóstico / Trabajo</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Técnico Líder</th>
                  <th className="py-3.5 px-4 w-28 text-right">Soporte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {ordenes.map((orden, idx) => {
                  const isExpanded = expandedRows.has(orden.id_orden_servicio);
                  const fechaIntervencion = orden.fecha_programada || orden.fecha_creacion;
                  const pdfUrl = getPdfUrl(orden);
                  const esCorrectivo = orden.tipos_servicio?.categoria === 'CORRECTIVO' || orden.tipos_servicio?.categoria === 'EMERGENCIA';
                  const serviciosHijos = orden.detalle_servicios_orden || [];
                  const equiposList = getEquiposList(orden);

                  // Observaciones procesadas
                  const plainTrabajo = stripHtmlToPlainText(orden.trabajo_realizado);
                  const plainFalla = stripHtmlToPlainText(orden.descripcion_inicial);
                  const plainCierre = stripHtmlToPlainText(orden.observaciones_cierre || orden.observaciones_tecnico);
                  const nombreTecnico = formatNombreTecnico(orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados);
                  const inicialesTecnico = getInicialesTecnico(orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados);

                  return (
                    <Fragment key={orden.id_orden_servicio}>
                      <tr
                        className={cn(
                          'group transition-colors hover:bg-blue-50/40',
                          isExpanded ? 'bg-slate-100/80 font-medium' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        )}
                      >
                        {/* 1. Toggle Expansión */}
                        <td className="py-3.5 px-3 text-center align-top">
                          <button
                            type="button"
                            onClick={() => toggleRowExpansion(orden.id_orden_servicio)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                            title={isExpanded ? 'Colapsar detalles' : 'Ver desglose inline'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-blue-600 font-bold" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        {/* 2. Fecha & Código de Orden */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-black text-slate-900 block group-hover:text-blue-600 transition-colors">
                              {orden.numero_orden}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{formatDateSafe(fechaIntervencion, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                            {orden.estados_orden && (
                              <span
                                className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide mt-0.5"
                                style={{
                                  backgroundColor: `${orden.estados_orden.color_hex || '#64748b'}15`,
                                  color: orden.estados_orden.color_hex || '#64748b',
                                  borderColor: `${orden.estados_orden.color_hex || '#64748b'}30`,
                                }}
                              >
                                {orden.estados_orden.nombre_estado}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Naturaleza / Tipo de Servicio */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-black tracking-wider uppercase px-2 py-0.5',
                                esCorrectivo
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              )}
                            >
                              {orden.tipos_servicio?.categoria || 'SERVICIO'}
                            </Badge>
                            <p className="font-bold text-slate-900 text-xs">
                              {orden.tipos_servicio?.nombre_tipo || 'Mantenimiento General'}
                            </p>
                          </div>
                        </td>

                        {/* 4. Equipos Intervenidos (Nombres Prominentes & Horómetros) */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1.5 min-w-[180px]">
                            {equiposList.length > 0 ? (
                              equiposList.map((eq) => (
                                <div key={eq.id_equipo} className="flex flex-col gap-0.5">
                                  <Link
                                    href={`/equipos/${eq.id_equipo}`}
                                    className="font-bold text-slate-800 hover:text-blue-600 text-xs transition-colors flex items-center gap-1.5 group/eq leading-snug break-words"
                                    title={`${eq.nombre_equipo} (${eq.codigo_equipo})`}
                                  >
                                    <span>{eq.nombre_equipo}</span>
                                  </Link>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium flex-wrap">
                                    {eq.horas_actuales != null && (
                                      <span className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                        <Gauge className="h-2.5 w-2.5 text-slate-400" />
                                        {eq.horas_actuales} hrs
                                      </span>
                                    )}
                                    {eq.tipo_nombre && (
                                      <span className="text-slate-400 text-[10px]">
                                        {eq.tipo_nombre}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sin equipo asignado</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Alcance & Servicios Específicos (Completo, Sin Truncamientos) */}
                        <td className="py-3.5 px-4 align-top">
                          {serviciosHijos.length > 0 ? (
                            <div className="space-y-1.5 min-w-[220px]">
                              <div className="flex items-center gap-1 text-[10px] font-black text-orange-800 uppercase tracking-wider">
                                <Layers className="h-3 w-3 text-orange-600" />
                                <span>{serviciosHijos.length} Ejecutado(s)</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {serviciosHijos.map((det) => (
                                  <div
                                    key={det.id_detalle_servicio}
                                    className="p-2 bg-orange-50/90 rounded-lg border border-orange-200/80 text-[11px] flex items-start justify-between gap-1.5 shadow-2xs"
                                  >
                                    <span className="font-bold text-orange-950 leading-snug break-words flex-1">
                                      {det.catalogo_servicios?.nombre_servicio}
                                    </span>
                                    {Number(det.cantidad) > 1 && (
                                      <span className="text-[9px] font-black bg-orange-200/80 text-orange-900 px-1.5 py-0.5 rounded-sm shrink-0">
                                        x{det.cantidad}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              {esCorrectivo ? (
                                <span className="inline-flex items-center gap-1 text-orange-800 bg-orange-50/90 px-2.5 py-1 rounded-md border border-orange-200 text-[11px] font-medium leading-tight">
                                  <Wrench className="h-3 w-3 text-orange-500 shrink-0" />
                                  Correctivo general según diagnóstico
                                </span>
                              ) : orden.tipos_servicio?.categoria === 'EMERGENCIA' ? (
                                <span className="inline-flex items-center gap-1 text-red-800 bg-red-50/90 px-2.5 py-1 rounded-md border border-red-200 text-[11px] font-medium leading-tight">
                                  <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                                  Atención de emergencia directa
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Rutina preventiva estándar</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. Diagnóstico / Trabajo (Contenido Completo, Sin Cortes) */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-2 min-w-[280px]">
                            {plainTrabajo || plainFalla || plainCierre ? (
                              <>
                                {plainTrabajo && (
                                  <div className="text-[11.5px] text-slate-800 leading-relaxed break-words">
                                    <strong className="text-slate-900 font-bold">Trabajo:</strong>{' '}
                                    <span className="whitespace-pre-line">{plainTrabajo}</span>
                                  </div>
                                )}
                                {plainFalla && plainFalla !== plainTrabajo && (
                                  <div className="text-[11.5px] text-slate-700 leading-relaxed break-words">
                                    <strong className="text-slate-900 font-bold">Falla / Motivo:</strong>{' '}
                                    <span className="whitespace-pre-line">{plainFalla}</span>
                                  </div>
                                )}
                                {plainCierre && plainCierre !== plainTrabajo && (
                                  <div className="text-[11.5px] text-slate-700 leading-relaxed break-words">
                                    <strong className="text-slate-900 font-bold">Cierre:</strong>{' '}
                                    <span className="whitespace-pre-line">{plainCierre}</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setModalOrden(orden)}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 pt-0.5 transition-colors"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Ver bitácora completa</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sin observaciones registradas</span>
                            )}
                          </div>
                        </td>

                        {/* 7. Técnico Responsable (Nombre Completo Sin Truncar) */}
                        <td className="py-3.5 px-4 align-top">
                          {orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona ? (
                            <div className="flex items-center gap-2 text-slate-800 min-w-[150px]">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-300">
                                {inicialesTecnico}
                              </div>
                              <span
                                className="font-semibold text-[11.5px] text-slate-800 leading-snug break-words"
                                title={nombreTecnico}
                              >
                                {nombreTecnico}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin asignar</span>
                          )}
                        </td>

                        {/* 8. Acciones & PDF */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pdfUrl && (
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-bold flex items-center gap-1"
                                title="Ver Informe Técnico en PDF"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span className="text-[10px]">PDF</span>
                              </a>
                            )}
                            <Link
                              href={`/ordenes/${orden.id_orden_servicio}`}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors border border-slate-200"
                              title="Ir al detalle completo de la orden"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Panel Expandido Inline (Justo debajo de la fila de la orden) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/95 border-b border-slate-200">
                          <td colSpan={8} className="p-0">
                            <div className="p-5 space-y-4 text-xs animate-in fade-in duration-150 bg-slate-50/90 border-t border-slate-200">
                              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                    Detalle de Intervención #{orden.numero_orden}
                                  </span>
                                  <Badge variant="outline" className="font-bold text-xs bg-white">
                                    {orden.tipos_servicio?.nombre_tipo}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setModalOrden(orden)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Ver Bitácora Completa</span>
                                  </button>
                                  {pdfUrl && (
                                    <a
                                      href={pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>Descargar Acta / PDF</span>
                                    </a>
                                  )}
                                  <Link
                                    href={`/ordenes/${orden.id_orden_servicio}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                                  >
                                    <span>Abrir Orden</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Desglose de Servicios Hijos */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                  <p className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-orange-600">
                                    <Layers className="h-4 w-4" />
                                    Servicios Específicos ({serviciosHijos.length})
                                  </p>
                                  {serviciosHijos.length > 0 ? (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {serviciosHijos.map((det) => (
                                        <div
                                          key={det.id_detalle_servicio}
                                          className="p-2.5 bg-orange-50/50 rounded-lg border border-orange-100 flex items-start justify-between gap-2"
                                        >
                                          <p className="font-bold text-slate-800 text-xs">
                                            {det.catalogo_servicios?.nombre_servicio}
                                          </p>
                                          <Badge variant="outline" className="text-[10px] bg-white font-mono shrink-0">
                                            Cant: {det.cantidad}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-slate-500 italic text-xs">
                                      {esCorrectivo
                                        ? 'Intervención correctiva general según diagnóstico en campo.'
                                        : 'Rutina preventiva estándar según protocolo de mantenimiento.'}
                                    </p>
                                  )}
                                </div>

                                {/* Hallazgos y Diagnóstico Técnico */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                  <p className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-blue-600">
                                    <FileText className="h-4 w-4" />
                                    Registro Cualitativo de Campo
                                  </p>
                                  <div className="space-y-2 text-slate-700 max-h-48 overflow-y-auto pr-1">
                                    {plainFalla && (
                                      <div>
                                        <span className="font-bold text-slate-900 block text-[10px] uppercase">Motivo / Falla Reportada:</span>
                                        <p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-800 mt-0.5 whitespace-pre-line">
                                          {plainFalla}
                                        </p>
                                      </div>
                                    )}
                                    {plainTrabajo && (
                                      <div>
                                        <span className="font-bold text-slate-900 block text-[10px] uppercase">Trabajo Realizado:</span>
                                        <p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-800 mt-0.5 whitespace-pre-line">
                                          {plainTrabajo}
                                        </p>
                                      </div>
                                    )}
                                    {plainCierre && (
                                      <div>
                                        <span className="font-bold text-slate-900 block text-[10px] uppercase">Observaciones de Cierre:</span>
                                        <p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-800 mt-0.5 whitespace-pre-line">
                                          {plainCierre}
                                        </p>
                                      </div>
                                    )}
                                    {!plainFalla && !plainTrabajo && !plainCierre && (
                                      <p className="text-slate-400 italic text-xs">Sin observaciones detalladas.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Activos y Técnico Asignado */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                  <div>
                                    <p className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-slate-700 mb-1.5">
                                      <Wrench className="h-4 w-4" />
                                      Equipos Intervenidos
                                    </p>
                                    {equiposList.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {equiposList.map((eq) => (
                                          <div key={eq.id_equipo} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                                            <div>
                                              <span className="font-bold text-slate-800 text-xs block">{eq.nombre_equipo}</span>
                                              {eq.tipo_nombre && (
                                                <span className="text-[10px] text-slate-400">{eq.tipo_nombre}</span>
                                              )}
                                            </div>
                                            {eq.horas_actuales != null && (
                                              <span className="font-mono text-xs font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {eq.horas_actuales} hrs
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-slate-400 italic text-xs">Sin equipo asignado</p>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-slate-100">
                                    <p className="font-bold text-slate-900 uppercase text-[10px] text-slate-500 mb-1">
                                      Especialista Certificado:
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-slate-400" />
                                      <span className="font-bold text-slate-800">
                                        {nombreTecnico}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= VISTA LÍNEA DE TIEMPO (TIMELINE NARRATIVO) ================= */
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {ordenes.map((orden) => {
            const fechaIntervencion = orden.fecha_programada || orden.fecha_creacion;
            const pdfUrl = getPdfUrl(orden);
            const tieneCorrectivosEspecificos = orden.detalle_servicios_orden && orden.detalle_servicios_orden.length > 0;
            const esCorrectivo = orden.tipos_servicio?.categoria === 'CORRECTIVO' || orden.tipos_servicio?.categoria === 'EMERGENCIA';
            const equiposList = getEquiposList(orden);

            const plainFalla = stripHtmlToPlainText(orden.descripcion_inicial);
            const plainTrabajo = stripHtmlToPlainText(orden.trabajo_realizado);
            const plainCierre = stripHtmlToPlainText(orden.observaciones_cierre || orden.observaciones_tecnico);

            return (
              <div key={orden.id_orden_servicio} className="relative group">
                {/* Punto de la línea de tiempo */}
                <div
                  className={cn(
                    'absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full border-4 border-white shadow-xs transition-transform group-hover:scale-125',
                    esCorrectivo ? 'bg-orange-500' : 'bg-blue-600'
                  )}
                />

                {/* Card de la Orden */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4">
                  {/* Encabezado */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {orden.numero_orden}
                      </span>
                      {orden.tipos_servicio && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-bold text-xs',
                            esCorrectivo
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          )}
                        >
                          {orden.tipos_servicio.nombre_tipo}
                        </Badge>
                      )}
                      {orden.estados_orden && (
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${orden.estados_orden.color_hex || '#64748b'}15`,
                            color: orden.estados_orden.color_hex || '#64748b',
                            borderColor: `${orden.estados_orden.color_hex || '#64748b'}30`,
                          }}
                        >
                          {orden.estados_orden.nombre_estado}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDateSafe(fechaIntervencion, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <Link
                        href={`/ordenes/${orden.id_orden_servicio}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors ml-2"
                      >
                        <span>Ver Orden</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Servicios Hijos */}
                  {tieneCorrectivosEspecificos ? (
                    <div className="bg-orange-50/60 rounded-xl p-3.5 border border-orange-200/80 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-orange-600" />
                        <p className="text-xs font-black uppercase tracking-wider text-orange-900">
                          Servicios Específicos Ejecutados ({orden.detalle_servicios_orden?.length})
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {orden.detalle_servicios_orden?.map((det) => (
                          <div
                            key={det.id_detalle_servicio}
                            className="flex items-start gap-2 p-2 bg-white rounded-lg border border-orange-100 text-xs shadow-2xs"
                          >
                            <span className="font-bold text-slate-800 flex-1">
                              {det.catalogo_servicios?.nombre_servicio}
                            </span>
                            {Number(det.cantidad) > 1 && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                x{det.cantidad}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Trabajo y Observaciones */}
                  {(plainFalla || plainTrabajo || plainCierre) && (
                    <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl">
                      {plainFalla && (
                        <p className="text-slate-700 whitespace-pre-line">
                          <strong className="text-slate-900">Descripción inicial / Falla:</strong> {plainFalla}
                        </p>
                      )}
                      {plainTrabajo && (
                        <p className="text-slate-700 whitespace-pre-line">
                          <strong className="text-slate-900">Trabajo realizado:</strong> {plainTrabajo}
                        </p>
                      )}
                      {plainCierre && (
                        <p className="text-slate-700 whitespace-pre-line">
                          <strong className="text-slate-900">Observaciones técnicas:</strong> {plainCierre}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Equipos, Técnico y PDF Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-500 flex items-center gap-1">
                        <Wrench className="h-3.5 w-3.5 text-slate-400" /> Equipos:
                      </span>
                      {equiposList.length > 0 ? (
                        equiposList.map((eq) => (
                          <Link
                            key={eq.id_equipo}
                            href={`/equipos/${eq.id_equipo}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md font-medium border border-slate-200 transition-colors"
                          >
                            <span>{eq.nombre_equipo}</span>
                            {eq.horas_actuales != null && (
                              <span className="text-[10px] text-slate-400">({eq.horas_actuales} hrs)</span>
                            )}
                          </Link>
                        ))
                      ) : (
                        <span className="text-slate-400">Sin equipo especificado</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona && (
                        <div className="flex items-center gap-1 text-slate-700">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">
                            {formatNombreTecnico(orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados)}
                          </span>
                        </div>
                      )}

                      {pdfUrl && (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg font-bold transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal Corporativo de Detalle Técnico / Hallazgos Completos */}
      {modalOrden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200">
            {/* Header del Modal */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between relative">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-white/20 text-white px-2.5 py-1 rounded-lg">
                    {modalOrden.numero_orden}
                  </span>
                  <Badge variant="outline" className="text-xs bg-white text-slate-900 font-bold">
                    {modalOrden.tipos_servicio?.nombre_tipo || 'Intervención Técnica'}
                  </Badge>
                  {modalOrden.estados_orden && (
                    <span
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${modalOrden.estados_orden.color_hex || '#64748b'}25`,
                        color: '#ffffff',
                        borderColor: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {modalOrden.estados_orden.nombre_estado}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-white pt-1">
                  Bitácora Integral de Intervención & Hallazgos
                </h2>
                <p className="text-xs text-slate-300">
                  Fecha: {formatDateSafe(modalOrden.fecha_programada || modalOrden.fecha_creacion, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOrden(null)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Cerrar ventana"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Equipos & Técnico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                    Equipos Intervenidos:
                  </span>
                  {getEquiposList(modalOrden).map((eq) => (
                    <div key={eq.id_equipo} className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-bold text-slate-900 text-xs">{eq.nombre_equipo}</span>
                      {eq.horas_actuales != null && (
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {eq.horas_actuales} hrs
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                    Técnico Especialista:
                  </span>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900 text-xs">
                      {formatNombreTecnico(modalOrden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Servicios Específicos */}
              {modalOrden.detalle_servicios_orden && modalOrden.detalle_servicios_orden.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-orange-700 font-bold uppercase text-[11px]">
                    <Layers className="h-4 w-4" />
                    <span>Servicios Específicos Ejecutados ({modalOrden.detalle_servicios_orden.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modalOrden.detalle_servicios_orden.map((det) => (
                      <div key={det.id_detalle_servicio} className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/80 flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{det.catalogo_servicios?.nombre_servicio}</span>
                        {Number(det.cantidad) > 1 && (
                          <Badge variant="outline" className="bg-white text-[10px] font-mono">
                            Cant: {det.cantidad}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Secciones Narrativas de la Bitácora */}
              <div className="space-y-4">
                {modalOrden.descripcion_inicial && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-slate-800">
                      <Info className="h-3.5 w-3.5 text-blue-600" />
                      1. Estado Inicial / Falla Reportada:
                    </span>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-slate-800 leading-relaxed whitespace-pre-line text-xs">
                      {stripHtmlToPlainText(modalOrden.descripcion_inicial)}
                    </div>
                  </div>
                )}

                {modalOrden.trabajo_realizado && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-slate-800">
                      <Wrench className="h-3.5 w-3.5 text-emerald-600" />
                      2. Trabajos de Campo Ejecutados:
                    </span>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-slate-800 leading-relaxed whitespace-pre-line text-xs">
                      {stripHtmlToPlainText(modalOrden.trabajo_realizado)}
                    </div>
                  </div>
                )}

                {(modalOrden.observaciones_cierre || modalOrden.observaciones_tecnico) && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-slate-800">
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                      3. Hallazgos Técnicos & Observaciones de Cierre:
                    </span>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-slate-800 leading-relaxed whitespace-pre-line text-xs font-normal">
                      {stripHtmlToPlainText(modalOrden.observaciones_cierre || modalOrden.observaciones_tecnico)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Auditoría técnica registrada en plataforma Mekanos
              </span>
              <div className="flex items-center gap-2">
                {getPdfUrl(modalOrden) && (
                  <a
                    href={getPdfUrl(modalOrden)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Descargar PDF</span>
                  </a>
                )}
                <Link
                  href={`/ordenes/${modalOrden.id_orden_servicio}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                >
                  <span>Abrir Orden Completa</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOrden(null)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal de Vista Previa del Informe Ejecutivo PDF */}
      <ModalVistaPreviaTrazabilidadPdf
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        clienteId={clienteId}
        clienteNombre={clienteNombre}
        filtros={{
          categoria: categoriaFiltro !== 'TODOS' ? categoriaFiltro : undefined,
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          search: search.trim() || undefined,
        }}
        totalOrdenes={ordenes.length}
      />
    </div>
  );
}
