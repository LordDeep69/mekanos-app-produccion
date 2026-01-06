/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Gestión de Órdenes de Servicio
 * 
 * Ruta: /ordenes
 * 
 * Funcionalidades:
 * - Listado de órdenes con filtros (estado, prioridad, cliente)
 * - Ver estado FSM de cada orden
 * - Navegación a detalle
 */

'use client';

import {
    getClienteNombre,
    getEstadoColor,
    getPrioridadColor,
    getTecnicoNombre,
    useOrdenes,
} from '@/features/ordenes';
import { useTiposServicio } from '@/features/ordenes/hooks/use-catalogos';
import { cn } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import {
    AlertCircle,
    ArrowDownAZ,
    ArrowUpAZ,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    Eye,
    Filter,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    User,
    Wrench,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function EstadoBadge({ estado }: { estado?: string }) {
    const labels: Record<string, string> = {
        PROGRAMADA: 'Programada',
        ASIGNADA: 'Asignada',
        EN_PROCESO: 'En Proceso',
        EN_ESPERA_REPUESTO: 'Espera Repuesto',
        COMPLETADA: 'Completada',
        APROBADA: 'Aprobada',
        CANCELADA: 'Cancelada',
    };

    return (
        <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getEstadoColor(estado)
        )}>
            {labels[estado || ''] || estado || 'Sin estado'}
        </span>
    );
}

function PrioridadBadge({ prioridad }: { prioridad?: string }) {
    const labels: Record<string, string> = {
        BAJA: 'Baja',
        NORMAL: 'Normal',
        ALTA: 'Alta',
        URGENTE: 'Urgente',
    };

    return (
        <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getPrioridadColor(prioridad)
        )}>
            {labels[prioridad || ''] || prioridad || 'Normal'}
        </span>
    );
}

