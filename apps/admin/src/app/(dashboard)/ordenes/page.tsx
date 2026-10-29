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
    CARACTERISTICAS_ORDEN_REGISTRY,
    CaracteristicasOrdenFilter,
    type FiltrosCaracteristicas,
    FiltroFechaPremium,
    ModernFilterSelect,
    type ModernFilterOption,
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
    CheckCircle2,
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
    Sparkles,
    Tag,
    User,
    Wrench,
    X,
    GitBranch,
    AlertTriangle,
    Lock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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

function OrdenCard({
    orden,
    filtroServicioEspecifico,
    filtroServicioTexto,
    onSelectServicio,
}: {
    orden: Orden;
    filtroServicioEspecifico?: string;
    filtroServicioTexto?: string;
    onSelectServicio?: (id: number) => void;
}) {
    const fechaProgramada = orden.fecha_programada
        ? formatDateSafe(orden.fecha_programada)
        : 'Sin programar';

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-2">
                    <span className="font-mono text-sm text-blue-600 font-semibold">
                        {orden.numero_orden}
                    </span>

                    {/* ✅ Micro-Badge de Trazabilidad de Caso */}
                    {(() => {
                        const esCaso = Boolean(
                            orden.id_orden_padre ||
                            (orden.numero_visita_caso && orden.numero_visita_caso > 1) ||
                            Boolean(orden.total_pendientes && orden.total_pendientes > 0) ||
                            Boolean(orden.pendientes_activos && orden.pendientes_activos > 0) ||
                            (orden.estado_caso === 'ABIERTO' && Boolean(orden.nombre_caso?.trim()))
                        );
                        if (!esCaso) return null;

                        const codigoCaso = (
                            orden.orden_padre?.numero_orden ||
                            orden.numero_orden ||
                            ''
                        ).replace(/^OS-/, 'CASO-');
                        const numVisita = orden.numero_visita_caso || (orden.id_orden_padre ? 2 : 1);
                        const nombreCaso = orden.nombre_caso || orden.orden_padre?.nombre_caso;
                        const estadoCaso = orden.estado_caso || orden.orden_padre?.estado_caso || 'ABIERTO';
                        const isAbierto = estadoCaso === 'ABIERTO';

                        return (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors',
                                        isAbierto
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                    )}
                                    title={nombreCaso ? `Caso: ${nombreCaso}` : `Caso ${codigoCaso}`}
                                >
                                    <GitBranch className="h-3 w-3 text-indigo-500" />
                                    <span className="font-mono">{codigoCaso}</span>
                                    <span className="text-slate-400">•</span>
                                    <span>Visita #{numVisita}</span>
                                </span>
                                <span
                                    className={cn(
                                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                        isAbierto
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    )}
                                >
                                    {isAbierto ? '🟢 Abierto' : '🔒 Cerrado'}
                                </span>
                                {nombreCaso && (
                                    <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={nombreCaso}>
                                        {nombreCaso}
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                    <div className="flex items-center gap-2 mt-1">
                        <EstadoBadge estado={orden.estados_orden?.codigo_estado} />
                        <PrioridadBadge prioridad={orden.prioridad} />
                        {/* ✅ BADGES DINÁMICOS VINCULADOS AL REGISTRO CENTRAL */}
                        {CARACTERISTICAS_ORDEN_REGISTRY.map((caract) => {
                            const Icon = caract.icon;
                            const tiene = caract.check(orden);
                            const count = caract.getCount(orden);
                            return (
                                <span
                                    key={caract.id}
                                    className={cn(
                                        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                                        tiene ? caract.colorPillActiva : caract.colorPillInactiva
                                    )}
                                    title={tiene ? caract.titleCard(count) : caract.titleInactivo}
                                >
                                    <Icon className="h-3 w-3" />
                                    <span>{tiene ? count : '-'}</span>
                                </span>
                            );
                        })}
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
                {(() => {
                    const equipoInfo =
                        orden.equipos ||
                        (orden.ordenes_equipos?.[0] as any)?.equipo ||
                        (orden.ordenes_equipos?.[0] as any)?.equipos;
                    return (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="line-clamp-1">
                                {equipoInfo?.codigo_equipo || 'Sin equipo'}
                                {equipoInfo?.nombre_equipo && ` - ${equipoInfo.nombre_equipo}`}
                            </span>
                        </div>
                    );
                })()}

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
                                const isExactMatch = Boolean(filtroServicioEspecifico && item.id_servicio === parseInt(filtroServicioEspecifico));
                                const isTextMatch = Boolean(
                                    filtroServicioTexto && (
                                        item.catalogo_servicios?.nombre_servicio?.toLowerCase().includes(filtroServicioTexto.toLowerCase()) ||
                                        item.catalogo_servicios?.codigo_servicio?.toLowerCase().includes(filtroServicioTexto.toLowerCase())
                                    )
                                );
                                const isMatch = isExactMatch || isTextMatch;
                                return (
                                    <button
                                        type="button"
                                        key={idx}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (onSelectServicio) {
                                                onSelectServicio(isMatch ? 0 : item.id_servicio);
                                            }
                                        }}
                                        className={cn(
                                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all text-left cursor-pointer',
                                            isMatch
                                                ? 'bg-orange-100 text-orange-900 font-bold border border-orange-300 ring-2 ring-orange-400/50 shadow-xs'
                                                : 'bg-slate-100 text-slate-700 border border-slate-200/70 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-900'
                                        )}
                                        title={`Filtrar por catálogo: ${item.catalogo_servicios?.nombre_servicio || 'servicio'}`}
                                    >
                                        {item.catalogo_servicios?.codigo_servicio && (
                                            <span className="font-mono text-[10px] text-orange-700 font-semibold">
                                                {item.catalogo_servicios.codigo_servicio}
                                            </span>
                                        )}
                                        <span className="truncate max-w-[150px]">
                                            {item.catalogo_servicios?.nombre_servicio || `Servicio #${item.id_servicio}`}
                                        </span>
                                    </button>
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

// ═══════════════════════════════════════════════════════════════════════════════
// OPCIONES DE FILTROS MODERNOS
// ═══════════════════════════════════════════════════════════════════════════════

const ESTADOS_OPTIONS: ModernFilterOption[] = [
    { value: 'PROGRAMADA', label: 'Programada' },
    { value: 'ASIGNADA', label: 'Asignada sin ejecutar' },
    { value: 'EN_PROCESO', label: 'En Proceso' },
    { value: 'EN_ESPERA_REPUESTO', label: 'Espera Repuesto' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'APROBADA', label: 'Aprobada' },
    { value: 'CANCELADA', label: 'Cancelada' },
];

const PRIORIDADES_OPTIONS: ModernFilterOption[] = [
    { value: 'BAJA', label: 'Baja' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'URGENTE', label: 'Urgente' },
];

const SORT_OPTIONS: ModernFilterOption[] = [
    { value: 'fecha_creacion', label: 'Más recientes (Creación)' },
    { value: 'fecha_programada', label: 'Fecha de servicio' },
    { value: 'numero_orden', label: 'Número de orden correlativo' },
];

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
    // ✅ FECHAS PREMIUM (Desde / Hasta)
    const [fechaDesde, setFechaDesde] = useState<string>(searchParams.get('fechaDesde') || '');
    const [fechaHasta, setFechaHasta] = useState<string>(searchParams.get('fechaHasta') || '');
    // ✅ CARACTERÍSTICAS / BADGES DINÁMICOS (Correo, PDF, Pendientes)
    const [filtrosCaracteristicas, setFiltrosCaracteristicas] = useState<FiltrosCaracteristicas>(() => {
        const init: FiltrosCaracteristicas = {};
        for (const c of CARACTERISTICAS_ORDEN_REGISTRY) {
            const val = searchParams.get(`caract_${c.id}`);
            if (val === 'CON' || val === 'SIN') {
                init[c.id] = val;
            }
        }
        return init;
    });
    // ENTERPRISE: Nuevos filtros avanzados
    const [sortBy, setSortBy] = useState<'fecha_creacion' | 'fecha_programada' | 'numero_orden'>((searchParams.get('sortBy') as any) || 'fecha_creacion');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as any) || 'desc');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>(searchParams.get('tipoServicio') || '');
    const [filtroServicioEspecifico, setFiltroServicioEspecifico] = useState<string>(
        searchParams.get('servicio') || searchParams.get('idServicio') || ''
    );
    const [filtroServicioTexto, setFiltroServicioTexto] = useState<string>(
        searchParams.get('servicioTexto') || ''
    );
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(
        searchParams.get('advanced') === 'true' || Boolean(searchParams.get('servicio')) || Boolean(searchParams.get('idServicio')) || Boolean(searchParams.get('servicioTexto'))
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
        if (fechaDesde) params.set('fechaDesde', fechaDesde);
        if (fechaHasta) params.set('fechaHasta', fechaHasta);
        for (const [k, v] of Object.entries(filtrosCaracteristicas)) {
            if (v && v !== 'TODOS') params.set(`caract_${k}`, v);
        }
        if (sortBy !== 'fecha_creacion') params.set('sortBy', sortBy);
        if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
        if (filtroTipoServicio) params.set('tipoServicio', filtroTipoServicio);
        if (filtroServicioEspecifico) params.set('servicio', filtroServicioEspecifico);
        if (filtroServicioTexto) params.set('servicioTexto', filtroServicioTexto);
        if (showAdvancedFilters) params.set('advanced', 'true');

        const queryString = params.toString();
        const newPath = queryString ? `/ordenes?${queryString}` : '/ordenes';
        router.replace(newPath);
    }, [page, busqueda, filtroEstado, filtroPrioridad, filtroTecnico, fechaDesde, fechaHasta, filtrosCaracteristicas, sortBy, sortOrder, filtroTipoServicio, filtroServicioEspecifico, filtroServicioTexto, showAdvancedFilters, router]);

    const pageSize = 12;

    // Cargar catálogos para filtros
    const { data: tiposServicio } = useTiposServicio({ activo: true });
    const { data: tecnicos } = useTecnicosSelector();
    const { data: catalogoServicios } = useServiciosComerciales({ activo: true, limit: 250 });

    const tecnicosOptions: ModernFilterOption[] = useMemo(() => {
        return (tecnicos || []).map((tec) => {
            const nombre = tec.persona
                ? `${tec.persona.primer_nombre || ''} ${tec.persona.primer_apellido || ''}`.trim()
                : `Técnico #${tec.id_empleado}`;
            return { value: tec.id_empleado, label: nombre };
        });
    }, [tecnicos]);

    const tiposServicioOptions: ModernFilterOption[] = useMemo(() => {
        return (tiposServicio || []).map((tipo) => ({
            value: tipo.id_tipo_servicio,
            label: tipo.nombre_tipo,
        }));
    }, [tiposServicio]);

    const activeCaractCount = useMemo(() => {
        return Object.values(filtrosCaracteristicas).filter((v) => v && v !== 'TODOS').length;
    }, [filtrosCaracteristicas]);

    // Contador de filtros avanzados activos
    const activeAdvancedCount =
        (filtroTipoServicio ? 1 : 0) +
        activeCaractCount +
        (sortBy !== 'fecha_creacion' || sortOrder !== 'desc' ? 1 : 0);

    const [filtroCasos, setFiltroCasos] = useState<'TODAS' | 'CASOS_ABIERTOS' | 'CON_PENDIENTES'>('TODAS');

    // ✅ BÚSQUEDA SERVER-SIDE: Enviar busqueda y filtros al backend (incluyendo filtro de Casos y Pendientes)
    const { data, isLoading, isError, refetch } = useOrdenes({
        page,
        limit: pageSize,
        filtroCaso: filtroCasos !== 'TODAS' ? filtroCasos : undefined,
        estado: filtroEstado || undefined,
        prioridad: filtroPrioridad || undefined,
        idTecnico: filtroTecnico ? parseInt(filtroTecnico) : undefined,
        sortBy,
        sortOrder,
        tipoServicioId: filtroTipoServicio ? parseInt(filtroTipoServicio) : undefined,
        idServicio: filtroServicioEspecifico ? parseInt(filtroServicioEspecifico, 10) : undefined,
        servicioTexto: filtroServicioTexto || undefined,
        busqueda: busquedaDebounced || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        conPendientes: filtrosCaracteristicas.pendientes === 'CON' ? true : undefined,
    });

    const ordenes = data?.data || [];
    const pagination = data?.pagination;
    const totalPages = pagination?.totalPages || 1;

    const countCasosAbiertos = useMemo(() => {
        return ordenes.filter((o) => {
            const esCaso = Boolean(
                o.id_orden_padre ||
                (o.numero_visita_caso && o.numero_visita_caso > 1) ||
                Boolean(o.total_pendientes && o.total_pendientes > 0) ||
                Boolean(o.pendientes_activos && o.pendientes_activos > 0) ||
                (o.estado_caso === 'ABIERTO' && Boolean(o.nombre_caso?.trim()))
            );
            const esAbierto =
                o.estado_caso === 'ABIERTO' ||
                o.orden_padre?.estado_caso === 'ABIERTO' ||
                (!o.estado_caso && esCaso);
            return esCaso && esAbierto;
        }).length;
    }, [ordenes]);

    const countConPendientes = useMemo(() => {
        return ordenes.filter((o) => Boolean((o.total_pendientes && o.total_pendientes > 0) || (o.pendientes_activos && o.pendientes_activos > 0))).length;
    }, [ordenes]);

    // ✅ FILTRADO DINÁMICO POR CARACTERÍSTICAS DE CARDS (Correo, PDF, Pendientes, etc.)
    const ordenesFiltradas = useMemo(() => {
        return ordenes.filter((orden) => {
            for (const caract of CARACTERISTICAS_ORDEN_REGISTRY) {
                const estado = filtrosCaracteristicas[caract.id] || 'TODOS';
                if (estado === 'CON' && !caract.check(orden)) return false;
                if (estado === 'SIN' && caract.check(orden)) return false;
            }
            return true;
        });
    }, [ordenes, filtrosCaracteristicas]);

    const handleCambiarFiltroCaso = (nuevo: 'TODAS' | 'CASOS_ABIERTOS' | 'CON_PENDIENTES') => {
        setFiltroCasos(nuevo);
        setPage(1);
    };

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
                {/* ✅ Píldoras de Filtro Rápido de Continuidad y Casos */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-100">
                    <button
                        type="button"
                        onClick={() => handleCambiarFiltroCaso('TODAS')}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                            filtroCasos === 'TODAS'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        )}
                    >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>Todas las Órdenes ({pagination?.total || ordenes.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleCambiarFiltroCaso('CASOS_ABIERTOS')}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                            filtroCasos === 'CASOS_ABIERTOS'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        )}
                    >
                        <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                        <span>🟢 Casos Abiertos / En Seguimiento ({pagination?.totalCasosAbiertos ?? countCasosAbiertos})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleCambiarFiltroCaso('CON_PENDIENTES')}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                            filtroCasos === 'CON_PENDIENTES'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                        )}
                    >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>🎯 Con Pendientes Activos ({pagination?.totalConPendientes ?? countConPendientes})</span>
                    </button>
                </div>

                <div className="flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center">
                    {/* Búsqueda inteligente y adaptativa (nunca colapsa) */}
                    <div className="relative w-full xl:w-80 2xl:w-96 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar orden, cliente, NIT, técnico, equipo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full h-9 pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 font-medium transition-all shadow-2xs"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                                title="Limpiar búsqueda"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filtros principales */}
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Estado con selector moderno */}
                        <ModernFilterSelect
                            icon={CheckCircle2}
                            value={filtroEstado}
                            onChange={(val) => { setFiltroEstado(val); setPage(1); }}
                            options={ESTADOS_OPTIONS}
                            placeholder="Todos los estados"
                            onClear={() => { setFiltroEstado(''); setPage(1); }}
                        />

                        {/* Técnico Asignado con selector moderno */}
                        <ModernFilterSelect
                            icon={User}
                            value={filtroTecnico}
                            onChange={(val) => { setFiltroTecnico(val); setPage(1); }}
                            options={tecnicosOptions}
                            placeholder="Todos los técnicos"
                            searchable
                            searchPlaceholder="Buscar técnico..."
                            onClear={() => { setFiltroTecnico(''); setPage(1); }}
                        />

                        {/* Prioridad con selector moderno */}
                        <ModernFilterSelect
                            icon={AlertCircle}
                            value={filtroPrioridad}
                            onChange={(val) => { setFiltroPrioridad(val); setPage(1); }}
                            options={PRIORIDADES_OPTIONS}
                            placeholder="Todas las prioridades"
                            onClear={() => { setFiltroPrioridad(''); setPage(1); }}
                        />

                        {/* ✅ FILTRO DE FECHAS PREMIUM (Estado del Arte) */}
                        <FiltroFechaPremium
                            fechaDesde={fechaDesde}
                            fechaHasta={fechaHasta}
                            onSelectRange={(desde, hasta) => {
                                setFechaDesde(desde);
                                setFechaHasta(hasta);
                                setPage(1);
                            }}
                            onClear={() => {
                                setFechaDesde('');
                                setFechaHasta('');
                                setPage(1);
                            }}
                        />

                        {/* ✅ FILTRO DIRECTO: Catálogo de Servicios Específicos */}
                        <div className="w-56 sm:w-64 md:w-72">
                            <ServicioEspecificoCombobox
                                selectedId={filtroServicioEspecifico ? parseInt(filtroServicioEspecifico, 10) : null}
                                selectedTexto={filtroServicioTexto}
                                onSelect={(id, texto) => {
                                    setFiltroServicioEspecifico(id ? String(id) : '');
                                    setFiltroServicioTexto(texto || '');
                                    setPage(1);
                                }}
                                tipoServicioId={filtroTipoServicio ? parseInt(filtroTipoServicio, 10) : undefined}
                                placeholder="Servicio correctivo / catálogo..."
                                align="right"
                            />
                        </div>

                        {/* Botón filtros avanzados */}
                        <button
                            type="button"
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={cn(
                                'flex items-center gap-1.5 h-9 px-3 border rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer',
                                showAdvancedFilters || activeAdvancedCount > 0
                                    ? 'border-blue-400 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/15'
                                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 bg-white'
                            )}
                            title="Filtros avanzados y de entregables"
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
                                'flex items-center gap-1.5 h-9 px-3 border rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer',
                                enVivoAutoRefresh
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/15'
                                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 bg-white'
                            )}
                            title={enVivoAutoRefresh ? 'Pausar modo en vivo' : 'Activar lectura y auto-refresco en vivo estilo Sytex'}
                        >
                            <span className="relative flex h-2 w-2">
                                {enVivoAutoRefresh && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                )}
                                <span className={cn('relative inline-flex rounded-full h-2 w-2', enVivoAutoRefresh ? 'bg-emerald-500' : 'bg-slate-400')} />
                            </span>
                            <Radio className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">En Vivo</span>
                        </button>

                        {/* Refrescar */}
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="h-9 px-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors bg-white shadow-2xs flex items-center justify-center cursor-pointer"
                            title="Refrescar lista de órdenes"
                        >
                            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin text-blue-600')} />
                        </button>
                    </div>
                </div>

                {/* ENTERPRISE: Panel de Filtros Avanzados (con selector de características e indicadores) */}
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
                                            Filtros Avanzados y Entregables
                                        </h4>
                                        <p className="text-[11px] text-gray-500">
                                            Filtra por indicadores de entregables (Correo, PDF, Pendientes), tipo macro o ajusta el ordenamiento
                                        </p>
                                    </div>
                                </div>

                                {(filtroTipoServicio || activeCaractCount > 0 || sortBy !== 'fecha_creacion' || sortOrder !== 'desc') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFiltroTipoServicio('');
                                            setFiltrosCaracteristicas({});
                                            setSortBy('fecha_creacion');
                                            setSortOrder('desc');
                                            setPage(1);
                                        }}
                                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold hover:underline self-start sm:self-auto cursor-pointer"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Restablecer avanzados
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                                {/* Columna 1: Tipo Macro de Servicio con selector moderno */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                                        Tipo Macro de Servicio
                                    </label>
                                    <ModernFilterSelect
                                        icon={Clock}
                                        value={filtroTipoServicio}
                                        onChange={(val) => {
                                            setFiltroTipoServicio(val);
                                            setPage(1);
                                        }}
                                        options={tiposServicioOptions}
                                        placeholder="Todos los tipos macro"
                                        fullWidth
                                        searchable
                                        searchPlaceholder="Buscar tipo macro..."
                                        onClear={() => {
                                            setFiltroTipoServicio('');
                                            setPage(1);
                                        }}
                                    />
                                </div>

                                {/* Columna 2: Indicadores y Badges de la Orden (Desplegable con Feedback) */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                                            Indicadores de Entrega
                                        </span>
                                        {activeCaractCount > 0 && (
                                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                                {activeCaractCount} activo{activeCaractCount > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </label>
                                    <CaracteristicasOrdenFilter
                                        filtros={filtrosCaracteristicas}
                                        onChange={(id, estado) => {
                                            setFiltrosCaracteristicas((prev) => ({ ...prev, [id]: estado }));
                                            setPage(1);
                                        }}
                                        onReset={() => {
                                            setFiltrosCaracteristicas({});
                                            setPage(1);
                                        }}
                                    />
                                </div>

                                {/* Columna 3: Criterio de Ordenamiento con selector moderno */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <ArrowDownAZ className="h-3.5 w-3.5 text-blue-600" />
                                        Ordenar lista por
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <ModernFilterSelect
                                                icon={ArrowDownAZ}
                                                value={sortBy}
                                                onChange={(val) => {
                                                    setSortBy(val as typeof sortBy);
                                                    setPage(1);
                                                }}
                                                options={SORT_OPTIONS}
                                                placeholder="Ordenar por..."
                                                fullWidth
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                            className={cn(
                                                'h-9 px-2.5 border rounded-xl bg-white hover:bg-slate-50 transition-all shrink-0 flex items-center justify-center shadow-2xs cursor-pointer',
                                                sortOrder === 'asc'
                                                    ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-500/15'
                                                    : 'border-slate-300 text-slate-600'
                                            )}
                                            title={sortOrder === 'desc' ? 'Orden descendente (más reciente primero)' : 'Orden ascendente'}
                                        >
                                            {sortOrder === 'desc' ? (
                                                <ArrowDownAZ className="h-4 w-4" />
                                            ) : (
                                                <ArrowUpAZ className="h-4 w-4 text-blue-600" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Indicadores de filtros activos */}
                {(filtroEstado ||
                    filtroTecnico ||
                    filtroPrioridad ||
                    filtroTipoServicio ||
                    filtroServicioEspecifico ||
                    filtroServicioTexto ||
                    fechaDesde ||
                    fechaHasta ||
                    activeCaractCount > 0 ||
                    busquedaDebounced) && (
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

                            {(fechaDesde || fechaHasta) && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-medium">
                                    <Calendar className="h-3 w-3 text-blue-600" />
                                    <span>
                                        Fecha: {fechaDesde && fechaHasta ? `${fechaDesde} a ${fechaHasta}` : fechaDesde ? `Desde ${fechaDesde}` : `Hasta ${fechaHasta}`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setFechaDesde(''); setFechaHasta(''); setPage(1); }}
                                        className="hover:bg-blue-200/60 rounded-full p-0.5 text-blue-700 transition-colors"
                                        title="Quitar filtro de fecha"
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
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-100 text-orange-950 border border-orange-300 rounded-full text-xs font-semibold shadow-2xs">
                                    <Tag className="h-3 w-3 text-orange-600" />
                                    <span>
                                        Servicio: {(() => {
                                            const s = catalogoServicios?.find(srv => srv.id_servicio === parseInt(filtroServicioEspecifico));
                                            return s ? `[${s.codigo_servicio}] ${s.nombre_servicio}` : `Servicio #${filtroServicioEspecifico}`;
                                        })()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setFiltroServicioEspecifico(''); setFiltroServicioTexto(''); setPage(1); }}
                                        className="hover:bg-orange-200/60 rounded-full p-0.5 text-orange-800 transition-colors"
                                        title="Quitar filtro de servicio específico"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {/* Badges dinámicos de características activas */}
                            {CARACTERISTICAS_ORDEN_REGISTRY.map((caract) => {
                                const val = filtrosCaracteristicas[caract.id];
                                if (!val || val === 'TODOS') return null;
                                const Icon = caract.icon;
                                const isCon = val === 'CON';
                                return (
                                    <span
                                        key={caract.id}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs',
                                            isCon ? caract.activeBadgeColor : 'bg-slate-100 text-slate-700 border-slate-300'
                                        )}
                                    >
                                        <Icon className="h-3 w-3" />
                                        <span>{isCon ? `Con ${caract.labelCorto}` : `Sin ${caract.labelCorto}`}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFiltrosCaracteristicas((prev) => ({
                                                    ...prev,
                                                    [caract.id]: 'TODOS',
                                                }));
                                                setPage(1);
                                            }}
                                            className="hover:opacity-75 rounded-full p-0.5 transition-opacity"
                                            title={`Quitar filtro de ${caract.labelCorto}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>

                        {/* Botón Restablecer Todos */}
                        <button
                            type="button"
                            onClick={() => {
                                setBusqueda('');
                                setBusquedaDebounced('');
                                setFiltroEstado('');
                                setFiltroTecnico('');
                                setFiltroPrioridad('');
                                setFiltroTipoServicio('');
                                setFiltroServicioEspecifico('');
                                setFiltroServicioTexto('');
                                setFechaDesde('');
                                setFechaHasta('');
                                setFiltrosCaracteristicas({});
                                setPage(1);
                            }}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold hover:underline cursor-pointer"
                        >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restablecer todos</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Grid de órdenes */}
            {!isLoading && !isError && (
                <>
                    {ordenesFiltradas.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
                            <ClipboardList className="h-12 w-12 mx-auto text-slate-400" />
                            <p className="text-slate-800 font-bold text-base">No se encontraron órdenes con los filtros aplicados</p>
                            <p className="text-slate-500 text-xs max-w-md mx-auto">Prueba cambiando el rango de fechas, los indicadores de entregables o restableciendo los criterios.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setBusqueda('');
                                    setBusquedaDebounced('');
                                    setFiltroEstado('');
                                    setFiltroTecnico('');
                                    setFiltroPrioridad('');
                                    setFiltroTipoServicio('');
                                    setFiltroServicioEspecifico('');
                                    setFiltroServicioTexto('');
                                    setFechaDesde('');
                                    setFechaHasta('');
                                    setFiltrosCaracteristicas({});
                                    setPage(1);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Restablecer Filtros</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ordenesFiltradas.map((orden) => (
                                <OrdenCard
                                    key={orden.id_orden_servicio}
                                    orden={orden}
                                    filtroServicioEspecifico={filtroServicioEspecifico}
                                    filtroServicioTexto={filtroServicioTexto}
                                    onSelectServicio={(id) => {
                                        setFiltroServicioEspecifico(id ? String(id) : '');
                                        setFiltroServicioTexto('');
                                        setPage(1);
                                    }}
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
