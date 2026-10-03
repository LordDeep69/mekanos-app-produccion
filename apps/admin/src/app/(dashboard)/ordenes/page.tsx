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
    useServiciosComerciales,
    ServicioEspecificoCombobox,
} from '@/features/ordenes';
import { ProgresoRegistroBadge } from '@/features/ordenes/components/progreso-registro-badge';
import { useTiposServicio, useTecnicosSelector } from '@/features/ordenes/hooks/use-catalogos';
import { cn, formatDateSafe } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import {
    AlertCircle,
    ArrowDownAZ,
    ArrowUpAZ,
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    Eye,
    FileText,
    Filter,
    Layers,
    Loader2,
    Mail,
    Plus,
    Radio,
    RefreshCw,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Tag,
    User,
    Wrench,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function EstadoBadge({ estado }: { estado?: string }) {
    const labels: Record<string, string> = {
        PROGRAMADA: 'Programada',
        ASIGNADA: 'Asignada sin ejecutar',
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

function OrdenCard({ orden, filtroServicioEspecifico }: { orden: Orden; filtroServicioEspecifico?: string }) {
    const fechaProgramada = orden.fecha_programada
        ? formatDateSafe(orden.fecha_programada)
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
                        {/* ✅ FIX 03-MAR-2026: Indicador de email enviado */}
                        {orden.total_emails_enviados ? (
                            <span
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                                title={`${orden.total_emails_enviados} email(s) enviado(s)`}
                            >
                                <Mail className="h-3 w-3" />
                                {orden.total_emails_enviados}
                            </span>
                        ) : (
                            <span
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                                title="Sin emails enviados"
                            >
                                <Mail className="h-3 w-3" />
                                -
                            </span>
                        )}
                        {/* ✅ FIX 06-MAY-2026: Indicador de PDF generado */}
                        {orden.total_documentos_pdf ? (
                            <span
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"
                                title={`${orden.total_documentos_pdf} PDF(s) generado(s)`}
                            >
                                <FileText className="h-3 w-3" />
                                {orden.total_documentos_pdf}
                            </span>
                        ) : (
                            <span
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                                title="Sin PDF generado"
                            >
                                <FileText className="h-3 w-3" />
                                -
                            </span>
                        )}
                        {/* ✅ FIX 23-SEP-2026: Indicador de pendientes técnicos */}
                        {Boolean(orden.total_pendientes && orden.total_pendientes > 0) ? (
                            <span
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm"
                                title={`${orden.total_pendientes} pendiente(s) técnico(s) registrado(s)`}
                            >
                                <ClipboardList className="h-3 w-3 text-amber-700" />
                                {orden.total_pendientes}
                            </span>
                        ) : (
                            <span
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400"
                                title="Sin pendientes técnicos"
                            >
                                <ClipboardList className="h-3 w-3" />
                                -
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Descripción */}
            {orden.descripcion && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {orden.descripcion}
                </p>
            )}

            {/* ✅ FEATURE ESTILO SYTEX: Barra de Avance y Telemetría en Tiempo Real */}
            {orden.progreso_registro && (
                <div className="mb-3">
                    <ProgresoRegistroBadge
                        progreso={orden.progreso_registro}
                        estadoOrden={orden.estados_orden?.codigo_estado}
                    />
                </div>
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

                {/* Tipo servicio macro */}
                {orden.tipos_servicio && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="line-clamp-1">{orden.tipos_servicio.nombre_tipo}</span>
                    </div>
                )}
            </div>

            {/* ✅ Servicios Específicos vinculados del catálogo */}
            {orden.detalle_servicios_orden && orden.detalle_servicios_orden.length > 0 && (() => {
                const serviciosOrdenados = [...orden.detalle_servicios_orden].sort((a, b) => {
                    if (filtroServicioEspecifico) {
                        const idFiltrado = parseInt(filtroServicioEspecifico);
                        if (a.id_servicio === idFiltrado) return -1;
                        if (b.id_servicio === idFiltrado) return 1;
                    }
                    return 0;
                });
                return (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3 text-blue-500" />
                                Servicios ({orden.detalle_servicios_orden.length})
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {serviciosOrdenados.slice(0, 3).map((item, idx) => {
                                const isMatch = Boolean(filtroServicioEspecifico && item.id_servicio === parseInt(filtroServicioEspecifico));
                                return (
                                    <span
                                        key={idx}
                                        className={cn(
                                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                                            isMatch
                                                ? 'bg-blue-100 text-blue-900 font-bold border border-blue-300 ring-1 ring-blue-400/50 shadow-2xs'
                                                : 'bg-slate-100 text-slate-700 border border-slate-200/70 hover:bg-slate-200/80'
                                        )}
                                        title={item.catalogo_servicios?.nombre_servicio}
                                    >
                                        {item.catalogo_servicios?.codigo_servicio && (
                                            <span className="font-mono text-[10px] text-blue-700 font-semibold">
                                                {item.catalogo_servicios.codigo_servicio}
                                            </span>
                                        )}
                                        <span className="truncate max-w-[150px]">
                                            {item.catalogo_servicios?.nombre_servicio || `Servicio #${item.id_servicio}`}
                                        </span>
                                    </span>
                                );
                            })}
                            {orden.detalle_servicios_orden.length > 3 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                                    +{orden.detalle_servicios_orden.length - 3} más
                                </span>
                            )}
                        </div>
                    </div>
                );
            })()}

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

function OrdenesPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Inicializar filtros desde URL params
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '');
    const [busquedaDebounced, setBusquedaDebounced] = useState(searchParams.get('busqueda') || '');
    const [filtroEstado, setFiltroEstado] = useState<string>(searchParams.get('estado') || '');
    const [filtroPrioridad, setFiltroPrioridad] = useState<string>(searchParams.get('prioridad') || '');
    const [filtroTecnico, setFiltroTecnico] = useState<string>(searchParams.get('tecnico') || '');
    // ENTERPRISE: Nuevos filtros avanzados
    const [sortBy, setSortBy] = useState<'fecha_creacion' | 'fecha_programada' | 'numero_orden'>((searchParams.get('sortBy') as any) || 'fecha_creacion');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'desc');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>(searchParams.get('tipoServicio') || '');
    const [filtroServicioEspecifico, setFiltroServicioEspecifico] = useState<string>(
        searchParams.get('servicio') || searchParams.get('idServicio') || ''
    );
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(
        searchParams.get('advanced') === 'true' || Boolean(searchParams.get('servicio')) || Boolean(searchParams.get('idServicio'))
    );
    const [enVivoAutoRefresh, setEnVivoAutoRefresh] = useState(false);

    // ✅ DEBOUNCE: Esperar 400ms después de que el usuario deje de escribir
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setBusquedaDebounced(busqueda.trim());
            setPage(1);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [busqueda]);

    // ✅ PERSISTENCIA: Actualizar URL cuando cambian los filtros (evitar en el primer mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const params = new URLSearchParams();
        if (page > 1) params.set('page', String(page));
        if (busqueda) params.set('busqueda', busqueda);
        if (filtroEstado) params.set('estado', filtroEstado);
        if (filtroPrioridad) params.set('prioridad', filtroPrioridad);
        if (filtroTecnico) params.set('tecnico', filtroTecnico);
        if (sortBy !== 'fecha_creacion') params.set('sortBy', sortBy);
        if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
        if (filtroTipoServicio) params.set('tipoServicio', filtroTipoServicio);
        if (filtroServicioEspecifico) params.set('servicio', filtroServicioEspecifico);
        if (showAdvancedFilters) params.set('advanced', 'true');

        const queryString = params.toString();
        const newPath = queryString ? `/ordenes?${queryString}` : '/ordenes';
        router.replace(newPath);
    }, [page, busqueda, filtroEstado, filtroPrioridad, filtroTecnico, sortBy, sortOrder, filtroTipoServicio, filtroServicioEspecifico, showAdvancedFilters, router]);

    const pageSize = 12;

    // Cargar catálogos para filtros
    const { data: tiposServicio } = useTiposServicio({ activo: true });
    const { data: tecnicos } = useTecnicosSelector();
    const { data: catalogoServicios } = useServiciosComerciales({ activo: true, limit: 250 });

    // Contador de filtros avanzados activos
    const activeAdvancedCount =
        (filtroTipoServicio ? 1 : 0) +
        (filtroServicioEspecifico ? 1 : 0) +
        (sortBy !== 'fecha_creacion' || sortOrder !== 'desc' ? 1 : 0);

    // ✅ BÚSQUEDA SERVER-SIDE: Enviar busqueda y filtros al backend
    const { data, isLoading, isError, refetch } = useOrdenes({
        page,
        limit: pageSize,
        estado: filtroEstado || undefined,
        prioridad: filtroPrioridad || undefined,
        idTecnico: filtroTecnico ? parseInt(filtroTecnico) : undefined,
        sortBy,
        sortOrder,
        tipoServicioId: filtroTipoServicio ? parseInt(filtroTipoServicio) : undefined,
        idServicio: filtroServicioEspecifico ? parseInt(filtroServicioEspecifico, 10) : undefined,
        busqueda: busquedaDebounced || undefined,
    });

    const ordenes = data?.data || [];
    const pagination = data?.pagination;
    const totalPages = pagination?.totalPages || 1;

    // ✅ Server-side search: no need for local filtering
    const ordenesFiltradas = ordenes;

    // ✅ FEATURE ESTILO SYTEX: Auto-refresco en vivo
    useEffect(() => {
        if (!enVivoAutoRefresh) return;
        const interval = setInterval(() => {
            refetch();
        }, 20000);
        return () => clearInterval(interval);
    }, [enVivoAutoRefresh, refetch]);

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

            {/* Filtros Básicos y Avanzados */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por orden, cliente, NIT, técnico, equipo, servicio..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                title="Limpiar búsqueda"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Filtros principales */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Estado */}
                        <select
                            value={filtroEstado}
                            onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs bg-white text-gray-700 font-medium"
                        >
                            <option value="">Todos los estados</option>
                            <option value="PROGRAMADA">Programada</option>
                            <option value="ASIGNADA">Asignada sin ejecutar</option>
                            <option value="EN_PROCESO">En Proceso</option>
                            <option value="EN_ESPERA_REPUESTO">Espera Repuesto</option>
                            <option value="COMPLETADA">Completada</option>
                            <option value="APROBADA">Aprobada</option>
                            <option value="CANCELADA">Cancelada</option>
                        </select>

                        {/* Filtro por Técnico Asignado */}
                        <select
                            value={filtroTecnico}
                            onChange={(e) => { setFiltroTecnico(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs bg-white text-gray-700 font-medium"
                        >
                            <option value="">Todos los técnicos</option>
                            {tecnicos?.map((tec) => {
                                const nombre = tec.persona
                                    ? `${tec.persona.primer_nombre || ''} ${tec.persona.primer_apellido || ''}`.trim()
                                    : `Técnico #${tec.id_empleado}`;
                                return (
                                    <option key={tec.id_empleado} value={tec.id_empleado}>
                                        {nombre}
                                    </option>
                                );
                            })}
                        </select>

                        {/* Prioridad */}
                        <select
                            value={filtroPrioridad}
                            onChange={(e) => { setFiltroPrioridad(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs bg-white text-gray-700 font-medium"
                        >
                            <option value="">Todas las prioridades</option>
                            <option value="BAJA">Baja</option>
                            <option value="NORMAL">Normal</option>
                            <option value="ALTA">Alta</option>
                            <option value="URGENTE">Urgente</option>
                        </select>

                        {/* Botón filtros avanzados */}
                        <button
                            type="button"
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-all',
                                showAdvancedFilters || activeAdvancedCount > 0
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs'
                                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                            )}
                            title="Filtros avanzados y por servicio específico"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Avanzados</span>
                            {activeAdvancedCount > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                    {activeAdvancedCount}
                                </span>
                            )}
                            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', showAdvancedFilters && 'rotate-180')} />
                        </button>

                        {/* ✅ FEATURE ESTILO SYTEX: Botón Modo En Vivo con Auto-Refresco */}
                        <button
                            type="button"
                            onClick={() => {
                                const next = !enVivoAutoRefresh;
                                setEnVivoAutoRefresh(next);
                                toast.info(next ? 'Modo Sytex En Vivo activado (refresco cada 20s)' : 'Modo En Vivo pausado');
                            }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-all',
                                enVivoAutoRefresh
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                            )}
                            title={enVivoAutoRefresh ? 'Pausar modo en vivo' : 'Activar lectura y auto-refresco en vivo estilo Sytex'}
                        >
                            <span className="relative flex h-2 w-2">
                                {enVivoAutoRefresh && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                )}
                                <span className={cn('relative inline-flex rounded-full h-2 w-2', enVivoAutoRefresh ? 'bg-emerald-500' : 'bg-gray-400')} />
                            </span>
                            <Radio className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">En Vivo</span>
                        </button>

                        {/* Refrescar */}
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                            title="Refrescar lista de órdenes"
                        >
                            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin text-blue-600')} />
                        </button>
                    </div>
                </div>

                {/* ENTERPRISE: Panel de Filtros Avanzados (con selector de servicio específico profesional) */}
                {showAdvancedFilters && (
                    <div className="pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/90 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                                        <SlidersHorizontal className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                            Filtros Avanzados y Catálogos
                                        </h4>
                                        <p className="text-[11px] text-gray-500">
                                            Filtra por catálogo de servicios específicos, tipo macro o ajusta el ordenamiento
                                        </p>
                                    </div>
                                </div>

                                {(filtroTipoServicio || filtroServicioEspecifico || sortBy !== 'fecha_creacion' || sortOrder !== 'desc') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFiltroTipoServicio('');
                                            setFiltroServicioEspecifico('');
                                            setSortBy('fecha_creacion');
                                            setSortOrder('desc');
                                            setPage(1);
                                        }}
                                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium hover:underline self-start sm:self-auto"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Restablecer avanzados
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                                {/* Columna 1: Tipo Macro de Servicio */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                                        Tipo Macro de Servicio
                                    </label>
                                    <select
                                        value={filtroTipoServicio}
                                        onChange={(e) => {
                                            setFiltroTipoServicio(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs bg-white text-gray-800 font-medium"
                                    >
                                        <option value="">Todos los tipos macro</option>
                                        {tiposServicio?.map((tipo) => (
                                            <option key={tipo.id_tipo_servicio} value={tipo.id_tipo_servicio}>
                                                {tipo.nombre_tipo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Columna 2: Servicio Específico del Catálogo (ServicioEspecificoCombobox) */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Tag className="h-3.5 w-3.5 text-blue-600" />
                                            Servicio Específico (Catálogo)
                                        </span>
                                        {filtroServicioEspecifico && (
                                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                                Activo
                                            </span>
                                        )}
                                    </label>
                                    <ServicioEspecificoCombobox
                                        selectedId={filtroServicioEspecifico ? parseInt(filtroServicioEspecifico, 10) : null}
                                        onSelect={(id) => {
                                            setFiltroServicioEspecifico(id ? String(id) : '');
                                            setPage(1);
                                        }}
                                        tipoServicioId={filtroTipoServicio ? parseInt(filtroTipoServicio, 10) : undefined}
                                        placeholder="Buscar y deslizar servicio..."
                                    />
                                </div>

                                {/* Columna 3: Criterio de Ordenamiento */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <ArrowDownAZ className="h-3.5 w-3.5 text-blue-600" />
                                        Criterio de Ordenamiento
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs bg-white text-gray-800 font-medium"
                                        >
                                            <option value="fecha_creacion">Fecha creación</option>
                                            <option value="fecha_programada">Fecha programada</option>
                                            <option value="numero_orden">Número orden</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                            className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 transition-colors shrink-0"
                                            title={sortOrder === 'desc' ? 'Orden descendente (más reciente primero)' : 'Orden ascendente'}
                                        >
                                            {sortOrder === 'desc' ? (
                                                <ArrowDownAZ className="h-4 w-4 text-gray-600" />
                                            ) : (
                                                <ArrowUpAZ className="h-4 w-4 text-gray-600" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Indicadores de filtros activos */}
                {(filtroEstado || filtroTecnico || filtroPrioridad || filtroTipoServicio || filtroServicioEspecifico || busquedaDebounced) && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-wrap">
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                            <div className="flex items-center gap-1 text-gray-500 font-semibold mr-1">
                                <Filter className="h-3.5 w-3.5 text-blue-600" />
                                <span>Filtros activos:</span>
                            </div>

                            {busquedaDebounced && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 text-green-800 border border-green-200 rounded-full text-xs font-medium">
                                    <span>Búsqueda: &quot;{busquedaDebounced}&quot;</span>
                                    <button
                                        type="button"
                                        onClick={() => { setBusqueda(''); setBusquedaDebounced(''); setPage(1); }}
                                        className="hover:bg-green-200/60 rounded-full p-0.5 text-green-700 transition-colors"
                                        title="Quitar búsqueda"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {filtroEstado && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-medium">
                                    <span>Estado: {filtroEstado === 'ASIGNADA' ? 'Asignada sin ejecutar' : filtroEstado}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setFiltroEstado(''); setPage(1); }}
                                        className="hover:bg-blue-200/60 rounded-full p-0.5 text-blue-700 transition-colors"
                                        title="Quitar filtro de estado"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {filtroTecnico && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-violet-50 text-violet-800 border border-violet-200 rounded-full text-xs font-medium">
                                    <span>
                                        Técnico: {(() => {
                                            const tec = tecnicos?.find(t => t.id_empleado === parseInt(filtroTecnico));
                                            return tec?.persona
                                                ? `${tec.persona.primer_nombre || ''} ${tec.persona.primer_apellido || ''}`.trim()
                                                : `Técnico #${filtroTecnico}`;
                                        })()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setFiltroTecnico(''); setPage(1); }}
                                        className="hover:bg-violet-200/60 rounded-full p-0.5 text-violet-700 transition-colors"
                                        title="Quitar filtro de técnico"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {filtroPrioridad && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-full text-xs font-medium">
                                    <span>Prioridad: {filtroPrioridad}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setFiltroPrioridad(''); setPage(1); }}
                                        className="hover:bg-orange-200/60 rounded-full p-0.5 text-orange-700 transition-colors"
                                        title="Quitar filtro de prioridad"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {filtroTipoServicio && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-full text-xs font-medium">
                                    <span>
                                        Tipo: {tiposServicio?.find(t => t.id_tipo_servicio === parseInt(filtroTipoServicio))?.nombre_tipo || `Tipo #${filtroTipoServicio}`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setFiltroTipoServicio(''); setPage(1); }}
                                        className="hover:bg-purple-200/60 rounded-full p-0.5 text-purple-700 transition-colors"
                                        title="Quitar filtro de tipo macro"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {filtroServicioEspecifico && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-semibold shadow-2xs">
                                    <Tag className="h-3 w-3 text-blue-600" />
                                    <span>
                                        Servicio: {(() => {
                                            const s = catalogoServicios?.find(srv => srv.id_servicio === parseInt(filtroServicioEspecifico));
                                            return s ? `[${s.codigo_servicio}] ${s.nombre_servicio}` : `Servicio #${filtroServicioEspecifico}`;
                                        })()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setFiltroServicioEspecifico(''); setPage(1); }}
                                        className="hover:bg-blue-200 rounded-full p-0.5 text-blue-800 transition-colors"
                                        title="Quitar filtro de servicio específico"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}
                        </div>

                        {/* Botón limpiar todos */}
                        <button
                            type="button"
                            onClick={() => {
                                setFiltroEstado('');
                                setFiltroTecnico('');
                                setFiltroPrioridad('');
                                setFiltroTipoServicio('');
                                setFiltroServicioEspecifico('');
                                setBusqueda('');
                                setBusquedaDebounced('');
                                setPage(1);
                            }}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold hover:underline shrink-0 ml-auto"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Limpiar todos
                        </button>
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
                                <OrdenCard
                                    key={orden.id_orden_servicio}
                                    orden={orden}
                                    filtroServicioEspecifico={filtroServicioEspecifico}
                                />
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

// Wrapper con Suspense para useSearchParams
export default function OrdenesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
            <OrdenesPageContent />
        </Suspense>
    );
}