function OrdenCard({ orden }: { orden: Orden }) {
    const fechaProgramada = orden.fecha_programada
        ? new Date(orden.fecha_programada).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        : 'Sin programar';

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <span className="font-mono text-sm text-blue-600 font-semibold">
                        {orden.numero_orden}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                        <EstadoBadge estado={orden.estados_orden?.codigo_estado} />
                        <PrioridadBadge prioridad={orden.prioridad} />
                    </div>
                </div>
            </div>

            {/* Descripción */}
            {orden.descripcion && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {orden.descripcion}
                </p>
            )}

            {/* Info Grid */}
            <div className="space-y-2 text-sm">
                {/* Cliente */}
                <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">{getClienteNombre(orden)}</span>
                </div>

                {/* Equipo */}
                <div className="flex items-center gap-2 text-gray-600">
                    <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-1">
                        {orden.equipos?.codigo_equipo || 'Sin equipo'}
                        {orden.equipos?.nombre_equipo && ` - ${orden.equipos.nombre_equipo}`}
                    </span>
                </div>

                {/* Técnico */}
                <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{getTecnicoNombre(orden)}</span>
                </div>

                {/* Fecha programada */}
                <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{fechaProgramada}</span>
                </div>

                {/* Tipo servicio */}
                {orden.tipos_servicio && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="line-clamp-1">{orden.tipos_servicio.nombre_tipo}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-4 pt-3 border-t">
                <Link
                    href={`/ordenes/${orden.id_orden_servicio}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                </Link>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrdenesPage() {
    const [page, setPage] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<string>('');
    const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
    // ENTERPRISE: Nuevos filtros avanzados
    const [sortBy, setSortBy] = useState<'fecha_creacion' | 'fecha_programada' | 'numero_orden'>('fecha_creacion');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const pageSize = 12;

    // Cargar tipos de servicio para el filtro
    const { data: tiposServicio } = useTiposServicio({ activo: true });

    const { data, isLoading, isError, refetch } = useOrdenes({
        page,
        limit: pageSize,
        estado: filtroEstado || undefined,
        prioridad: filtroPrioridad || undefined,
        sortBy,
        sortOrder,
        tipoServicioId: filtroTipoServicio ? parseInt(filtroTipoServicio) : undefined,
    });

    const ordenes = data?.data || [];
    const pagination = data?.pagination;
    const totalPages = pagination?.totalPages || 1;

    // Filtro local por búsqueda (número de orden)
    const ordenesFiltradas = busqueda
        ? ordenes.filter((o) => {
            const numero = (o.numero_orden || '').toLowerCase();
            const query = busqueda.toLowerCase();
            return numero.includes(query);
        })
        : ordenes;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="h-7 w-7 text-blue-600" />
                        Órdenes de Servicio
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestión de órdenes de mantenimiento preventivo y correctivo
                    </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                        {pagination?.total || 0} órdenes
                    </span>
                    <Link
                        href="/ordenes/nueva"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva Orden
                    </Link>
                </div>
            </div>

            {/* Filtros Básicos */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por número de orden..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Filtros principales */}
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filtroEstado}
                            onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">Todos los estados</option>
                            <option value="PROGRAMADA">Programada</option>
                            <option value="ASIGNADA">Asignada</option>
                            <option value="EN_PROCESO">En Proceso</option>
                            <option value="EN_ESPERA_REPUESTO">Espera Repuesto</option>
                            <option value="COMPLETADA">Completada</option>
                            <option value="APROBADA">Aprobada</option>
                            <option value="CANCELADA">Cancelada</option>
                        </select>

                        <select
                            value={filtroPrioridad}
                            onChange={(e) => { setFiltroPrioridad(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">Todas las prioridades</option>
                            <option value="BAJA">Baja</option>
                            <option value="NORMAL">Normal</option>
                            <option value="ALTA">Alta</option>
                            <option value="URGENTE">Urgente</option>
                        </select>

                        {/* ENTERPRISE: Ordenamiento */}
                        <select
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="fecha_creacion">Fecha creación</option>
                            <option value="fecha_programada">Fecha programada</option>
                            <option value="numero_orden">Número orden</option>
                        </select>

                        <button
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            title={sortOrder === 'desc' ? 'Ordenar ascendente' : 'Ordenar descendente'}
                        >
                            {sortOrder === 'desc' ? (
                                <ArrowDownAZ className="h-5 w-5 text-gray-600" />
                            ) : (
                                <ArrowUpAZ className="h-5 w-5 text-gray-600" />
                            )}
                        </button>

                        {/* Botón filtros avanzados */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={cn(
                                'flex items-center gap-1 px-3 py-2 border rounded-lg text-sm',
                                showAdvancedFilters
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Avanzados
                        </button>

                        <button
                            onClick={() => refetch()}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            title="Refrescar"
                        >
                            <RefreshCw className={cn('h-5 w-5 text-gray-600', isLoading && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                {/* ENTERPRISE: Filtros Avanzados */}
                {showAdvancedFilters && (
                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-3">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Servicio</label>
                                <select
                                    value={filtroTipoServicio}
                                    onChange={(e) => { setFiltroTipoServicio(e.target.value); setPage(1); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="">Todos los tipos</option>
                                    {tiposServicio?.map((tipo) => (
                                        <option key={tipo.id_tipo_servicio} value={tipo.id_tipo_servicio}>
                                            {tipo.nombre_tipo}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Limpiar filtros */}
                            {(filtroEstado || filtroPrioridad || filtroTipoServicio) && (
                                <button
                                    onClick={() => {
                                        setFiltroEstado('');
                                        setFiltroPrioridad('');
                                        setFiltroTipoServicio('');
                                        setPage(1);
                                    }}
                                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-800"
                                >
                                    <X className="h-4 w-4" />
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Indicadores de filtros activos */}
                {(filtroEstado || filtroPrioridad || filtroTipoServicio) && (
                    <div className="flex items-center gap-2 text-sm">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Filtros activos:</span>
                        {filtroEstado && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                Estado: {filtroEstado}
                            </span>
                        )}
                        {filtroPrioridad && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                                Prioridad: {filtroPrioridad}
                            </span>
                        )}
                        {filtroTipoServicio && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                                Tipo: {tiposServicio?.find(t => t.id_tipo_servicio === parseInt(filtroTipoServicio))?.nombre_tipo}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="font-medium">Error al cargar órdenes</p>
                    <button onClick={() => refetch()} className="mt-2 text-sm text-blue-600 hover:underline">
                        Reintentar
                    </button>
                </div>
            )}

            {/* Grid de órdenes */}
            {!isLoading && !isError && (
                <>
                    {ordenesFiltradas.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-600 font-medium">No hay órdenes de servicio</p>
                            <p className="text-gray-500 text-sm">Las órdenes aparecerán aquí cuando se creen</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ordenesFiltradas.map((orden) => (
                                <OrdenCard key={orden.id_orden_servicio} orden={orden} />
                            ))}
                        </div>
                    )}

                    {/* ENTERPRISE: Paginación Avanzada */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-gray-600">
                                    Mostrando <span className="font-medium">{((page - 1) * pageSize) + 1}</span> - <span className="font-medium">{Math.min(page * pageSize, pagination?.total || 0)}</span> de <span className="font-medium">{pagination?.total || 0}</span> órdenes
                                </p>
                                <select
                                    value={page}
                                    onChange={(e) => setPage(parseInt(e.target.value))}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <option key={p} value={p}>Página {p}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Primera página */}
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className={cn(
                                        'p-2 rounded border text-sm',
                                        page === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                    title="Primera página"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <ChevronLeft className="h-4 w-4 -ml-2" />
                                </button>

                                {/* Anterior */}
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-2 rounded border text-sm',
                                        page === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
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
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Siguiente */}
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-2 rounded border text-sm',
                                        page >= totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4" />
                                </button>

                                {/* Última página */}
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page >= totalPages}
                                    className={cn(
                                        'p-2 rounded border text-sm',
                                        page >= totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                    title="Última página"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                    <ChevronRight className="h-4 w-4 -ml-2" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
