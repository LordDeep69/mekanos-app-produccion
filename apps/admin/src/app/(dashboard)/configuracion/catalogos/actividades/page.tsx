'use client';

import {
    TIPOS_ACTIVIDAD,
    useCatalogoActividades,
    useCreateCatalogoActividad,
    useDeleteCatalogoActividad,
    useTiposServicio,
    useUpdateCatalogoActividad,
} from '@/features/catalogos';
import {
    useCatalogoSistemas,
    useCreateCatalogoSistema,
} from '@/features/catalogos/hooks/use-catalogo-sistemas';
import {
    useCreateParametroMedicion,
    useParametrosMedicion,
    useUpdateParametroMedicion,
} from '@/features/catalogos/hooks/use-parametros-medicion';
import {
    EamSelect,
    generarCodigoActividad,
    generarCodigoSistema,
    useArquetiposEam,
    useBancoMagnitudesEam,
    useUnidadesEam,
    verificarCodigoDuplicado,
} from '@/features/catalogos-eam';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BookOpen,
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
    FolderKanban,
    Gauge,
    Globe,
    Info,
    Layers,
    Link2,
    ListChecks,
    Loader2,
    Lock,
    Plus,
    Ruler,
    Search,
    Settings2,
    Sparkles,
    Trash2,
    Unlock,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Helper para color de tipo de actividad
function getTipoActividadColor(tipo: string) {
    return TIPOS_ACTIVIDAD.find(t => t.value === tipo)?.color || 'bg-gray-100 text-gray-800';
}

// Helper para obtener el icono del tipo de actividad
function getTipoActividadIcon(tipo: string) {
    const iconMap: Record<string, any> = {
        INSPECCION: CheckCircle2,
        MEDICION: Gauge,
        LIMPIEZA: Sparkles,
        LUBRICACION: Zap,
        AJUSTE: Settings2,
        CAMBIO: Wrench,
        PRUEBA: Activity,
        VERIFICACION: ClipboardCheck,
    };
    return iconMap[tipo] || ClipboardCheck;
}

