/**
 * MEKANOS S.A.S - Portal Admin
 * Wizard de Creación de Orden de Servicio - MULTI-EQUIPOS
 * 
 * Ruta: /ordenes/nueva
 * 
 * Flujo de 3 pasos:
 * 1. CONTEXTO: Cliente → Sede → EQUIPOS (múltiples)
 * 2. ALCANCE: Tipo de Servicio, Prioridad, Fecha
 * 3. ASIGNACIÓN: Técnico Principal
 */

'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    getCategoriaServicioColor,
    getCategoriaServicioLabel,
    getClienteLabel,
    getEquipoLabel,
    getTecnicoLabel,
    useCascadaClienteEquipo,
    useCrearOrden,
    useServiciosComerciales,
    useTecnicosSelector,
    useUltimasSeleccionesEquipos,
    useWizardCatalogos,
    type CatalogoServicio,
    type CategoriaSeleccion,
    type ClienteSelector,
    type EquipoSelector,
    type SeleccionEquipos,
    type TecnicoSelector,
    type TipoServicio,
} from '@/features/ordenes';
import { useEquipo } from '@/features/equipos';
import { SelectorCard } from '@/features/ordenes/components/selector-card';
import {
    clasificarServicioCorrectivo,
    detectarFamiliaEquipos,
    esServicioCompatibleConFamilia,
    type FamiliaEquipo,
} from '@/features/ordenes/lib/familia-equipo';
import { calculateSmartMatchScore } from '@/lib/search-utils';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Building2,
    Check,
    CheckCircle2,
    ClipboardList,
    History,
    Layers,
    Loader2,
    MapPin,
    Plus,
    Search,
    Settings,
    Tag,
    User,
    Wrench,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface WizardData {
    clienteId?: number;
    clienteSeleccionado?: ClienteSelector;
    sedeId?: number;
    equiposSeleccionados: EquipoSelector[];
    tipoServicioId?: number;
    tipoServicioSeleccionado?: TipoServicio;
    serviciosCorrectivosSeleccionados?: CatalogoServicio[];
    razonFalla?: string;
    prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
    fechaProgramada?: string;
    descripcion?: string;
    tecnicoId?: number;
    tecnicoSeleccionado?: TecnicoSelector;
    modoEscenario?: 'CASO_RAIZ' | 'SEGUIMIENTO_CASO' | 'VISITA_AISLADA';
    nombreCaso?: string;
    idOrdenPadre?: number;
    numeroOrdenPadre?: string;
    codigoCasoPadre?: string;
    nombreCasoPadre?: string;
    tipoVisita?: 'INICIAL' | 'CONTINUACION' | 'CORRECTIVO_DERIVADO' | 'GARANTIA' | 'AISLADA';
    idsPendientesAResolver?: number[];
}

type Paso = 1 | 2 | 3;

