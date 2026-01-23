'use client';

import {
    TIPOS_ACTIVIDAD,
    useCatalogoActividades,
    useCreateCatalogoActividad,
    useDeleteCatalogoActividad,
    useTiposServicio,
    useUpdateCatalogoActividad,
} from '@/features/catalogos';
import { useCatalogoSistemas } from '@/features/catalogos/hooks/use-catalogo-sistemas';
import { useParametrosMedicion } from '@/features/catalogos/hooks/use-parametros-medicion';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Cog,
    Edit,
    Filter,
    Gauge,
    Info,
    Layers,
    ListChecks,
    Loader2,
    Plus,
    Search,
    Settings2,
    Sparkles,
    Trash2,
    Wrench,
    X,
    Zap
} from 'lucide-react';
import { useMemo, useState } from 'react';

// Helper para color de tipo de actividad
function getTipoActividadColor(tipo: string) {
    return TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.color || 'bg-gray-100 text-gray-800';
}

// Helper para obtener el icono del tipo de actividad
function getTipoActividadIcon(tipo: string) {
    const iconMap: Record<string, any> = {
        'INSPECCION': CheckCircle2,
        'MEDICION': Gauge,
        'LIMPIEZA': Sparkles,
        'LUBRICACION': Zap,
        'AJUSTE': Settings2,
        'CAMBIO': Wrench,
        'PRUEBA': Activity,
        'VERIFICACION': ClipboardCheck,
    };
    return iconMap[tipo] || ClipboardCheck;
}

// Colores para tipos de servicio
const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    'GEN_PREV_A': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', accent: 'bg-emerald-500' },
    'GEN_PREV_B': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', accent: 'bg-teal-500' },
    'BOM_PREV_A': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-500' },
    'BOM_PREV_B': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', accent: 'bg-indigo-500' },
    'GEN_CORR': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'bg-orange-500' },
    'BOM_CORR': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: 'bg-amber-500' },
    'EMERGENCIA': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-500' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', accent: 'bg-gray-500' };

