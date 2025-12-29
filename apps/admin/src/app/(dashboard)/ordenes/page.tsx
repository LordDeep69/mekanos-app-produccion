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
import { cn } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import {
    AlertCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    Eye,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    User,
    Wrench
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
                        <span className="line-clamp-1">{orden.tipos_servicio.nombre_servicio}</span>
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

    const pageSize = 12;

    const { data, isLoading, isError, refetch } = useOrdenes({
        page,
        limit: pageSize,
        estado: filtroEstado || undefined,
        prioridad: filtroPrioridad || undefined,
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

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
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

                <div className="flex gap-2">
                    <select
                        value={filtroEstado}
                        onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todas las prioridades</option>
                        <option value="BAJA">Baja</option>
                        <option value="NORMAL">Normal</option>
                        <option value="ALTA">Alta</option>
                        <option value="URGENTE">Urgente</option>
                    </select>

                    <button
                        onClick={() => refetch()}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        title="Refrescar"
                    >
                        <RefreshCw className={cn('h-5 w-5 text-gray-600', isLoading && 'animate-spin')} />
                    </button>
                </div>
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

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-gray-600">
                                Página {pagination?.page || 1} de {totalPages}
                                {pagination?.total && ` (${pagination.total} total)`}
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-1 rounded border',
                                        page === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-1 rounded border',
                                        page >= totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
