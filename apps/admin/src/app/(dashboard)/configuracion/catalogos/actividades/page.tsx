'use client';

import {
    TIPOS_ACTIVIDAD,
    useCatalogoActividades,
    useCreateCatalogoActividad,
    useDeleteCatalogoActividad,
    useTiposServicio,
    useUpdateCatalogoActividad,
} from '@/features/catalogos';
import { useCatalogoSistemas, useCreateCatalogoSistema } from '@/features/catalogos/hooks/use-catalogo-sistemas';
import { useParametrosMedicion, useCreateParametroMedicion } from '@/features/catalogos/hooks/use-parametros-medicion';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BookOpen,
    Boxes,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Cog,
    Copy,
    Edit,
    Filter,
    Gauge,
    Info,
    Layers,
    Link2,
    ListChecks,
    Loader2,
    Lock,
    Plus,
    Search,
    Settings2,
    Sparkles,
    Trash2,
    Unlock,
    Wrench,
    X,
    Zap,
    ExternalLink,
    Tag,
    Share2
} from 'lucide-react';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { generarCodigoActividad, verificarCodigoDuplicado, EamSelect, useArquetiposEam } from '@/features/catalogos-eam';

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
    'COMP_PREV_A': { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', accent: 'bg-cyan-500' },
    'ELEV_PREV_A': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', accent: 'bg-purple-500' },
    'HVAC_PREV_A': { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', accent: 'bg-sky-500' },
    'GEN_CORR': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'bg-orange-500' },
    'BOM_CORR': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: 'bg-amber-500' },
    'EMERGENCIA': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-500' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', accent: 'bg-gray-500' };

// Unidades rápidas comunes para mediciones
const UNIDADES_METROLOGICAS_COMUNES = [
    { label: 'Milímetros (mm)', value: 'mm', magnitud: 'Longitud' },
    { label: 'Metros/seg (m/s)', value: 'm/s', magnitud: 'Velocidad' },
    { label: 'Segundos (s)', value: 's', magnitud: 'Tiempo' },
    { label: 'Minutos (min)', value: 'min', magnitud: 'Tiempo' },
    { label: 'Presión PSI (PSI)', value: 'PSI', magnitud: 'Presión' },
    { label: 'Presión Bar (bar)', value: 'bar', magnitud: 'Presión' },
    { label: 'Voltaje (VAC)', value: 'VAC', magnitud: 'Tensión Eléctrica' },
    { label: 'Corriente (A)', value: 'A', magnitud: 'Corriente' },
    { label: 'Temperatura (°C)', value: '°C', magnitud: 'Temperatura' },
    { label: 'Frecuencia (Hz)', value: 'Hz', magnitud: 'Frecuencia' },
    { label: 'Vibración (mm/s)', value: 'mm/s', magnitud: 'Vibración' },
    { label: 'Masa / Carga (kg)', value: 'kg', magnitud: 'Masa' },
    { label: 'Nivel (%)', value: '%', magnitud: 'Porcentaje' },
];

