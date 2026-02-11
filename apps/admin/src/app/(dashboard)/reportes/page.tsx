/**
 * MEKANOS S.A.S - Portal Admin
 * Módulo de Reportes — Gestión centralizada de informes PDF
 * 
 * Ruta: /reportes
 * 
 * Funcionalidades:
 * - Tabla profesional con todos los informes PDF generados
 * - Filtros: cliente, fecha, tipo servicio, estado, búsqueda libre
 * - Acciones: ver PDF, descargar, ver orden asociada
 * - Paginación server-side
 * 
 * ✅ REPORTES MODULE 10-FEB-2026
 */

'use client';

import {
    useClientesConInformes,
    useReportes,
    type ReporteItem,
} from '@/features/reportes';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    Building2,
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    Eye,
    FileText,
    Filter,
    HardDrive,
    Loader2,
    RefreshCw,
    Search,
    SlidersHorizontal,
    User,
    Wrench,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getEstadoInformeStyle(estado: string): string {
    switch (estado) {
        case 'APROBADO': return 'bg-green-100 text-green-800';
        case 'ENVIADO': return 'bg-blue-100 text-blue-800';
        case 'REVISADO': return 'bg-yellow-100 text-yellow-800';
        case 'BORRADOR': return 'bg-gray-100 text-gray-600';
        case 'GENERADO': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-600';
    }
}

function getEstadoInformeLabel(estado: string): string {
    switch (estado) {
        case 'APROBADO': return 'Aprobado';
        case 'ENVIADO': return 'Enviado';
        case 'REVISADO': return 'Revisado';
        case 'BORRADOR': return 'Borrador';
        case 'GENERADO': return 'Generado';
        default: return estado;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

function EstadoInformeBadge({ estado }: { estado: string }) {
    return (
        <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
            getEstadoInformeStyle(estado),
        )}>
            {getEstadoInformeLabel(estado)}
        </span>
    );
}