export default function ActividadesCatalogoPage() {
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');
    const [filtroSistema, setFiltroSistema] = useState<string>('');
    const [filtroTipoActividad, setFiltroTipoActividad] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActividad, setEditingActividad] = useState<any>(null);
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

    const { data: response, isLoading, isError, refetch } = useCatalogoActividades({ activo: true });
    const actividades = response?.data || [];

    const { data: tiposServicioResponse } = useTiposServicio({ activo: true });
    const tiposServicio = tiposServicioResponse?.data || [];

    const { data: sistemasResponse } = useCatalogoSistemas({ activo: true });
    const sistemas = sistemasResponse?.data || [];

    const { data: parametrosResponse } = useParametrosMedicion({ activo: true });
    const parametros = parametrosResponse?.data || [];

    const crearActividad = useCreateCatalogoActividad();
    const actualizarActividad = useUpdateCatalogoActividad();
    const eliminarActividad = useDeleteCatalogoActividad();

    // Filtrar actividades
    const filteredActividades = useMemo(() => {
        return actividades.filter(a => {
            const desc = (a.descripcionActividad || a.descripcion_actividad || '').toLowerCase();
            const code = (a.codigoActividad || a.codigo_actividad || '').toLowerCase();
            const matchBusqueda = !busqueda || desc.includes(busqueda.toLowerCase()) || code.includes(busqueda.toLowerCase());

            const tipoServId = a.idTipoServicio || a.id_tipo_servicio;
            const matchServicio = !filtroTipoServicio || String(tipoServId) === filtroTipoServicio;

            const sistemaId = a.idSistema || a.id_sistema;
            const matchSistema = !filtroSistema || String(sistemaId) === filtroSistema;

            const tipoAct = a.tipoActividad || a.tipo_actividad;
            const matchTipoAct = !filtroTipoActividad || tipoAct === filtroTipoActividad;

            return matchBusqueda && matchServicio && matchSistema && matchTipoAct;
        });
    }, [actividades, busqueda, filtroTipoServicio, filtroSistema, filtroTipoActividad]);

    // Agrupar por tipo de servicio
    const groupedByService = useMemo(() => {
        const groups: Record<string, {
            servicio: any;
            actividades: any[];
            bySystem: Record<string, any[]>;
        }> = {};

        filteredActividades.forEach(act => {
            const tipoServId = String(act.idTipoServicio || act.id_tipo_servicio || 'sin_servicio');
            const servicio = act.tipoServicio || act.tipos_servicio;

            if (!groups[tipoServId]) {
                groups[tipoServId] = { servicio, actividades: [], bySystem: {} };
            }
            groups[tipoServId].actividades.push(act);

            // Agrupar por sistema dentro del servicio
            const sistemaId = String(act.idSistema || act.id_sistema || 'general');
            const sistemaNombre = act.sistema?.nombreSistema || act.catalogo_sistemas?.nombre_sistema || 'General';
            if (!groups[tipoServId].bySystem[sistemaId]) {
                groups[tipoServId].bySystem[sistemaId] = [];
            }
            groups[tipoServId].bySystem[sistemaId].push({ ...act, sistemaNombre });
        });

        // Ordenar actividades dentro de cada grupo
        Object.values(groups).forEach(group => {
            group.actividades.sort((a, b) => (a.ordenEjecucion || a.orden_ejecucion || 0) - (b.ordenEjecucion || b.orden_ejecucion || 0));
            Object.values(group.bySystem).forEach(acts => {
                acts.sort((a, b) => (a.ordenEjecucion || a.orden_ejecucion || 0) - (b.ordenEjecucion || b.orden_ejecucion || 0));
            });
        });

        return groups;
    }, [filteredActividades]);

    // Métricas
    const metricas = useMemo(() => {
        const total = actividades.length;
        const obligatorias = actividades.filter(a => a.esObligatoria ?? a.es_obligatoria).length;
        const mediciones = actividades.filter(a => (a.tipoActividad || a.tipo_actividad) === 'MEDICION').length;
        const porServicio = Object.keys(groupedByService).length;

        // Contar por tipo de actividad
        const porTipo: Record<string, number> = {};
        actividades.forEach(a => {
            const tipo = a.tipoActividad || a.tipo_actividad || 'OTRO';
            porTipo[tipo] = (porTipo[tipo] || 0) + 1;
        });

        return { total, obligatorias, mediciones, porServicio, porTipo };
    }, [actividades, groupedByService]);

    const toggleService = (serviceId: string) => {
        setExpandedServices(prev => {
            const next = new Set(prev);
            if (next.has(serviceId)) {
                next.delete(serviceId);
            } else {
                next.add(serviceId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedServices(new Set(Object.keys(groupedByService)));
    };

    const collapseAll = () => {
        setExpandedServices(new Set());
    };

    const handleEdit = (actividad: any) => {
        setEditingActividad(actividad);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar esta actividad del catálogo?')) {
            await eliminarActividad.mutateAsync(id);
        }
    };

    const clearFilters = () => {
        setBusqueda('');
        setFiltroTipoServicio('');
        setFiltroSistema('');
        setFiltroTipoActividad('');
    };

    const hasActiveFilters = busqueda || filtroTipoServicio || filtroSistema || filtroTipoActividad;

    return (
        <div className="space-y-6">
            {/* Header con métricas */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <ListChecks className="h-7 w-7 text-blue-400" />
                            </div>
                            Catálogo de Actividades
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm">
                            Gestiona los checklists maestros organizados por tipo de servicio y sistema
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingActividad(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
                    >
                        <Plus className="h-5 w-5" />
                        Nueva Actividad
                    </button>
                </div>

                {/* Métricas Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <ClipboardList className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{metricas.total}</p>
                                <p className="text-xs text-slate-400">Total Actividades</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{metricas.obligatorias}</p>
                                <p className="text-xs text-slate-400">Obligatorias</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                <Gauge className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{metricas.mediciones}</p>
                                <p className="text-xs text-slate-400">Con Medición</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <Cog className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{metricas.porServicio}</p>
                                <p className="text-xs text-slate-400">Tipos de Servicio</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros Avanzados */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Filtros</span>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium">
                            Limpiar filtros
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50"
                        />
                    </div>
                    <select
                        value={filtroTipoServicio}
                        onChange={(e) => setFiltroTipoServicio(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                    >
                        <option value="">Todos los servicios</option>
                        {tiposServicio.map((t: any) => (
                            <option key={`svc-${t.id_tipo_servicio || t.idTipoServicio}`} value={t.id_tipo_servicio || t.idTipoServicio}>
                                {t.nombre_tipo || t.nombreTipo}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filtroSistema}
                        onChange={(e) => setFiltroSistema(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                    >
                        <option value="">Todos los sistemas</option>
                        {sistemas.map((s: any) => (
                            <option key={`sys-${s.id_sistema || s.idSistema}`} value={s.id_sistema || s.idSistema}>
                                {s.nombre_sistema || s.nombreSistema}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filtroTipoActividad}
                        onChange={(e) => setFiltroTipoActividad(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                    >
                        <option value="">Todos los tipos</option>
                        {TIPOS_ACTIVIDAD.map(tipo => (
                            <option key={`tipo-${tipo.value}`} value={tipo.value}>{tipo.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Controles de expansión */}
            {!isLoading && !isError && Object.keys(groupedByService).length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Mostrando <span className="font-semibold text-gray-700">{filteredActividades.length}</span> actividades
                        {hasActiveFilters && <span className="text-blue-600"> (filtradas)</span>}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={expandAll} className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            Expandir todo
                        </button>
                        <button onClick={collapseAll} className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            Colapsar todo
                        </button>
                    </div>
                </div>
            )}

            {/* Contenido Principal */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                    <p className="text-gray-500 font-medium">Cargando catálogo de actividades...</p>
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-200">
                    <AlertCircle className="h-14 w-14 text-red-400 mb-4" />
                    <p className="font-bold text-lg text-red-600">Error al cargar el catálogo</p>
                    <button onClick={() => refetch()} className="mt-4 px-5 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium transition-colors">
                        Reintentar
                    </button>
                </div>
            ) : filteredActividades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                    <ListChecks className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg font-semibold text-gray-500">No hay actividades que coincidan</p>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedByService).map(([serviceId, group]) => {
                        const isExpanded = expandedServices.has(serviceId);
                        const serviceCodigo = group.servicio?.codigoTipoServicio || group.servicio?.codigo_tipo || '';
                        const colors = SERVICE_COLORS[serviceCodigo] || DEFAULT_COLOR;
                        const serviceNombre = group.servicio?.nombreTipoServicio || group.servicio?.nombre_tipo || 'Sin Servicio';

                        return (
                            <div key={`service-group-${serviceId}`} className={cn("rounded-2xl border-2 overflow-hidden transition-all", colors.border, colors.bg)}>
                                {/* Header del Servicio */}
                                <button
                                    onClick={() => toggleService(serviceId)}
                                    className={cn("w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors")}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-1.5 h-12 rounded-full", colors.accent)} />
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs font-mono px-2 py-0.5 rounded-md bg-white/60", colors.text)}>
                                                    {serviceCodigo}
                                                </span>
                                                <h3 className={cn("font-bold text-lg", colors.text)}>{serviceNombre}</h3>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {group.actividades.length} actividades • {Object.keys(group.bySystem).length} sistemas
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:flex items-center gap-2">
                                            {Object.entries(metricas.porTipo).slice(0, 4).map(([tipo, count]) => {
                                                const tipoInService = group.actividades.filter(a => (a.tipoActividad || a.tipo_actividad) === tipo).length;
                                                if (tipoInService === 0) return null;
                                                const Icon = getTipoActividadIcon(tipo);
                                                return (
                                                    <span key={`metric-${serviceId}-${tipo}`} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium", getTipoActividadColor(tipo))}>
                                                        <Icon className="h-3 w-3" /> {tipoInService}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className={cn("h-5 w-5", colors.text)} />
                                        ) : (
                                            <ChevronRight className={cn("h-5 w-5", colors.text)} />
                                        )}
                                    </div>
                                </button>

                                {/* Contenido expandido */}
                                {isExpanded && (
                                    <div className="bg-white border-t border-gray-100">
                                        {Object.entries(group.bySystem).map(([sistemaId, acts]) => (
                                            <div key={`system-${serviceId}-${sistemaId}`} className="border-b border-gray-50 last:border-b-0">
                                                {/* Header del Sistema */}
                                                <div className="px-6 py-3 bg-gray-50/50 flex items-center gap-2">
                                                    <Layers className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        {acts[0]?.sistemaNombre || 'General'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 ml-1">({acts.length})</span>
                                                </div>

                                                {/* Lista de Actividades */}
                                                <div className="divide-y divide-gray-50">
                                                    {acts.map((act, idx) => {
                                                        const Icon = getTipoActividadIcon(act.tipoActividad || act.tipo_actividad || '');
                                                        return (
                                                            <div key={`act-${serviceId}-${sistemaId}-${act.idActividadCatalogo || act.id_actividad_catalogo || idx}`}
                                                                className="px-6 py-3 hover:bg-blue-50/30 transition-colors group flex items-center gap-4">
                                                                {/* Orden */}
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                                    {act.ordenEjecucion || act.orden_ejecucion}
                                                                </div>

                                                                {/* Info Principal */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                                                                        {act.descripcionActividad || act.descripcion_actividad}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] font-mono text-gray-400">
                                                                            {act.codigoActividad || act.codigo_actividad}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Badges */}
                                                                <div className="hidden lg:flex items-center gap-2">
                                                                    <span className={cn(
                                                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                                                                        getTipoActividadColor(act.tipoActividad || act.tipo_actividad || '')
                                                                    )}>
                                                                        <Icon className="h-3 w-3" />
                                                                        {act.tipoActividad || act.tipo_actividad}
                                                                    </span>

                                                                    {(act.esObligatoria ?? act.es_obligatoria) && (
                                                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                                                                            OBLIGATORIA
                                                                        </span>
                                                                    )}

                                                                    {(act.tiempoEstimadoMinutos || act.tiempo_estimado_minutos) && (
                                                                        <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                                                                            <Clock className="h-3 w-3" />
                                                                            {act.tiempoEstimadoMinutos || act.tiempo_estimado_minutos}m
                                                                        </span>
                                                                    )}

                                                                    {(act.idParametroMedicion || act.id_parametro_medicion) && (
                                                                        <span className="flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-semibold">
                                                                            <Gauge className="h-3 w-3" />
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Acciones */}
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleEdit(act)}
                                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(act.idActividadCatalogo || act.id_actividad_catalogo || 0)}
                                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <ActividadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    actividad={editingActividad}
                    tiposServicio={tiposServicio || []}
                    sistemas={sistemas || []}
                    parametros={parametros || []}
                    onSubmit={async (formData: any) => {
                        const dto = {
                            codigoActividad: formData.codigo_actividad,
                            descripcionActividad: formData.descripcion_actividad,
                            idTipoServicio: Number(formData.id_tipo_servicio),
                            idSistema: formData.id_sistema ? Number(formData.id_sistema) : undefined,
                            tipoActividad: formData.tipo_actividad,
                            ordenEjecucion: Number(formData.orden_ejecucion),
                            esObligatoria: formData.es_obligatoria,
                            tiempoEstimadoMinutos: formData.tiempo_estimado_minutos ? Number(formData.tiempo_estimado_minutos) : undefined,
                            idParametroMedicion: formData.id_parametro_medicion ? Number(formData.id_parametro_medicion) : undefined,
                            instrucciones: formData.instrucciones || undefined,
                            precauciones: formData.precauciones || undefined,
                        };
                        if (editingActividad) {
                            await actualizarActividad.mutateAsync({
                                id: editingActividad.idActividadCatalogo || editingActividad.id_actividad_catalogo,
                                data: dto
                            });
                        } else {
                            await crearActividad.mutateAsync(dto);
                        }
                        setIsModalOpen(false);
                    }}
                    isLoading={crearActividad.isPending || actualizarActividad.isPending}
                />
            )}
        </div>
    );
}

function ActividadModal({ isOpen, onClose, actividad, tiposServicio, sistemas, parametros, onSubmit, isLoading }: any) {
    const [formData, setFormData] = useState({
        descripcion_actividad: actividad?.descripcion_actividad || '',
        codigo_actividad: actividad?.codigo_actividad || '',
        id_tipo_servicio: actividad?.id_tipo_servicio || '',
        id_sistema: actividad?.id_sistema || '',
        tipo_actividad: actividad?.tipo_actividad || 'INSPECCION',
        orden_ejecucion: actividad?.orden_ejecucion || 1,
        es_obligatoria: actividad?.es_obligatoria ?? true,
        tiempo_estimado_minutos: actividad?.tiempo_estimado_minutos || '',
        id_parametro_medicion: actividad?.id_parametro_medicion || '',
        instrucciones: actividad?.instrucciones || '',
        precauciones: actividad?.precauciones || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data: any = {
            ...formData,
            id_tipo_servicio: Number(formData.id_tipo_servicio),
            id_sistema: formData.id_sistema ? Number(formData.id_sistema) : null,
            id_parametro_medicion: formData.id_parametro_medicion ? Number(formData.id_parametro_medicion) : null,
            orden_ejecucion: Number(formData.orden_ejecucion),
            tiempo_estimado_minutos: formData.tiempo_estimado_minutos ? Number(formData.tiempo_estimado_minutos) : null
        };
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {actividad ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        {actividad ? 'Editar Actividad' : 'Nueva Actividad del Catálogo'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción de la Actividad *</label>
                        <textarea
                            required
                            rows={2}
                            value={formData.descripcion_actividad}
                            onChange={(e) => setFormData({ ...formData, descripcion_actividad: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                            placeholder="Ej: Verificar nivel de aceite del motor y estado del filtro..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Código Único *</label>
                            <input
                                required
                                type="text"
                                value={formData.codigo_actividad}
                                onChange={(e) => setFormData({ ...formData, codigo_actividad: e.target.value.toUpperCase().trim() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                placeholder="ACT_001"
                                disabled={!!actividad}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo de Actividad *</label>
                            <select
                                required
                                value={formData.tipo_actividad}
                                onChange={(e) => setFormData({ ...formData, tipo_actividad: e.target.value as any })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                {TIPOS_ACTIVIDAD.map(tipo => (
                                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Servicio Vinculado *</label>
                            <select
                                required
                                value={formData.id_tipo_servicio}
                                onChange={(e) => setFormData({ ...formData, id_tipo_servicio: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="">Seleccionar servicio...</option>
                                {tiposServicio?.map((t: any) => (
                                    <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>{t.nombre_tipo}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Sistema (Opcional)</label>
                            <select
                                value={formData.id_sistema}
                                onChange={(e) => setFormData({ ...formData, id_sistema: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                            >
                                <option value="">General / Ninguno</option>
                                {sistemas?.map((s: any) => (
                                    <option key={s.id_sistema} value={s.id_sistema}>{s.nombre_sistema}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Orden Ejecución</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.orden_ejecucion}
                                onChange={(e) => setFormData({ ...formData, orden_ejecucion: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tiempo Est. (min)</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.tiempo_estimado_minutos}
                                onChange={(e) => setFormData({ ...formData, tiempo_estimado_minutos: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="15"
                            />
                        </div>
                    </div>

                    {formData.tipo_actividad === 'MEDICION' && (
                        <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100 space-y-2">
                            <label className="block text-sm font-bold text-cyan-800 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Parámetro de Medición a Capturar
                            </label>
                            <select
                                required={formData.tipo_actividad === 'MEDICION'}
                                value={formData.id_parametro_medicion}
                                onChange={(e) => setFormData({ ...formData, id_parametro_medicion: e.target.value })}
                                className="w-full px-4 py-2 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-sm bg-white"
                            >
                                <option value="">Seleccionar parámetro...</option>
                                {parametros?.map((p: any) => (
                                    <option key={p.id_parametro_medicion} value={p.id_parametro_medicion}>
                                        {p.nombre_parametro} ({p.unidad_medida})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-cyan-600 italic">
                                Al seleccionar MEDICIÓN, la App móvil pedirá obligatoriamente el valor de este parámetro.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <Info className="h-4 w-4 text-blue-500" /> Instrucciones para Técnico
                            </label>
                            <textarea
                                rows={2}
                                value={formData.instrucciones}
                                onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                placeholder="Paso a paso detallado..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Precauciones / HSE
                            </label>
                            <textarea
                                rows={2}
                                value={formData.precauciones}
                                onChange={(e) => setFormData({ ...formData, precauciones: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                placeholder="Uso de EPP, bloqueo de energías..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <input
                            type="checkbox"
                            id="es_obligatoria"
                            checked={formData.es_obligatoria}
                            onChange={(e) => setFormData({ ...formData, es_obligatoria: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="es_obligatoria" className="text-sm font-bold text-blue-900 cursor-pointer">
                            ¿Es de ejecución obligatoria para cerrar la orden?
                        </label>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                        {actividad ? 'Guardar Cambios' : 'Crear Actividad'}
                    </button>
                </div>
            </div>
        </div>
    );
}