function ActividadesCatalogoContent() {
    const searchParams = useSearchParams();
    const paramServicioId = searchParams.get('servicioId');
    const paramTab = searchParams.get('tab');
    const paramAction = searchParams.get('action');

    // Modo de visualización: Checklists por Servicio vs Banco Universal
    const [vistaActiva, setVistaActiva] = useState<'checklists' | 'banco'>('checklists');

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');
    const [filtroSistema, setFiltroSistema] = useState<string>('');
    const [filtroTipoActividad, setFiltroTipoActividad] = useState<string>('');
    const [filtroEquipoBanco, setFiltroEquipoBanco] = useState<string>('TODOS');

    // Modales y drawers
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActividad, setEditingActividad] = useState<any>(null);
    const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);

    // Modal Importar desde Banco Universal a un servicio
    const [serviceForImport, setServiceForImport] = useState<any>(null);

    // Modal Asignar tarea individual del Banco a otro servicio
    const [activityForAssign, setActivityForAssign] = useState<any>(null);

    // Acordeones abiertos
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

    // Consultas React Query
    const { data: response, isLoading, isError, refetch } = useCatalogoActividades({ activo: true });
    const actividades = response?.data || [];

    const { data: tiposServicioResponse } = useTiposServicio({ activo: true });
    const tiposServicio = tiposServicioResponse?.data || [];

    const { data: sistemasResponse } = useCatalogoSistemas({ activo: true });
    const sistemas = sistemasResponse?.data || [];

    const { data: parametrosResponse, refetch: refetchParametros } = useParametrosMedicion({ activo: true });
    const parametros = parametrosResponse?.data || [];

    const { data: arquetipos = [] } = useArquetiposEam();

    // Sincronización inteligente con URL params (deep-linking desde tipos-servicio u órdenes)
    useEffect(() => {
        if (paramServicioId) {
            setFiltroTipoServicio(paramServicioId);
            setExpandedServices(prev => new Set([...Array.from(prev), paramServicioId]));

            if (paramAction === 'new') {
                setPreselectedServiceId(paramServicioId);
                setEditingActividad(null);
                setIsModalOpen(true);
            } else if (paramAction === 'import') {
                const targetSrv = (tiposServicio || []).find((s: any) => String(s.id_tipo_servicio || s.idTipoServicio) === paramServicioId);
                if (targetSrv) {
                    setServiceForImport(targetSrv);
                }
            }
        }
        if (paramTab === 'banco') {
            setVistaActiva('banco');
        }
    }, [paramServicioId, paramTab, paramAction, tiposServicio]);

    // Mutaciones
    const crearActividad = useCreateCatalogoActividad();
    const actualizarActividad = useUpdateCatalogoActividad();
    const eliminarActividad = useDeleteCatalogoActividad();
    const crearParametro = useCreateParametroMedicion();

    // =========================================================================
    // 1. BANCO UNIVERSAL DEDUPLICADO (Biblioteca Canónica de Tareas)
    // =========================================================================
    const bancoUniversal = useMemo(() => {
        const bancoMap = new Map<string, {
            claveCanonica: string;
            descripcion: string;
            codigoBase: string;
            tipoActividad: string;
            sistemaNombre: string;
            tiempoEstimadoMinutos?: number;
            instrucciones?: string;
            precauciones?: string;
            idParametroMedicion?: number;
            parametroMedicion?: any;
            esObligatoria?: boolean;
            serviciosAsociados: Array<{
                idTipoServicio: number;
                nombreTipo: string;
                codigoTipo: string;
                idActividadCatalogo: number;
                orden: number;
                aplicaA?: string[];
            }>;
            actividadOriginal: any;
        }>();

        actividades.forEach((act: any) => {
            const desc = (act.descripcionActividad || act.descripcion_actividad || '').trim();
            const tipo = act.tipoActividad || act.tipo_actividad || 'INSPECCION';
            const normKey = `${desc.toLowerCase()}_${tipo}`;

            const srvId = act.idTipoServicio || act.id_tipo_servicio;
            const srv = act.tipoServicio || act.tipos_servicio || tiposServicio.find((t: any) =>
                (t.id_tipo_servicio || t.idTipoServicio) === srvId
            );

            if (!bancoMap.has(normKey)) {
                bancoMap.set(normKey, {
                    claveCanonica: normKey,
                    descripcion: desc,
                    codigoBase: act.codigoActividad || act.codigo_actividad || '',
                    tipoActividad: tipo,
                    sistemaNombre: act.sistema?.nombreSistema || act.catalogo_sistemas?.nombre_sistema || 'General',
                    tiempoEstimadoMinutos: act.tiempoEstimadoMinutos || act.tiempo_estimado_minutos,
                    instrucciones: act.instrucciones,
                    precauciones: act.precauciones,
                    idParametroMedicion: act.idParametroMedicion || act.id_parametro_medicion,
                    parametroMedicion: act.parametros_medicion,
                    esObligatoria: act.esObligatoria ?? act.es_obligatoria ?? true,
                    serviciosAsociados: [],
                    actividadOriginal: act,
                });
            }

            const item = bancoMap.get(normKey)!;
            if (srv && srvId) {
                if (!item.serviciosAsociados.some(s => s.idTipoServicio === srvId)) {
                    item.serviciosAsociados.push({
                        idTipoServicio: srvId,
                        nombreTipo: srv.nombre_tipo || srv.nombreTipo,
                        codigoTipo: srv.codigo_tipo || srv.codigoTipo,
                        idActividadCatalogo: act.idActividadCatalogo || act.id_actividad_catalogo,
                        orden: act.ordenEjecucion || act.orden_ejecucion || 0,
                        aplicaA: Array.isArray(srv.aplica_a) ? srv.aplica_a : (srv.tipos_equipo?.codigo_tipo ? [srv.tipos_equipo.codigo_tipo] : []),
                    });
                }
            }
        });

        return Array.from(bancoMap.values());
    }, [actividades, tiposServicio]);

    // Filtrar Banco Universal
    const bancoUniversalFiltrado = useMemo(() => {
        return bancoUniversal.filter(item => {
            const desc = item.descripcion.toLowerCase();
            const code = item.codigoBase.toLowerCase();
            const matchBusqueda = !busqueda || desc.includes(busqueda.toLowerCase()) || code.includes(busqueda.toLowerCase());
            const matchTipo = !filtroTipoActividad || item.tipoActividad === filtroTipoActividad;

            // Filtro por arquetipo de equipo en el banco
            let matchEquipo = true;
            if (filtroEquipoBanco && filtroEquipoBanco !== 'TODOS') {
                matchEquipo = item.serviciosAsociados.some(srv => {
                    if (!srv.aplicaA || srv.aplicaA.length === 0) return filtroEquipoBanco === 'UNIVERSAL';
                    return srv.aplicaA.includes(filtroEquipoBanco) || srv.aplicaA.includes('UNIVERSAL');
                });
            }

            return matchBusqueda && matchTipo && matchEquipo;
        });
    }, [bancoUniversal, busqueda, filtroTipoActividad, filtroEquipoBanco]);

    // =========================================================================
    // 2. CHECKLISTS POR TIPO DE SERVICIO (Consolidado e incluyendo los de 0 act)
    // =========================================================================
    // Filtrar actividades planas
    const filteredActividades = useMemo(() => {
        return actividades.filter((a: any) => {
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

    // Agrupar por tipo de servicio garantizando que TODOS los servicios de la empresa existan
    const groupedByService = useMemo(() => {
        const groups: Record<string, {
            servicio: any;
            actividades: any[];
            bySystem: Record<string, { sistemaNombre: string; actividades: any[] }>;
        }> = {};

        // 1. Inicializar grupos con TODOS los tipos de servicio
        (tiposServicio || []).forEach((srv: any) => {
            const srvId = String(srv.id_tipo_servicio || srv.idTipoServicio);
            if (filtroTipoServicio && filtroTipoServicio !== srvId) return;

            groups[srvId] = {
                servicio: srv,
                actividades: [],
                bySystem: {}
            };
        });

        // 2. Colocar cada actividad filtrada en su grupo
        filteredActividades.forEach((act: any) => {
            const srvId = String(act.idTipoServicio || act.id_tipo_servicio || 'sin_servicio');
            const servicio = act.tipoServicio || act.tipos_servicio;

            if (!groups[srvId]) {
                groups[srvId] = {
                    servicio: servicio || { nombre_tipo: 'Sin Servicio Asignado', codigo_tipo: 'N/A' },
                    actividades: [],
                    bySystem: {}
                };
            }
            groups[srvId].actividades.push(act);

            // Consolidar subsistemas: normalizar y jamás separar dos "General"
            const rawSysId = act.idSistema || act.id_sistema;
            const rawSysNombre = (act.sistema?.nombreSistema || act.catalogo_sistemas?.nombre_sistema || '').trim();
            const esGeneral = !rawSysId || !rawSysNombre || rawSysNombre.toLowerCase().includes('general') || rawSysNombre.toLowerCase().includes('ninguno');
            const sistemaKey = esGeneral ? 'general' : String(rawSysId);
            const sistemaNombre = esGeneral ? 'General / Protocolo Universal' : rawSysNombre;

            if (!groups[srvId].bySystem[sistemaKey]) {
                groups[srvId].bySystem[sistemaKey] = { sistemaNombre, actividades: [] };
            }
            groups[srvId].bySystem[sistemaKey].actividades.push({ ...act, sistemaNombre });
        });

        // 3. Ordenar actividades dentro de cada grupo por orden_ejecucion
        Object.values(groups).forEach(group => {
            group.actividades.sort((a, b) => (a.ordenEjecucion || a.orden_ejecucion || 0) - (b.ordenEjecucion || b.orden_ejecucion || 0));
            Object.values(group.bySystem).forEach(sysGroup => {
                sysGroup.actividades.sort((a, b) => (a.ordenEjecucion || a.orden_ejecucion || 0) - (b.ordenEjecucion || b.orden_ejecucion || 0));
            });
        });

        return groups;
    }, [tiposServicio, filteredActividades, filtroTipoServicio]);

    // Métricas del catálogo
    const metricas = useMemo(() => {
        const total = actividades.length;
        const obligatorias = actividades.filter((a: any) => a.esObligatoria ?? a.es_obligatoria).length;
        const mediciones = actividades.filter((a: any) => (a.tipoActividad || a.tipo_actividad) === 'MEDICION').length;
        const totalServicios = (tiposServicio || []).length;
        const tareasUnicasBanco = bancoUniversal.length;

        return { total, obligatorias, mediciones, totalServicios, tareasUnicasBanco };
    }, [actividades, tiposServicio, bancoUniversal]);

    // Handlers de acordeones
    const toggleService = (serviceId: string) => {
        setExpandedServices(prev => {
            const next = new Set(prev);
            if (next.has(serviceId)) next.delete(serviceId);
            else next.add(serviceId);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedServices(new Set(Object.keys(groupedByService)));
    };

    const collapseAll = () => {
        setExpandedServices(new Set());
    };

    // Acciones sobre actividades
    const handleEdit = (actividad: any) => {
        setEditingActividad(actividad);
        setPreselectedServiceId(String(actividad.idTipoServicio || actividad.id_tipo_servicio || ''));
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar esta actividad del catálogo?')) {
            try {
                await eliminarActividad.mutateAsync(id);
                toast.success('Actividad eliminada del catálogo');
            } catch (err: any) {
                toast.error(`Error al eliminar: ${err?.message || 'Error desconocido'}`);
            }
        }
    };

    // Swap interactivo de orden (Subir / Bajar)
    const handleSwapOrder = async (actCurrent: any, actAdjacent: any) => {
        const idCurrent = actCurrent.idActividadCatalogo || actCurrent.id_actividad_catalogo;
        const idAdjacent = actAdjacent.idActividadCatalogo || actAdjacent.id_actividad_catalogo;
        const ordenCurrent = actCurrent.ordenEjecucion || actCurrent.orden_ejecucion;
        const ordenAdjacent = actAdjacent.ordenEjecucion || actAdjacent.orden_ejecucion;

        try {
            await Promise.all([
                actualizarActividad.mutateAsync({ id: idCurrent, data: { ordenEjecucion: ordenAdjacent } }),
                actualizarActividad.mutateAsync({ id: idAdjacent, data: { ordenEjecucion: ordenCurrent } }),
            ]);
            toast.success('Secuencia de inspección actualizada');
        } catch (err: any) {
            toast.error('Error al reordenar secuencia');
        }
    };

    const clearFilters = () => {
        setBusqueda('');
        setFiltroTipoServicio('');
        setFiltroSistema('');
        setFiltroTipoActividad('');
        setFiltroEquipoBanco('TODOS');
    };

    const hasActiveFilters = busqueda || filtroTipoServicio || filtroSistema || filtroTipoActividad || filtroEquipoBanco !== 'TODOS';

    return (
        <div className="space-y-6">
            {/* Header con métricas y Conmutador de Vistas */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                                <ListChecks className="h-7 w-7 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">Catálogo de Actividades y Protocolos</h1>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    Biblioteca técnica reusable y constructor de checklists por clase de equipo
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Selector de Vista: Checklists vs Banco */}
                        <div className="bg-slate-800/90 border border-slate-700 p-1 rounded-2xl flex items-center shadow-inner">
                            <button
                                type="button"
                                onClick={() => setVistaActiva('checklists')}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    vistaActiva === 'checklists'
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/40"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <ClipboardList className="h-4 w-4" />
                                <span>Checklists por Servicio ({metricas.totalServicios})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setVistaActiva('banco')}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    vistaActiva === 'banco'
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <BookOpen className="h-4 w-4" />
                                <span>Banco Universal ({metricas.tareasUnicasBanco})</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setEditingActividad(null);
                                setPreselectedServiceId(null);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 font-bold text-xs transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Nueva Actividad</span>
                        </button>
                    </div>
                </div>

                {/* Métricas Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xl font-black">{metricas.tareasUnicasBanco}</p>
                                <p className="text-[11px] text-slate-400 font-medium">Tareas Únicas en Banco</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <Boxes className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xl font-black">{metricas.totalServicios}</p>
                                <p className="text-[11px] text-slate-400 font-medium">Protocolos de Servicio</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
                                <Gauge className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xl font-black">{metricas.mediciones}</p>
                                <p className="text-[11px] text-slate-400 font-medium">Variables de Medición</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xl font-black">{metricas.obligatorias}</p>
                                <p className="text-[11px] text-slate-400 font-medium">Inspecciones Obligatorias</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros Contextuales */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {vistaActiva === 'checklists' ? 'Filtrar Checklists por Servicio' : 'Filtrar Banco Universal de Actividades'}
                    </span>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer">
                            Limpiar filtros
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por descripción o código..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-gray-50/50 font-medium"
                        />
                    </div>

                    {vistaActiva === 'checklists' ? (
                        <EamSelect
                            value={filtroTipoServicio}
                            onChange={(val) => setFiltroTipoServicio(val)}
                            options={[
                                { value: '', label: `Todos los servicios (${tiposServicio.length})` },
                                ...tiposServicio.map((t: any) => ({
                                    value: String(t.id_tipo_servicio || t.idTipoServicio),
                                    label: t.nombre_tipo || t.nombreTipo,
                                    badge: t.codigo_tipo || t.codigoTipo || undefined,
                                })),
                            ]}
                            placeholder="Filtrar por servicio..."
                            searchable
                        />
                    ) : (
                        <EamSelect
                            value={filtroEquipoBanco}
                            onChange={(val) => setFiltroEquipoBanco(val)}
                            options={[
                                { value: 'TODOS', label: 'Todas las clases de equipo' },
                                { value: 'UNIVERSAL', label: 'Universal (Aplica a todo)' },
                                ...arquetipos.map((a: any) => ({
                                    value: a.codigo_tipo,
                                    label: a.nombre_canonico || a.nombre_tipo,
                                    badge: a.codigo_tipo,
                                })),
                            ]}
                            placeholder="Filtrar por tipo de equipo..."
                            searchable
                        />
                    )}

                    <EamSelect
                        value={filtroSistema}
                        onChange={(val) => setFiltroSistema(val)}
                        options={[
                            { value: '', label: `Todos los sistemas (${sistemas.length})` },
                            ...sistemas.map((s: any) => ({
                                value: String(s.id_sistema || s.idSistema),
                                label: s.nombre_sistema || s.nombreSistema,
                                badge: s.codigo_sistema || undefined,
                            })),
                        ]}
                        placeholder="Filtrar por sistema..."
                        searchable
                    />

                    <EamSelect
                        value={filtroTipoActividad}
                        onChange={(val) => setFiltroTipoActividad(val)}
                        options={[
                            { value: '', label: 'Todos los tipos de tarea' },
                            ...TIPOS_ACTIVIDAD.map(tipo => ({
                                value: tipo.value,
                                label: tipo.label,
                            })),
                        ]}
                        placeholder="Tipo de actividad..."
                    />
                </div>
            </div>

            {/* Banner de Enfoque Activo si se filtró por un servicio específico */}
            {filtroTipoServicio && vistaActiva === 'checklists' && (
                <div className="flex items-center justify-between p-3.5 bg-blue-50/90 border border-blue-200/90 rounded-2xl text-xs text-blue-900 shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                        <span>
                            Protocolo enfocado en: <strong className="font-bold text-blue-950">
                                {tiposServicio.find((s: any) => String(s.id_tipo_servicio || s.idTipoServicio) === filtroTipoServicio)?.nombre_tipo || `Servicio #${filtroTipoServicio}`}
                            </strong>
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltroTipoServicio('')}
                        className="text-blue-700 hover:text-blue-950 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-white/70 px-3 py-1 rounded-lg border border-blue-200 transition-colors"
                    >
                        Mostrar todos los servicios ({tiposServicio.length}) ✕
                    </button>
                </div>
            )}

            {/* VISTA 1: CHECKLISTS POR TIPO DE SERVICIO */}
            {vistaActiva === 'checklists' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-xs text-gray-500 font-medium">
                            Mostrando <strong className="text-gray-800">{Object.keys(groupedByService).length}</strong> tipos de servicio con protocolo configurado
                        </p>
                        <div className="flex gap-2">
                            <button onClick={expandAll} className="text-xs px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors cursor-pointer">
                                Expandir todo
                            </button>
                            <button onClick={collapseAll} className="text-xs px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors cursor-pointer">
                                Colapsar todo
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
                            <p className="text-gray-500 text-xs font-semibold">Cargando protocolos y actividades...</p>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 text-center p-6">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
                            <p className="font-bold text-red-700">Error al cargar las actividades del catálogo</p>
                            <button onClick={() => refetch()} className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors">
                                Reintentar consulta
                            </button>
                        </div>
                    ) : Object.keys(groupedByService).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 text-center p-6">
                            <ListChecks className="h-12 w-12 text-gray-300 mb-3" />
                            <p className="font-bold text-gray-600 text-sm">No se encontraron servicios que coincidan con los filtros</p>
                            <button onClick={clearFilters} className="mt-2 text-xs font-bold text-blue-600 hover:underline">
                                Restablecer filtros
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedByService).map(([serviceId, group]) => {
                                const isExpanded = expandedServices.has(serviceId);
                                const serviceCodigo = group.servicio?.codigoTipoServicio || group.servicio?.codigo_tipo || '';
                                const colors = SERVICE_COLORS[serviceCodigo] || DEFAULT_COLOR;
                                const serviceNombre = group.servicio?.nombreTipoServicio || group.servicio?.nombre_tipo || 'Sin Servicio';
                                const totalAct = group.actividades.length;
                                const totalSys = Object.keys(group.bySystem).length;

                                // Identificar equipo al que aplica
                                const aplicaCodes: string[] = Array.isArray(group.servicio?.aplica_a)
                                    ? group.servicio.aplica_a
                                    : (group.servicio?.tipos_equipo?.codigo_tipo ? [group.servicio.tipos_equipo.codigo_tipo] : []);

                                return (
                                    <div key={`service-group-${serviceId}`} className={cn("rounded-2xl border-2 overflow-hidden transition-all shadow-2xs", colors.border, colors.bg)}>
                                        {/* Header del Servicio */}
                                        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-white/70 backdrop-blur-xs">
                                            <div
                                                onClick={() => toggleService(serviceId)}
                                                className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer select-none"
                                            >
                                                <div className={cn("w-1.5 h-11 rounded-full shrink-0", colors.accent)} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={cn("text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border", colors.border, colors.text, "bg-white")}>
                                                            {serviceCodigo}
                                                        </span>
                                                        <h3 className={cn("font-bold text-base text-gray-900 truncate")}>{serviceNombre}</h3>

                                                        {aplicaCodes.length > 0 ? (
                                                            aplicaCodes.map(code => (
                                                                <span key={code} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                                    {code === 'ELEV' ? 'Ascensor (ELEV)' : code}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                                Universal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                                        <span><strong>{totalAct}</strong> actividades</span>
                                                        <span>•</span>
                                                        <span><strong>{totalSys}</strong> sistemas</span>
                                                        {totalAct === 0 && (
                                                            <span className="ml-2 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold animate-pulse">
                                                                Checklist pendiente por armar
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Botones de acción directa en la cabecera */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setServiceForImport(group.servicio);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                                    title="Reutilizar tareas existentes desde el Banco Universal"
                                                >
                                                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                                                    <span>+ Agregar del Banco</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingActividad(null);
                                                        setPreselectedServiceId(serviceId);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                                    title="Crear una nueva actividad específica para este servicio"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>+ Nueva Tarea</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleService(serviceId)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-5 w-5" />
                                                    ) : (
                                                        <ChevronRight className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Contenido expandido */}
                                        {isExpanded && (
                                            <div className="bg-white border-t border-gray-100">
                                                {totalAct === 0 ? (
                                                    <div className="p-8 text-center rounded-b-2xl bg-slate-50/50 space-y-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                                                            <ClipboardList className="h-6 w-6" />
                                                        </div>
                                                        <h4 className="text-sm font-bold text-gray-800">
                                                            Este servicio aún no tiene actividades en su checklist
                                                        </h4>
                                                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                                                            Puedes importar tareas estándar desde el Banco Universal con 1 clic o registrar nuevas tareas técnicas específicas para este equipo.
                                                        </p>
                                                        <div className="flex items-center justify-center gap-3 pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => setServiceForImport(group.servicio)}
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                                                            >
                                                                <BookOpen className="h-4 w-4" />
                                                                <span>Importar del Banco Universal</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingActividad(null);
                                                                    setPreselectedServiceId(serviceId);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:bg-white text-gray-700 text-xs font-bold cursor-pointer"
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                                <span>Redactar Primera Tarea</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {Object.entries(group.bySystem).map(([sistemaKey, sysGroup]) => (
                                                            <div key={`system-${serviceId}-${sistemaKey}`} className="border-b border-gray-100 last:border-b-0">
                                                                {/* Header del Sistema Consolidado */}
                                                                <div className="px-6 py-2.5 bg-slate-50 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Layers className="h-4 w-4 text-purple-600" />
                                                                        <span className="text-xs font-bold text-gray-800">
                                                                            {sysGroup.sistemaNombre}
                                                                        </span>
                                                                        <span className="text-[11px] font-semibold text-gray-400">
                                                                            ({sysGroup.actividades.length} tareas)
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Lista de Actividades con Swap de Reordenamiento */}
                                                                <div className="divide-y divide-gray-50">
                                                                    {sysGroup.actividades.map((act, idx) => {
                                                                        const Icon = getTipoActividadIcon(act.tipoActividad || act.tipo_actividad || '');
                                                                        const esPrimero = idx === 0;
                                                                        const esUltimo = idx === sysGroup.actividades.length - 1;
                                                                        const paramMedicion = act.parametros_medicion;

                                                                        return (
                                                                            <div
                                                                                key={`act-${serviceId}-${sistemaKey}-${act.idActividadCatalogo || act.id_actividad_catalogo || idx}`}
                                                                                className="px-6 py-3 hover:bg-blue-50/20 transition-colors group flex items-center gap-3.5"
                                                                            >
                                                                                {/* Controles de Orden y Reordenamiento Swap */}
                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                                                        {act.ordenEjecucion || act.orden_ejecucion || idx + 1}
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={esPrimero || actualizarActividad.isPending}
                                                                                            onClick={() => handleSwapOrder(act, sysGroup.actividades[idx - 1])}
                                                                                            className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                                                                            title="Subir orden"
                                                                                        >
                                                                                            <ArrowUp className="h-3 w-3" />
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={esUltimo || actualizarActividad.isPending}
                                                                                            onClick={() => handleSwapOrder(act, sysGroup.actividades[idx + 1])}
                                                                                            className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                                                                            title="Bajar orden"
                                                                                        >
                                                                                            <ArrowDown className="h-3 w-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Info de la Actividad */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="font-semibold text-xs text-gray-900 group-hover:text-blue-700 transition-colors leading-relaxed">
                                                                                        {act.descripcionActividad || act.descripcion_actividad}
                                                                                    </p>
                                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                                        <span className="text-[10px] font-mono text-gray-400 font-bold">
                                                                                            {act.codigoActividad || act.codigo_actividad}
                                                                                        </span>

                                                                                        {paramMedicion && (
                                                                                            <span className="text-[10px] bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                                                                                <Gauge className="h-3 w-3 text-cyan-600" />
                                                                                                <span>
                                                                                                    {paramMedicion.nombre_parametro || paramMedicion.nombreParametro} ({paramMedicion.unidad_medida || paramMedicion.unidadMedida})
                                                                                                    {paramMedicion.valor_minimo_normal !== null && paramMedicion.valor_maximo_normal !== null && (
                                                                                                        ` [${paramMedicion.valor_minimo_normal} - ${paramMedicion.valor_maximo_normal}]`
                                                                                                    )}
                                                                                                </span>
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Badges de Atributos */}
                                                                                <div className="hidden md:flex items-center gap-2 shrink-0">
                                                                                    <span className={cn(
                                                                                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold",
                                                                                        getTipoActividadColor(act.tipoActividad || act.tipo_actividad || '')
                                                                                    )}>
                                                                                        <Icon className="h-3 w-3" />
                                                                                        {act.tipoActividad || act.tipo_actividad}
                                                                                    </span>

                                                                                    {(act.esObligatoria ?? act.es_obligatoria) && (
                                                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                                                                                            OBLIGATORIA
                                                                                        </span>
                                                                                    )}

                                                                                    {(act.tiempoEstimadoMinutos || act.tiempo_estimado_minutos) && (
                                                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">
                                                                                            <Clock className="h-3 w-3" />
                                                                                            {act.tiempoEstimadoMinutos || act.tiempo_estimado_minutos}m
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Acciones */}
                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleEdit(act)}
                                                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                                                                        title="Editar actividad"
                                                                                    >
                                                                                        <Edit className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleDelete(act.idActividadCatalogo || act.id_actividad_catalogo || 0)}
                                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                                                        title="Eliminar de este servicio"
                                                                                    >
                                                                                        <Trash2 className="h-3.5 w-3.5" />
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
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 2: BANCO UNIVERSAL DE ACTIVIDADES (Catálogo Reutilizable) */}
            {vistaActiva === 'banco' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-xs text-gray-500 font-medium">
                            Biblioteca maestra con <strong className="text-gray-800">{bancoUniversalFiltrado.length}</strong> tareas técnicas estandarizadas
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bancoUniversalFiltrado.map((item) => {
                            const Icon = getTipoActividadIcon(item.tipoActividad);
                            return (
                                <div
                                    key={item.claveCanonica}
                                    className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className={cn(
                                                "flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold",
                                                getTipoActividadColor(item.tipoActividad)
                                            )}>
                                                <Icon className="h-3 w-3" />
                                                {item.tipoActividad}
                                            </span>

                                            <span className="text-[10px] font-mono text-gray-400 font-bold">
                                                {item.codigoBase}
                                            </span>
                                        </div>

                                        <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                                            {item.descripcion}
                                        </h4>

                                        <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1.5">
                                            <Layers className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                            <span className="truncate">{item.sistemaNombre}</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                En uso ({item.serviciosAsociados.length})
                                            </span>
                                            {item.tiempoEstimadoMinutos && (
                                                <span className="text-[10px] text-blue-700 font-semibold flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {item.tiempoEstimadoMinutos}m
                                                </span>
                                            )}
                                        </div>

                                        {/* Píldoras de servicios asociados */}
                                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                            {item.serviciosAsociados.map(srv => (
                                                <span key={srv.idTipoServicio} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {srv.codigoTipo}
                                                </span>
                                            ))}
                                            {item.serviciosAsociados.length === 0 && (
                                                <span className="text-[10px] text-amber-600 italic">
                                                    Sin asignar a servicios
                                                </span>
                                            )}
                                        </div>

                                        {/* Botón Asignar a otro Servicio */}
                                        <button
                                            type="button"
                                            onClick={() => setActivityForAssign(item)}
                                            className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
                                        >
                                            <Link2 className="h-3.5 w-3.5 text-indigo-600" />
                                            <span>Vincular a otro Servicio</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* MODAL 1: NUEVA / EDITAR ACTIVIDAD CON FILTRADO CONTEXTUAL Y MEDICIONES */}
            {isModalOpen && (
                <ActividadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    actividad={editingActividad}
                    actividades={actividades || []}
                    tiposServicio={tiposServicio || []}
                    sistemas={sistemas || []}
                    parametros={parametros || []}
                    preselectedServiceId={preselectedServiceId}
                    onSubmit={async (formData: any) => {
                        try {
                            let parametroId = formData.id_parametro_medicion ? Number(formData.id_parametro_medicion) : undefined;

                            // Si es de tipo MEDICION y se definieron unidad y rangos pero no se eligió un parámetro existente, crearlo al vuelo
                            if (formData.tipo_actividad === 'MEDICION' && !parametroId && formData.unidad_medida) {
                                try {
                                    const codParam = `PAR_${formData.codigo_actividad || 'MED'}`.slice(0, 30);
                                    const nuevoParam = await crearParametro.mutateAsync({
                                        codigoParametro: codParam,
                                        nombreParametro: formData.descripcion_actividad.slice(0, 80),
                                        unidadMedida: formData.unidad_medida,
                                        valorMinimoNormal: formData.valor_minimo_normal ? Number(formData.valor_minimo_normal) : undefined,
                                        valorMaximoNormal: formData.valor_maximo_normal ? Number(formData.valor_maximo_normal) : undefined,
                                        tipoDato: 'NUMERICO',
                                        categoria: 'OTRO',
                                        activo: true,
                                    });
                                    parametroId = nuevoParam?.data?.id_parametro_medicion;
                                    refetchParametros();
                                } catch (pErr) {
                                    console.warn('No se pudo auto-crear parámetro de medición, continuando:', pErr);
                                }
                            }

                            // Permitir guardar en múltiples servicios si se seleccionaron varios
                            const serviciosDestino = Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0
                                ? formData.servicios_seleccionados
                                : [formData.id_tipo_servicio];

                            for (const srvId of serviciosDestino) {
                                const dto = {
                                    codigoActividad: formData.codigo_actividad,
                                    descripcionActividad: formData.descripcion_actividad,
                                    idTipoServicio: Number(srvId),
                                    idSistema: formData.id_sistema ? Number(formData.id_sistema) : undefined,
                                    tipoActividad: formData.tipo_actividad,
                                    ordenEjecucion: Number(formData.orden_ejecucion),
                                    esObligatoria: formData.es_obligatoria,
                                    tiempoEstimadoMinutos: formData.tiempo_estimado_minutos ? Number(formData.tiempo_estimado_minutos) : undefined,
                                    idParametroMedicion: parametroId,
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
                            }

                            toast.success(editingActividad ? 'Actividad actualizada' : 'Actividad registrada con éxito');
                            setIsModalOpen(false);
                        } catch (err: any) {
                            toast.error(`Error al guardar: ${err?.message || 'Error desconocido'}`);
                        }
                    }}
                    isLoading={crearActividad.isPending || actualizarActividad.isPending}
                />
            )}

            {/* MODAL 2: IMPORTAR DEL BANCO UNIVERSAL A UN SERVICIO ESPECÍFICO */}
            {serviceForImport && (
                <ImportarDelBancoModal
                    servicio={serviceForImport}
                    bancoUniversal={bancoUniversal}
                    actividadesExistentes={actividades.filter((a: any) =>
                        String(a.idTipoServicio || a.id_tipo_servicio) === String(serviceForImport.id_tipo_servicio || serviceForImport.idTipoServicio)
                    )}
                    onClose={() => setServiceForImport(null)}
                    onImport={async (itemsParaImportar: any[]) => {
                        const srvId = Number(serviceForImport.id_tipo_servicio || serviceForImport.idTipoServicio);
                        const srvActividades = actividades.filter((a: any) =>
                            Number(a.idTipoServicio || a.id_tipo_servicio) === srvId
                        );
                        let maxOrden = srvActividades.length > 0
                            ? Math.max(...srvActividades.map((a: any) => a.ordenEjecucion || a.orden_ejecucion || 0))
                            : 0;

                        try {
                            for (const item of itemsParaImportar) {
                                maxOrden += 1;
                                const original = item.actividadOriginal;
                                await crearActividad.mutateAsync({
                                    codigoActividad: `${item.codigoBase}_${serviceForImport.codigo_tipo || 'SRV'}`.slice(0, 45),
                                    descripcionActividad: item.descripcion,
                                    idTipoServicio: srvId,
                                    idSistema: original?.idSistema || original?.id_sistema || undefined,
                                    tipoActividad: item.tipoActividad as any,
                                    ordenEjecucion: maxOrden,
                                    esObligatoria: item.esObligatoria ?? true,
                                    tiempoEstimadoMinutos: item.tiempoEstimadoMinutos,
                                    idParametroMedicion: item.idParametroMedicion,
                                    instrucciones: item.instrucciones,
                                    precauciones: item.precauciones,
                                });
                            }
                            toast.success(`Se importaron ${itemsParaImportar.length} actividades al servicio`);
                            setServiceForImport(null);
                        } catch (err: any) {
                            toast.error('Error al importar actividades');
                        }
                    }}
                />
            )}

            {/* MODAL 3: VINCULAR TAREA DEL BANCO A OTRO SERVICIO */}
            {activityForAssign && (
                <AsignarAServicioModal
                    actividad={activityForAssign}
                    tiposServicio={tiposServicio}
                    onClose={() => setActivityForAssign(null)}
                    onAssign={async (idServicioDestino: number) => {
                        try {
                            const srvActividades = actividades.filter((a: any) =>
                                Number(a.idTipoServicio || a.id_tipo_servicio) === idServicioDestino
                            );
                            const maxOrden = srvActividades.length > 0
                                ? Math.max(...srvActividades.map((a: any) => a.ordenEjecucion || a.orden_ejecucion || 0)) + 1
                                : 1;

                            const srvTarget = tiposServicio.find((t: any) => (t.id_tipo_servicio || t.idTipoServicio) === idServicioDestino);
                            const original = activityForAssign.actividadOriginal;

                            await crearActividad.mutateAsync({
                                codigoActividad: `${activityForAssign.codigoBase}_${srvTarget?.codigo_tipo || 'CLON'}`.slice(0, 45),
                                descripcionActividad: activityForAssign.descripcion,
                                idTipoServicio: idServicioDestino,
                                idSistema: original?.idSistema || original?.id_sistema || undefined,
                                tipoActividad: activityForAssign.tipoActividad as any,
                                ordenEjecucion: maxOrden,
                                esObligatoria: activityForAssign.esObligatoria ?? true,
                                tiempoEstimadoMinutos: activityForAssign.tiempoEstimadoMinutos,
                                idParametroMedicion: activityForAssign.idParametroMedicion,
                                instrucciones: activityForAssign.instrucciones,
                                precauciones: activityForAssign.precauciones,
                            });

                            toast.success(`Actividad asignada a ${srvTarget?.nombre_tipo || 'el servicio seleccionado'}`);
                            setActivityForAssign(null);
                        } catch (err: any) {
                            toast.error('Error al asignar la actividad al servicio');
                        }
                    }}
                />
            )}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES: MODALES ESPECÍFICOS DE ALTA PRODUCTIVIDAD
// =============================================================================

/**
 * Modal principal para crear/editar actividad con filtrado contextual estricto y telemetría
 */
function ActividadModal({
    isOpen,
    onClose,
    actividad,
    actividades = [],
    tiposServicio = [],
    sistemas = [],
    parametros = [],
    preselectedServiceId,
    onSubmit,
    isLoading
}: any) {
    const codigosExistentes = useMemo(() => {
        return new Set<string>(
            (actividades || [])
                .filter((a: any) => !actividad || (a.idActividad || a.id_actividad) !== (actividad.idActividad || actividad.id_actividad))
                .map((a: any) => (a.codigoActividad || a.codigo_actividad || '').toUpperCase().trim())
                .filter(Boolean)
        );
    }, [actividades, actividad]);

    const [isAutoCodigo, setIsAutoCodigo] = useState(!actividad);

    // Estado del formulario
    const [formData, setFormData] = useState({
        descripcion_actividad: actividad?.descripcion_actividad || actividad?.descripcionActividad || '',
        codigo_actividad: actividad?.codigo_actividad || actividad?.codigoActividad || '',
        id_tipo_servicio: actividad?.id_tipo_servicio || actividad?.idTipoServicio || preselectedServiceId || '',
        servicios_seleccionados: preselectedServiceId ? [preselectedServiceId] : [],
        id_sistema: actividad?.id_sistema || actividad?.idSistema || '',
        tipo_actividad: actividad?.tipo_actividad || actividad?.tipoActividad || 'INSPECCION',
        orden_ejecucion: actividad?.orden_ejecucion || actividad?.ordenEjecucion || 1,
        es_obligatoria: actividad?.es_obligatoria ?? actividad?.esObligatoria ?? true,
        tiempo_estimado_minutos: actividad?.tiempo_estimado_minutos || actividad?.tiempoEstimadoMinutos || '',
        id_parametro_medicion: actividad?.id_parametro_medicion || actividad?.idParametroMedicion || '',
        instrucciones: actividad?.instrucciones || '',
        precauciones: actividad?.precauciones || '',
        // Campos metrológicos adicionales
        unidad_medida: actividad?.parametros_medicion?.unidad_medida || '',
        valor_minimo_normal: actividad?.parametros_medicion?.valor_minimo_normal || '',
        valor_maximo_normal: actividad?.parametros_medicion?.valor_maximo_normal || '',
    });

    // Detectar servicio seleccionado para inferir su arquetipo
    const servicioActual = useMemo(() => {
        return tiposServicio.find((t: any) => String(t.id_tipo_servicio || t.idTipoServicio) === String(formData.id_tipo_servicio));
    }, [tiposServicio, formData.id_tipo_servicio]);

    // Arquetipos a los que aplica el servicio
    const arquetiposDelServicio = useMemo(() => {
        if (!servicioActual) return [];
        const codes: string[] = [];
        if (Array.isArray(servicioActual.aplica_a)) {
            codes.push(...servicioActual.aplica_a.map((c: string) => String(c).toUpperCase().trim()));
        }
        if (servicioActual.tipos_equipo?.codigo_tipo) {
            codes.push(String(servicioActual.tipos_equipo.codigo_tipo).toUpperCase().trim());
        }
        return codes;
    }, [servicioActual]);

    // Filtrar estrictamente los sistemas para evitar contaminación cruzada (Defecto #3)
    const sistemasFiltrados = useMemo(() => {
        if (!servicioActual || arquetiposDelServicio.length === 0 || arquetiposDelServicio.includes('UNIVERSAL')) {
            return sistemas;
        }
        return (sistemas || []).filter((s: any) => {
            const sysAplica: string[] = Array.isArray(s.aplica_a)
                ? s.aplica_a.map((c: string) => String(c).toUpperCase().trim())
                : [];
            if (sysAplica.length === 0 || sysAplica.includes('UNIVERSAL')) return true;
            return sysAplica.some(c => arquetiposDelServicio.includes(c));
        });
    }, [sistemas, servicioActual, arquetiposDelServicio]);

    // Auto-cálculo de orden al cambiar de servicio
    const handleServicioChange = (srvId: string) => {
        const srvActividades = actividades.filter((a: any) => String(a.idTipoServicio || a.id_tipo_servicio) === String(srvId));
        const maxOrden = srvActividades.length > 0
            ? Math.max(...srvActividades.map((a: any) => a.ordenEjecucion || a.orden_ejecucion || 0)) + 1
            : 1;

        setFormData(prev => ({
            ...prev,
            id_tipo_servicio: srvId,
            id_sistema: '', // Resetear sistema al cambiar servicio para evitar inconsistencias
            orden_ejecucion: maxOrden,
        }));
    };

    const isCodigoDuplicado = useMemo(() => {
        return verificarCodigoDuplicado(
            formData.codigo_actividad,
            codigosExistentes,
            actividad?.codigo_actividad || actividad?.codigoActividad,
        );
    }, [formData.codigo_actividad, codigosExistentes, actividad]);

    const handleDescripcionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newDesc = e.target.value;
        const auto = (isAutoCodigo && !actividad)
            ? generarCodigoActividad(newDesc, codigosExistentes)
            : formData.codigo_actividad;
        setFormData({
            ...formData,
            descripcion_actividad: newDesc,
            codigo_actividad: auto,
        });
    };

    const handleToggleAutoCodigo = () => {
        const nuevoModo = !isAutoCodigo;
        setIsAutoCodigo(nuevoModo);
        if (nuevoModo) {
            const auto = generarCodigoActividad(formData.descripcion_actividad, codigosExistentes);
            setFormData((prev) => ({ ...prev, codigo_actividad: auto }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isCodigoDuplicado) return;
        const finalCode = formData.codigo_actividad.trim() || generarCodigoActividad(formData.descripcion_actividad, codigosExistentes);
        onSubmit({
            ...formData,
            codigo_actividad: finalCode.toUpperCase().trim(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-200">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        {actividad ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                        <span>{actividad ? 'Editar Actividad del Protocolo' : 'Nueva Actividad Técnica'}</span>
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Descripción de la actividad */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Descripción de la Actividad *</label>
                        <textarea
                            required
                            rows={2}
                            value={formData.descripcion_actividad}
                            onChange={handleDescripcionChange}
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs resize-none font-medium leading-relaxed"
                            placeholder="Ej: Inspección de fotocelda, cortina infrarroja y cierre de puertas de cabina..."
                        />
                    </div>

                    {/* Código y Tipo de Actividad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-700">Código Único *</label>
                                {!actividad && (
                                    <button
                                        type="button"
                                        onClick={handleToggleAutoCodigo}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        {isAutoCodigo ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                        <span>{isAutoCodigo ? 'Personalizar' : 'Auto'}</span>
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                required
                                value={formData.codigo_actividad}
                                onChange={(e) => setFormData({ ...formData, codigo_actividad: e.target.value.toUpperCase().trim() })}
                                className={`w-full px-3 py-2 border rounded-xl outline-none text-xs font-mono uppercase transition-colors disabled:bg-slate-100 disabled:text-slate-600 ${
                                    isCodigoDuplicado
                                        ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                                        : 'border-gray-300'
                                }`}
                                placeholder="ACT_001"
                                disabled={Boolean(actividad) || isAutoCodigo}
                            />
                            {isCodigoDuplicado && (
                                <p className="text-[10px] text-rose-600 font-bold mt-1">
                                    ✕ Código en uso. Modifícalo.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Tarea *</label>
                            <EamSelect
                                value={formData.tipo_actividad}
                                onChange={(val) => setFormData({ ...formData, tipo_actividad: val as any })}
                                options={TIPOS_ACTIVIDAD.map(tipo => ({
                                    value: tipo.value,
                                    label: tipo.label,
                                }))}
                                placeholder="Seleccionar tipo de tarea..."
                            />
                        </div>
                    </div>

                    {/* Servicio Vinculado y Sistema Contextual */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Servicio Vinculado *</label>
                            <EamSelect
                                value={formData.id_tipo_servicio ? String(formData.id_tipo_servicio) : ''}
                                onChange={handleServicioChange}
                                options={[
                                    { value: '', label: 'Seleccionar servicio...' },
                                    ...(tiposServicio || []).map((t: any) => ({
                                        value: String(t.id_tipo_servicio || t.idTipoServicio),
                                        label: t.nombre_tipo || t.nombreTipo,
                                        badge: t.codigo_tipo || t.codigoTipo || undefined,
                                    })),
                                ]}
                                placeholder="Seleccionar servicio..."
                                searchable
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-700">Sistema / Subsistema *</label>
                                {arquetiposDelServicio.length > 0 && !arquetiposDelServicio.includes('UNIVERSAL') && (
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                                        Filtro: {arquetiposDelServicio.join(', ')}
                                    </span>
                                )}
                            </div>
                            <EamSelect
                                value={formData.id_sistema ? String(formData.id_sistema) : ''}
                                onChange={(val) => setFormData({ ...formData, id_sistema: val })}
                                options={[
                                    { value: '', label: 'General / Protocolo Universal' },
                                    ...(sistemasFiltrados || []).map((s: any) => ({
                                        value: String(s.id_sistema || s.idSistema),
                                        label: s.nombre_sistema || s.nombreSistema,
                                        badge: s.codigo_sistema || s.codigoSistema || undefined,
                                    })),
                                ]}
                                placeholder="General / Protocolo Universal"
                                searchable
                            />
                        </div>
                    </div>

                    {/* BLOQUE METROLÓGICO PARA MEDICIONES */}
                    {formData.tipo_actividad === 'MEDICION' && (
                        <div className="p-4 bg-gradient-to-br from-cyan-50/70 to-blue-50/50 rounded-2xl border border-cyan-200/80 space-y-3">
                            <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-cyan-700" />
                                <span className="text-xs font-extrabold text-cyan-950 uppercase tracking-wider">
                                    Configuración Metrológica de la Medición (Telemetría)
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-cyan-900 mb-1">Unidad de Medida *</label>
                                    <input
                                        type="text"
                                        value={formData.unidad_medida}
                                        onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                                        placeholder="Ej: mm, m/s, s, PSI"
                                        className="w-full px-3 py-1.5 border border-cyan-300 rounded-xl bg-white text-xs font-bold text-cyan-950 outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    {/* Chips rápidos de unidades */}
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {['mm', 'm/s', 's', 'PSI', 'VAC', '°C'].map(u => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, unidad_medida: u })}
                                                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-100/70 hover:bg-cyan-200 text-cyan-900 font-bold cursor-pointer"
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-cyan-900 mb-1">Valor Mínimo Normal</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.valor_minimo_normal}
                                        onChange={(e) => setFormData({ ...formData, valor_minimo_normal: e.target.value })}
                                        placeholder="Ej: 0"
                                        className="w-full px-3 py-1.5 border border-cyan-300 rounded-xl bg-white text-xs font-medium outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-cyan-900 mb-1">Valor Máximo Normal</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.valor_maximo_normal}
                                        onChange={(e) => setFormData({ ...formData, valor_maximo_normal: e.target.value })}
                                        placeholder="Ej: 5"
                                        className="w-full px-3 py-1.5 border border-cyan-300 rounded-xl bg-white text-xs font-medium outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orden y Tiempo estimado */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                        <div>
                            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Orden de Secuencia</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.orden_ejecucion}
                                onChange={(e) => setFormData({ ...formData, orden_ejecucion: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Tiempo Est. (min)</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.tiempo_estimado_minutos}
                                onChange={(e) => setFormData({ ...formData, tiempo_estimado_minutos: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium"
                                placeholder="15"
                            />
                        </div>
                    </div>

                    {/* Instrucciones y Precauciones */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 text-blue-500" /> Instrucciones para Técnico
                            </label>
                            <textarea
                                rows={2}
                                value={formData.instrucciones}
                                onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs resize-none"
                                placeholder="Paso a paso para el técnico en campo..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Precauciones / HSE
                            </label>
                            <textarea
                                rows={2}
                                value={formData.precauciones}
                                onChange={(e) => setFormData({ ...formData, precauciones: e.target.value })}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs resize-none"
                                placeholder="EPP, bloqueo y etiquetado..."
                            />
                        </div>
                    </div>

                    {/* Checkbox Obligatoria */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50/80 rounded-xl border border-blue-100">
                        <input
                            type="checkbox"
                            id="es_obligatoria"
                            checked={formData.es_obligatoria}
                            onChange={(e) => setFormData({ ...formData, es_obligatoria: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="es_obligatoria" className="text-xs font-bold text-blue-900 cursor-pointer">
                            ¿Es de ejecución obligatoria para dar por cerrada la orden de trabajo?
                        </label>
                    </div>
                </form>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-white text-xs font-bold transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading || isCodigoDuplicado || !formData.descripcion_actividad.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 disabled:opacity-50 cursor-pointer"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span>{actividad ? 'Guardar Cambios' : 'Registrar Actividad'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Modal para importar en lote actividades desde el Banco Universal a un servicio
 */
function ImportarDelBancoModal({ servicio, bancoUniversal = [], actividadesExistentes = [], onClose, onImport }: any) {
    const [busqueda, setBusqueda] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Identificar actividades que ya están en este servicio para deshabilitarlas
    const descripcionesEnServicio = useMemo(() => {
        return new Set(actividadesExistentes.map((a: any) => (a.descripcionActividad || a.descripcion_actividad || '').toLowerCase().trim()));
    }, [actividadesExistentes]);

    const actividadesDisponibles = useMemo(() => {
        return bancoUniversal.filter((item: any) => {
            const matchDesc = !busqueda || item.descripcion.toLowerCase().includes(busqueda.toLowerCase()) || item.codigoBase.toLowerCase().includes(busqueda.toLowerCase());
            return matchDesc;
        });
    }, [bancoUniversal, busqueda]);

    const toggleSelect = (clave: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (next.has(clave)) next.delete(clave);
            else next.add(clave);
            return next;
        });
    };

    const handleConfirm = async () => {
        const seleccionadas = bancoUniversal.filter((item: any) => selectedKeys.has(item.claveCanonica));
        if (seleccionadas.length === 0) return;
        setIsSubmitting(true);
        await onImport(seleccionadas);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-indigo-50/60">
                    <div>
                        <h3 className="text-sm font-black text-indigo-950 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-600" />
                            <span>Importar Actividades del Banco Universal</span>
                        </h3>
                        <p className="text-xs text-indigo-800/80 mt-0.5">
                            Destino: <strong>{servicio?.nombre_tipo || servicio?.nombreTipo}</strong> ({servicio?.codigo_tipo || servicio?.codigoTipo})
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full cursor-pointer">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar en el banco de actividades..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="p-4 overflow-y-auto divide-y divide-gray-100 max-h-[55vh]">
                    {actividadesDisponibles.map((item: any) => {
                        const yaExiste = descripcionesEnServicio.has(item.descripcion.toLowerCase().trim());
                        const isChecked = selectedKeys.has(item.claveCanonica);
                        const Icon = getTipoActividadIcon(item.tipoActividad);

                        return (
                            <div
                                key={item.claveCanonica}
                                onClick={() => !yaExiste && toggleSelect(item.claveCanonica)}
                                className={cn(
                                    "p-3 rounded-xl flex items-center gap-3 transition-colors",
                                    yaExiste
                                        ? "opacity-50 bg-gray-50 cursor-not-allowed"
                                        : isChecked
                                            ? "bg-indigo-50/80 border border-indigo-200 cursor-pointer"
                                            : "hover:bg-gray-50 cursor-pointer"
                                )}
                            >
                                <input
                                    type="checkbox"
                                    disabled={yaExiste}
                                    checked={isChecked}
                                    onChange={() => !yaExiste && toggleSelect(item.claveCanonica)}
                                    className="w-4 h-4 rounded text-indigo-600 border-gray-300"
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold",
                                            getTipoActividadColor(item.tipoActividad)
                                        )}>
                                            <Icon className="h-3 w-3" />
                                            {item.tipoActividad}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400 font-bold">
                                            {item.codigoBase}
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-900 leading-snug">
                                        {item.descripcion}
                                    </p>
                                    <span className="text-[10px] text-gray-500">
                                        Sistema sugerido: <strong>{item.sistemaNombre}</strong>
                                    </span>
                                </div>

                                {yaExiste && (
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                        Ya instalada
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">
                        {selectedKeys.size} actividad(es) seleccionadas
                    </span>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-white cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={selectedKeys.size === 0 || isSubmitting}
                            onClick={handleConfirm}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            <span>Importar a este Servicio</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Modal para asignar una tarea canónica del Banco Universal a otro servicio
 */
function AsignarAServicioModal({ actividad, tiposServicio = [], onClose, onAssign }: any) {
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtrar servicios donde la actividad NO esté ya asignada
    const idsServiciosExistentes = useMemo(() => {
        return new Set(actividad.serviciosAsociados.map((s: any) => s.idTipoServicio));
    }, [actividad]);

    const serviciosDisponibles = useMemo(() => {
        return tiposServicio.filter((t: any) => !idsServiciosExistentes.has(t.id_tipo_servicio || t.idTipoServicio));
    }, [tiposServicio, idsServiciosExistentes]);

    const handleConfirm = async () => {
        if (!selectedServiceId) return;
        setIsSubmitting(true);
        await onAssign(Number(selectedServiceId));
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-indigo-600" />
                        <span>Vincular Actividad a Otro Servicio</span>
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full cursor-pointer">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block mb-0.5">
                            {actividad.codigoBase}
                        </span>
                        <p className="text-xs font-bold text-gray-900">
                            {actividad.descripcion}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            ¿A qué Tipo de Servicio deseas incorporar esta tarea? *
                        </label>
                        <EamSelect
                            value={selectedServiceId}
                            onChange={(val) => setSelectedServiceId(val)}
                            options={[
                                { value: '', label: 'Seleccionar servicio destinatario...' },
                                ...serviciosDisponibles.map((t: any) => ({
                                    value: String(t.id_tipo_servicio || t.idTipoServicio),
                                    label: t.nombre_tipo || t.nombreTipo,
                                    badge: t.codigo_tipo || t.codigoTipo || undefined,
                                })),
                            ]}
                            placeholder="Seleccionar servicio destinatario..."
                            searchable
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-white cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!selectedServiceId || isSubmitting}
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span>Confirmar Vinculación</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ActividadesCatalogoPage() {
    return (
        <Suspense fallback={
            <div className="p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-semibold text-gray-600">Cargando Catálogo de Actividades y Protocolos...</p>
            </div>
        }>
            <ActividadesCatalogoContent />
        </Suspense>
    );
}