const PRIORIDADES = [
    { value: 'BAJA', label: 'Baja', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'ALTA', label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'URGENTE', label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function StepIndicator({ paso, pasoActual, label, icon: Icon }: { paso: Paso; pasoActual: Paso; label: string; icon: any }) {
    const completado = paso < pasoActual;
    const activo = paso === pasoActual;

    return (
        <div className="flex flex-col items-center group flex-1 relative">
            {/* Línea conectora */}
            {paso > 1 && (
                <div className={cn(
                    "absolute right-1/2 left-[-50%] top-5 h-0.5 -translate-y-1/2 z-0 transition-colors duration-500",
                    paso <= pasoActual ? "bg-blue-600" : "bg-slate-200"
                )} />
            )}

            <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl border-2 z-10 transition-all duration-500 shadow-sm',
                completado && 'bg-green-500 border-green-500 text-white scale-90 rotate-[360deg]',
                activo && 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 scale-110',
                !completado && !activo && 'bg-white border-slate-200 text-slate-400'
            )}>
                {completado ? (
                    <Check className="h-5 w-5 stroke-[3]" />
                ) : (
                    <Icon className={cn("h-5 w-5", activo ? "animate-pulse" : "")} />
                )}
            </div>

            <div className="mt-3 text-center">
                <span className={cn(
                    'text-[10px] font-bold uppercase tracking-widest transition-colors duration-300',
                    activo && 'text-blue-600',
                    completado && 'text-green-600',
                    !completado && !activo && 'text-slate-400'
                )}>
                    Paso {paso}
                </span>
                <p className={cn(
                    'text-xs font-bold transition-colors duration-300 hidden sm:block',
                    activo && 'text-slate-900',
                    completado && 'text-slate-500',
                    !completado && !activo && 'text-slate-400'
                )}>
                    {label}
                </p>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASOS DEL WIZARD
// ═══════════════════════════════════════════════════════════════════════════════

function PasoContexto({
    data,
    onChange,
}: {
    data: WizardData;
    onChange: (updates: Partial<WizardData>) => void;
}) {
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [busquedaEquipo, setBusquedaEquipo] = useState('');
    const [preselectEquipoId, setPreselectEquipoId] = useState<number | null>(null);

    // ✅ FIX 06-AGO-2026: Mini-filtro PREVEN/CORR en "Últimas selecciones"
    // (los correctivos puntuales de 1-2 equipos ensucian la lista; por defecto PREVEN.)
    const [filtroCategoria, setFiltroCategoria] = useState<CategoriaSeleccion>('PREVENTIVO');
    const OPCIONES_FILTRO: { key: CategoriaSeleccion; label: string }[] = [
        { key: 'PREVENTIVO', label: 'PREVEN.' },
        { key: 'CORRECTIVO', label: 'CORR.' },
        { key: 'TODAS', label: 'TODAS' },
    ];

    const { clientes, sedes, equipos, isLoadingClientes, isFetchingClientes, isLoadingSedes, isLoadingEquipos } =
        useCascadaClienteEquipo(data.clienteId, data.sedeId, busquedaCliente);

    // ✅ Preselección desde query params (?clienteId=...&equipoId=...&ordenPadreId=...&tipoVisita=...&pendientesIds=...)
    const [pendientesDetectados, setPendientesDetectados] = useState<any[]>([]);
    const [loadingPendientes, setLoadingPendientes] = useState(false);
    const [casosAbiertos, setCasosAbiertos] = useState<any[]>([]);
    const [loadingCasos, setLoadingCasos] = useState(false);
    const [busquedaCaso, setBusquedaCaso] = useState('');
    const [verCasosHistoricos, setVerCasosHistoricos] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const cId = params.get('clienteId') || params.get('id_cliente');
        const eId = params.get('equipoId');
        const oPadreId = params.get('ordenPadreId') || params.get('ordenOrigenId');
        const tVisita = params.get('tipoVisita') as any;
        const pIdsStr = params.get('pendientesIds') || params.get('pendienteId');

        const updates: Partial<WizardData> = {};
        if (cId && !data.clienteId) {
            updates.clienteId = Number(cId);
        }
        if (tVisita) {
            updates.tipoVisita = tVisita;
        }
        if (pIdsStr) {
            const pIds = pIdsStr.split(',').map(Number).filter(Boolean);
            if (pIds.length > 0) {
                updates.idsPendientesAResolver = pIds;
            }
        }
        if (Object.keys(updates).length > 0) {
            onChange(updates);
        }
        if (eId) {
            setPreselectEquipoId(Number(eId));
        }

        if (oPadreId) {
            apiClient
                .get(`/ordenes/${oPadreId}`)
                .then((res) => {
                    const ord = res.data?.data;
                    if (!ord) return;
                    const rootId = ord.id_orden_padre || ord.id_orden_servicio;
                    const rootNum = ord.orden_padre?.numero_orden || ord.numero_orden;
                    const pCaso = (ord.hilo_caso?.pendientes_caso || ord.ordenes_pendientes || []).filter(
                        (p: any) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION'
                    );
                    const autoPIds = pIdsStr
                        ? pIdsStr.split(',').map(Number).filter(Boolean)
                        : pCaso.map((p: any) => p.id_orden_pendiente);
                    const nextUpdates: Partial<WizardData> = {
                        modoEscenario: 'SEGUIMIENTO_CASO',
                        idOrdenPadre: rootId,
                        numeroOrdenPadre: rootNum,
                        codigoCasoPadre: ord.hilo_caso?.codigo_caso || rootNum.replace(/^OS-/, 'CASO-'),
                        nombreCasoPadre: ord.hilo_caso?.nombre_caso || ord.nombre_caso || ord.descripcion_inicial,
                        tipoVisita: tVisita || 'CORRECTIVO_DERIVADO',
                        idsPendientesAResolver: autoPIds,
                    };
                    if (!cId && (ord.clientes?.id_cliente || ord.id_cliente)) {
                        nextUpdates.clienteId = ord.clientes?.id_cliente || ord.id_cliente;
                    }
                    if (!eId && ord.ordenes_equipos?.length > 0) {
                        const firstEq = ord.ordenes_equipos[0]?.equipo || ord.ordenes_equipos[0]?.equipos;
                        if (firstEq?.id_equipo) {
                            setPreselectEquipoId(firstEq.id_equipo);
                        }
                    } else if (!eId && ord.equipos?.id_equipo) {
                        setPreselectEquipoId(ord.equipos.id_equipo);
                    }
                    onChange(nextUpdates);
                })
                .catch((err) => console.error('Error cargando orden padre:', err));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ Detector Proactivo de Casos Abiertos Reales y Pendientes del Cliente
    useEffect(() => {
        if (!data.clienteId) {
            setPendientesDetectados([]);
            setCasosAbiertos([]);
            return;
        }
        setLoadingPendientes(true);
        setLoadingCasos(true);
        const eqIds = data.equiposSeleccionados.map((e) => e.id_equipo);

        const queryPendientes = new URLSearchParams();
        queryPendientes.set('idCliente', String(data.clienteId));
        queryPendientes.set('estado', 'ACTIVOS');
        if (eqIds.length > 0) {
            queryPendientes.set('idEquipos', eqIds.join(','));
        }

        const queryCasos = new URLSearchParams();
        queryCasos.set('idCliente', String(data.clienteId));
        if (eqIds.length > 0) {
            queryCasos.set('idEquipos', eqIds.join(','));
        }
        if (verCasosHistoricos) {
            queryCasos.set('incluirHistoricos', 'true');
        }

        Promise.all([
            apiClient
                .get(`/ordenes/backlog-pendientes?${queryPendientes.toString()}`)
                .then((res) => {
                    if (res.data?.success && Array.isArray(res.data.data)) {
                        setPendientesDetectados(res.data.data);
                    }
                })
                .catch(() => {}),
            apiClient
                .get(`/ordenes/casos-abiertos?${queryCasos.toString()}`)
                .then((res) => {
                    if (res.data?.success && Array.isArray(res.data.data)) {
                        setCasosAbiertos(res.data.data);
                    }
                })
                .catch(() => {}),
        ]).finally(() => {
            setLoadingPendientes(false);
            setLoadingCasos(false);
        });
    }, [data.clienteId, data.equiposSeleccionados, verCasosHistoricos]);

    const togglePendienteResolver = (idPendiente: number) => {
        const actuales = data.idsPendientesAResolver || [];
        const existe = actuales.includes(idPendiente);
        const nuevos = existe
            ? actuales.filter((id) => id !== idPendiente)
            : [...actuales, idPendiente];
        onChange({ idsPendientesAResolver: nuevos });
    };

    const casosFiltrados = useMemo(() => {
        const s = busquedaCaso.trim().toLowerCase();
        if (!s) return casosAbiertos;
        return casosAbiertos.filter((c) => {
            const matchNombre = c.nombre_caso?.toLowerCase().includes(s);
            const matchCod = c.codigo_caso?.toLowerCase().includes(s);
            const matchOrd = c.numero_orden_raiz?.toLowerCase().includes(s);
            const matchEq = (c.equipos || []).some(
                (e: any) =>
                    e.codigo_equipo?.toLowerCase().includes(s) ||
                    e.nombre_equipo?.toLowerCase().includes(s)
            );
            const matchPend = (c.pendientes_activos || []).some((p: any) =>
                p.descripcion?.toLowerCase().includes(s)
            );
            return matchNombre || matchCod || matchOrd || matchEq || matchPend;
        });
    }, [casosAbiertos, busquedaCaso]);

    const modoActual =
        data.modoEscenario || (data.idOrdenPadre ? 'SEGUIMIENTO_CASO' : 'CASO_RAIZ');

    useEffect(() => {
        if (data.clienteId && !data.clienteSeleccionado && clientes.length > 0) {
            const found = clientes.find((c) => c.id_cliente === data.clienteId);
            if (found) {
                onChange({ clienteSeleccionado: found });
            }
        }
    }, [data.clienteId, data.clienteSeleccionado, clientes, onChange]);

    // Carga directa del equipo para preselección instantánea Zero-Trust
    const { data: preselectEquipoData } = useEquipo(preselectEquipoId || 0);

    useEffect(() => {
        if (!preselectEquipoId || !preselectEquipoData?.data) return;
        const eqData = preselectEquipoData.data;

        // Auto-asignar cliente si venía ausente o incompleto
        if ((!data.clienteId || !data.clienteSeleccionado) && eqData.cliente) {
            onChange({
                clienteId: eqData.cliente.id_cliente,
                clienteSeleccionado: {
                    id_cliente: eqData.cliente.id_cliente,
                    codigo_cliente: eqData.cliente.codigo_cliente,
                    nombre_comercial: eqData.cliente.nombre,
                    razon_social: eqData.cliente.nombre,
                    numero_identificacion: eqData.cliente.numero_documento || '',
                    total_equipos: 1,
                } as any,
            });
        }

        // Preseleccionar el equipo inmediatamente en el wizard
        if (data.equiposSeleccionados.length === 0) {
            const eqItem: EquipoSelector = {
                id_equipo: eqData.id_equipo,
                codigo_equipo: eqData.codigo_equipo,
                nombre_equipo: eqData.nombre_equipo,
                tipo: eqData.tipo,
                tipo_equipo: eqData.tipo,
                marca: eqData.marca,
                modelo: eqData.modelo,
                serie: eqData.numero_serie_equipo || '',
                ubicacion: eqData.ubicacion_texto || '',
                estado: eqData.estado_equipo,
                horas_actuales: Number(eqData.horas_actuales || 0),
                id_sede: eqData.id_sede,
                sede: eqData.sede?.nombre || '',
                id_tipo_equipo: eqData.id_tipo_equipo,
                tipos_equipo: eqData.tipos_equipo,
            };
            onChange({ equiposSeleccionados: [eqItem] });
            setPreselectEquipoId(null);
        }
    }, [preselectEquipoId, preselectEquipoData, data.clienteId, data.clienteSeleccionado, data.equiposSeleccionados.length, onChange]);

    useEffect(() => {
        if (preselectEquipoId && equipos.length > 0 && data.equiposSeleccionados.length === 0) {
            const eq = equipos.find((e) => e.id_equipo === preselectEquipoId);
            if (eq) {
                onChange({ equiposSeleccionados: [eq] });
                setPreselectEquipoId(null);
            }
        }
    }, [preselectEquipoId, equipos, data.equiposSeleccionados.length, onChange]);

    // ✅ FIX 06-AGO-2026: Últimas selecciones de equipos del cliente (y tipo de servicio si ya se eligió)
    const { data: ultimasSelecciones = [], isLoading: isLoadingSelecciones } =
        useUltimasSeleccionesEquipos(data.clienteId, data.tipoServicioId);

    const seleccionesFiltradas = ultimasSelecciones.filter((s) => {
        if (filtroCategoria === 'TODAS') return true;
        return (s.tipo_servicio?.categoria ?? '') === filtroCategoria;
    });

    const equiposDisponibles = equipos
        .filter((e) => !data.equiposSeleccionados.some((sel) => sel.id_equipo === e.id_equipo))
        .filter((e) => {
            if (!busquedaEquipo.trim()) return true;
            const searchTerm = busquedaEquipo.toLowerCase();
            return (
                e.nombre_equipo?.toLowerCase().includes(searchTerm) ||
                e.codigo_equipo?.toLowerCase().includes(searchTerm) ||
                e.tipos_equipo?.nombre_tipo?.toLowerCase().includes(searchTerm) ||
                e.marca?.toLowerCase().includes(searchTerm) ||
                e.modelo?.toLowerCase().includes(searchTerm) ||
                e.serie?.toLowerCase().includes(searchTerm)
            );
        });

    const agregarEquipo = (equipo: EquipoSelector) => {
        const nuevosEquipos = [...data.equiposSeleccionados, equipo];
        const updates: Partial<WizardData> = {
            equiposSeleccionados: nuevosEquipos,
        };
        if (data.tipoServicioSeleccionado) {
            const nuevaFamilia = detectarFamiliaEquipos(nuevosEquipos);
            if (!esServicioCompatibleConFamilia(data.tipoServicioSeleccionado, nuevaFamilia)) {
                updates.tipoServicioId = undefined;
                updates.tipoServicioSeleccionado = undefined;
                updates.serviciosCorrectivosSeleccionados = [];
            }
        }
        onChange(updates);
    };

    const quitarEquipo = (idEquipo: number) => {
        const nuevosEquipos = data.equiposSeleccionados.filter((e) => e.id_equipo !== idEquipo);
        const updates: Partial<WizardData> = {
            equiposSeleccionados: nuevosEquipos,
        };
        if (data.tipoServicioSeleccionado) {
            const nuevaFamilia = detectarFamiliaEquipos(nuevosEquipos);
            if (!esServicioCompatibleConFamilia(data.tipoServicioSeleccionado, nuevaFamilia)) {
                updates.tipoServicioId = undefined;
                updates.tipoServicioSeleccionado = undefined;
                updates.serviciosCorrectivosSeleccionados = [];
            }
        }
        onChange(updates);
    };

    // ✅ FIX 06-AGO-2026: Aplicar una selección anterior (equipos + tipo de servicio)
    const aplicarSeleccion = (seleccion: SeleccionEquipos) => {
        onChange({
            equiposSeleccionados: seleccion.equipos,
            tipoServicioId: seleccion.tipo_servicio?.id_tipo_servicio,
            tipoServicioSeleccionado: seleccion.tipo_servicio
                ? (seleccion.tipo_servicio as TipoServicio)
                : undefined,
        });
        toast.success(`Se aplicaron ${seleccion.equipos.length} equipos de ${seleccion.numero_orden}`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Contexto del Servicio</h3>
                        <p className="text-slate-600 text-sm">
                            Identifique al cliente y los activos que requieren intervención técnica.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            Cliente Titular *
                        </label>
                        <SelectorCard
                            items={clientes}
                            selectedId={data.clienteId}
                            onSelect={(cliente, id) => {
                                setBusquedaCaso('');
                                setVerCasosHistoricos(false);
                                onChange({
                                    clienteId: id,
                                    clienteSeleccionado: cliente,
                                    sedeId: undefined,
                                    equiposSeleccionados: [],
                                    modoEscenario: 'CASO_RAIZ',
                                    nombreCaso: '',
                                    idOrdenPadre: undefined,
                                    numeroOrdenPadre: undefined,
                                    codigoCasoPadre: undefined,
                                    nombreCasoPadre: undefined,
                                    tipoVisita: 'INICIAL',
                                    idsPendientesAResolver: [],
                                });
                            }}
                            getLabel={getClienteLabel}
                            getSubtitle={(c) => (
                                <span className="text-xs text-slate-500">NIT: {c.persona?.numero_identificacion || 'N/A'}</span>
                            )}
                            renderIcon={() => <Building2 className="h-5 w-5" />}
                            getId={(c) => c.id_cliente}
                            isLoading={isLoadingClientes}
                            isFetching={isFetchingClientes}
                            emptyMessage={busquedaCliente ? 'No se encontraron clientes con ese criterio' : 'No hay clientes activos'}
                            searchPlaceholder="Buscar cliente..."
                            debounceMs={0}
                            onSearchChange={setBusquedaCliente}
                        />
                    </div>

                    {data.clienteId && sedes.length > 0 && (
                        <div className="animate-in fade-in duration-300">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                                <MapPin className="h-4 w-4 text-red-500" />
                                Ubicación / Sede
                            </label>
                            <SelectorCard
                                items={sedes}
                                selectedId={data.sedeId}
                                onSelect={(sede, id) => onChange({
                                    sedeId: id,
                                    equiposSeleccionados: [],
                                })}
                                getLabel={(s) => s.nombre_sede}
                                getSubtitle={(s) => <span className="text-xs text-slate-500">{s.direccion || s.ciudad}</span>}
                                renderIcon={() => <MapPin className="h-5 w-5" />}
                                getId={(s) => s.id_sede}
                                isLoading={isLoadingSedes}
                                emptyMessage="El cliente no tiene sedes"
                            />
                        </div>
                    )}

                    {/* ✅ FIX 06-AGO-2026: Últimas selecciones de equipos del cliente (debajo de Cliente/Sede) */}
                    {data.clienteId && (isLoadingSelecciones || ultimasSelecciones.length > 0) && (
                        <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2">
                                <div className="flex items-center gap-1.5">
                                    <History className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                                        Últimas selecciones
                                    </span>
                                    <span className="hidden sm:inline text-[9px] text-purple-400 font-bold">
                                        (clic para reutilizar)
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {OPCIONES_FILTRO.map((op) => (
                                        <button
                                            key={op.key}
                                            type="button"
                                            onClick={() => setFiltroCategoria(op.key)}
                                            className={cn(
                                                'text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border transition-colors',
                                                filtroCategoria === op.key
                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                    : 'bg-white text-purple-500 border-purple-200 hover:bg-purple-100'
                                            )}
                                        >
                                            {op.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {isLoadingSelecciones ? (
                                <div className="flex justify-center py-2">
                                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 content-start">
                                    {seleccionesFiltradas.length === 0 && ultimasSelecciones.length > 0 ? (
                                        <div className="text-[9px] font-bold text-purple-600 text-center py-2 bg-white rounded-lg border border-dashed border-purple-200 col-span-full">
                                            Sin selecciones {filtroCategoria === 'PREVENTIVO' ? 'PREVENTIVAS' : 'CORRECTIVAS'} recientes — cambie el filtro
                                        </div>
                                    ) : (
                                        seleccionesFiltradas.map((s) => (
                                        <button
                                            key={s.id_orden_servicio}
                                            type="button"
                                            onClick={() => aplicarSeleccion(s)}
                                            className="w-full text-left p-2 rounded-lg border-2 border-dashed border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50 transition-all group min-w-0"
                                            title={`Aplicar ${s.equipos.length} equipos de ${s.numero_orden}`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[10px] font-black text-purple-800 truncate min-w-0">
                                                    {s.numero_orden}
                                                    {s.tipo_servicio?.categoria && (
                                                        <span className={cn('ml-1.5 text-[8px] font-bold rounded-full px-1.5 py-0.5 align-middle', getCategoriaServicioColor(s.tipo_servicio.categoria))}>
                                                            {getCategoriaServicioLabel(s.tipo_servicio.categoria)}
                                                        </span>
                                                    )}
                                                </p>
                                                {s.fecha_creacion && (
                                                    <span className="text-[8px] text-slate-400 font-bold shrink-0">
                                                        {new Date(s.fecha_creacion).toLocaleDateString('es-CO')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {s.equipos.slice(0, 6).map((e) => (
                                                    <span key={e.id_equipo} className="text-[8px] font-bold bg-purple-50 border border-purple-200 text-purple-700 rounded-md px-1.5 py-0.5 truncate max-w-full">
                                                        {e.codigo_equipo || e.nombre_equipo}
                                                    </span>
                                                ))}
                                                {s.equipos.length > 6 && (
                                                    <span className="text-[8px] font-bold text-purple-400">+{s.equipos.length - 6}</span>
                                                )}
                                            </div>
                                            <p className="text-[8px] font-bold text-purple-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Aplicar selección ({s.equipos.length} equipos) →
                                            </p>
                                        </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                        <Wrench className="h-4 w-4 text-blue-500" />
                        Equipos a intervenir ({data.equiposSeleccionados.length})
                    </label>

                    {!data.clienteId ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-slate-50 text-slate-400 text-sm">
                            Seleccione un cliente para ver sus equipos.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Search input for equipment */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar equipos por nombre, código, tipo o marca..."
                                    value={busquedaEquipo}
                                    onChange={(e) => setBusquedaEquipo(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                                />
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {isLoadingEquipos ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                                ) : equiposDisponibles.length === 0 ? (
                                    <div className="text-xs text-center text-slate-400 p-4 border rounded-xl">No hay más equipos disponibles</div>
                                ) : (
                                    equiposDisponibles.map((e) => (
                                        <button key={e.id_equipo} onClick={() => agregarEquipo(e)} className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-all text-left bg-white shadow-sm">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-700 text-sm break-words">{getEquipoLabel(e)}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">{e.tipos_equipo?.nombre_tipo}</p>
                                            </div>
                                            <Plus className="h-4 w-4 text-blue-500" />
                                        </button>
                                    ))
                                )}
                            </div>

                            {data.equiposSeleccionados.length > 0 && (
                                <div className="space-y-2 pt-4 border-t">
                                    {data.equiposSeleccionados.map((e) => (
                                        <div key={e.id_equipo} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-blue-900 text-sm break-words">{getEquipoLabel(e)}</p>
                                                <p className="text-[10px] text-blue-600 uppercase font-bold">{e.tipos_equipo?.nombre_tipo}</p>
                                            </div>
                                            <button onClick={() => quitarEquipo(e.id_equipo)} className="p-1 text-blue-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ BLOQUE 3: SELECTOR EXPLÍCITO DE CONTINUIDAD DEL CASO Y PENDIENTES ABIERTOS */}
            {data.clienteId && (
                <div className="pt-6 border-t border-slate-200 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                                <Layers className="h-4 w-4 text-indigo-600" />
                                Escenario / Continuidad del Caso y Pendientes Abiertos
                            </label>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Defina si esta orden abre un nuevo Caso Base con nombre propio (Opción A), se encadena a un Caso Abierto (Opción B) o es una Visita Puntual Aislada (Opción C).
                            </p>
                        </div>
                        {(loadingPendientes || loadingCasos) && (
                            <span className="text-xs text-indigo-600 flex items-center gap-1.5 font-semibold">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando casos y pendientes...
                            </span>
                        )}
                    </div>

                    {/* 3 Opciones de Continuidad (Exclusividad Mutua Estricta) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Opción A: Nuevo Caso Base (Visita #1) */}
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    modoEscenario: 'CASO_RAIZ',
                                    idOrdenPadre: undefined,
                                    numeroOrdenPadre: undefined,
                                    codigoCasoPadre: undefined,
                                    nombreCasoPadre: undefined,
                                    tipoVisita: 'INICIAL',
                                    idsPendientesAResolver: [],
                                })
                            }
                            className={cn(
                                'p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer',
                                modoActual === 'CASO_RAIZ'
                                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-blue-300'
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                                        Opción A • Visita #1
                                    </span>
                                    {modoActual === 'CASO_RAIZ' && (
                                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                                    )}
                                </div>
                                <p className="font-bold text-slate-900 text-xs">
                                    Abrir Nuevo Caso Base (Expediente Raíz)
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                    Inicia un nuevo caso técnico con nombre e identificador propios. Queda inmediatamente abierto para futuras visitas.
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md self-start">
                                🟢 Crea Caso Abierto inmediato
                            </span>
                        </button>

                        {/* Opción B: Vincular a Caso Abierto Existente */}
                        <button
                            type="button"
                            onClick={() => {
                                onChange({
                                    modoEscenario: 'SEGUIMIENTO_CASO',
                                    tipoVisita:
                                        data.tipoVisita &&
                                        data.tipoVisita !== 'INICIAL' &&
                                        data.tipoVisita !== 'AISLADA'
                                            ? data.tipoVisita
                                            : 'CORRECTIVO_DERIVADO',
                                });
                            }}
                            className={cn(
                                'p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer',
                                modoActual === 'SEGUIMIENTO_CASO'
                                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-indigo-300'
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                                        Opción B • Seguimiento
                                    </span>
                                    {modoActual === 'SEGUIMIENTO_CASO' && (
                                        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                    )}
                                </div>
                                <p className="font-bold text-slate-900 text-xs">
                                    Vincular como Nueva Visita a Caso Abierto
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                    Busque y seleccione un Caso Raíz existente del cliente para encadenar esta visita y heredar sus pendientes.
                                </p>
                            </div>
                            <span
                                className={cn(
                                    'text-[10px] font-bold px-2 py-0.5 rounded-md self-start',
                                    casosAbiertos.length > 0
                                        ? 'text-indigo-700 bg-indigo-100/80'
                                        : 'text-slate-600 bg-slate-100'
                                )}
                            >
                                {casosAbiertos.length > 0
                                    ? `${casosAbiertos.length} caso(s) abierto(s) disponible(s)`
                                    : '0 casos abiertos actualmente'}
                            </span>
                        </button>

                        {/* Opción C: Visita Independiente sin abrir caso ni arrastrar pendientes */}
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    modoEscenario: 'VISITA_AISLADA',
                                    idOrdenPadre: undefined,
                                    numeroOrdenPadre: undefined,
                                    codigoCasoPadre: undefined,
                                    nombreCasoPadre: undefined,
                                    nombreCaso: '',
                                    tipoVisita: 'AISLADA',
                                    idsPendientesAResolver: [],
                                })
                            }
                            className={cn(
                                'p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer',
                                modoActual === 'VISITA_AISLADA'
                                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-emerald-300'
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                        Opción C • Aislada
                                    </span>
                                    {modoActual === 'VISITA_AISLADA' && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    )}
                                </div>
                                <p className="font-bold text-slate-900 text-xs">
                                    Visita Independiente (Sin arrastrar pendientes)
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                    Crea una orden puntual aislada, sin abrir un expediente de seguimiento ni arrastrar pendientes abiertos de otros servicios.
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md self-start">
                                ⚡ Orden limpia e independiente
                            </span>
                        </button>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════════════════
                        PANEL DINÁMICO SEGÚN OPCIÓN SELECCIONADA (A, B o C)
                    ═══════════════════════════════════════════════════════════════════════════ */}

                    {/* 1. PANEL OPCIÓN A: IDENTIDAD DEL NUEVO CASO BASE */}
                    {modoActual === 'CASO_RAIZ' && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 border border-blue-200 shadow-2xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                                        🆕 Nuevo Caso Base (Visita #1)
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">
                                        Identidad y Nombre Característico del Caso
                                    </span>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    🟢 Estado Inicial: CASO ABIERTO
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Nombre del Caso / Escenario de Trabajo (Para búsqueda y trazabilidad de futuras visitas)
                                </label>
                                <input
                                    type="text"
                                    value={data.nombreCaso || ''}
                                    onChange={(e) => onChange({ nombreCaso: e.target.value })}
                                    placeholder={
                                        data.equiposSeleccionados[0]
                                            ? `Ej: Diagnóstico y reparación de fuga en radiador — ${data.equiposSeleccionados[0].codigo_equipo}`
                                            : 'Ej: Diagnóstico de falla en sistema de enfriamiento / Mantenimiento Preventivo...'
                                    }
                                    className="w-full px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                {/* Sugerencias rápidas en 1 clic */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                                        Sugerencias rápidas:
                                    </span>
                                    {[
                                        data.equiposSeleccionados[0]
                                            ? `Intervención técnica y seguimiento — ${data.equiposSeleccionados[0].codigo_equipo}`
                                            : 'Intervención técnica y seguimiento operativo',
                                        data.equiposSeleccionados[0]
                                            ? `Mantenimiento preventivo y control de hallazgos — ${data.equiposSeleccionados[0].codigo_equipo}`
                                            : 'Mantenimiento preventivo y control de hallazgos',
                                        data.equiposSeleccionados[0]
                                            ? `Diagnóstico y reparación correctiva — ${data.equiposSeleccionados[0].codigo_equipo}`
                                            : 'Diagnóstico y reparación correctiva en sede',
                                    ].map((sug) => (
                                        <button
                                            key={sug}
                                            type="button"
                                            onClick={() => onChange({ nombreCaso: sug })}
                                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                                        >
                                            + {sug}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    Al crear esta orden, el caso quedará registrado inmediatamente como <strong>Caso Abierto</strong> con este nombre propio, sin requerir una segunda visita previa para ser reconocido.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 2. PANEL OPCIÓN B: BUSCADOR Y SELECTOR INTELIGENTE DE CASOS ABIERTOS */}
                    {modoActual === 'SEGUIMIENTO_CASO' && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border-2 border-indigo-200 shadow-xs space-y-4">
                            {/* Cabecera del Contenedor de Selección de Caso */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                                            🗂️ Selección de Caso Raíz para Encadenar Visita
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                            {casosAbiertos.length} {verCasosHistoricos ? 'caso(s) totales' : 'caso(s) abierto(s)'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Busque por nombre del caso, código (CASO-... / OS-...), equipo o pendiente y haga clic en el caso que desea continuar.
                                    </p>
                                </div>

                                {data.idOrdenPadre ? (
                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                        <span className="text-xs font-mono font-extrabold text-white bg-indigo-600 px-3 py-1.5 rounded-xl shadow-2xs">
                                            ✓ Caso Seleccionado: {data.codigoCasoPadre || data.numeroOrdenPadre || `#${data.idOrdenPadre}`}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onChange({
                                                    idOrdenPadre: undefined,
                                                    numeroOrdenPadre: undefined,
                                                    codigoCasoPadre: undefined,
                                                    nombreCasoPadre: undefined,
                                                    idsPendientesAResolver: [],
                                                })
                                            }
                                            className="text-xs font-bold text-red-600 hover:underline cursor-pointer px-1"
                                        >
                                            Quitar selección
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl self-start sm:self-center">
                                        👆 Seleccione un caso de la lista inferior
                                    </span>
                                )}
                            </div>

                            {/* Barra de Búsqueda de Casos */}
                            {(casosAbiertos.length > 0 || verCasosHistoricos) && (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={busquedaCaso}
                                        onChange={(e) => setBusquedaCaso(e.target.value)}
                                        placeholder="Buscar caso por nombre característico, código CASO-..., orden OS-..., equipo o pendiente..."
                                        className="w-full pl-10 pr-24 py-2.5 text-sm font-medium bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                                    {busquedaCaso && (
                                        <button
                                            type="button"
                                            onClick={() => setBusquedaCaso('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                                        >
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Estado Vacío Inteligente cuando el Cliente NO tiene Casos Abiertos (ej. HOTEL ARSENAL) */}
                            {!loadingCasos && casosAbiertos.length === 0 && (
                                <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-indigo-200 text-center space-y-3">
                                    <div className="mx-auto w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                        <AlertTriangle className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1 max-w-lg mx-auto">
                                        <p className="text-sm font-extrabold text-slate-900">
                                            {data.clienteSeleccionado
                                                ? `${getClienteLabel(data.clienteSeleccionado)} no tiene casos técnicos abiertos actualmente`
                                                : 'Este cliente no tiene casos técnicos abiertos actualmente'}
                                        </p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            El sistema no impone órdenes cerradas automáticamente. Para iniciar un nuevo escenario de trabajo, utilice la <strong>Opción A (Abrir Nuevo Caso Base)</strong>, o si desea reabrir una orden histórica cerrada como caso raíz, púlselo abajo.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onChange({
                                                    modoEscenario: 'CASO_RAIZ',
                                                    idOrdenPadre: undefined,
                                                    numeroOrdenPadre: undefined,
                                                    codigoCasoPadre: undefined,
                                                    nombreCasoPadre: undefined,
                                                    tipoVisita: 'INICIAL',
                                                    idsPendientesAResolver: [],
                                                })
                                            }
                                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                                        >
                                            🆕 Ir a Opción A: Abrir Nuevo Caso Base
                                        </button>
                                        {!verCasosHistoricos && (
                                            <button
                                                type="button"
                                                onClick={() => setVerCasosHistoricos(true)}
                                                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all cursor-pointer"
                                            >
                                                🕰️ Buscar en órdenes históricas cerradas del cliente
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Grid de Tarjetas de Casos Abiertos */}
                            {casosFiltrados.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                                    {casosFiltrados.map((caso) => {
                                        const isSel = data.idOrdenPadre === caso.id_orden_raiz;
                                        return (
                                            <button
                                                key={caso.id_orden_raiz}
                                                type="button"
                                                onClick={() => {
                                                    const updates: Partial<WizardData> = {
                                                        modoEscenario: 'SEGUIMIENTO_CASO',
                                                        idOrdenPadre: caso.id_orden_raiz,
                                                        numeroOrdenPadre: caso.numero_orden_raiz,
                                                        codigoCasoPadre: caso.codigo_caso,
                                                        nombreCasoPadre: caso.nombre_caso,
                                                        tipoVisita:
                                                            data.tipoVisita &&
                                                            data.tipoVisita !== 'INICIAL' &&
                                                            data.tipoVisita !== 'AISLADA'
                                                                ? data.tipoVisita
                                                                : 'CORRECTIVO_DERIVADO',
                                                        idsPendientesAResolver:
                                                            caso.pendientes_activos_ids || [],
                                                    };
                                                    // Si aún no había seleccionado equipo en el wizard y el caso tiene equipo, preseleccionarlo
                                                    if (
                                                        data.equiposSeleccionados.length === 0 &&
                                                        caso.equipos?.[0]?.id_equipo
                                                    ) {
                                                        const eqMatch = equipos.find(
                                                            (e) => e.id_equipo === caso.equipos[0].id_equipo
                                                        );
                                                        if (eqMatch) {
                                                            updates.equiposSeleccionados = [eqMatch];
                                                        }
                                                    }
                                                    onChange(updates);
                                                }}
                                                className={cn(
                                                    'p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer',
                                                    isSel
                                                        ? 'bg-indigo-950 text-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                                                        : 'bg-white text-slate-800 border-indigo-100 hover:border-indigo-400 hover:shadow-xs'
                                                )}
                                            >
                                                <div className="space-y-1.5 w-full">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span
                                                                className={cn(
                                                                    'px-2 py-0.5 rounded-md font-mono font-extrabold text-[11px]',
                                                                    isSel
                                                                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                                                                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                                                )}
                                                            >
                                                                {caso.codigo_caso}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    'text-[10px] font-mono font-semibold',
                                                                    isSel ? 'text-slate-300' : 'text-slate-400'
                                                                )}
                                                            >
                                                                (Raíz: {caso.numero_orden_raiz})
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={cn(
                                                                'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                                                                caso.estado_caso === 'ABIERTO'
                                                                    ? isSel
                                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            )}
                                                        >
                                                            {caso.estado_caso === 'ABIERTO'
                                                                ? '🟢 Caso Abierto'
                                                                : '🕰️ Histórico'}
                                                        </span>
                                                    </div>

                                                    {/* Nombre Característico del Caso */}
                                                    <p
                                                        className={cn(
                                                            'font-extrabold text-xs leading-snug line-clamp-2',
                                                            isSel ? 'text-white' : 'text-slate-900'
                                                        )}
                                                    >
                                                        📋 {caso.nombre_caso}
                                                    </p>
                                                </div>

                                                {/* Metadatos del Caso: Equipos, Visitas y Pendientes */}
                                                <div className="pt-2 border-t border-slate-100/20 flex items-center justify-between gap-2 flex-wrap w-full">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {caso.equipos?.map((eq: any) => (
                                                            <span
                                                                key={eq.id_equipo}
                                                                className={cn(
                                                                    'text-[10px] font-bold px-2 py-0.5 rounded-md',
                                                                    isSel
                                                                        ? 'bg-white/10 text-indigo-200'
                                                                        : 'bg-slate-100 text-slate-700'
                                                                )}
                                                            >
                                                                🔧 {eq.codigo_equipo || eq.nombre_equipo}
                                                            </span>
                                                        ))}
                                                        <span
                                                            className={cn(
                                                                'text-[10px] font-bold px-2 py-0.5 rounded-md',
                                                                isSel
                                                                    ? 'bg-indigo-500/30 text-white'
                                                                    : 'bg-blue-50 text-blue-700'
                                                            )}
                                                        >
                                                            {caso.total_visitas} visita(s) → Visita #{caso.proxima_visita_numero}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'text-[10px] font-bold px-2 py-0.5 rounded-md',
                                                                caso.pendientes_activos_count > 0
                                                                    ? isSel
                                                                        ? 'bg-amber-500/30 text-amber-200'
                                                                        : 'bg-amber-100 text-amber-800'
                                                                    : isSel
                                                                    ? 'bg-white/10 text-slate-300'
                                                                    : 'bg-slate-100 text-slate-500'
                                                            )}
                                                        >
                                                            {caso.pendientes_activos_count > 0
                                                                ? `🎯 ${caso.pendientes_activos_count} pendiente(s)`
                                                                : '0 pendientes activos'}
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={cn(
                                                            'text-xs font-extrabold shrink-0',
                                                            isSel ? 'text-emerald-300' : 'text-indigo-600'
                                                        )}
                                                    >
                                                        {isSel ? '✓ Seleccionado' : 'Seleccionar →'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Configuración de la Naturaleza de la Visita cuando ya se seleccionó el Caso */}
                            {data.idOrdenPadre && (
                                <div className="p-4 rounded-xl bg-indigo-950 text-white border border-indigo-500/40 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 block">
                                                Secuencia Encadenada Confirmada
                                            </span>
                                            <p className="text-xs font-bold text-white mt-0.5">
                                                📋 {data.nombreCasoPadre || `Caso ${data.codigoCasoPadre || data.numeroOrdenPadre}`}
                                            </p>
                                        </div>
                                        <span className="text-xs font-mono font-bold bg-indigo-500/30 border border-indigo-400/40 px-2.5 py-1 rounded-lg">
                                            {data.codigoCasoPadre || data.numeroOrdenPadre}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-indigo-200 mr-1">
                                            Naturaleza de esta nueva visita:
                                        </span>
                                        {([
                                            { key: 'CORRECTIVO_DERIVADO', label: '🔧 Correctivo Derivado (Hallazgos)' },
                                            { key: 'CONTINUACION', label: '⏳ Continuación Operativa (2da Jornada)' },
                                            { key: 'GARANTIA', label: '🛡️ Visita por Garantía' },
                                        ] as const).map((op) => (
                                            <button
                                                key={op.key}
                                                type="button"
                                                onClick={() => onChange({ tipoVisita: op.key })}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                                                    (data.tipoVisita || 'CORRECTIVO_DERIVADO') === op.key
                                                        ? 'bg-indigo-500 text-white border-indigo-300 shadow-xs'
                                                        : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/10'
                                                )}
                                            >
                                                {op.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. PANEL OPCIÓN C: CONFIRMACIÓN DE VISITA INDEPENDIENTE / AISLADA */}
                    {modoActual === 'VISITA_AISLADA' && (
                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                                    ⚡ Modo Visita Independiente / Aislada Activo
                                </p>
                                <p className="text-xs text-emerald-800 leading-relaxed">
                                    Esta orden se ejecutará como una intervención puntual aislada. No abrirá un Caso Base en el listado de casos abiertos ni arrastrará pendientes abiertos de otros servicios.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Matriz Interactiva de Pendientes Abiertos (Solo visible en Opción A u Opción B, oculta en Opción C) */}
                    {modoActual !== 'VISITA_AISLADA' && pendientesDetectados.length > 0 && (
                        <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                                        🎯 Pendientes Abiertos Disponibles para Resolver en esta Orden
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-600 text-white">
                                        {(data.idsPendientesAResolver || []).length} / {pendientesDetectados.length} seleccionados
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChange({
                                                idsPendientesAResolver: pendientesDetectados.map(
                                                    (p) => p.id_orden_pendiente
                                                ),
                                            })
                                        }
                                        className="font-bold text-amber-800 hover:underline cursor-pointer"
                                    >
                                        Seleccionar todos
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => onChange({ idsPendientesAResolver: [] })}
                                        className="font-medium text-slate-500 hover:underline cursor-pointer"
                                    >
                                        Ninguno
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                                {pendientesDetectados.map((p) => {
                                    const checked = (data.idsPendientesAResolver || []).includes(
                                        p.id_orden_pendiente
                                    );
                                    const alcance = p.alcance || 'EQUIPO';
                                    return (
                                        <div
                                            key={p.id_orden_pendiente}
                                            onClick={() => togglePendienteResolver(p.id_orden_pendiente)}
                                            className={cn(
                                                'p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer select-none',
                                                checked
                                                    ? 'bg-white border-amber-500 shadow-xs ring-1 ring-amber-500/30'
                                                    : 'bg-white/60 border-slate-200 opacity-75 hover:opacity-100'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0',
                                                    checked
                                                        ? 'bg-amber-600 border-amber-600 text-white'
                                                        : 'border-slate-300 bg-white'
                                                )}
                                            >
                                                {checked && <Check className="h-3 w-3 stroke-[3]" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {alcance === 'CLIENTE'
                                                            ? '🏢 Cliente / Sede'
                                                            : alcance === 'SERVICIO'
                                                            ? '🛠️ Servicio'
                                                            : `🔧 ${p.equipos?.codigo_equipo || 'Equipo'}`}
                                                    </span>
                                                    {p.ordenes_servicio?.numero_orden && (
                                                        <span className="text-[10px] font-mono font-bold text-indigo-700">
                                                            Origen: {p.ordenes_servicio.numero_orden}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 leading-snug">
                                                    {p.descripcion}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function PasoAlcance({
    data,
    onChange,
}: {
    data: WizardData;
    onChange: (updates: Partial<WizardData>) => void;
}) {
    const primerEquipo = data.equiposSeleccionados[0];
    const tipoEquipoId = primerEquipo?.tipos_equipo?.id_tipo_equipo || primerEquipo?.id_tipo_equipo;
    const familiaEquipo = useMemo(() => detectarFamiliaEquipos(data.equiposSeleccionados), [data.equiposSeleccionados]);

    const { tiposServicio, isLoading: isLoadingTipos } = useWizardCatalogos();

    const { data: serviciosComerciales, isLoading: isLoadingServicios } = useServiciosComerciales({ activo: true, limit: 100 });
    const [busquedaCorrectivo, setBusquedaCorrectivo] = useState('');

    // Estado del filtro de correctivos: por defecto "FAMILIA_Y_GLOBAL" para evitar errores de asignación cruzada
    const defaultTab = (familiaEquipo === 'GENERADOR' || familiaEquipo === 'BOMBA' || familiaEquipo === 'MOTOR' || familiaEquipo === 'COMPRESOR')
        ? 'FAMILIA_Y_GLOBAL'
        : 'TODOS';
    const [filtroTab, setFiltroTab] = useState<string>(defaultTab);

    // Sincronizar tab cuando cambia la familia del equipo
    useEffect(() => {
        if (familiaEquipo === 'GENERADOR' || familiaEquipo === 'BOMBA' || familiaEquipo === 'MOTOR' || familiaEquipo === 'COMPRESOR') {
            setFiltroTab('FAMILIA_Y_GLOBAL');
        } else {
            setFiltroTab('TODOS');
        }
    }, [familiaEquipo]);

    // Filtrar servicios macro de acuerdo con la familia de los equipos seleccionados
    const tiposServicioCompatibles = useMemo(() => {
        return (tiposServicio || []).filter((tipo) =>
            esServicioCompatibleConFamilia(tipo, familiaEquipo)
        );
    }, [tiposServicio, familiaEquipo]);

    const tiposPorCategoria = useMemo(() => {
        return tiposServicioCompatibles.reduce((acc, tipo) => {
            const cat = tipo.categoria || 'OTRO';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(tipo);
            return acc;
        }, {} as Record<string, TipoServicio[]>);
    }, [tiposServicioCompatibles]);

    const esCorrectivoOEmergencia = 
        data.tipoServicioSeleccionado?.categoria === 'CORRECTIVO' ||
        data.tipoServicioSeleccionado?.categoria === 'EMERGENCIA' ||
        data.tipoServicioSeleccionado?.categoria === 'ESPECIALIZADO' ||
        data.tipoServicioSeleccionado?.categoria === 'DIAGNOSTICO';

    // Determinar la familia activa efectiva para correctivos (toma en cuenta el servicio macro si especifica familia)
    const familiaEfectiva: FamiliaEquipo = useMemo(() => {
        const codTipoServ = (data.tipoServicioSeleccionado?.codigo_tipo || '').toUpperCase();
        if (codTipoServ.includes('GEN') || codTipoServ.includes('PLANTA')) return 'GENERADOR';
        if (codTipoServ.includes('BOM')) return 'BOMBA';
        if (codTipoServ.includes('MOT')) return 'MOTOR';
        if (codTipoServ.includes('COMP')) return 'COMPRESOR';
        return familiaEquipo;
    }, [data.tipoServicioSeleccionado, familiaEquipo]);

    // Filtrar servicios comerciales correctivos/especializados inteligentemente
    const serviciosFiltrados = useMemo(() => {
        const list = (serviciosComerciales || []).filter((s) => {
            const cat = clasificarServicioCorrectivo(s);
            const esFamiliaMatch = cat === familiaEfectiva || (familiaEfectiva === 'COMPRESOR' && cat === 'BOMBA');
            if (filtroTab === 'FAMILIA_Y_GLOBAL') return esFamiliaMatch || cat === 'GLOBAL';
            if (filtroTab === 'SOLO_FAMILIA') return esFamiliaMatch;
            if (filtroTab === 'SOLO_GLOBAL') return cat === 'GLOBAL';
            if (filtroTab === 'GEN') return cat === 'GENERADOR';
            if (filtroTab === 'BOM') return cat === 'BOMBA';
            if (filtroTab === 'MOT') return cat === 'MOTOR';
            return true;
        });

        const query = busquedaCorrectivo.trim();
        if (!query) return list;

        const scored = list
            .map((s) => ({
                servicio: s,
                score: calculateSmartMatchScore(query, {
                    primary: s.nombre_servicio,
                    secondary: s.codigo_servicio,
                    extra: [s.descripcion, s.categoria],
                }),
            }))
            .filter((item) => item.score > 0);

        scored.sort((a, b) => b.score - a.score);
        return scored.map((item) => item.servicio);
    }, [serviciosComerciales, busquedaCorrectivo, filtroTab, familiaEfectiva]);

    const toggleServicioCorrectivo = (servicio: CatalogoServicio) => {
        const actuales = data.serviciosCorrectivosSeleccionados || [];
        const existe = actuales.some((s) => s.id_servicio === servicio.id_servicio);
        if (existe) {
            onChange({
                serviciosCorrectivosSeleccionados: actuales.filter((s) => s.id_servicio !== servicio.id_servicio),
            });
        } else {
            onChange({
                serviciosCorrectivosSeleccionados: [...actuales, servicio],
            });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                        <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Configuración del Alcance</h3>
                        <p className="text-slate-600 text-sm">Define el tipo de intervención, servicios específicos y su urgencia.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                        1. Seleccione el Tipo de Servicio Macro
                    </label>
                </div>

                {isLoadingTipos ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : Object.keys(tiposPorCategoria).length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                        No hay servicios macro disponibles para este tipo de equipo.
                    </div>
                ) : (
                    Object.entries(tiposPorCategoria).map(([categoria, tipos]) => (
                        <div key={categoria} className="space-y-3">
                            <h4 className={cn("text-[10px] font-black px-2 py-0.5 rounded uppercase inline-block", getCategoriaServicioColor(categoria))}>
                                {getCategoriaServicioLabel(categoria)}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {tipos.map((tipo) => {
                                    const isSelected = data.tipoServicioId === tipo.id_tipo_servicio;
                                    return (
                                        <button
                                            key={tipo.id_tipo_servicio}
                                            type="button"
                                            onClick={() => onChange({ tipoServicioId: tipo.id_tipo_servicio, tipoServicioSeleccionado: tipo })}
                                            className={cn(
                                                'flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all',
                                                isSelected ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-500' : 'border-slate-100 bg-white hover:border-blue-200'
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                                                <Wrench className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 text-sm leading-snug break-words" title={tipo.nombre_tipo}>
                                                    {tipo.nombre_tipo}
                                                </p>
                                                {tipo.duracion_estimada_horas && (
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                                                        {tipo.duracion_estimada_horas}h estimadas
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ✅ SECCIÓN DE SERVICIOS CORRECTIVOS ESPECÍFICOS (TRAZABILIDAD GRANULAR) */}
            {esCorrectivoOEmergencia && (
                <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/30 p-5 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-500 text-white rounded-lg">
                                <Layers className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900">Servicios Correctivos Específicos</h4>
                                <p className="text-xs text-slate-500">Seleccione las intervenciones técnicas exactas para la bitácora histórica.</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 self-start sm:self-auto text-[10px]">
                            {data.serviciosCorrectivosSeleccionados?.length || 0} seleccionados
                        </Badge>
                    </div>

                    {/* Filtros dinámicos y buscador de correctivos */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar: batería, radiador, sensor, bomba, motor..."
                                value={busquedaCorrectivo}
                                onChange={(e) => setBusquedaCorrectivo(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                            {familiaEfectiva === 'GENERADOR' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('FAMILIA_Y_GLOBAL')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'FAMILIA_Y_GLOBAL'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Servicios propios de Generador y los que aplican a todos los equipos"
                                    >
                                        Generador + Generales
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('SOLO_FAMILIA')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'SOLO_FAMILIA'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Solo intervenciones específicas de generadores eléctricos"
                                    >
                                        Solo Generador
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('SOLO_GLOBAL')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'SOLO_GLOBAL'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Solo servicios universales que aplican a cualquier equipo"
                                    >
                                        Solo Generales
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('TODOS')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'TODOS'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Ver todo el catálogo sin restricciones"
                                    >
                                        Ver Todo
                                    </button>
                                </>
                            ) : (familiaEfectiva === 'BOMBA' || familiaEfectiva === 'COMPRESOR') ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('FAMILIA_Y_GLOBAL')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'FAMILIA_Y_GLOBAL'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Servicios propios de Bomba / Compresor y los que aplican a todos los equipos"
                                    >
                                        {familiaEfectiva === 'COMPRESOR' ? 'Compresor / Bomba + Generales' : 'Bomba + Generales'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('SOLO_FAMILIA')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'SOLO_FAMILIA'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Solo intervenciones específicas de bombas y compresores"
                                    >
                                        {familiaEfectiva === 'COMPRESOR' ? 'Solo Compresor / Bomba' : 'Solo Bomba'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('SOLO_GLOBAL')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'SOLO_GLOBAL'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Solo servicios universales que aplican a cualquier equipo"
                                    >
                                        Solo Generales
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('TODOS')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'TODOS'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                        title="Ver todo el catálogo sin restricciones"
                                    >
                                        Ver Todo
                                    </button>
                                </>
                            ) : familiaEfectiva === 'MOTOR' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('FAMILIA_Y_GLOBAL')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'FAMILIA_Y_GLOBAL'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                    >
                                        Motor + Generales
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('SOLO_FAMILIA')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'SOLO_FAMILIA'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                    >
                                        Solo Motor
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('SOLO_GLOBAL')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'SOLO_GLOBAL'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                    >
                                        Solo Generales
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroTab('TODOS')}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                            filtroTab === 'TODOS'
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        )}
                                    >
                                        Ver Todo
                                    </button>
                                </>
                            ) : (
                                <>
                                    {['TODOS', 'GEN', 'BOM', 'MOT', 'SOLO_GLOBAL'].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setFiltroTab(cat)}
                                            className={cn(
                                                'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors shrink-0',
                                                filtroTab === cat
                                                    ? 'bg-orange-600 text-white shadow-sm'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                            )}
                                        >
                                            {cat === 'TODOS' ? 'Todos' : cat === 'GEN' ? 'Generador' : cat === 'BOM' ? 'Bomba' : cat === 'MOT' ? 'Motor' : 'Generales'}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Listado de cards de correctivos */}
                    {isLoadingServicios ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                        </div>
                    ) : serviciosFiltrados.length === 0 ? (
                        <div className="p-4 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                            No se encontraron servicios que coincidan con la búsqueda en esta sección.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                            {serviciosFiltrados.map((s) => {
                                const isChecked = (data.serviciosCorrectivosSeleccionados || []).some(
                                    (item) => item.id_servicio === s.id_servicio
                                );
                                const esGlobal = clasificarServicioCorrectivo(s) === 'GLOBAL';
                                return (
                                    <button
                                        key={s.id_servicio}
                                        type="button"
                                        onClick={() => toggleServicioCorrectivo(s)}
                                        className={cn(
                                            'p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 bg-white',
                                            isChecked
                                                ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-400/20 shadow-sm'
                                                : 'border-slate-200 hover:border-orange-300'
                                        )}
                                        title={s.nombre_servicio}
                                    >
                                        <div
                                            className={cn(
                                                'w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors shrink-0',
                                                isChecked
                                                    ? 'bg-orange-600 border-orange-600 text-white'
                                                    : 'border-slate-300 bg-white'
                                            )}
                                        >
                                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono text-[9px] font-black text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                                    {s.codigo_servicio}
                                                </span>
                                                {s.duracion_estimada_horas && (
                                                    <span className="text-[9px] font-bold text-orange-700">
                                                        {s.duracion_estimada_horas}h
                                                    </span>
                                                )}
                                                {esGlobal && (
                                                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded">
                                                        Todos los equipos
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-800 mt-1 leading-snug break-words">
                                                {s.nombre_servicio}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Campo de Motivo o Razón de la Falla */}
                    <div className="pt-3 border-t border-orange-200">
                        <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">
                            Motivo / Falla Reportada (Diagnóstico Inicial)
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Ej. Batería no retiene carga, fuga de refrigerante en manguera superior de radiador..."
                            value={data.razonFalla || ''}
                            onChange={(e) => onChange({ razonFalla: e.target.value })}
                            className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
                <div>
                    <label className="text-sm font-bold text-slate-700 uppercase mb-3 block">Prioridad</label>
                    <div className="flex gap-2">
                        {PRIORIDADES.map((p) => (
                            <button key={p.value} onClick={() => onChange({ prioridad: p.value })} className={cn('flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all', data.prioridad === p.value ? p.color + ' border-current' : 'border-slate-100 text-slate-400')}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 uppercase mb-3 flex items-center justify-between">
                        <span>Fecha Programada <span className="text-red-500">*</span></span>
                        {Boolean(data.fechaProgramada && data.fechaProgramada < new Date().toISOString().split('T')[0]) && (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-600" /> Fecha Anterior
                            </span>
                        )}
                    </label>
                    <input
                        type="date"
                        value={data.fechaProgramada || ''}
                        onChange={(e) => onChange({ fechaProgramada: e.target.value })}
                        className={cn(
                            "w-full p-2.5 border-2 rounded-xl text-sm outline-none transition-colors",
                            !data.fechaProgramada && "border-red-200 bg-red-50",
                            data.fechaProgramada && !(data.fechaProgramada < new Date().toISOString().split('T')[0]) && "border-slate-200 focus:border-blue-500",
                            Boolean(data.fechaProgramada && data.fechaProgramada < new Date().toISOString().split('T')[0]) && "border-amber-400 bg-amber-50/60 focus:border-amber-500 text-amber-950 font-medium"
                        )}
                        required
                    />
                    {!data.fechaProgramada ? (
                        <p className="text-xs text-red-500 mt-1">La fecha es obligatoria</p>
                    ) : data.fechaProgramada < new Date().toISOString().split('T')[0] ? (
                        <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <p className="font-bold text-amber-950">Aviso de Fecha Retroactiva</p>
                                <p className="text-amber-800 text-[11px] leading-relaxed">
                                    Ha seleccionado el <strong>{data.fechaProgramada}</strong>, que es anterior a la fecha de hoy. El sistema permitirá registrar la orden con fines históricos o auditoría, y le solicitará confirmación antes de crearla.
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function PasoAsignacion({
    data,
    onChange,
}: {
    data: WizardData;
    onChange: (updates: Partial<WizardData>) => void;
}) {
    const { data: tecnicosRaw, isLoading } = useTecnicosSelector();
    const tecnicos = useMemo(() => {
        return (tecnicosRaw || []).filter((t: any) => {
            const nombre = getTecnicoLabel(t).toUpperCase();
            if (nombre.includes('KARL MAX') || nombre.includes('SHERLOCK HOLMES')) return false;
            return true;
        });
    }, [tecnicosRaw]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Asignación de Responsable</h3>
                        <p className="text-slate-600 text-sm">Asigne un técnico para ejecutar la intervención.</p>
                    </div>
                </div>
            </div>

            <SelectorCard
                items={tecnicos || []}
                selectedId={data.tecnicoId}
                onSelect={(tecnico, id) => onChange({ tecnicoId: id, tecnicoSeleccionado: tecnico })}
                getLabel={getTecnicoLabel}
                getSubtitle={(t) => <span className="text-xs text-slate-500">{t.cargo || 'Técnico'}</span>}
                renderIcon={() => <User className="h-5 w-5" />}
                getId={(t) => t.id_empleado}
                isLoading={isLoading}
                emptyMessage="No hay técnicos disponibles"
                searchPlaceholder="Buscar técnico..."
            />
        </div>
    );
}

function ResumenOrden({ data }: { data: WizardData }) {
    const esFechaPasada = Boolean(data.fechaProgramada && data.fechaProgramada < new Date().toISOString().split('T')[0]);
    const modoActual =
        data.modoEscenario || (data.idOrdenPadre ? 'SEGUIMIENTO_CASO' : 'CASO_RAIZ');

    return (
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-6">
            <h4 className="font-bold text-blue-400 text-xs uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Resumen de Orden
            </h4>
            <div className="space-y-4 text-sm">
                <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-1.5">
                    <p className="text-indigo-400 text-[10px] uppercase font-bold tracking-wider">
                        Continuidad del Caso
                    </p>
                    {modoActual === 'SEGUIMIENTO_CASO' ? (
                        data.idOrdenPadre ? (
                            <div className="space-y-1">
                                <p className="font-mono font-extrabold text-indigo-300 text-xs">
                                    🔗 Vinculada a {data.codigoCasoPadre || data.numeroOrdenPadre || `#${data.idOrdenPadre}`}
                                </p>
                                {data.nombreCasoPadre && (
                                    <p className="text-[11px] font-bold text-white leading-snug">
                                        📋 {data.nombreCasoPadre}
                                    </p>
                                )}
                                <p className="text-[11px] text-slate-300">
                                    {data.tipoVisita === 'GARANTIA'
                                        ? '🛡️ Visita por Garantía'
                                        : data.tipoVisita === 'CONTINUACION'
                                        ? '⏳ Continuación Operativa'
                                        : '🔧 Correctivo Derivado'}
                                </p>
                            </div>
                        ) : (
                            <p className="font-bold text-amber-300 text-xs">
                                ⚠️ Seleccione un Caso Abierto de la lista
                            </p>
                        )
                    ) : modoActual === 'VISITA_AISLADA' ? (
                        <div>
                            <p className="font-bold text-emerald-300 text-xs">
                                ⚡ Visita Independiente (Aislada)
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Sin abrir caso ni arrastrar pendientes
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <p className="font-bold text-blue-300 text-xs">
                                🆕 Nuevo Caso Base Abierto (Visita #1)
                            </p>
                            {data.nombreCaso?.trim() && (
                                <p className="text-[11px] font-semibold text-white leading-snug">
                                    📋 {data.nombreCaso.trim()}
                                </p>
                            )}
                        </div>
                    )}
                    {modoActual !== 'VISITA_AISLADA' && (data.idsPendientesAResolver?.length || 0) > 0 && (
                        <p className="text-[11px] font-bold text-amber-300 pt-1 border-t border-slate-700">
                            🎯 {data.idsPendientesAResolver!.length} pendiente(s) heredado(s) a resolver
                        </p>
                    )}
                </div>
                <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Cliente</p>
                    <p
                        className="font-bold text-slate-100 text-xs leading-snug break-words mt-0.5"
                        title={data.clienteSeleccionado ? getClienteLabel(data.clienteSeleccionado) : undefined}
                    >
                        {data.clienteSeleccionado ? getClienteLabel(data.clienteSeleccionado) : 'N/A'}
                    </p>
                </div>
                <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Servicio</p>
                    <p
                        className="font-bold text-slate-100 text-xs leading-snug break-words mt-0.5"
                        title={data.tipoServicioSeleccionado?.nombre_tipo || undefined}
                    >
                        {data.tipoServicioSeleccionado?.nombre_tipo || 'N/A'}
                    </p>
                </div>
                {data.fechaProgramada && (
                    <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Fecha Programada</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="font-bold text-slate-100 text-xs">{data.fechaProgramada}</p>
                            {esFechaPasada && (
                                <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-700/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle className="h-2.5 w-2.5 text-amber-400" /> Retroactiva
                                </span>
                            )}
                        </div>
                    </div>
                )}
                {data.serviciosCorrectivosSeleccionados && data.serviciosCorrectivosSeleccionados.length > 0 && (
                    <div>
                        <p className="text-orange-400 text-[10px] uppercase font-bold tracking-wider">
                            Correctivos Específicos ({data.serviciosCorrectivosSeleccionados.length})
                        </p>
                        <div className="flex flex-col gap-1.5 mt-1.5">
                            {data.serviciosCorrectivosSeleccionados.map((s) => (
                                <span
                                    key={s.id_servicio}
                                    className="text-[10px] bg-orange-950/80 text-orange-200 border border-orange-800/80 rounded-lg px-2 py-1 leading-snug break-words"
                                    title={s.nombre_servicio}
                                >
                                    • {s.nombre_servicio}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {data.razonFalla && (
                    <div>
                        <p className="text-amber-400 text-[10px] uppercase font-bold tracking-wider">Motivo de Falla</p>
                        <p className="text-xs text-slate-300 break-words italic mt-0.5">{data.razonFalla}</p>
                    </div>
                )}
                <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        Equipos ({data.equiposSeleccionados.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {data.equiposSeleccionados.map((e) => (
                            <Badge
                                key={e.id_equipo}
                                variant="secondary"
                                className="bg-slate-800 text-slate-200 border border-slate-700 text-[10px] px-2 py-0.5 break-words whitespace-normal"
                                title={e.nombre_equipo ? `${e.codigo_equipo} - ${e.nombre_equipo}` : e.codigo_equipo}
                            >
                                {e.codigo_equipo}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NuevaOrdenPage() {
    const router = useRouter();
    const [paso, setPaso] = useState<Paso>(1);
    const [data, setData] = useState<WizardData>({
        prioridad: 'NORMAL',
        equiposSeleccionados: [],
        modoEscenario: 'CASO_RAIZ',
        nombreCaso: '',
    });
    const [showRetroactivaModal, setShowRetroactivaModal] = useState(false);

    // Pre-cargar catálogos de servicios en segundo plano para que al avanzar al Paso 2 la carga sea instantánea (0ms)
    useWizardCatalogos();
    useServiciosComerciales({ activo: true, limit: 100 });

    const crearOrden = useCrearOrden();

    const handleChange = (updates: Partial<WizardData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    const canContinue = () => {
        if (paso === 1) {
            if (!data.clienteId || data.equiposSeleccionados.length === 0) return false;
            if (data.modoEscenario === 'SEGUIMIENTO_CASO' && !data.idOrdenPadre) return false;
            return true;
        }
        // ✅ FIX: Fecha programada es REQUERIDA
        if (paso === 2) return !!data.tipoServicioId && !!data.fechaProgramada;
        return true;
    };

    const esFechaPasada = Boolean(data.fechaProgramada && data.fechaProgramada < new Date().toISOString().split('T')[0]);

    const ejecutarCreacion = async () => {
        try {
            const modo = data.modoEscenario || (data.idOrdenPadre ? 'SEGUIMIENTO_CASO' : 'CASO_RAIZ');
            const esAislada = modo === 'VISITA_AISLADA';
            const esSeguimiento = modo === 'SEGUIMIENTO_CASO' && Boolean(data.idOrdenPadre);

            const result = await crearOrden.mutateAsync({
                clienteId: data.clienteId!,
                equipoId: data.equiposSeleccionados[0]?.id_equipo, // Equipo principal (requerido)
                equiposIds: data.equiposSeleccionados.map(e => e.id_equipo),
                tipoServicioId: data.tipoServicioId!,
                serviciosIds: data.serviciosCorrectivosSeleccionados?.map(s => s.id_servicio),
                razonFalla: data.razonFalla,
                sedeClienteId: data.sedeId,
                prioridad: data.prioridad,
                // ✅ FIX TIMEZONE: Enviar fecha como string YYYY-MM-DD sin conversión a Date
                // El backend manejará la conversión correctamente
                fechaProgramada: data.fechaProgramada || undefined,
                descripcion: data.descripcion,
                tecnicoId: data.tecnicoId,
                idOrdenPadre: esSeguimiento ? data.idOrdenPadre : undefined,
                tipoVisita: esAislada
                    ? 'AISLADA'
                    : esSeguimiento
                    ? data.tipoVisita || 'CORRECTIVO_DERIVADO'
                    : 'INICIAL',
                nombreCaso:
                    modo === 'CASO_RAIZ'
                        ? data.nombreCaso?.trim() || undefined
                        : undefined,
                estadoCaso: esAislada ? 'AISLADA' : 'ABIERTO',
                idsPendientesAResolver: esAislada ? [] : data.idsPendientesAResolver,
            });
            if (result.data?.id_orden_servicio) router.push(`/ordenes/${result.data.id_orden_servicio}`);
            else router.push('/ordenes');
        } catch (e) {
            console.error(e);
        } finally {
            setShowRetroactivaModal(false);
        }
    };

    const handleSubmit = () => {
        if (!canContinue()) return;
        if (esFechaPasada) {
            setShowRetroactivaModal(true);
            return;
        }
        ejecutarCreacion();
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4">
            <div className="flex flex-col lg:flex-row gap-8 mt-8">
                <div className="flex-1 space-y-8 min-w-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0 w-full max-w-md">
                            <StepIndicator paso={1} pasoActual={paso} label="Contexto" icon={Building2} />
                            <StepIndicator paso={2} pasoActual={paso} label="Alcance" icon={Settings} />
                            <StepIndicator paso={3} pasoActual={paso} label="Asignación" icon={User} />
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border shadow-sm p-6 md:p-8">
                        {paso === 1 && <PasoContexto data={data} onChange={handleChange} />}
                        {paso === 2 && <PasoAlcance data={data} onChange={handleChange} />}
                        {paso === 3 && <PasoAsignacion data={data} onChange={handleChange} />}

                        <div className="flex justify-between mt-10 pt-6 border-t">
                            <Button variant="ghost" onClick={() => setPaso(p => (p - 1) as Paso)} disabled={paso === 1}>Anterior</Button>
                            {paso < 3 ? (
                                <Button onClick={() => setPaso(p => (p + 1) as Paso)} disabled={!canContinue()} className="bg-blue-600 px-8">Siguiente</Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={crearOrden.isPending} className="bg-green-600 px-8">
                                    {crearOrden.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Crear Orden'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-80 shrink-0">
                    <div className="sticky top-24 space-y-6">
                        <ResumenOrden data={data} />
                    </div>
                </div>
            </div>

            {/* Modal de Alerta y Confirmación para Órdenes con Fecha Anterior */}
            <AlertDialog open={showRetroactivaModal} onOpenChange={setShowRetroactivaModal}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-3 shadow-inner">
                            <AlertTriangle className="h-7 w-7 text-amber-600" />
                        </div>
                        <AlertDialogTitle className="text-center text-lg font-bold text-slate-900">
                            ¿Crear Orden con Fecha Anterior?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-slate-600 text-sm space-y-2 pt-1">
                            <span>
                                Ha seleccionado como fecha programada el <strong className="text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded font-mono">{data.fechaProgramada}</strong>, la cual es <strong>anterior a la fecha de hoy</strong>.
                            </span>
                            <span className="block text-xs text-slate-500 pt-1">
                                Esta orden quedará registrada con fecha retroactiva para fines de auditoría, archivo o regularización de servicios ya ejecutados.
                            </span>
                            <span className="block font-semibold text-slate-800 pt-1">
                                ¿Está seguro de que desea proceder con la creación?
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
                        <AlertDialogCancel disabled={crearOrden.isPending} className="border-slate-300">
                            Cancelar y Revisar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                ejecutarCreacion();
                            }}
                            disabled={crearOrden.isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md"
                        >
                            {crearOrden.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                            Sí, Crear con Fecha Anterior
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