// Colores para tipos de servicio
const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    GEN_PREV_A: { bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-800', accent: 'bg-emerald-500' },
    GEN_PREV_B: { bg: 'bg-teal-50/70', border: 'border-teal-200', text: 'text-teal-800', accent: 'bg-teal-500' },
    BOM_PREV_A: { bg: 'bg-blue-50/70', border: 'border-blue-200', text: 'text-blue-800', accent: 'bg-blue-500' },
    BOM_PREV_B: { bg: 'bg-indigo-50/70', border: 'border-indigo-200', text: 'text-indigo-800', accent: 'bg-indigo-500' },
    GEN_CORR: { bg: 'bg-orange-50/70', border: 'border-orange-200', text: 'text-orange-800', accent: 'bg-orange-500' },
    BOM_CORR: { bg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-800', accent: 'bg-amber-500' },
    EMERGENCIA: { bg: 'bg-red-50/70', border: 'border-red-200', text: 'text-red-800', accent: 'bg-red-500' },
    ELEV_PREV_A: { bg: 'bg-violet-50/70', border: 'border-violet-200', text: 'text-violet-900', accent: 'bg-violet-600' },
    HVAC_PREV_A: { bg: 'bg-sky-50/70', border: 'border-sky-200', text: 'text-sky-900', accent: 'bg-sky-500' },
    COMP_PREV_A: { bg: 'bg-cyan-50/70', border: 'border-cyan-200', text: 'text-cyan-900', accent: 'bg-cyan-600' },
};

const DEFAULT_COLOR = { bg: 'bg-slate-50/80', border: 'border-slate-200', text: 'text-slate-800', accent: 'bg-blue-600' };

/**
 * Resuelve los arquetipos de equipo a los que aplica un Tipo de Servicio o un Subsistema
 */
function resolverArquetiposDeEntidad(
    entidad: any,
    arquetipos: any[]
): Array<{ codigo: string; nombre: string; id_tipo_equipo?: number }> {
    if (!entidad) return [];
    const rawCodes = new Set<string>();
    const rawAplica = entidad.aplica_a || entidad.aplicaA;
    if (Array.isArray(rawAplica) && rawAplica.length > 0) {
        for (const c of rawAplica) {
            if (c && String(c).trim()) {
                const upper = String(c).trim().toUpperCase();
                if (upper !== 'AMBOS' && upper !== 'OTRO' && upper !== 'GENERAL' && upper !== 'UNIVERSAL' && upper !== 'TODOS') {
                    rawCodes.add(upper);
                } else if (upper === 'AMBOS') {
                    rawCodes.add('GEN');
                    rawCodes.add('BOM');
                }
            }
        }
    }
    if (entidad.tipos_equipo?.codigo_tipo) {
        rawCodes.add(String(entidad.tipos_equipo.codigo_tipo).trim().toUpperCase());
    }

    const idTipoEquipo = entidad.id_tipo_equipo ?? entidad.idTipoEquipo ?? entidad.tipos_equipo?.id_tipo_equipo;
    if (rawCodes.size === 0 && !idTipoEquipo) {
        return [];
    }

    const matchedMap = new Map<string, { codigo: string; nombre: string; id_tipo_equipo?: number }>();

    for (const code of Array.from(rawCodes)) {
        const arq = (arquetipos || []).find((a: any) => {
            const cCorto = String(a.codigo_corto || '').toUpperCase().trim();
            const cTipo = String(a.codigo_tipo || '').toUpperCase().trim();
            const syncs: string[] = Array.isArray(a.codigos_sincronizados)
                ? a.codigos_sincronizados.map((s: string) => String(s).toUpperCase().trim())
                : [];
            if (cCorto === code || cTipo === code || syncs.includes(code)) return true;
            if ((code === 'GEN' || code === 'GENERADOR') && (cTipo === 'GEN' || cTipo === 'GENERADOR')) return true;
            if ((code === 'BOM' || code === 'BOMBA') && (cTipo === 'BOM' || cTipo === 'BOMBA')) return true;
            if ((code === 'MOT' || code === 'MOTOR') && (cTipo === 'MOT' || cTipo === 'MOTOR')) return true;
            if ((code === 'COMP' || code === 'COMPRESOR') && (cTipo === 'COMP' || cTipo === 'COMPRESOR')) return true;
            return false;
        });

        if (arq) {
            const key = String(arq.codigo_corto || arq.codigo_tipo).toUpperCase().trim();
            if (!matchedMap.has(key)) {
                matchedMap.set(key, {
                    codigo: key,
                    nombre: arq.nombre_canonico || arq.nombre_tipo || key,
                    id_tipo_equipo: arq.id_tipo_equipo,
                });
            }
        } else {
            const canonKey =
                code === 'GENERADOR' ? 'GEN' :
                code === 'BOMBA' ? 'BOM' :
                code === 'MOTOR' ? 'MOT' :
                code === 'COMPRESOR' ? 'COMP' : code;
            if (!matchedMap.has(canonKey)) {
                matchedMap.set(canonKey, {
                    codigo: canonKey,
                    nombre: entidad.tipos_equipo?.nombre_tipo || canonKey,
                    id_tipo_equipo: idTipoEquipo ?? undefined,
                });
            }
        }
    }

    if (matchedMap.size === 0 && idTipoEquipo) {
        const arqById = (arquetipos || []).find(
            (a: any) =>
                Number(a.id_tipo_equipo) === Number(idTipoEquipo) ||
                (Array.isArray(a.ids_sincronizados) && a.ids_sincronizados.includes(Number(idTipoEquipo)))
        );
        if (arqById) {
            const key = String(arqById.codigo_corto || arqById.codigo_tipo).toUpperCase().trim();
            matchedMap.set(key, {
                codigo: key,
                nombre: arqById.nombre_canonico || arqById.nombre_tipo || key,
                id_tipo_equipo: arqById.id_tipo_equipo,
            });
        }
    }

    return Array.from(matchedMap.values());
}

/**
 * Verifica si un subsistema (`catalogo_sistemas`) es compatible con los arquetipos indicados
 */
function esSistemaCompatibleConArquetipos(
    sistema: any,
    codigosArquetipoServicio: string[],
    arquetipos: any[]
): boolean {
    if (!codigosArquetipoServicio || codigosArquetipoServicio.length === 0) {
        // Si el servicio es Universal, todos los sistemas están disponibles
        return true;
    }
    const rawAplica = sistema?.aplica_a || sistema?.aplicaA;
    if (!rawAplica || (Array.isArray(rawAplica) && rawAplica.length === 0)) {
        // Sistema sin restricción explícita -> Universal
        return true;
    }
    const aplicaArr = (Array.isArray(rawAplica) ? rawAplica : [rawAplica]).map((s: any) =>
        String(s || '').trim().toUpperCase()
    );
    if (aplicaArr.includes('OTRO') || aplicaArr.includes('GENERAL') || aplicaArr.includes('UNIVERSAL') || aplicaArr.includes('TODOS')) {
        // Verificar que no sea un sistema específico de otro equipo disfrazado
        const arqsSistema = resolverArquetiposDeEntidad(sistema, arquetipos);
        if (arqsSistema.length === 0) return true;
    }
    const arqsSistema = resolverArquetiposDeEntidad(sistema, arquetipos);
    if (arqsSistema.length === 0) return true;
    return arqsSistema.some(arqSis => codigosArquetipoServicio.includes(arqSis.codigo));
}

export interface PlantillaUniversalActividad {
    key: string;
    descripcionActividad: string;
    tipoActividad: string;
    esObligatoria: boolean;
    tiempoEstimadoMinutos?: number | null;
    instrucciones?: string | null;
    precauciones?: string | null;
    idSistema?: number | null;
    sistemaNombre: string;
    sistemaCodigo?: string;
    idParametroMedicion?: number | null;
    parametroInfo?: {
        id: number;
        nombre: string;
        codigo: string;
        unidad: string;
        min?: number | null;
        max?: number | null;
    } | null;
    instancias: any[];
    serviciosIds: Set<number>;
    serviciosInfo: Array<{
        idTipoServicio: number;
        codigoTipo: string;
        nombreTipo: string;
        idActividadCatalogo: number;
    }>;
    arquetipos: Array<{ codigo: string; nombre: string }>;
}

export default function ActividadesCatalogoPage() {
    const [vistaActiva, setVistaActiva] = useState<'checklists' | 'banco'>('checklists');
    const [busqueda, setBusqueda] = useState('');
    const [filtroArquetipo, setFiltroArquetipo] = useState<string>('');
    const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');
    const [filtroSistema, setFiltroSistema] = useState<string>('');
    const [filtroTipoActividad, setFiltroTipoActividad] = useState<string>('');
    const [filtroEstadoChecklist, setFiltroEstadoChecklist] = useState<'TODOS' | 'PENDIENTES' | 'CONFIGURADOS'>('TODOS');

    // Estado para crear/editar actividad individual o multi-servicio
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActividad, setEditingActividad] = useState<any>(null);
    const [preselectedServiceId, setPreselectedServiceId] = useState<number | null>(null);

    // Estado para Reutilizar desde el Banco Universal hacia un Servicio o desde una Plantilla hacia N Servicios
    const [reutilizarTargetService, setReutilizarTargetService] = useState<any | null>(null);
    const [plantillaAVincular, setPlantillaAVincular] = useState<PlantillaUniversalActividad | null>(null);

    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
    const [reorderingId, setReorderingId] = useState<number | null>(null);

    const { data: response, isLoading, isError, refetch } = useCatalogoActividades({ activo: true, limit: 500 });
    const actividades = response?.data || [];

    const { data: tiposServicioResponse, isLoading: isLoadingServicios } = useTiposServicio({ activo: true, limit: 100 });
    const tiposServicio = tiposServicioResponse?.data || [];

    const { data: sistemasResponse } = useCatalogoSistemas({ activo: true, limit: 200 });
    const sistemas = sistemasResponse?.data || [];

    const { data: parametrosResponse } = useParametrosMedicion({ activo: true, limit: 200 });
    const parametros = parametrosResponse?.data || [];

    const { data: arquetipos = [] } = useArquetiposEam();

    const crearActividad = useCreateCatalogoActividad();
    const actualizarActividad = useUpdateCatalogoActividad();
    const eliminarActividad = useDeleteCatalogoActividad();

    // Mapa rápido de parámetros por ID
    const parametrosMap = useMemo(() => {
        const map = new Map<number, any>();
        for (const p of parametros) {
            const id = Number(p.id_parametro_medicion || (p as any).idParametroMedicion);
            if (id) map.set(id, p);
        }
        return map;
    }, [parametros]);

    // Leer ?servicioId=... o ?vista=... de la URL al montar
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const srvId = params.get('servicioId');
        const vista = params.get('vista');
        const openNew = params.get('nueva');
        if (vista === 'banco') {
            setVistaActiva('banco');
        }
        if (srvId) {
            setFiltroTipoServicio(srvId);
            setExpandedServices(new Set([srvId]));
            if (openNew === '1') {
                setPreselectedServiceId(Number(srvId));
                setEditingActividad(null);
                setIsModalOpen(true);
            }
        }
    }, []);

    // Auto-expandir servicios nuevos con 0 actividades para que nunca pasen desapercibidos
    useEffect(() => {
        if (tiposServicio.length > 0 && actividades.length > 0 && expandedServices.size === 0) {
            const counts = new Map<number, number>();
            actividades.forEach(a => {
                const sid = Number(a.idTipoServicio || a.id_tipo_servicio);
                if (sid) counts.set(sid, (counts.get(sid) || 0) + 1);
            });
            const zeroActServices = tiposServicio
                .filter(t => t.tiene_checklist !== false && (counts.get(t.id_tipo_servicio) || 0) === 0)
                .map(t => String(t.id_tipo_servicio));
            if (zeroActServices.length > 0) {
                setExpandedServices(new Set(zeroActServices));
            }
        }
    }, [tiposServicio, actividades]);

    // Helper para obtener info metrológica enriquecida de una actividad
    const obtenerInfoParametro = (act: any) => {
        const idParam = Number(act.idParametroMedicion || act.id_parametro_medicion || 0);
        const rel = act.parametroMedicion || act.parametros_medicion || (idParam ? parametrosMap.get(idParam) : null);
        if (!rel) return null;
        return {
            id: Number(rel.idParametroMedicion || rel.id_parametro_medicion || idParam),
            nombre: rel.nombreParametro || rel.nombre_parametro || '',
            codigo: rel.codigoParametro || rel.codigo_parametro || '',
            unidad: rel.unidadMedida || rel.unidad_medida || '',
            min: rel.valorMinimoNormal ?? rel.valor_minimo_normal ?? null,
            max: rel.valorMaximoNormal ?? rel.valor_maximo_normal ?? null,
        };
    };

    // =========================================================================
    // CONSTRUCCIÓN DE VISTA 1: CHECKLISTS POR TIPO DE SERVICIO (INCLUYE 0 ACT)
    // =========================================================================
    const groupedByService = useMemo(() => {
        const groups: Record<
            string,
            {
                servicio: any;
                arquetipos: Array<{ codigo: string; nombre: string; id_tipo_equipo?: number }>;
                actividades: any[];
                bySystem: Record<string, { sistemaNombre: string; sistemaId: number | null; acts: any[] }>;
            }
        > = {};

        // 1. Sembrar TODOS los tipos de servicio activos (o que requieren checklist)
        tiposServicio.forEach((srv: any) => {
            const idStr = String(srv.id_tipo_servicio || srv.idTipoServicio);
            const arqs = resolverArquetiposDeEntidad(srv, arquetipos);
            groups[idStr] = {
                servicio: srv,
                arquetipos: arqs,
                actividades: [],
                bySystem: {},
            };
        });

        // 2. Poblar con las actividades del catálogo
        actividades.forEach(act => {
            const tipoServId = String(act.idTipoServicio || act.id_tipo_servicio || 'sin_servicio');
            const servicioRel: any = act.tipoServicio || act.tipos_servicio;

            if (!groups[tipoServId]) {
                groups[tipoServId] = {
                    servicio: servicioRel || {
                        id_tipo_servicio: Number(tipoServId) || 0,
                        codigo_tipo: servicioRel?.codigoTipoServicio || servicioRel?.codigo_tipo || 'SIN_SERVICIO',
                        nombre_tipo: servicioRel?.nombreTipoServicio || servicioRel?.nombre_tipo || 'Sin Servicio Asignado',
                        tiene_checklist: true,
                    },
                    arquetipos: resolverArquetiposDeEntidad(servicioRel, arquetipos),
                    actividades: [],
                    bySystem: {},
                };
            }

            // Verificar filtros a nivel de actividad
            const desc = (act.descripcionActividad || act.descripcion_actividad || '').toLowerCase();
            const code = (act.codigoActividad || act.codigo_actividad || '').toLowerCase();
            const matchBusquedaAct = !busqueda || desc.includes(busqueda.toLowerCase()) || code.includes(busqueda.toLowerCase());

            const sistemaId = act.idSistema ?? act.id_sistema ?? null;
            const matchSistema = !filtroSistema || String(sistemaId || '') === filtroSistema;

            const tipoAct = act.tipoActividad || act.tipo_actividad;
            const matchTipoAct = !filtroTipoActividad || tipoAct === filtroTipoActividad;

            if (matchBusquedaAct && matchSistema && matchTipoAct) {
                groups[tipoServId].actividades.push(act);

                // Consolidar por nombre normalizado de sistema (evita dos bloques "General (2)" y "General (5)")
                const rawSistemaNombre =
                    act.sistema?.nombreSistema ||
                    act.catalogo_sistemas?.nombre_sistema ||
                    (sistemaId ? sistemas.find((s: any) => Number(s.id_sistema) === Number(sistemaId))?.nombre_sistema : null) ||
                    'General';
                const sistemaKey = rawSistemaNombre.trim().toUpperCase();

                if (!groups[tipoServId].bySystem[sistemaKey]) {
                    groups[tipoServId].bySystem[sistemaKey] = {
                        sistemaNombre: rawSistemaNombre.trim(),
                        sistemaId: sistemaId ? Number(sistemaId) : null,
                        acts: [],
                    };
                }
                groups[tipoServId].bySystem[sistemaKey].acts.push({
                    ...act,
                    sistemaNombre: rawSistemaNombre.trim(),
                    parametroInfo: obtenerInfoParametro(act),
                });
            }
        });

        // 3. Ordenar actividades dentro de cada servicio y subsistema
        Object.values(groups).forEach(group => {
            group.actividades.sort(
                (a, b) =>
                    (a.ordenEjecucion || a.orden_ejecucion || 0) - (b.ordenEjecucion || b.orden_ejecucion || 0) ||
                    (a.idActividadCatalogo || a.id_actividad_catalogo || 0) - (b.idActividadCatalogo || b.id_actividad_catalogo || 0)
            );
            Object.values(group.bySystem).forEach(sysGroup => {
                sysGroup.acts.sort(
                    (a, b) =>
                        (a.ordenEjecucion || a.orden_ejecucion || 0) - (b.ordenEjecucion || b.orden_ejecucion || 0) ||
                        (a.idActividadCatalogo || a.id_actividad_catalogo || 0) - (b.idActividadCatalogo || b.id_actividad_catalogo || 0)
                );
            });
        });

        return groups;
    }, [tiposServicio, actividades, arquetipos, busqueda, filtroSistema, filtroTipoActividad, sistemas, parametrosMap]);

    // Filtrar y ordenar la lista de tarjetas de Tipo de Servicio
    const serviceEntriesFiltrados = useMemo(() => {
        const entries = Object.entries(groupedByService).filter(([serviceId, group]) => {
            const srv = group.servicio;
            // Si no tiene checklist y tiene 0 actividades, solo mostrarlo si el usuario lo filtra explícitamente
            if (srv?.tiene_checklist === false && group.actividades.length === 0 && filtroTipoServicio !== serviceId) {
                return false;
            }

            if (filtroTipoServicio && serviceId !== filtroTipoServicio) {
                return false;
            }

            if (filtroArquetipo) {
                if (filtroArquetipo === 'UNIVERSAL') {
                    if (group.arquetipos.length > 0) return false;
                } else {
                    if (!group.arquetipos.some(a => a.codigo === filtroArquetipo)) return false;
                }
            }

            if (filtroEstadoChecklist === 'PENDIENTES' && group.actividades.length > 0) return false;
            if (filtroEstadoChecklist === 'CONFIGURADOS' && group.actividades.length === 0) return false;

            // Si hay filtros de actividad o búsqueda activa:
            const srvNombre = (srv?.nombre_tipo || srv?.nombreTipoServicio || '').toLowerCase();
            const srvCodigo = (srv?.codigo_tipo || srv?.codigoTipoServicio || '').toLowerCase();
            const srvMatchesSearch =
                !busqueda ||
                srvNombre.includes(busqueda.toLowerCase()) ||
                srvCodigo.includes(busqueda.toLowerCase());

            if ((filtroSistema || filtroTipoActividad) && group.actividades.length === 0) {
                return false;
            }
            if (busqueda && group.actividades.length === 0 && !srvMatchesSearch) {
                return false;
            }

            return true;
        });

        // Ordenar: Primero servicios con 0 actividades (para que el usuario vea inmediatamente los nuevos por configurar), luego por nombre
        entries.sort(([, a], [, b]) => {
            const aEmpty = a.actividades.length === 0 ? 0 : 1;
            const bEmpty = b.actividades.length === 0 ? 0 : 1;
            if (aEmpty !== bEmpty) return aEmpty - bEmpty;
            const nomA = a.servicio?.nombre_tipo || a.servicio?.nombreTipoServicio || '';
            const nomB = b.servicio?.nombre_tipo || b.servicio?.nombreTipoServicio || '';
            return nomA.localeCompare(nomB);
        });

        return entries;
    }, [groupedByService, filtroTipoServicio, filtroArquetipo, filtroEstadoChecklist, busqueda, filtroSistema, filtroTipoActividad]);

    // =========================================================================
    // CONSTRUCCIÓN DE VISTA 2: BANCO UNIVERSAL DE ACTIVIDADES (DEDUPLICADO)
    // =========================================================================
    const plantillasUniversales = useMemo<PlantillaUniversalActividad[]>(() => {
        const map = new Map<string, PlantillaUniversalActividad>();

        actividades.forEach(act => {
            const desc = (act.descripcionActividad || act.descripcion_actividad || '').trim();
            if (!desc) return;
            const tipo = act.tipoActividad || act.tipo_actividad || 'INSPECCION';
            const normKey = `${desc.toUpperCase()}|${tipo}`;

            const idServ = Number(act.idTipoServicio || act.id_tipo_servicio || 0);
            const srvCompleta: any =
                tiposServicio.find((t: any) => Number(t.id_tipo_servicio) === idServ) ||
                act.tipoServicio ||
                act.tipos_servicio;

            const sistemaId = act.idSistema ?? act.id_sistema ?? null;
            const sistemaObj: any =
                (sistemaId ? sistemas.find((s: any) => Number(s.id_sistema) === Number(sistemaId)) : null) ||
                act.sistema ||
                act.catalogo_sistemas;
            const sistemaNombre =
                sistemaObj?.nombre_sistema || sistemaObj?.nombreSistema || 'General';
            const sistemaCodigo =
                sistemaObj?.codigo_sistema || sistemaObj?.codigoSistema || undefined;

            const paramInfo = obtenerInfoParametro(act);

            if (!map.has(normKey)) {
                map.set(normKey, {
                    key: normKey,
                    descripcionActividad: desc,
                    tipoActividad: tipo,
                    esObligatoria: Boolean(act.esObligatoria ?? act.es_obligatoria ?? true),
                    tiempoEstimadoMinutos: act.tiempoEstimadoMinutos ?? act.tiempo_estimado_minutos ?? null,
                    instrucciones: act.instrucciones ?? null,
                    precauciones: act.precauciones ?? null,
                    idSistema: sistemaId ? Number(sistemaId) : null,
                    sistemaNombre,
                    sistemaCodigo,
                    idParametroMedicion: paramInfo?.id ?? null,
                    parametroInfo: paramInfo,
                    instancias: [],
                    serviciosIds: new Set<number>(),
                    serviciosInfo: [],
                    arquetipos: [],
                });
            }

            const entry = map.get(normKey)!;
            entry.instancias.push(act);
            if (!entry.parametroInfo && paramInfo) {
                entry.parametroInfo = paramInfo;
                entry.idParametroMedicion = paramInfo.id;
            }
            if (!entry.idSistema && sistemaId) {
                entry.idSistema = Number(sistemaId);
                entry.sistemaNombre = sistemaNombre;
                entry.sistemaCodigo = sistemaCodigo;
            }

            if (idServ && !entry.serviciosIds.has(idServ)) {
                entry.serviciosIds.add(idServ);
                entry.serviciosInfo.push({
                    idTipoServicio: idServ,
                    codigoTipo: srvCompleta?.codigo_tipo || srvCompleta?.codigoTipoServicio || `SRV_${idServ}`,
                    nombreTipo: srvCompleta?.nombre_tipo || srvCompleta?.nombreTipoServicio || `Servicio #${idServ}`,
                    idActividadCatalogo: Number(act.idActividadCatalogo || act.id_actividad_catalogo),
                });
            }

            const arqsDeSrv = resolverArquetiposDeEntidad(srvCompleta, arquetipos);
            const arqsDeSis = resolverArquetiposDeEntidad(sistemaObj, arquetipos);
            for (const a of [...arqsDeSrv, ...arqsDeSis]) {
                if (!entry.arquetipos.some(existing => existing.codigo === a.codigo)) {
                    entry.arquetipos.push({ codigo: a.codigo, nombre: a.nombre });
                }
            }
        });

        return Array.from(map.values()).sort((a, b) =>
            a.descripcionActividad.localeCompare(b.descripcionActividad)
        );
    }, [actividades, tiposServicio, sistemas, arquetipos, parametrosMap]);

    const plantillasFiltradas = useMemo(() => {
        return plantillasUniversales.filter(p => {
            const term = busqueda.toLowerCase().trim();
            const matchSearch =
                !term ||
                p.descripcionActividad.toLowerCase().includes(term) ||
                p.sistemaNombre.toLowerCase().includes(term) ||
                (p.parametroInfo?.unidad || '').toLowerCase().includes(term) ||
                p.serviciosInfo.some(s => s.codigoTipo.toLowerCase().includes(term) || s.nombreTipo.toLowerCase().includes(term));

            const matchTipo = !filtroTipoActividad || p.tipoActividad === filtroTipoActividad;
            const matchSis = !filtroSistema || String(p.idSistema || '') === filtroSistema;
            const matchSrv = !filtroTipoServicio || p.serviciosIds.has(Number(filtroTipoServicio));

            let matchArq = true;
            if (filtroArquetipo === 'UNIVERSAL') {
                matchArq = p.arquetipos.length === 0;
            } else if (filtroArquetipo) {
                matchArq = p.arquetipos.some(a => a.codigo === filtroArquetipo);
            }

            return matchSearch && matchTipo && matchSis && matchSrv && matchArq;
        });
    }, [plantillasUniversales, busqueda, filtroTipoActividad, filtroSistema, filtroTipoServicio, filtroArquetipo]);

    // Métricas Globales
    const metricas = useMemo(() => {
        const total = actividades.length;
        const obligatorias = actividades.filter(a => a.esObligatoria ?? a.es_obligatoria).length;
        const mediciones = actividades.filter(a => (a.tipoActividad || a.tipo_actividad) === 'MEDICION').length;

        const todosServiciosChecklist = Object.values(groupedByService).filter(
            g => g.servicio?.tiene_checklist !== false || g.actividades.length > 0
        );
        const serviciosConfigurados = todosServiciosChecklist.filter(g => g.actividades.length > 0).length;
        const serviciosPendientes = todosServiciosChecklist.filter(g => g.actividades.length === 0).length;

        const porTipo: Record<string, number> = {};
        actividades.forEach(a => {
            const tipo = a.tipoActividad || a.tipo_actividad || 'OTRO';
            porTipo[tipo] = (porTipo[tipo] || 0) + 1;
        });

        return {
            total,
            obligatorias,
            mediciones,
            totalServiciosChecklist: todosServiciosChecklist.length,
            serviciosConfigurados,
            serviciosPendientes,
            totalBancoUniversal: plantillasUniversales.length,
            porTipo,
        };
    }, [actividades, groupedByService, plantillasUniversales]);

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
        setExpandedServices(new Set(serviceEntriesFiltrados.map(([id]) => id)));
    };

    const collapseAll = () => {
        setExpandedServices(new Set());
    };

    const handleOpenNewForService = (serviceId?: number | null) => {
        setEditingActividad(null);
        setPreselectedServiceId(serviceId ?? null);
        setIsModalOpen(true);
    };

    const handleEdit = (actividad: any) => {
        setEditingActividad(actividad);
        setPreselectedServiceId(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar esta actividad del protocolo?')) {
            await eliminarActividad.mutateAsync(id);
        }
    };

    // Reordenamiento ↑ / ↓ en 1 clic
    const handleMoveActivity = async (act: any, direction: 'up' | 'down', listInBlock: any[]) => {
        const currentIndex = listInBlock.findIndex(
            item =>
                (item.idActividadCatalogo || item.id_actividad_catalogo) ===
                (act.idActividadCatalogo || act.id_actividad_catalogo)
        );
        if (currentIndex === -1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= listInBlock.length) return;

        const currentAct = listInBlock[currentIndex];
        const neighborAct = listInBlock[targetIndex];
        const currentId = Number(currentAct.idActividadCatalogo || currentAct.id_actividad_catalogo);
        const neighborId = Number(neighborAct.idActividadCatalogo || neighborAct.id_actividad_catalogo);

        let orderCurrent = Number(currentAct.ordenEjecucion || currentAct.orden_ejecucion || currentIndex + 1);
        let orderNeighbor = Number(neighborAct.ordenEjecucion || neighborAct.orden_ejecucion || targetIndex + 1);

        // Si tenían el mismo número de orden por datos heredados, normalizarlos
        if (orderCurrent === orderNeighbor) {
            orderCurrent = direction === 'up' ? Math.max(1, orderNeighbor - 1) : orderNeighbor + 1;
        }

        setReorderingId(currentId);
        try {
            await Promise.all([
                actualizarActividad.mutateAsync({
                    id: currentId,
                    data: { ordenEjecucion: orderNeighbor },
                }),
                actualizarActividad.mutateAsync({
                    id: neighborId,
                    data: { ordenEjecucion: orderCurrent },
                }),
            ]);
        } finally {
            setReorderingId(null);
        }
    };

    const clearFilters = () => {
        setBusqueda('');
        setFiltroArquetipo('');
        setFiltroTipoServicio('');
        setFiltroSistema('');
        setFiltroTipoActividad('');
        setFiltroEstadoChecklist('TODOS');
    };

    const hasActiveFilters =
        Boolean(busqueda || filtroArquetipo || filtroTipoServicio || filtroSistema || filtroTipoActividad) ||
        filtroEstadoChecklist !== 'TODOS';

    return (
        <div className="space-y-6">
            {/* Header Ejecutivo Dual */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/20">
                                <ListChecks className="h-7 w-7 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2.5">
                                    Catálogo Universal de Actividades y Protocolos
                                </h1>
                                <p className="text-slate-400 mt-1 text-sm">
                                    Banco maestro reutilizable de tareas técnicas, mediciones con UoM y constructor de checklists por Tipo de Servicio
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => handleOpenNewForService(filtroTipoServicio ? Number(filtroTipoServicio) : null)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
                        >
                            <Plus className="h-5 w-5" />
                            Nueva Actividad / Medición
                        </button>
                    </div>
                </div>

                {/* Métricas Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <BookOpen className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{metricas.totalBancoUniversal}</p>
                                <p className="text-xs text-slate-400">Actividades Únicas (Banco Universal)</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <ClipboardList className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{metricas.total}</p>
                                <p className="text-xs text-slate-400">Asignaciones en Checklists</p>
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
                                <p className="text-xs text-slate-400">Puntos de Medición Metrológica</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <Cog className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold">{metricas.totalServiciosChecklist}</p>
                                    {metricas.serviciosPendientes > 0 && (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                            {metricas.serviciosPendientes} por armar
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">Tipos de Servicio con Checklist</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conmutador Principal de 2 Vistas */}
                <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="inline-flex p-1 bg-slate-950/60 rounded-xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => setVistaActiva('checklists')}
                            className={cn(
                                'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
                                vistaActiva === 'checklists'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <FolderKanban className="h-4 w-4" />
                            <span>1. Checklists por Tipo de Servicio</span>
                            <span
                                className={cn(
                                    'px-2 py-0.5 rounded-md text-xs font-mono',
                                    vistaActiva === 'checklists' ? 'bg-blue-700 text-blue-100' : 'bg-white/10 text-slate-300'
                                )}
                            >
                                {metricas.totalServiciosChecklist}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setVistaActiva('banco')}
                            className={cn(
                                'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer',
                                vistaActiva === 'banco'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <BookOpen className="h-4 w-4" />
                            <span>2. Banco Universal de Actividades (Catálogo Maestro)</span>
                            <span
                                className={cn(
                                    'px-2 py-0.5 rounded-md text-xs font-mono',
                                    vistaActiva === 'banco' ? 'bg-indigo-700 text-indigo-100' : 'bg-white/10 text-slate-300'
                                )}
                            >
                                {metricas.totalBancoUniversal}
                            </span>
                        </button>
                    </div>

                    {vistaActiva === 'checklists' && metricas.serviciosPendientes > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setFiltroEstadoChecklist(prev => (prev === 'PENDIENTES' ? 'TODOS' : 'PENDIENTES'))
                                }
                                className={cn(
                                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                                    filtroEstadoChecklist === 'PENDIENTES'
                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                                        : 'bg-amber-500/15 text-amber-300 border-amber-400/30 hover:bg-amber-500/25'
                                )}
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>
                                    {filtroEstadoChecklist === 'PENDIENTES'
                                        ? `Mostrando solo pendientes (${metricas.serviciosPendientes}) · Ver todos`
                                        : `${metricas.serviciosPendientes} servicio(s) nuevo(s) con 0 actividades listos para configurar`}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filtros Contextuales Inteligentes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-700">
                            Filtros de Gobernanza {vistaActiva === 'banco' ? '(Banco Universal)' : '(Checklists por Servicio)'}
                        </span>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                        >
                            Limpiar todos los filtros
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar actividad, servicio, unidad..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50"
                        />
                    </div>
                    <EamSelect
                        value={filtroArquetipo}
                        onChange={val => setFiltroArquetipo(val)}
                        options={[
                            { value: '', label: 'Todos los Tipos de Equipo' },
                            { value: 'UNIVERSAL', label: '🌐 Universal (Todos los Equipos)', badge: 'GLOBAL' },
                            ...arquetipos.map((a: any) => {
                                const cod = String(a.codigo_corto || a.codigo_tipo).toUpperCase().trim();
                                return {
                                    value: cod,
                                    label: `${a.nombre_canonico || a.nombre_tipo} (${cod})`,
                                    badge: cod,
                                };
                            }),
                        ]}
                        placeholder="Tipo de Equipo..."
                        searchable
                    />
                    <EamSelect
                        value={filtroTipoServicio}
                        onChange={val => setFiltroTipoServicio(val)}
                        options={[
                            { value: '', label: 'Todos los Tipos de Servicio' },
                            ...tiposServicio.map((t: any) => ({
                                value: String(t.id_tipo_servicio || t.idTipoServicio),
                                label: t.nombre_tipo || t.nombreTipo,
                                badge: t.codigo_tipo || undefined,
                            })),
                        ]}
                        placeholder="Todos los servicios"
                        searchable
                    />
                    <EamSelect
                        value={filtroSistema}
                        onChange={val => setFiltroSistema(val)}
                        options={[
                            { value: '', label: 'Todos los Subsistemas' },
                            ...sistemas.map((s: any) => ({
                                value: String(s.id_sistema || s.idSistema),
                                label: s.nombre_sistema || s.nombreSistema,
                                badge: s.codigo_sistema || undefined,
                            })),
                        ]}
                        placeholder="Todos los subsistemas"
                        searchable
                    />
                    <EamSelect
                        value={filtroTipoActividad}
                        onChange={val => setFiltroTipoActividad(val)}
                        options={[
                            { value: '', label: 'Todos los Tipos de Tarea' },
                            ...TIPOS_ACTIVIDAD.map(tipo => ({
                                value: tipo.value,
                                label: tipo.label,
                            })),
                        ]}
                        placeholder="Todos los tipos"
                    />
                </div>
            </div>

            {/* =========================================================================
                CONTENIDO PRINCIPAL SEGÚN PESTAÑA ACTIVA
               ========================================================================= */}
            {isLoading || isLoadingServicios ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                    <p className="text-gray-500 font-medium">Cargando protocolos y banco universal de actividades...</p>
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-200">
                    <AlertCircle className="h-14 w-14 text-red-400 mb-4" />
                    <p className="font-bold text-lg text-red-600">Error al cargar el catálogo</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-5 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            ) : vistaActiva === 'checklists' ? (
                /* ═══════════════════════════════════════════════════════════════════════
                   VISTA 1: CHECKLISTS POR TIPO DE SERVICIO
                   ═══════════════════════════════════════════════════════════════════════ */
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-600">
                                Mostrando <span className="font-bold text-gray-900">{serviceEntriesFiltrados.length}</span> tipos de servicio
                            </span>
                            <div className="flex items-center gap-1.5 ml-2">
                                <button
                                    type="button"
                                    onClick={() => setFiltroEstadoChecklist('TODOS')}
                                    className={cn(
                                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                                        filtroEstadoChecklist === 'TODOS'
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    Todos ({metricas.totalServiciosChecklist})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFiltroEstadoChecklist('PENDIENTES')}
                                    className={cn(
                                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                                        filtroEstadoChecklist === 'PENDIENTES'
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                    )}
                                >
                                    ⚡ Sin Actividades ({metricas.serviciosPendientes})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFiltroEstadoChecklist('CONFIGURADOS')}
                                    className={cn(
                                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                                        filtroEstadoChecklist === 'CONFIGURADOS'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                    )}
                                >
                                    ✓ Configurados ({metricas.serviciosConfigurados})
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={expandAll}
                                className="text-xs font-semibold px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                                Expandir todo
                            </button>
                            <button
                                onClick={collapseAll}
                                className="text-xs font-semibold px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                                Colapsar todo
                            </button>
                        </div>
                    </div>

                    {serviceEntriesFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
                            <ListChecks className="h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-lg font-semibold text-gray-600">No hay servicios que coincidan con el filtro</p>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-bold cursor-pointer"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {serviceEntriesFiltrados.map(([serviceId, group]) => {
                                const isExpanded = expandedServices.has(serviceId);
                                const serviceCodigo =
                                    group.servicio?.codigo_tipo || group.servicio?.codigoTipoServicio || '';
                                const serviceNombre =
                                    group.servicio?.nombre_tipo || group.servicio?.nombreTipoServicio || 'Sin Servicio';
                                const isZeroActs = group.actividades.length === 0;
                                const colors = isZeroActs
                                    ? {
                                          bg: 'bg-amber-50/70',
                                          border: 'border-amber-300',
                                          text: 'text-slate-900',
                                          accent: 'bg-amber-500',
                                      }
                                    : SERVICE_COLORS[serviceCodigo] || DEFAULT_COLOR;
                                const numSistemas = Object.keys(group.bySystem).length;

                                return (
                                    <div
                                        key={`service-group-${serviceId}`}
                                        className={cn(
                                            'rounded-2xl border-2 overflow-hidden transition-all shadow-2xs',
                                            colors.border,
                                            colors.bg
                                        )}
                                    >
                                        {/* Header del Servicio */}
                                        <div
                                            onClick={() => toggleService(serviceId)}
                                            className="w-full flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4 hover:bg-white/60 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-start sm:items-center gap-4">
                                                <div className={cn('w-1.5 h-12 rounded-full shrink-0', colors.accent)} />
                                                <div className="text-left">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-slate-700">
                                                            {serviceCodigo}
                                                        </span>
                                                        <h3 className={cn('font-bold text-lg', colors.text)}>
                                                            {serviceNombre}
                                                        </h3>
                                                        {group.arquetipos.length > 0 ? (
                                                            group.arquetipos.map(arq => (
                                                                <span
                                                                    key={arq.codigo}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100/90 text-blue-800 border border-blue-200"
                                                                >
                                                                    <Layers className="h-3 w-3 text-blue-600" />
                                                                    {arq.nombre} ({arq.codigo})
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-white/80 text-slate-600 border border-slate-200">
                                                                <Globe className="h-3 w-3 text-slate-400" />
                                                                Universal
                                                            </span>
                                                        )}
                                                        {isZeroActs && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                                ⚡ Nuevo · Pendiente armar checklist
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1 font-medium">
                                                        {isZeroActs ? (
                                                            <span className="text-amber-800 font-semibold">
                                                                0 actividades configuradas — Agrega tareas nuevas o reutiliza del Banco Universal
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className="font-bold text-slate-800">
                                                                    {group.actividades.length}
                                                                </span>{' '}
                                                                actividades •{' '}
                                                                <span className="font-bold text-slate-800">
                                                                    {numSistemas}
                                                                </span>{' '}
                                                                {numSistemas === 1 ? 'subsistema' : 'subsistemas'}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Botones de Acción Directa en el Header del Servicio */}
                                            <div
                                                className="flex items-center gap-2.5 self-end lg:self-center flex-wrap"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setReutilizarTargetService(group.servicio)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-2xs cursor-pointer"
                                                    title="Seleccionar actividades existentes del Banco Universal para clonarlas en este servicio"
                                                >
                                                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                                                    <span>+ Reutilizar del Banco</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenNewForService(Number(serviceId))}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>+ Nueva Actividad aquí</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleService(serviceId)}
                                                    className="p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className={cn('h-5 w-5', colors.text)} />
                                                    ) : (
                                                        <ChevronRight className={cn('h-5 w-5', colors.text)} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Contenido Expandido del Servicio */}
                                        {isExpanded && (
                                            <div className="bg-white border-t border-gray-200">
                                                {isZeroActs ? (
                                                    <div className="p-8 text-center bg-gradient-to-b from-amber-50/30 to-white">
                                                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                                                            <ClipboardList className="h-6 w-6" />
                                                        </div>
                                                        <h4 className="text-base font-bold text-slate-900">
                                                            Protocolo listo para configurar ({serviceNombre})
                                                        </h4>
                                                        <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                                                            Aún no se han cargado actividades de inspección o medición en este tipo de servicio. Puedes crear actividades específicas para sus subsistemas o reutilizar tareas del Banco Universal.
                                                        </p>
                                                        <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenNewForService(Number(serviceId))}
                                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                                Crear Primera Actividad / Medición
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReutilizarTargetService(group.servicio)}
                                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
                                                            >
                                                                <BookOpen className="h-4 w-4" />
                                                                Reutilizar del Banco Universal
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    Object.entries(group.bySystem).map(([sistemaKey, sysBlock]) => (
                                                        <div
                                                            key={`system-${serviceId}-${sistemaKey}`}
                                                            className="border-b border-gray-100 last:border-b-0"
                                                        >
                                                            {/* Header Consolidado del Subsistema */}
                                                            <div className="px-6 py-3 bg-slate-50/80 flex items-center justify-between border-b border-gray-100">
                                                                <div className="flex items-center gap-2">
                                                                    <Layers className="h-4 w-4 text-purple-600" />
                                                                    <span className="text-sm font-bold text-slate-800">
                                                                        {sysBlock.sistemaNombre}
                                                                    </span>
                                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                                                        {sysBlock.acts.length}{' '}
                                                                        {sysBlock.acts.length === 1 ? 'actividad' : 'actividades'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Lista de Actividades del Subsistema */}
                                                            <div className="divide-y divide-gray-100">
                                                                {sysBlock.acts.map((act, idx) => {
                                                                    const actId = Number(
                                                                        act.idActividadCatalogo || act.id_actividad_catalogo || idx
                                                                    );
                                                                    const tipoAct =
                                                                        act.tipoActividad || act.tipo_actividad || 'INSPECCION';
                                                                    const Icon = getTipoActividadIcon(tipoAct);
                                                                    const pInfo = act.parametroInfo;

                                                                    return (
                                                                        <div
                                                                            key={`act-${serviceId}-${sistemaKey}-${actId}`}
                                                                            className="px-6 py-3.5 hover:bg-blue-50/30 transition-colors group flex items-center gap-4"
                                                                        >
                                                                            {/* Orden + Controles ↑ / ↓ en 1 clic */}
                                                                            <div className="flex items-center gap-1.5">
                                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 border border-slate-200">
                                                                                    {act.ordenEjecucion || act.orden_ejecucion || idx + 1}
                                                                                </div>
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={idx === 0 || reorderingId === actId}
                                                                                        onClick={() =>
                                                                                            handleMoveActivity(act, 'up', sysBlock.acts)
                                                                                        }
                                                                                        title="Subir orden de ejecución"
                                                                                        className="p-0.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-700 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                                                                                    >
                                                                                        <ArrowUp className="h-3 w-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={
                                                                                            idx === sysBlock.acts.length - 1 ||
                                                                                            reorderingId === actId
                                                                                        }
                                                                                        onClick={() =>
                                                                                            handleMoveActivity(act, 'down', sysBlock.acts)
                                                                                        }
                                                                                        title="Bajar orden de ejecución"
                                                                                        className="p-0.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-700 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                                                                                    >
                                                                                        <ArrowDown className="h-3 w-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Info Principal */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                                                    {act.descripcionActividad || act.descripcion_actividad}
                                                                                </p>
                                                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                                    <span className="text-[11px] font-mono text-gray-400">
                                                                                        {act.codigoActividad || act.codigo_actividad}
                                                                                    </span>
                                                                                    {pInfo && (
                                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                                                                            <Ruler className="h-3 w-3 text-cyan-600" />
                                                                                            <span>
                                                                                                Unidad: <strong>{pInfo.unidad}</strong>
                                                                                            </span>
                                                                                            {(pInfo.min !== null || pInfo.max !== null) && (
                                                                                                <span className="font-mono text-cyan-700">
                                                                                                    [{pInfo.min ?? '—'} a {pInfo.max ?? '—'}{' '}
                                                                                                    {pInfo.unidad}]
                                                                                                </span>
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Badges */}
                                                                            <div className="hidden md:flex items-center gap-2 flex-wrap">
                                                                                <span
                                                                                    className={cn(
                                                                                        'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold',
                                                                                        getTipoActividadColor(tipoAct)
                                                                                    )}
                                                                                >
                                                                                    <Icon className="h-3.5 w-3.5" />
                                                                                    {tipoAct}
                                                                                </span>

                                                                                {(act.esObligatoria ?? act.es_obligatoria) && (
                                                                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold">
                                                                                        OBLIGATORIA
                                                                                    </span>
                                                                                )}

                                                                                {(act.tiempoEstimadoMinutos ||
                                                                                    act.tiempo_estimado_minutos) && (
                                                                                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
                                                                                        <Clock className="h-3 w-3" />
                                                                                        {act.tiempoEstimadoMinutos ||
                                                                                            act.tiempo_estimado_minutos}
                                                                                        m
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Acciones */}
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const desc = (
                                                                                            act.descripcionActividad ||
                                                                                            act.descripcion_actividad ||
                                                                                            ''
                                                                                        ).trim();
                                                                                        const found = plantillasUniversales.find(
                                                                                            p =>
                                                                                                p.key ===
                                                                                                `${desc.toUpperCase()}|${tipoAct}`
                                                                                        );
                                                                                        if (found) setPlantillaAVincular(found);
                                                                                    }}
                                                                                    title="Vincular / Reutilizar esta actividad en otro Tipo de Servicio"
                                                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                                                                >
                                                                                    <Copy className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleEdit(act)}
                                                                                    title="Editar actividad"
                                                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDelete(actId)}
                                                                                    title="Eliminar actividad"
                                                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* ═══════════════════════════════════════════════════════════════════════
                   VISTA 2: BANCO UNIVERSAL DE ACTIVIDADES (CATÁLOGO MAESTRO REUTILIZABLE)
                   ═══════════════════════════════════════════════════════════════════════ */
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-indigo-600" />
                                Diccionario Maestro de Actividades Técnicas ({plantillasFiltradas.length})
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Cada actividad del banco universal puede vincularse o reutilizarse en múltiples Tipos de Servicio (ej. Preventivo Tipo A, Preventivo Tipo B, Correctivo) con un solo clic.
                            </p>
                        </div>
                    </div>

                    {plantillasFiltradas.length === 0 ? (
                        <div className="py-16 text-center">
                            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-base font-bold text-gray-600">
                                No se encontraron actividades en el Banco Universal con estos filtros
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {plantillasFiltradas.map(plantilla => {
                                const Icon = getTipoActividadIcon(plantilla.tipoActividad);
                                return (
                                    <div
                                        key={plantilla.key}
                                        className="p-4 sm:px-6 hover:bg-indigo-50/20 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                    >
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold',
                                                        getTipoActividadColor(plantilla.tipoActividad)
                                                    )}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                    {plantilla.tipoActividad}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                    <Layers className="h-3 w-3" />
                                                    {plantilla.sistemaNombre}
                                                </span>
                                                {plantilla.arquetipos.length > 0 ? (
                                                    plantilla.arquetipos.map(arq => (
                                                        <span
                                                            key={arq.codigo}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                                        >
                                                            {arq.nombre} ({arq.codigo})
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                                                        🌐 Universal
                                                    </span>
                                                )}
                                                {plantilla.parametroInfo && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                                        <Ruler className="h-3 w-3 text-cyan-600" />
                                                        Unidad: {plantilla.parametroInfo.unidad}
                                                        {(plantilla.parametroInfo.min !== null ||
                                                            plantilla.parametroInfo.max !== null) && (
                                                            <span className="font-mono">
                                                                [{plantilla.parametroInfo.min ?? '—'} -{' '}
                                                                {plantilla.parametroInfo.max ?? '—'}]
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="font-bold text-slate-900 text-sm sm:text-base">
                                                {plantilla.descripcionActividad}
                                            </p>

                                            {/* Servicios donde está vinculada actualmente */}
                                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Usada en ({plantilla.serviciosInfo.length}):
                                                </span>
                                                {plantilla.serviciosInfo.map(srv => (
                                                    <span
                                                        key={srv.idTipoServicio}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                                    >
                                                        <span className="font-mono text-[10px] text-slate-500">
                                                            {srv.codigoTipo}
                                                        </span>
                                                        <span>{srv.nombreTipo}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                                            <button
                                                type="button"
                                                onClick={() => setPlantillaAVincular(plantilla)}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                                            >
                                                <Link2 className="h-4 w-4" />
                                                <span>Vincular a otro Servicio</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Crear / Editar Actividad Inteligente (Multi-Servicio + UoM + Filtro Contextual de Sistema) */}
            {isModalOpen && (
                <ActividadModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setPreselectedServiceId(null);
                    }}
                    actividad={editingActividad}
                    preselectedServiceId={preselectedServiceId}
                    actividades={actividades || []}
                    tiposServicio={tiposServicio || []}
                    sistemas={sistemas || []}
                    parametros={parametros || []}
                    arquetipos={arquetipos || []}
                    crearActividad={crearActividad}
                    actualizarActividad={actualizarActividad}
                />
            )}

            {/* Modal para Vincular una Plantilla del Banco Universal a 1 o Múltiples Servicios */}
            {plantillaAVincular && (
                <VincularPlantillaAServiciosModal
                    plantilla={plantillaAVincular}
                    tiposServicio={tiposServicio}
                    actividades={actividades}
                    arquetipos={arquetipos}
                    crearActividad={crearActividad}
                    onClose={() => setPlantillaAVincular(null)}
                />
            )}

            {/* Modal para Reutilizar Múltiples Actividades del Banco Universal dentro de un Servicio específico */}
            {reutilizarTargetService && (
                <ReutilizarDelBancoParaServicioModal
                    servicioDestino={reutilizarTargetService}
                    plantillas={plantillasUniversales}
                    actividades={actividades}
                    arquetipos={arquetipos}
                    crearActividad={crearActividad}
                    onClose={() => setReutilizarTargetService(null)}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL INTELIGENTE: NUEVA / EDITAR ACTIVIDAD (MULTI-SERVICIO + FILTRO SUBSISTEMA + UoM)
// ═══════════════════════════════════════════════════════════════════════════════
function ActividadModal({
    onClose,
    actividad,
    preselectedServiceId,
    actividades = [],
    tiposServicio = [],
    sistemas = [],
    parametros = [],
    arquetipos = [],
    crearActividad,
    actualizarActividad,
}: any) {
    const crearSistemaMutation = useCreateCatalogoSistema();
    const crearParametroMutation = useCreateParametroMedicion();
    const actualizarParametroMutation = useUpdateParametroMedicion();
    const { data: unidadesEam = [] } = useUnidadesEam();
    const { data: bancoMagnitudes = [] } = useBancoMagnitudesEam();

    const codigosExistentes = useMemo(() => {
        return new Set<string>(
            (actividades || [])
                .filter(
                    (a: any) =>
                        !actividad ||
                        (a.idActividadCatalogo || a.id_actividad_catalogo) !==
                            (actividad.idActividadCatalogo || actividad.id_actividad_catalogo)
                )
                .map((a: any) => (a.codigoActividad || a.codigo_actividad || '').toUpperCase().trim())
                .filter(Boolean)
        );
    }, [actividades, actividad]);

    // Calcular el siguiente orden_ejecucion disponible para un servicio dado
    const calcularSiguienteOrden = (serviceId: number | string) => {
        if (!serviceId) return 1;
        const actsDelServicio = (actividades || []).filter(
            (a: any) => String(a.idTipoServicio || a.id_tipo_servicio) === String(serviceId)
        );
        if (actsDelServicio.length === 0) return 1;
        const maxOrden = Math.max(
            0,
            ...actsDelServicio.map((a: any) => Number(a.ordenEjecucion || a.orden_ejecucion || 0))
        );
        return maxOrden + 1;
    };

    const initialServiceId = actividad
        ? String(actividad.idTipoServicio || actividad.id_tipo_servicio || '')
        : preselectedServiceId
        ? String(preselectedServiceId)
        : '';

    const existingParamId = actividad?.idParametroMedicion || actividad?.id_parametro_medicion || '';
    const existingParamObj = useMemo(() => {
        if (!existingParamId) return null;
        return (
            actividad?.parametroMedicion ||
            actividad?.parametros_medicion ||
            (parametros || []).find(
                (p: any) => Number(p.id_parametro_medicion || p.idParametroMedicion) === Number(existingParamId)
            ) ||
            null
        );
    }, [existingParamId, actividad, parametros]);

    const [isAutoCodigo, setIsAutoCodigo] = useState(!actividad);
    const [serviciosAdicionalesIds, setServiciosAdicionalesIds] = useState<string[]>([]);
    const [mostrarMultiServicio, setMostrarMultiServicio] = useState(false);

    // Estado para creación rápida inline de Subsistema
    const [creandoSubsistemaInline, setCreandoSubsistemaInline] = useState(false);
    const [nuevoSubsistemaNombre, setNuevoSubsistemaNombre] = useState('');

    // Estado para Configuración Metrológica directa (cuando tipo_actividad === 'MEDICION')
    const [modoMetrologico, setModoMetrologico] = useState<'DIRECTO_UOM' | 'CATALOGO_EXISTENTE'>('DIRECTO_UOM');
    const [unidadMedidaDirecta, setUnidadMedidaDirecta] = useState<string>(
        existingParamObj?.unidadMedida || existingParamObj?.unidad_medida || ''
    );
    const [rangoMinDirecto, setRangoMinDirecto] = useState<string>(
        existingParamObj?.valorMinimoNormal != null
            ? String(existingParamObj.valorMinimoNormal)
            : existingParamObj?.valor_minimo_normal != null
            ? String(existingParamObj.valor_minimo_normal)
            : ''
    );
    const [rangoMaxDirecto, setRangoMaxDirecto] = useState<string>(
        existingParamObj?.valorMaximoNormal != null
            ? String(existingParamObj.valorMaximoNormal)
            : existingParamObj?.valor_maximo_normal != null
            ? String(existingParamObj.valor_maximo_normal)
            : ''
    );

    const [formData, setFormData] = useState({
        descripcion_actividad: actividad?.descripcionActividad || actividad?.descripcion_actividad || '',
        codigo_actividad: actividad?.codigoActividad || actividad?.codigo_actividad || '',
        id_tipo_servicio: initialServiceId,
        id_sistema: actividad ? String(actividad.idSistema || actividad.id_sistema || '') : '',
        tipo_actividad: actividad?.tipoActividad || actividad?.tipo_actividad || 'INSPECCION',
        orden_ejecucion: actividad
            ? actividad.ordenEjecucion || actividad.orden_ejecucion || 1
            : calcularSiguienteOrden(initialServiceId),
        es_obligatoria: actividad?.esObligatoria ?? actividad?.es_obligatoria ?? true,
        tiempo_estimado_minutos:
            actividad?.tiempoEstimadoMinutos || actividad?.tiempo_estimado_minutos || '',
        id_parametro_medicion: existingParamId ? String(existingParamId) : '',
        instrucciones: actividad?.instrucciones || '',
        precauciones: actividad?.precauciones || '',
    });

    const [isSaving, setIsSaving] = useState(false);

    // Resolver servicio seleccionado y su(s) arquetipo(s) de equipo
    const servicioSeleccionado = useMemo(() => {
        if (!formData.id_tipo_servicio) return null;
        return (tiposServicio || []).find(
            (t: any) => String(t.id_tipo_servicio || t.idTipoServicio) === String(formData.id_tipo_servicio)
        );
    }, [formData.id_tipo_servicio, tiposServicio]);

    const arquetiposDelServicio = useMemo(() => {
        if (!servicioSeleccionado) return [];
        return resolverArquetiposDeEntidad(servicioSeleccionado, arquetipos);
    }, [servicioSeleccionado, arquetipos]);

    // Filtrar estrictamente los Subsistemas según el Arquetipo del Servicio seleccionado
    const sistemasFiltradosContextual = useMemo(() => {
        const codigosArq = arquetiposDelServicio.map(a => a.codigo);
        return (sistemas || []).filter((s: any) =>
            esSistemaCompatibleConArquetipos(s, codigosArq, arquetipos)
        );
    }, [sistemas, arquetiposDelServicio, arquetipos]);

    // Opciones consolidadas de Unidades de Medida (Banco EAM 60 Magnitudes / 263 Unidades + Ingeniería)
    const opcionesUnidadesMedida = useMemo(() => {
        const map = new Map<string, { value: string; label: string; badge?: string }>();

        // 1. Unidades esenciales de ingeniería para acceso inmediato
        const unidadesDestacadas = [
            { sim: 'mm', nom: 'Milímetros (Longitud / Nivelación)', mag: 'LONGITUD' },
            { sim: 'm/s', nom: 'Metros por segundo (Velocidad lineal)', mag: 'VELOCIDAD' },
            { sim: 's', nom: 'Segundos (Tiempo de maniobra / apertura)', mag: 'TIEMPO' },
            { sim: 'PSI', nom: 'Libras por pulgada cuadrada (Presión)', mag: 'PRESIÓN' },
            { sim: 'bar', nom: 'Bares (Presión)', mag: 'PRESIÓN' },
            { sim: '°C', nom: 'Grados Celsius (Temperatura)', mag: 'TEMPERATURA' },
            { sim: 'VAC', nom: 'Voltios AC (Tensión Alterna)', mag: 'TENSIÓN' },
            { sim: 'VDC', nom: 'Voltios DC (Tensión Continua)', mag: 'TENSIÓN' },
            { sim: 'V', nom: 'Voltios (Tensión Eléctrica)', mag: 'TENSIÓN' },
            { sim: 'A', nom: 'Amperios (Corriente Eléctrica)', mag: 'CORRIENTE' },
            { sim: 'Hz', nom: 'Hertz (Frecuencia)', mag: 'FRECUENCIA' },
            { sim: 'RPM', nom: 'Revoluciones por minuto (Velocidad giro)', mag: 'VELOCIDAD' },
            { sim: 'mm/s', nom: 'Milímetros por segundo RMS (Vibración)', mag: 'VIBRACIÓN' },
            { sim: 'dB', nom: 'Decibelios (Nivel sonoro)', mag: 'ACÚSTICA' },
            { sim: '%', nom: 'Porcentaje (Nivel / Carga / Humedad)', mag: 'PORCENTAJE' },
            { sim: 'kW', nom: 'Kilovatios (Potencia Activa)', mag: 'POTENCIA' },
            { sim: 'kVA', nom: 'Kilovoltiamperios (Potencia Aparente)', mag: 'POTENCIA' },
            { sim: 'MΩ', nom: 'Megaohmios (Resistencia de Aislamiento)', mag: 'RESISTENCIA' },
            { sim: 'Ω', nom: 'Ohmios (Resistencia / Puesta a tierra)', mag: 'RESISTENCIA' },
            { sim: 'GPM', nom: 'Galones por minuto (Caudal)', mag: 'CAUDAL' },
            { sim: 'L/min', nom: 'Litros por minuto (Caudal)', mag: 'CAUDAL' },
            { sim: 'Ciclos', nom: 'Ciclos de operación / viaje', mag: 'CONTADOR' },
            { sim: 'h', nom: 'Horas de operación (Horómetro)', mag: 'TIEMPO' },
        ];

        for (const u of unidadesDestacadas) {
            map.set(u.sim, {
                value: u.sim,
                label: `${u.sim} — ${u.nom}`,
                badge: u.mag,
            });
        }

        // 2. Unidades activas en la BD (`unidades_medida`)
        for (const u of (unidadesEam as any[]) || []) {
            const sim = String(u.simbolo || u.codigo_unidad || '').trim();
            if (sim && !map.has(sim)) {
                map.set(sim, {
                    value: sim,
                    label: `${sim} — ${u.nombre_unidad || u.nombre || sim}`,
                    badge: typeof u.magnitud === 'string' ? u.magnitud : u.magnitud?.nombre_magnitud || undefined,
                });
            }
        }

        // 3. Banco completo de 60 Magnitudes / 263 Unidades
        for (const mag of bancoMagnitudes || []) {
            for (const u of mag.unidades || []) {
                const sim = String(u.simbolo || u.codigo_unidad || '').trim();
                if (sim && !map.has(sim)) {
                    map.set(sim, {
                        value: sim,
                        label: `${sim} — ${u.nombre_unidad}`,
                        badge: mag.nombre_magnitud || mag.codigo_magnitud,
                    });
                }
            }
        }

        return Array.from(map.values());
    }, [unidadesEam, bancoMagnitudes]);

    const isCodigoDuplicado = useMemo(() => {
        return verificarCodigoDuplicado(
            formData.codigo_actividad,
            codigosExistentes,
            actividad?.codigo_actividad || actividad?.codigoActividad
        );
    }, [formData.codigo_actividad, codigosExistentes, actividad]);

    const handleDescripcionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newDesc = e.target.value;
        const auto =
            isAutoCodigo && !actividad
                ? generarCodigoActividad(newDesc, codigosExistentes)
                : formData.codigo_actividad;
        setFormData(prev => ({
            ...prev,
            descripcion_actividad: newDesc,
            codigo_actividad: auto,
        }));
    };

    const handleServicioPrincipalChange = (newServiceId: string) => {
        const nextOrden = !actividad ? calcularSiguienteOrden(newServiceId) : formData.orden_ejecucion;
        const srv = (tiposServicio || []).find(
            (t: any) => String(t.id_tipo_servicio || t.idTipoServicio) === String(newServiceId)
        );
        const arqs = resolverArquetiposDeEntidad(srv, arquetipos).map(a => a.codigo);
        const currentSisObj = (sistemas || []).find(
            (s: any) => String(s.id_sistema || s.idSistema) === String(formData.id_sistema)
        );
        const keepSistema =
            currentSisObj && esSistemaCompatibleConArquetipos(currentSisObj, arqs, arquetipos)
                ? formData.id_sistema
                : '';

        setFormData(prev => ({
            ...prev,
            id_tipo_servicio: newServiceId,
            id_sistema: keepSistema,
            orden_ejecucion: nextOrden,
        }));
        setServiciosAdicionalesIds(prev => prev.filter(id => id !== newServiceId));
    };

    const handleToggleAutoCodigo = () => {
        const nuevoModo = !isAutoCodigo;
        setIsAutoCodigo(nuevoModo);
        if (nuevoModo) {
            const auto = generarCodigoActividad(formData.descripcion_actividad, codigosExistentes);
            setFormData(prev => ({ ...prev, codigo_actividad: auto }));
        }
    };

    // Crear nuevo subsistema inline vinculado al arquetipo del servicio actual
    const handleCrearSubsistemaInline = async () => {
        const nombre = nuevoSubsistemaNombre.trim();
        if (!nombre) return;
        const codigosExistentesSis = new Set<string>(
            (sistemas || []).map((s: any) => String(s.codigo_sistema || '').toUpperCase().trim())
        );
        const codigo = generarCodigoSistema(nombre, codigosExistentesSis);
        const aplicaA = arquetiposDelServicio.length > 0 ? arquetiposDelServicio.map(a => a.codigo) : ['OTRO'];

        try {
            const res = await crearSistemaMutation.mutateAsync({
                codigoSistema: codigo,
                nombreSistema: nombre,
                aplicaA,
                ordenVisualizacion: (sistemas?.length || 0) + 1,
                activo: true,
            });
            const createdId = res?.data?.id_sistema || (res as any)?.idSistema;
            if (createdId) {
                setFormData(prev => ({ ...prev, id_sistema: String(createdId) }));
            }
            setNuevoSubsistemaNombre('');
            setCreandoSubsistemaInline(false);
        } catch {
            // El hook ya muestra toast
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCodigoDuplicado || !formData.id_tipo_servicio) return;

        // Validar rango coherente si es MEDICION
        const minNum = rangoMinDirecto !== '' ? Number(rangoMinDirecto) : undefined;
        const maxNum = rangoMaxDirecto !== '' ? Number(rangoMaxDirecto) : undefined;
        if (
            formData.tipo_actividad === 'MEDICION' &&
            minNum !== undefined &&
            maxNum !== undefined &&
            !isNaN(minNum) &&
            !isNaN(maxNum) &&
            minNum >= maxNum
        ) {
            toast.error('El Valor Mínimo Normal debe ser menor que el Valor Máximo Normal');
            return;
        }

        if (
            formData.tipo_actividad === 'MEDICION' &&
            modoMetrologico === 'DIRECTO_UOM' &&
            !unidadMedidaDirecta.trim() &&
            !formData.id_parametro_medicion
        ) {
            toast.error('Selecciona la Unidad de Medida (ej: mm, m/s, s, PSI) para esta actividad de medición');
            return;
        }

        setIsSaving(true);
        try {
            let finalParametroId: number | undefined = formData.id_parametro_medicion
                ? Number(formData.id_parametro_medicion)
                : undefined;

            // Si es MEDICION y el usuario configuró Unidad / Rangos directamente:
            if (formData.tipo_actividad === 'MEDICION' && modoMetrologico === 'DIRECTO_UOM' && unidadMedidaDirecta.trim()) {
                const idTipoEquipoTarget =
                    arquetiposDelServicio[0]?.id_tipo_equipo ||
                    servicioSeleccionado?.id_tipo_equipo ||
                    undefined;

                // Si ya tenía un parámetro vinculado y estamos editando, actualizarlo o reutilizarlo
                if (finalParametroId && existingParamObj) {
                    await actualizarParametroMutation.mutateAsync({
                        id: finalParametroId,
                        data: {
                            unidadMedida: unidadMedidaDirecta.trim().slice(0, 20),
                            valorMinimoNormal: minNum,
                            valorMaximoNormal: maxNum,
                        },
                    });
                } else {
                    // Buscar si ya existe un parámetro idéntico para no duplicar innecesariamente
                    const descLimpia = formData.descripcion_actividad.trim();
                    const paramExistenteCompatible = (parametros || []).find(
                        (p: any) =>
                            (p.nombre_parametro || '').toLowerCase() === descLimpia.toLowerCase() &&
                            (p.unidad_medida || '') === unidadMedidaDirecta.trim()
                    );

                    if (paramExistenteCompatible) {
                        finalParametroId = Number(paramExistenteCompatible.id_parametro_medicion);
                        if (minNum !== undefined || maxNum !== undefined) {
                            await actualizarParametroMutation.mutateAsync({
                                id: finalParametroId,
                                data: {
                                    valorMinimoNormal: minNum,
                                    valorMaximoNormal: maxNum,
                                },
                            });
                        }
                    } else {
                        // Crear automáticamente el Parámetro de Medición en `parametros_medicion`
                        const baseCode = generarCodigoActividad(descLimpia, new Set()).replace(/^ACT_/, 'PAR_');
                        const uniqueSuffix = String(Date.now()).slice(-4);
                        const codigoParam = `${baseCode.slice(0, 40)}_${uniqueSuffix}`.toUpperCase();

                        const nuevoParamRes = await crearParametroMutation.mutateAsync({
                            codigoParametro: codigoParam,
                            nombreParametro: descLimpia.slice(0, 95),
                            unidadMedida: unidadMedidaDirecta.trim().slice(0, 20),
                            categoria: 'MECANICO' as any,
                            tipoDato: 'NUMERICO',
                            valorMinimoNormal: minNum,
                            valorMaximoNormal: maxNum,
                            tipoEquipoId: idTipoEquipoTarget ? Number(idTipoEquipoTarget) : undefined,
                            esObligatorio: Boolean(formData.es_obligatoria),
                            decimalesPrecision: 2,
                            activo: true,
                        });
                        const createdParamId =
                            (nuevoParamRes as any)?.data?.id_parametro_medicion ||
                            (nuevoParamRes as any)?.id_parametro_medicion ||
                            (nuevoParamRes as any)?.data?.idParametroMedicion ||
                            (nuevoParamRes as any)?.idParametroMedicion;
                        if (createdParamId) {
                            finalParametroId = Number(createdParamId);
                        }
                    }
                }
            }

            const finalCode = (
                formData.codigo_actividad.trim() ||
                generarCodigoActividad(formData.descripcion_actividad, codigosExistentes)
            )
                .toUpperCase()
                .trim();

            const baseDto = {
                codigoActividad: finalCode,
                descripcionActividad: formData.descripcion_actividad.trim(),
                idTipoServicio: Number(formData.id_tipo_servicio),
                idSistema: formData.id_sistema ? Number(formData.id_sistema) : undefined,
                tipoActividad: formData.tipo_actividad,
                ordenEjecucion: Number(formData.orden_ejecucion) || 1,
                esObligatoria: Boolean(formData.es_obligatoria),
                tiempoEstimadoMinutos: formData.tiempo_estimado_minutos
                    ? Number(formData.tiempo_estimado_minutos)
                    : undefined,
                idParametroMedicion: formData.tipo_actividad === 'MEDICION' ? finalParametroId : undefined,
                instrucciones: formData.instrucciones || undefined,
                precauciones: formData.precauciones || undefined,
            };

            if (actividad) {
                await actualizarActividad.mutateAsync({
                    id: Number(actividad.idActividadCatalogo || actividad.id_actividad_catalogo),
                    data: baseDto,
                });
            } else {
                // 1. Crear en el servicio principal
                await crearActividad.mutateAsync(baseDto);

                // 2. Si seleccionó servicios adicionales (Multi-Servicio), instanciar en cada uno con código y orden propios
                const usedCodes = new Set(codigosExistentes);
                usedCodes.add(finalCode);

                for (const extraServiceId of serviciosAdicionalesIds) {
                    if (String(extraServiceId) === String(formData.id_tipo_servicio)) continue;
                    const extraCode = generarCodigoActividad(
                        `${formData.descripcion_actividad}_${extraServiceId}`,
                        usedCodes
                    );
                    usedCodes.add(extraCode);
                    const extraOrden = calcularSiguienteOrden(extraServiceId);

                    await crearActividad.mutateAsync({
                        ...baseDto,
                        codigoActividad: extraCode,
                        idTipoServicio: Number(extraServiceId),
                        ordenEjecucion: extraOrden,
                    });
                }
            }

            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const toggleServicioAdicional = (idStr: string) => {
        setServiciosAdicionalesIds(prev =>
            prev.includes(idStr) ? prev.filter(item => item !== idStr) : [...prev, idStr]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                <div className="p-5 sm:px-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {actividad ? (
                                <Edit className="h-5 w-5 text-blue-600" />
                            ) : (
                                <Plus className="h-5 w-5 text-blue-600" />
                            )}
                            {actividad ? 'Editar Actividad del Protocolo' : 'Nueva Actividad / Punto de Medición'}
                        </h2>
                        {arquetiposDelServicio.length > 0 && (
                            <p className="text-xs text-blue-700 font-semibold mt-0.5 flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5" />
                                Equipo contextualizado:{' '}
                                {arquetiposDelServicio.map(a => `${a.nombre} (${a.codigo})`).join(', ')}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* 1. Servicio Principal + Multi-Servicio */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-bold text-slate-800">
                                        Servicio Vinculado *
                                    </label>
                                    {!actividad && (
                                        <button
                                            type="button"
                                            onClick={() => setMostrarMultiServicio(prev => !prev)}
                                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                        >
                                            <Link2 className="h-3 w-3" />
                                            <span>
                                                {mostrarMultiServicio
                                                    ? 'Ocultar multi-servicio'
                                                    : `+ Aplicar a varios (${serviciosAdicionalesIds.length + 1})`}
                                            </span>
                                        </button>
                                    )}
                                </div>
                                <EamSelect
                                    value={formData.id_tipo_servicio ? String(formData.id_tipo_servicio) : ''}
                                    onChange={handleServicioPrincipalChange}
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

                            {/* Subsistema filtrado estrictamente por el Arquetipo del Servicio */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-bold text-slate-800">
                                        Subsistema del Equipo ({sistemasFiltradosContextual.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setCreandoSubsistemaInline(prev => !prev)}
                                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="h-3 w-3" />
                                        <span>{creandoSubsistemaInline ? 'Cancelar' : 'Nuevo subsistema'}</span>
                                    </button>
                                </div>
                                <EamSelect
                                    value={formData.id_sistema ? String(formData.id_sistema) : ''}
                                    onChange={val => setFormData({ ...formData, id_sistema: val })}
                                    options={[
                                        { value: '', label: 'General / Nivel Equipo' },
                                        ...sistemasFiltradosContextual.map((s: any) => ({
                                            value: String(s.id_sistema || s.idSistema),
                                            label: s.nombre_sistema || s.nombreSistema,
                                            badge: s.codigo_sistema || s.codigoSistema || undefined,
                                        })),
                                    ]}
                                    placeholder="General / Nivel Equipo"
                                    searchable
                                />
                                {arquetiposDelServicio.length > 0 && (
                                    <p className="text-[10px] text-emerald-700 font-medium mt-1">
                                        ✓ Filtrado para {arquetiposDelServicio.map(a => a.codigo).join(', ')} (sin mezcla de otros equipos)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Creación rápida inline de Subsistema */}
                        {creandoSubsistemaInline && (
                            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-2">
                                <input
                                    type="text"
                                    value={nuevoSubsistemaNombre}
                                    onChange={e => setNuevoSubsistemaNombre(e.target.value)}
                                    placeholder={
                                        arquetiposDelServicio[0]
                                            ? `Nombre del nuevo subsistema para ${arquetiposDelServicio[0].nombre}...`
                                            : 'Nombre del nuevo subsistema...'
                                    }
                                    className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    disabled={!nuevoSubsistemaNombre.trim() || crearSistemaMutation.isPending}
                                    onClick={handleCrearSubsistemaInline}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                                >
                                    {crearSistemaMutation.isPending ? 'Creando...' : 'Crear y Seleccionar'}
                                </button>
                            </div>
                        )}

                        {/* Selector Multi-Servicio Opcional al crear */}
                        {!actividad && mostrarMultiServicio && (
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs font-bold text-indigo-900 mb-2">
                                    Selecciona otros Tipos de Servicio donde también deseas agregar esta misma actividad simultáneamente:
                                </p>
                                <div className="max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                                    {(tiposServicio || [])
                                        .filter(
                                            (t: any) =>
                                                String(t.id_tipo_servicio || t.idTipoServicio) !==
                                                String(formData.id_tipo_servicio)
                                        )
                                        .map((t: any) => {
                                            const idStr = String(t.id_tipo_servicio || t.idTipoServicio);
                                            const checked = serviciosAdicionalesIds.includes(idStr);
                                            return (
                                                <label
                                                    key={idStr}
                                                    className={cn(
                                                        'flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors',
                                                        checked
                                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleServicioAdicional(idStr)}
                                                        className="rounded border-gray-300 text-indigo-600"
                                                    />
                                                    <span className="truncate">{t.nombre_tipo || t.nombreTipo}</span>
                                                </label>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Descripción de la Actividad */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                            Descripción de la Actividad / Punto de Control *
                        </label>
                        <textarea
                            required
                            rows={2}
                            value={formData.descripcion_actividad}
                            onChange={handleDescripcionChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none font-medium"
                            placeholder="Ej: Medición de desnivel de parada entre piso de cabina y piso de hall..."
                        />
                    </div>

                    {/* 3. Código Único + Tipo de Actividad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-bold text-gray-700">Código Único *</label>
                                {!actividad && (
                                    <button
                                        type="button"
                                        onClick={handleToggleAutoCodigo}
                                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
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
                                onChange={e =>
                                    setFormData({ ...formData, codigo_actividad: e.target.value.toUpperCase().trim() })
                                }
                                className={cn(
                                    'w-full px-4 py-2 border rounded-xl outline-none text-sm font-mono uppercase transition-colors disabled:bg-slate-100 disabled:text-slate-600',
                                    isCodigoDuplicado
                                        ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                                        : 'border-gray-300'
                                )}
                                placeholder="ACT_001"
                                disabled={Boolean(actividad) || isAutoCodigo}
                            />
                            {isCodigoDuplicado ? (
                                <p className="text-[11px] text-rose-600 font-bold mt-1">
                                    ✕ Código en uso. Modifícalo.
                                </p>
                            ) : formData.codigo_actividad && !actividad ? (
                                <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Código único disponible</span>
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo de Actividad *</label>
                            <EamSelect
                                value={formData.tipo_actividad}
                                onChange={val => setFormData({ ...formData, tipo_actividad: val as any })}
                                options={TIPOS_ACTIVIDAD.map(tipo => ({
                                    value: tipo.value,
                                    label: tipo.label,
                                }))}
                                placeholder="Seleccionar tipo de actividad..."
                            />
                        </div>
                    </div>

                    {/* 4. BLOQUE METROLÓGICO DIRECTO CUANDO TIPO === 'MEDICION' */}
                    {formData.tipo_actividad === 'MEDICION' && (
                        <div className="p-4 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 rounded-2xl border-2 border-cyan-200 space-y-3 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="text-sm font-bold text-cyan-950 flex items-center gap-2">
                                    <Gauge className="h-4 w-4 text-cyan-700" />
                                    <span>📏 Configuración Metrológica de la Medición</span>
                                </label>
                                <div className="inline-flex p-0.5 bg-white/80 rounded-lg border border-cyan-200 text-[11px] font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setModoMetrologico('DIRECTO_UOM')}
                                        className={cn(
                                            'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                                            modoMetrologico === 'DIRECTO_UOM'
                                                ? 'bg-cyan-700 text-white'
                                                : 'text-cyan-800 hover:bg-cyan-100/50'
                                        )}
                                    >
                                        Unidad y Rango Directo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModoMetrologico('CATALOGO_EXISTENTE')}
                                        className={cn(
                                            'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                                            modoMetrologico === 'CATALOGO_EXISTENTE'
                                                ? 'bg-cyan-700 text-white'
                                                : 'text-cyan-800 hover:bg-cyan-100/50'
                                        )}
                                    >
                                        Parámetro Existente ({parametros.length})
                                    </button>
                                </div>
                            </div>

                            {modoMetrologico === 'DIRECTO_UOM' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-1">
                                        <label className="block text-xs font-bold text-cyan-900 mb-1">
                                            Unidad de Medida (UoM) *
                                        </label>
                                        <EamSelect
                                            value={unidadMedidaDirecta}
                                            onChange={val => setUnidadMedidaDirecta(val)}
                                            options={[
                                                { value: '', label: 'Elegir unidad...' },
                                                ...opcionesUnidadesMedida,
                                            ]}
                                            placeholder="Ej: mm, m/s, s, PSI..."
                                            searchable
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-cyan-900 mb-1">
                                            Valor Mín. Normal (Opcional)
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={rangoMinDirecto}
                                            onChange={e => setRangoMinDirecto(e.target.value)}
                                            placeholder="Ej: 0"
                                            className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-cyan-900 mb-1">
                                            Valor Máx. Normal (Opcional)
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={rangoMaxDirecto}
                                            onChange={e => setRangoMaxDirecto(e.target.value)}
                                            placeholder="Ej: 5"
                                            className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-cyan-900 mb-1">
                                        Seleccionar Parámetro del Catálogo
                                    </label>
                                    <EamSelect
                                        value={
                                            formData.id_parametro_medicion
                                                ? String(formData.id_parametro_medicion)
                                                : ''
                                        }
                                        onChange={val => {
                                            setFormData({ ...formData, id_parametro_medicion: val });
                                            const p = (parametros || []).find(
                                                (item: any) =>
                                                    String(
                                                        item.id_parametro_medicion || item.idParametroMedicion
                                                    ) === String(val)
                                            );
                                            if (p) {
                                                setUnidadMedidaDirecta(p.unidad_medida || p.unidadMedida || '');
                                                setRangoMinDirecto(
                                                    p.valor_minimo_normal != null
                                                        ? String(p.valor_minimo_normal)
                                                        : ''
                                                );
                                                setRangoMaxDirecto(
                                                    p.valor_maximo_normal != null
                                                        ? String(p.valor_maximo_normal)
                                                        : ''
                                                );
                                            }
                                        }}
                                        options={[
                                            { value: '', label: 'Seleccionar parámetro...' },
                                            ...(parametros || []).map((p: any) => ({
                                                value: String(p.id_parametro_medicion || p.idParametroMedicion),
                                                label: `${p.nombre_parametro || p.nombreParametro} (${
                                                    p.unidad_medida || p.unidadMedida
                                                })`,
                                                badge: p.unidad_medida || p.unidadMedida || undefined,
                                            })),
                                        ]}
                                        placeholder="Seleccionar parámetro..."
                                        searchable
                                    />
                                </div>
                            )}

                            <p className="text-[11px] text-cyan-800 font-medium">
                                ✓ Al guardar, el sistema vincula automáticamente la unidad{' '}
                                <strong>{unidadMedidaDirecta || 'seleccionada'}</strong> y los rangos de tolerancia para la App Móvil y el PDF de la Orden de Servicio.
                            </p>
                        </div>
                    )}

                    {/* 5. Orden de Ejecución Auto-calculado + Tiempo Estimado */}
                    <div className="grid grid-cols-2 gap-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Secuencia / Orden
                                </label>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Auto #{formData.orden_ejecucion}
                                </span>
                            </div>
                            <input
                                type="number"
                                min="1"
                                value={formData.orden_ejecucion}
                                onChange={e => setFormData({ ...formData, orden_ejecucion: e.target.value })}
                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                Tiempo Est. (min)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.tiempo_estimado_minutos}
                                onChange={e => setFormData({ ...formData, tiempo_estimado_minutos: e.target.value })}
                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="15"
                            />
                        </div>
                    </div>

                    {/* 6. Instrucciones + Precauciones */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5 text-blue-500" /> Instrucciones para Técnico (Opcional)
                            </label>
                            <textarea
                                rows={2}
                                value={formData.instrucciones}
                                onChange={e => setFormData({ ...formData, instrucciones: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs resize-none"
                                placeholder="Paso a paso detallado..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Precauciones / HSE (Opcional)
                            </label>
                            <textarea
                                rows={2}
                                value={formData.precauciones}
                                onChange={e => setFormData({ ...formData, precauciones: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs resize-none"
                                placeholder="Uso de EPP, bloqueo de energías..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-100">
                        <input
                            type="checkbox"
                            id="es_obligatoria"
                            checked={formData.es_obligatoria}
                            onChange={e => setFormData({ ...formData, es_obligatoria: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="es_obligatoria" className="text-xs font-bold text-blue-900 cursor-pointer">
                            ¿Es de ejecución obligatoria para cerrar la orden?
                        </label>
                    </div>
                </form>

                <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all cursor-pointer text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                            isSaving ||
                            isCodigoDuplicado ||
                            !formData.id_tipo_servicio ||
                            !formData.descripcion_actividad.trim() ||
                            !formData.codigo_actividad.trim()
                        }
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {actividad
                            ? 'Guardar Cambios'
                            : serviciosAdicionalesIds.length > 0
                            ? `Crear en ${serviciosAdicionalesIds.length + 1} Servicios`
                            : 'Crear Actividad'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: VINCULAR UNA PLANTILLA DEL BANCO UNIVERSAL A 1 O MÚLTIPLES SERVICIOS
// ═══════════════════════════════════════════════════════════════════════════════
function VincularPlantillaAServiciosModal({
    plantilla,
    tiposServicio = [],
    actividades = [],
    arquetipos = [],
    crearActividad,
    onClose,
}: {
    plantilla: PlantillaUniversalActividad;
    tiposServicio: any[];
    actividades: any[];
    arquetipos: any[];
    crearActividad: any;
    onClose: () => void;
}) {
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
    const [busquedaSrv, setBusquedaSrv] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleService = (id: number) => {
        setSelectedServiceIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const serviciosDisponibles = useMemo(() => {
        return (tiposServicio || []).filter(t => {
            const term = busquedaSrv.toLowerCase().trim();
            if (!term) return true;
            const nom = (t.nombre_tipo || '').toLowerCase();
            const cod = (t.codigo_tipo || '').toLowerCase();
            return nom.includes(term) || cod.includes(term);
        });
    }, [tiposServicio, busquedaSrv]);

    const handleVincular = async () => {
        if (selectedServiceIds.length === 0) return;
        setIsSubmitting(true);
        try {
            const usedCodes = new Set<string>(
                (actividades || [])
                    .map((a: any) => (a.codigoActividad || a.codigo_actividad || '').toUpperCase().trim())
                    .filter(Boolean)
            );

            for (const targetServiceId of selectedServiceIds) {
                if (plantilla.serviciosIds.has(targetServiceId)) continue;

                const actsInTarget = (actividades || []).filter(
                    (a: any) => Number(a.idTipoServicio || a.id_tipo_servicio) === Number(targetServiceId)
                );
                const maxOrden = Math.max(
                    0,
                    ...actsInTarget.map((a: any) => Number(a.ordenEjecucion || a.orden_ejecucion || 0))
                );
                const newCode = generarCodigoActividad(
                    `${plantilla.descripcionActividad}_${targetServiceId}`,
                    usedCodes
                );
                usedCodes.add(newCode);

                await crearActividad.mutateAsync({
                    codigoActividad: newCode,
                    descripcionActividad: plantilla.descripcionActividad,
                    idTipoServicio: Number(targetServiceId),
                    idSistema: plantilla.idSistema ? Number(plantilla.idSistema) : undefined,
                    tipoActividad: plantilla.tipoActividad,
                    ordenEjecucion: maxOrden + 1,
                    esObligatoria: plantilla.esObligatoria,
                    tiempoEstimadoMinutos: plantilla.tiempoEstimadoMinutos || undefined,
                    idParametroMedicion: plantilla.idParametroMedicion
                        ? Number(plantilla.idParametroMedicion)
                        : undefined,
                    instrucciones: plantilla.instrucciones || undefined,
                    precauciones: plantilla.precauciones || undefined,
                });
            }
            toast.success(
                `Actividad vinculada exitosamente a ${selectedServiceIds.length} servicio(s)`
            );
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-indigo-50/70 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-indigo-600" />
                            Vincular Actividad del Banco Universal a Servicio(s)
                        </h3>
                        <p className="text-xs text-indigo-700 mt-0.5 line-clamp-1">
                            {plantilla.descripcionActividad}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-indigo-100 text-gray-500 cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={busquedaSrv}
                            onChange={e => setBusquedaSrv(e.target.value)}
                            placeholder="Buscar tipo de servicio destino..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {serviciosDisponibles.map(srv => {
                            const id = Number(srv.id_tipo_servicio);
                            const yaVinculada = plantilla.serviciosIds.has(id);
                            const isChecked = selectedServiceIds.includes(id);
                            const arqs = resolverArquetiposDeEntidad(srv, arquetipos);

                            return (
                                <label
                                    key={id}
                                    className={cn(
                                        'flex items-center justify-between p-3 rounded-xl border transition-all',
                                        yaVinculada
                                            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                                            : isChecked
                                            ? 'bg-indigo-50 border-indigo-400 cursor-pointer shadow-2xs'
                                            : 'bg-white border-gray-200 hover:border-indigo-200 cursor-pointer'
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <input
                                            type="checkbox"
                                            disabled={yaVinculada}
                                            checked={yaVinculada || isChecked}
                                            onChange={() => !yaVinculada && toggleService(id)}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                {srv.nombre_tipo}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[10px] font-mono text-gray-500">
                                                    {srv.codigo_tipo}
                                                </span>
                                                {arqs.map(a => (
                                                    <span
                                                        key={a.codigo}
                                                        className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200"
                                                    >
                                                        {a.codigo}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {yaVinculada && (
                                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                                            ✓ Ya incluida
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-white cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={selectedServiceIds.length === 0 || isSubmitting}
                        onClick={handleVincular}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span>Vincular a {selectedServiceIds.length} Servicio(s)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: REUTILIZAR ACTIVIDADES DEL BANCO UNIVERSAL HACIA UN SERVICIO DESTINO
// ═══════════════════════════════════════════════════════════════════════════════
function ReutilizarDelBancoParaServicioModal({
    servicioDestino,
    plantillas = [],
    actividades = [],
    arquetipos = [],
    crearActividad,
    onClose,
}: {
    servicioDestino: any;
    plantillas: PlantillaUniversalActividad[];
    actividades: any[];
    arquetipos: any[];
    crearActividad: any;
    onClose: () => void;
}) {
    const idServicioDestino = Number(servicioDestino.id_tipo_servicio || servicioDestino.idTipoServicio);
    const arqsDestino = useMemo(
        () => resolverArquetiposDeEntidad(servicioDestino, arquetipos),
        [servicioDestino, arquetipos]
    );

    const [busqueda, setBusqueda] = useState('');
    const [soloCompatibles, setSoloCompatibles] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const plantillasDisponibles = useMemo(() => {
        return plantillas.filter(p => {
            if (p.serviciosIds.has(idServicioDestino)) return false;
            const term = busqueda.toLowerCase().trim();
            if (
                term &&
                !p.descripcionActividad.toLowerCase().includes(term) &&
                !p.sistemaNombre.toLowerCase().includes(term)
            ) {
                return false;
            }
            if (soloCompatibles && arqsDestino.length > 0) {
                return (
                    p.arquetipos.length === 0 ||
                    p.arquetipos.some(a => arqsDestino.some(ad => ad.codigo === a.codigo))
                );
            }
            return true;
        });
    }, [plantillas, idServicioDestino, busqueda, soloCompatibles, arqsDestino]);

    const toggleKey = (key: string) => {
        setSelectedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    };

    const handleImportarSeleccionadas = async () => {
        if (selectedKeys.length === 0) return;
        setIsSubmitting(true);
        try {
            const usedCodes = new Set<string>(
                (actividades || [])
                    .map((a: any) => (a.codigoActividad || a.codigo_actividad || '').toUpperCase().trim())
                    .filter(Boolean)
            );
            const actsInTarget = (actividades || []).filter(
                (a: any) => Number(a.idTipoServicio || a.id_tipo_servicio) === idServicioDestino
            );
            let nextOrden =
                Math.max(
                    0,
                    ...actsInTarget.map((a: any) => Number(a.ordenEjecucion || a.orden_ejecucion || 0))
                ) + 1;

            for (const key of selectedKeys) {
                const p = plantillas.find(item => item.key === key);
                if (!p) continue;

                const newCode = generarCodigoActividad(
                    `${p.descripcionActividad}_${idServicioDestino}`,
                    usedCodes
                );
                usedCodes.add(newCode);

                await crearActividad.mutateAsync({
                    codigoActividad: newCode,
                    descripcionActividad: p.descripcionActividad,
                    idTipoServicio: idServicioDestino,
                    idSistema: p.idSistema ? Number(p.idSistema) : undefined,
                    tipoActividad: p.tipoActividad,
                    ordenEjecucion: nextOrden++,
                    esObligatoria: p.esObligatoria,
                    tiempoEstimadoMinutos: p.tiempoEstimadoMinutos || undefined,
                    idParametroMedicion: p.idParametroMedicion ? Number(p.idParametroMedicion) : undefined,
                    instrucciones: p.instrucciones || undefined,
                    precauciones: p.precauciones || undefined,
                });
            }

            toast.success(
                `${selectedKeys.length} actividad(es) agregadas al checklist de ${
                    servicioDestino.nombre_tipo || servicioDestino.nombreTipoServicio
                }`
            );
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-indigo-50/70 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                            Reutilizar del Banco Universal →{' '}
                            {servicioDestino.nombre_tipo || servicioDestino.nombreTipoServicio}
                        </h3>
                        <p className="text-xs text-indigo-700 mt-0.5">
                            Selecciona las actividades existentes en el Banco Universal para incorporarlas automáticamente a este protocolo.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-indigo-100 text-gray-500 cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-3 overflow-y-auto flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar tarea por descripción o subsistema..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        {arqsDestino.length > 0 && (
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={soloCompatibles}
                                    onChange={e => setSoloCompatibles(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600"
                                />
                                <span>Solo de {arqsDestino.map(a => a.codigo).join('/')} o Universales</span>
                            </label>
                        )}
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {plantillasDisponibles.length === 0 ? (
                            <p className="text-center text-xs text-gray-500 py-10">
                                No hay más actividades disponibles con este filtro.
                            </p>
                        ) : (
                            plantillasDisponibles.map(p => {
                                const isChecked = selectedKeys.includes(p.key);
                                return (
                                    <label
                                        key={p.key}
                                        className={cn(
                                            'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                                            isChecked
                                                ? 'bg-indigo-50 border-indigo-400 shadow-2xs'
                                                : 'bg-white border-gray-200 hover:border-indigo-200'
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleKey(p.key)}
                                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900">
                                                {p.descripcionActividad}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-bold px-2 py-0.5 rounded',
                                                        getTipoActividadColor(p.tipoActividad)
                                                    )}
                                                >
                                                    {p.tipoActividad}
                                                </span>
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                                    {p.sistemaNombre}
                                                </span>
                                                {p.parametroInfo && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                                                        📏 {p.parametroInfo.unidad}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-white cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={selectedKeys.length === 0 || isSubmitting}
                        onClick={handleImportarSeleccionadas}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span>Agregar {selectedKeys.length} Actividad(es) al Checklist</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