function ReporteRow({ reporte }: { reporte: ReporteItem }) {
    const pdfUrl = reporte.documento?.ruta_archivo;

    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
            {/* Informe */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="font-mono text-sm font-semibold text-gray-900">
                            {reporte.numero_informe}
                        </p>
                        <p className="text-xs text-gray-500">
                            {formatDate(reporte.fecha_generacion)}
                        </p>
                    </div>
                </div>
            </td>

            {/* Estado */}
            <td className="px-4 py-3">
                <EstadoInformeBadge estado={reporte.estado_informe} />
            </td>

            {/* Cliente */}
            <td className="px-4 py-3">
                <div className="max-w-[200px]">
                    <p className="text-sm font-medium text-gray-900 truncate" title={reporte.cliente.nombre}>
                        {reporte.cliente.nombre}
                    </p>
                    {reporte.cliente.nit && (
                        <p className="text-xs text-gray-500">NIT: {reporte.cliente.nit}</p>
                    )}
                </div>
            </td>

            {/* Orden */}
            <td className="px-4 py-3">
                {reporte.orden ? (
                    <Link
                        href={`/ordenes/${reporte.orden.id_orden_servicio}`}
                        className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {reporte.orden.numero_orden}
                    </Link>
                ) : (
                    <span className="text-sm text-gray-400">—</span>
                )}
            </td>

            {/* Equipo */}
            <td className="px-4 py-3">
                {reporte.equipo ? (
                    <div className="max-w-[180px]">
                        <p className="text-sm text-gray-900 truncate" title={reporte.equipo.nombre}>
                            {reporte.equipo.codigo}
                        </p>
                        <p className="text-xs text-gray-500 truncate" title={reporte.equipo.nombre}>
                            {reporte.equipo.tipo}
                        </p>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400">—</span>
                )}
            </td>

            {/* Tipo Servicio */}
            <td className="px-4 py-3">
                {reporte.tipo_servicio ? (
                    <span className="text-sm text-gray-700">{reporte.tipo_servicio.nombre}</span>
                ) : (
                    <span className="text-sm text-gray-400">—</span>
                )}
            </td>

            {/* Técnico */}
            <td className="px-4 py-3">
                <span className="text-sm text-gray-700">{reporte.tecnico.nombre}</span>
            </td>

            {/* Tamaño */}
            <td className="px-4 py-3 text-right">
                <span className="text-xs text-gray-500 font-mono">
                    {formatFileSize(reporte.documento?.tama_o_bytes)}
                </span>
            </td>

            {/* Acciones */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                    {pdfUrl && (
                        <>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-colors"
                                title="Ver PDF"
                            >
                                <Eye className="h-4 w-4" />
                            </a>
                            <a
                                href={pdfUrl}
                                download
                                className="p-1.5 rounded-md hover:bg-green-50 text-green-600 hover:text-green-800 transition-colors"
                                title="Descargar PDF"
                            >
                                <Download className="h-4 w-4" />
                            </a>
                        </>
                    )}
                    {reporte.orden && (
                        <Link
                            href={`/ordenes/${reporte.orden.id_orden_servicio}`}
                            className="p-1.5 rounded-md hover:bg-purple-50 text-purple-600 hover:text-purple-800 transition-colors"
                            title="Ver orden"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS CARDS
// ═══════════════════════════════════════════════════════════════════════════════

function StatsCards({ total, isLoading }: { total: number; isLoading: boolean }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : total}
                    </p>
                    <p className="text-xs text-gray-500">Informes Generados</p>
                </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-lg">
                    <HardDrive className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">PDF</p>
                    <p className="text-xs text-gray-500">Formato disponible</p>
                </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
                <div className="p-2.5 bg-green-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">R2</p>
                    <p className="text-xs text-gray-500">Cloudflare Storage</p>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function ReportesPage() {
    // Estado de filtros
    const [page, setPage] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [busquedaDebounced, setBusquedaDebounced] = useState('');
    const [filtroCliente, setFiltroCliente] = useState<string>('');
    const [filtroEstado, setFiltroEstado] = useState<string>('');
    const [fechaDesde, setFechaDesde] = useState<string>('');
    const [fechaHasta, setFechaHasta] = useState<string>('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Debounce para búsqueda
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setBusquedaDebounced(busqueda.trim());
            setPage(1);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [busqueda]);

    const pageSize = 50;

    // Queries
    const { data: clientesData } = useClientesConInformes();

    const { data, isLoading, isError, refetch } = useReportes({
        page,
        limit: pageSize,
        clienteId: filtroCliente ? parseInt(filtroCliente) : undefined,
        estadoInforme: filtroEstado || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        busqueda: busquedaDebounced || undefined,
    });

    const reportes = data?.data || [];
    const meta = data?.meta;
    const totalPages = meta?.totalPages || 1;
    const totalItems = meta?.total || 0;

    const hasActiveFilters = !!(filtroCliente || filtroEstado || fechaDesde || fechaHasta || busquedaDebounced);

    const clearAllFilters = () => {
        setFiltroCliente('');
        setFiltroEstado('');
        setFechaDesde('');
        setFechaHasta('');
        setBusqueda('');
        setBusquedaDebounced('');
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-7 w-7 text-purple-600" />
                        Reportes e Informes
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestión centralizada de informes PDF de servicio por cliente
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                        {totalItems} informes
                    </span>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                    >
                        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Stats */}
            <StatsCards total={totalItems} isLoading={isLoading} />

            {/* Filtros */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por informe, orden, cliente, NIT..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Filtros principales */}
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filtroCliente}
                            onChange={(e) => { setFiltroCliente(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm min-w-[180px]"
                        >
                            <option value="">Todos los clientes</option>
                            {clientesData?.map((c) => (
                                <option key={c.id_cliente} value={c.id_cliente}>
                                    {c.nombre}{c.nit ? ` (${c.nit})` : ''}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtroEstado}
                            onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                            <option value="">Todos los estados</option>
                            <option value="GENERADO">Generado</option>
                            <option value="BORRADOR">Borrador</option>
                            <option value="REVISADO">Revisado</option>
                            <option value="APROBADO">Aprobado</option>
                            <option value="ENVIADO">Enviado</option>
                        </select>

                        {/* Toggle filtros avanzados */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={cn(
                                'flex items-center gap-1 px-3 py-2 border rounded-lg text-sm',
                                showAdvancedFilters
                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                    : 'border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Fechas
                        </button>
                    </div>
                </div>

                {/* Filtros avanzados: Rango de fechas */}
                {showAdvancedFilters && (
                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                />
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Indicadores de filtros activos */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Filtros:</span>
                        {busquedaDebounced && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                &quot;{busquedaDebounced}&quot;
                            </span>
                        )}
                        {filtroCliente && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                Cliente: {clientesData?.find(c => c.id_cliente === parseInt(filtroCliente))?.nombre || filtroCliente}
                            </span>
                        )}
                        {filtroEstado && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                Estado: {getEstadoInformeLabel(filtroEstado)}
                            </span>
                        )}
                        {(fechaDesde || fechaHasta) && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                                {fechaDesde && `Desde: ${fechaDesde}`} {fechaHasta && `Hasta: ${fechaHasta}`}
                            </span>
                        )}
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs text-red-600 hover:text-red-800"
                        >
                            <X className="h-3 w-3" />
                            Limpiar
                        </button>
                    </div>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="font-medium">Error al cargar reportes</p>
                    <button onClick={() => refetch()} className="mt-2 text-sm text-blue-600 hover:underline">
                        Reintentar
                    </button>
                </div>
            )}

            {/* Tabla */}
            {!isLoading && !isError && (
                <>
                    {reportes.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-600 font-medium">No se encontraron informes</p>
                            <p className="text-gray-500 text-sm mt-1">
                                {hasActiveFilters
                                    ? 'Intenta ajustar los filtros de búsqueda'
                                    : 'Los informes aparecerán aquí cuando se generen desde las órdenes completadas'}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Informe
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                <div className="flex items-center gap-1">
                                                    <Building2 className="h-3.5 w-3.5" />
                                                    Cliente
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Orden
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                <div className="flex items-center gap-1">
                                                    <Wrench className="h-3.5 w-3.5" />
                                                    Equipo
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Tipo Servicio
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    Técnico
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Tamaño
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportes.map((reporte) => (
                                            <ReporteRow key={reporte.id_documento} reporte={reporte} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                            <p className="text-sm text-gray-600">
                                Mostrando <span className="font-medium">{((page - 1) * pageSize) + 1}</span> - <span className="font-medium">{Math.min(page * pageSize, totalItems)}</span> de <span className="font-medium">{totalItems}</span> informes
                            </p>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className={cn(
                                        'p-2 rounded border text-sm',
                                        page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                    title="Primera página"
                                >
                                    <div className="flex">
                                        <ChevronLeft className="h-4 w-4" />
                                        <ChevronLeft className="h-4 w-4 -ml-2" />
                                    </div>
                                </button>

                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-2 rounded border text-sm',
                                        page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </button>

                                {/* Números de página */}
                                <div className="hidden sm:flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={cn(
                                                    'w-10 h-10 rounded border text-sm font-medium',
                                                    page === pageNum
                                                        ? 'bg-purple-600 text-white border-purple-600'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-2 rounded border text-sm',
                                        page >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4" />
                                </button>

                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page >= totalPages}
                                    className={cn(
                                        'p-2 rounded border text-sm',
                                        page >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                    title="Última página"
                                >
                                    <div className="flex">
                                        <ChevronRight className="h-4 w-4" />
                                        <ChevronRight className="h-4 w-4 -ml-2" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
