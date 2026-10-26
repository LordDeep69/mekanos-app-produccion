'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    CheckSquare,
    ClipboardList,
    Clock,
    CornerDownRight,
    ExternalLink,
    Globe,
    Loader2,
    MapPin,
    Plus,
    RotateCcw,
    Search,
    Square,
    Target,
    Trash2,
    User,
    Wrench,
    X,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn, formatDateSafe } from '@/lib/utils';
import type { Orden, OrdenPendiente } from '@/types/ordenes';
import {
    getPendienteEstadoColor,
    getPendienteEstadoLabel,
    getPrioridadColor,
} from '@/types/ordenes';
import { ProgramarVisitaModal } from './hilo-continuidad-caso';

interface PendientesSectionProps {
    orden: Orden;
    onUpdate?: () => void;
}

export function PendientesSection({ orden, onUpdate }: PendientesSectionProps) {
    // Unificar todos los pendientes del Caso (hilo_caso.pendientes_caso + ordenes_pendientes + pendientes_asignados_resolver)
    const initialUnificados = useMemo(() => {
        const map = new Map<number, OrdenPendiente>();
        const list = [
            ...(orden.hilo_caso?.pendientes_caso || []),
            ...(orden.ordenes_pendientes || []),
            ...(orden.pendientes_asignados_resolver || []),
        ];
        for (const p of list) {
            if (p && p.id_orden_pendiente) {
                map.set(p.id_orden_pendiente, p);
            }
        }
        return Array.from(map.values()).sort(
            (a, b) => a.id_orden_pendiente - b.id_orden_pendiente
        );
    }, [
        orden.hilo_caso?.pendientes_caso,
        orden.ordenes_pendientes,
        orden.pendientes_asignados_resolver,
    ]);

    const [pendientes, setPendientes] = useState<OrdenPendiente[]>(initialUnificados);
    const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [selectedPendiente, setSelectedPendiente] = useState<OrdenPendiente | null>(null);
    const [resolucionNotas, setResolucionNotas] = useState('');
    const [resolucionEstado, setResolucionEstado] = useState<
        'PENDIENTE' | 'EN_GESTION' | 'RESUELTO' | 'CANCELADO'
    >('RESUELTO');

    // Modal para crear visita desde un pendiente específico
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [followUpInitialIds, setFollowUpInitialIds] = useState<number[] | undefined>(undefined);

    // Add Form State
    const [catalogoItems, setCatalogoItems] = useState<any[]>([]);
    const [loadingCatalogo, setLoadingCatalogo] = useState(false);
    const [selectedCatalogoId, setSelectedCatalogoId] = useState<number | null>(null);
    const [descripcionManual, setDescripcionManual] = useState('');
    const [prioridad, setPrioridad] = useState<'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA'>('NORMAL');
    const [observaciones, setObservaciones] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchCatalogo, setSearchCatalogo] = useState('');
    const [catFiltro, setCatFiltro] = useState('TODAS');
    const [categoriasList, setCategoriasList] = useState<string[]>([
        'TODAS',
        'ELECTRICO',
        'MECANICO',
        'COMBUSTIBLE',
        'HIDRAULICO',
        'ELECTRONICO',
        'INSTRUMENTACION',
        'GENERAL',
    ]);

    // ✅ Multi-equipos & 3-Scope Alcance Selection State (EQUIPO | CLIENTE | SERVICIO)
    const [tipoAlcance, setTipoAlcance] = useState<'EQUIPO' | 'CLIENTE' | 'SERVICIO'>('EQUIPO');
    const [selectedEquiposIds, setSelectedEquiposIds] = useState<number[]>([]);

    // Normalización de equipos de la orden (Multi-equipos y equipo simple)
    const listaEquipos = useMemo(() => {
        if (orden.ordenes_equipos && orden.ordenes_equipos.length > 0) {
            return orden.ordenes_equipos.map((oe: any) => {
                const eqObj = oe.equipo || oe.equipos;
                return {
                    idOrdenEquipo: oe.id_orden_equipo as number,
                    idEquipo: (eqObj?.id_equipo || oe.id_equipo) as number | undefined,
                    secuencia: oe.orden_secuencia || 1,
                    nombreSistema: oe.nombre_sistema || null,
                    codigoEquipo: eqObj?.codigo_equipo || '',
                    nombreEquipo: eqObj?.nombre_equipo || `Equipo ${oe.orden_secuencia || 1}`,
                    tipoEquipo: eqObj?.tipos_equipo?.nombre_tipo || '',
                };
            });
        }
        if (orden.equipos) {
            return [
                {
                    idOrdenEquipo: null as number | null,
                    idEquipo: orden.equipos.id_equipo,
                    secuencia: 1,
                    nombreSistema: null,
                    codigoEquipo: orden.equipos.codigo_equipo || '',
                    nombreEquipo: orden.equipos.nombre_equipo || 'Equipo Principal',
                    tipoEquipo: (orden.equipos as any)?.tipos_equipo?.nombre_tipo || '',
                },
            ];
        }
        return [];
    }, [orden]);

    // Sync state with props
    useEffect(() => {
        setPendientes(initialUnificados);
    }, [initialUnificados]);

    // Cargar catálogo de pendientes al abrir modal
    useEffect(() => {
        if (isAddModalOpen && catalogoItems.length === 0) {
            setLoadingCatalogo(true);
            apiClient
                .get('/ordenes/catalogo-pendientes/categorias')
                .then((res) => {
                    if (res.data?.success && Array.isArray(res.data.data)) {
                        setCategoriasList(['TODAS', ...res.data.data]);
                    }
                })
                .catch(() => {});

            apiClient
                .get('/ordenes/catalogo-pendientes')
                .then((res) => {
                    const data = res.data;
                    if (data?.success && data?.data) {
                        setCatalogoItems(data.data);
                    }
                })
                .catch((err) => console.error('Error cargando catalogo pendientes:', err))
                .finally(() => setLoadingCatalogo(false));
        }
    }, [isAddModalOpen, catalogoItems.length]);

    const handleOpenAddModal = () => {
        setErrorMsg(null);
        setDescripcionManual('');
        setSelectedCatalogoId(null);
        setObservaciones('');
        if (listaEquipos.length > 0) {
            setTipoAlcance('EQUIPO');
            if (listaEquipos.length === 1 && listaEquipos[0].idOrdenEquipo) {
                setSelectedEquiposIds([listaEquipos[0].idOrdenEquipo]);
            } else {
                setSelectedEquiposIds([]);
            }
        } else {
            setTipoAlcance('SERVICIO');
            setSelectedEquiposIds([]);
        }
        setIsAddModalOpen(true);
    };

    const toggleEquipoSelection = (idOe: number) => {
        setSelectedEquiposIds((prev) =>
            prev.includes(idOe) ? prev.filter((id) => id !== idOe) : [...prev, idOe]
        );
    };

    const handleSelectAllEquipos = () => {
        const allIds = listaEquipos
            .map((e) => e.idOrdenEquipo)
            .filter((id): id is number => id !== null && id !== undefined);
        setSelectedEquiposIds(allIds);
    };

    const handleDeselectAllEquipos = () => {
        setSelectedEquiposIds([]);
    };

    const handleCreatePendiente = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        let desc = descripcionManual.trim();
        if (selectedCatalogoId) {
            const cat = catalogoItems.find((c) => c.id_pendiente_catalogo === selectedCatalogoId);
            if (cat) desc = cat.descripcion;
        }

        if (!desc) {
            setErrorMsg('Por favor ingrese o seleccione una descripción para el pendiente');
            return;
        }

        if (tipoAlcance === 'EQUIPO') {
            const tieneEquiposConId = listaEquipos.some((e) => e.idOrdenEquipo !== null);
            if (tieneEquiposConId && selectedEquiposIds.length === 0) {
                setErrorMsg(
                    'Por favor seleccione al menos un equipo de la lista o elija alcance "Cliente / Sede" o "Continuidad del Servicio"'
                );
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                descripcion: desc,
                idPendienteCatalogo: selectedCatalogoId || undefined,
                prioridad,
                alcance: tipoAlcance,
                observaciones: observaciones.trim() || undefined,
            };

            if (tipoAlcance === 'CLIENTE') {
                payload.esGeneral = true;
                payload.idEquipo = listaEquipos[0]?.idEquipo || orden.id_equipo || undefined;
                payload.idOrdenEquipo = null;
            } else if (tipoAlcance === 'SERVICIO') {
                payload.esGeneral = true;
                payload.idEquipo = listaEquipos[0]?.idEquipo || orden.id_equipo || undefined;
                payload.idOrdenEquipo = undefined;
            } else {
                if (selectedEquiposIds.length > 0) {
                    payload.idOrdenEquipos = selectedEquiposIds;
                    payload.idOrdenEquipo = selectedEquiposIds[0];
                } else if (listaEquipos.length === 1 && listaEquipos[0].idEquipo) {
                    payload.idEquipo = listaEquipos[0].idEquipo;
                }
            }

            const res = await apiClient.post(
                `/ordenes/${orden.id_orden_servicio}/pendientes`,
                payload
            );
            const data = res.data;
            if (!data?.success) {
                throw new Error(data?.message || 'Error registrando pendiente');
            }

            const nuevosItems = Array.isArray(data.items)
                ? data.items
                : Array.isArray(data.data)
                ? data.data
                : [data.data];

            setPendientes((prev) => [...prev, ...nuevosItems]);
            setIsAddModalOpen(false);
            setDescripcionManual('');
            setSelectedCatalogoId(null);
            setObservaciones('');
            setSelectedEquiposIds([]);
            onUpdate?.();
        } catch (err: any) {
            setErrorMsg(err.message || 'Error al crear pendiente');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateEstado = async () => {
        if (!selectedPendiente) return;
        setIsSubmitting(true);
        try {
            const res = await apiClient.patch(
                `/ordenes/pendientes/${selectedPendiente.id_orden_pendiente}/estado`,
                {
                    estado: resolucionEstado,
                    observaciones_resolucion:
                        resolucionEstado === 'PENDIENTE'
                            ? null
                            : resolucionNotas.trim() || undefined,
                    id_orden_resolucion:
                        resolucionEstado === 'RESUELTO'
                            ? orden.id_orden_servicio
                            : resolucionEstado === 'PENDIENTE'
                            ? null
                            : selectedPendiente.id_orden_resolucion || orden.id_orden_servicio,
                }
            );
            const data = res.data;
            if (!data?.success) {
                throw new Error(data?.message || 'Error actualizando estado');
            }

            setPendientes((prev) =>
                prev.map((p) =>
                    p.id_orden_pendiente === selectedPendiente.id_orden_pendiente
                        ? { ...p, ...data.data, ordenes_servicio: p.ordenes_servicio }
                        : p
                )
            );
            setIsResolveModalOpen(false);
            setSelectedPendiente(null);
            setResolucionNotas('');
            onUpdate?.();
        } catch (err: any) {
            alert(err.message || 'Error al actualizar estado');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResolverDirecto = async (p: OrdenPendiente) => {
        setIsSubmitting(true);
        try {
            const res = await apiClient.patch(`/ordenes/pendientes/${p.id_orden_pendiente}/estado`, {
                estado: 'RESUELTO',
                id_orden_resolucion: orden.id_orden_servicio,
                observaciones_resolucion:
                    p.observaciones_resolucion ||
                    `Resuelto satisfactoriamente en Visita #${orden.numero_visita_caso || 1} (${orden.numero_orden})`,
            });
            if (res.data?.success) {
                setPendientes((prev) =>
                    prev.map((item) =>
                        item.id_orden_pendiente === p.id_orden_pendiente
                            ? { ...item, ...res.data.data, ordenes_servicio: item.ordenes_servicio }
                            : item
                    )
                );
                onUpdate?.();
            }
        } catch (err) {
            console.error('Error resolviendo pendiente:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReabrirDirecto = async (p: OrdenPendiente) => {
        setIsSubmitting(true);
        try {
            const res = await apiClient.patch(`/ordenes/pendientes/${p.id_orden_pendiente}/estado`, {
                estado: 'PENDIENTE',
                id_orden_resolucion: null,
                observaciones_resolucion: '',
            });
            if (res.data?.success) {
                setPendientes((prev) =>
                    prev.map((item) =>
                        item.id_orden_pendiente === p.id_orden_pendiente
                            ? { ...item, ...res.data.data, ordenes_servicio: item.ordenes_servicio }
                            : item
                    )
                );
                onUpdate?.();
            }
        } catch (err) {
            console.error('Error reabriendo pendiente:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este pendiente técnico?')) return;
        try {
            const res = await apiClient.delete(`/ordenes/pendientes/${id}`);
            if (res.data?.success || res.status === 200) {
                setPendientes((prev) => prev.filter((p) => p.id_orden_pendiente !== id));
                onUpdate?.();
            }
        } catch (err) {
            console.error('Error eliminando pendiente:', err);
        }
    };

    const pendientesActivosCaso = useMemo(
        () => pendientes.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION'),
        [pendientes]
    );
    const totalPendientesActivos = pendientesActivosCaso.length;
    const totalPendientesResueltos = useMemo(
        () => pendientes.filter((p) => p.estado === 'RESUELTO').length,
        [pendientes]
    );

    const pendientesFiltrados = pendientes.filter((p) => {
        if (filtroEstado === 'TODOS') return true;
        if (filtroEstado === 'ACTIVOS') {
            return p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION';
        }
        return p.estado === filtroEstado;
    });

    const numVisitaActual = orden.numero_visita_caso || 1;
    const esMultivisita =
        Boolean(orden.hilo_caso?.es_multivisita) ||
        Boolean(orden.id_orden_padre) ||
        numVisitaActual > 1;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* BLOQUE A (CLOSED-LOOP): PENDIENTES ACTIVOS DEL CASO POR RESOLVER    */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {pendientesActivosCaso.length > 0 && (
                <div className="p-5 bg-gradient-to-r from-indigo-50 via-blue-50/60 to-emerald-50/40 border-b border-indigo-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                                <Target className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2 flex-wrap">
                                    <span>
                                        Pendientes Activos del Caso por Resolver en Visita #{numVisitaActual}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                        {pendientesActivosCaso.length} activo(s) • {totalPendientesResueltos} resuelto(s) en el caso
                                    </span>
                                </h4>
                                <p className="text-xs text-indigo-700/80">
                                    Marque en 1 clic los hallazgos que hayan quedado solucionados durante esta visita o programe una nueva visita de seguimiento.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setFollowUpInitialIds(
                                    pendientesActivosCaso.map((p) => p.id_orden_pendiente)
                                );
                                setFollowUpModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                        >
                            <CornerDownRight className="h-3.5 w-3.5" />
                            <span>Programar Visita con estos {pendientesActivosCaso.length} Pendientes</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pendientesActivosCaso.map((p) => {
                            const numOrigen = p.ordenes_servicio?.numero_orden || orden.numero_orden;
                            const numVisitaOrigen = p.ordenes_servicio?.numero_visita_caso || 1;
                            const codEq = p.equipos?.codigo_equipo;
                            const alcance = p.alcance || 'EQUIPO';
                            return (
                                <div
                                    key={p.id_orden_pendiente}
                                    className="p-3.5 rounded-xl border bg-white border-indigo-200 shadow-2xs flex flex-col justify-between gap-2.5 transition-all"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded text-[10px] font-bold border',
                                                        getPendienteEstadoColor(p.estado)
                                                    )}
                                                >
                                                    {getPendienteEstadoLabel(p.estado)}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                    {alcance === 'CLIENTE'
                                                        ? '🏢 Cliente / Sede'
                                                        : alcance === 'SERVICIO'
                                                        ? '🛠️ Servicio'
                                                        : `🔧 ${codEq || 'Equipo'}`}
                                                </span>
                                            </div>
                                            {p.ordenes_servicio ? (
                                                <Link
                                                    href={`/ordenes/${p.ordenes_servicio.id_orden_servicio}`}
                                                    className="text-[11px] font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1"
                                                >
                                                    <span>
                                                        📍 Origen: Visita #{numVisitaOrigen} • {numOrigen}
                                                    </span>
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                </Link>
                                            ) : (
                                                <span className="text-[11px] font-mono font-bold text-indigo-700">
                                                    📍 Origen: Visita #{numVisitaOrigen} • {numOrigen}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-900">{p.descripcion}</p>
                                        {p.observaciones && (
                                            <p className="text-[11px] text-slate-600 mt-1">{p.observaciones}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 gap-2">
                                        <span className="text-[11px] text-slate-500">
                                            {p.orden_resolucion
                                                ? `🎯 Asignado a ${p.orden_resolucion.numero_orden} (Visita #${p.orden_resolucion.numero_visita_caso || numVisitaActual})`
                                                : '⏳ Pendiente de resolución'}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => handleResolverDirecto(p)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>✓ Marcar Resuelto en Visita #{numVisitaActual}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Header de la Matriz Completa */}
            <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                        <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900">
                                {esMultivisita
                                    ? 'Matriz Completa de Hallazgos y Pendientes del Caso (360°)'
                                    : 'Hallazgos y Pendientes Técnicos del Caso (360°)'}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {pendientes.length} totales
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                {totalPendientesActivos} activo{totalPendientesActivos === 1 ? '' : 's'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                {totalPendientesResueltos} resuelto{totalPendientesResueltos === 1 ? '' : 's'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Vista unificada de todos los hallazgos del expediente con su visita de origen y visita de resolución.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenAddModal}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-amber-600/20 active:scale-95 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        Registrar Pendiente
                    </button>
                </div>
            </div>

            {/* Filtros rápidos */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-400 font-medium">Filtrar:</span>
                    {(
                        [
                            { id: 'TODOS', label: `Todos (${pendientes.length})` },
                            { id: 'ACTIVOS', label: `Activos (${totalPendientesActivos})` },
                            { id: 'PENDIENTE', label: 'Abiertos' },
                            { id: 'EN_GESTION', label: 'En Gestión' },
                            { id: 'RESUELTO', label: `Resueltos (${totalPendientesResueltos})` },
                            { id: 'CANCELADO', label: 'Cancelados' },
                        ] as const
                    ).map((est) => (
                        <button
                            key={est.id}
                            onClick={() => setFiltroEstado(est.id)}
                            className={cn(
                                'px-3 py-1 rounded-lg font-medium transition-all cursor-pointer',
                                filtroEstado === est.id
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            )}
                        >
                            {est.label}
                        </button>
                    ))}
                </div>

                <div className="text-gray-500 font-medium">
                    Mostrando {pendientesFiltrados.length} de {pendientes.length}
                </div>
            </div>

            {/* Listado de Pendientes */}
            <div className="p-6">
                {pendientes.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <h4 className="text-sm font-bold text-gray-800">
                            Sin Pendientes Registrados en este Caso
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                            Este expediente no registra hallazgos técnicos, requerimientos locativos de cliente ni trabajos pendientes.
                        </p>
                        <button
                            onClick={handleOpenAddModal}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-700 text-gray-700 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar Primer Pendiente
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendientesFiltrados.map((p) => {
                            const isResuelto = p.estado === 'RESUELTO';
                            const isCancelado = p.estado === 'CANCELADO';
                            const estadoClase = getPendienteEstadoColor(p.estado);
                            const prioridadClase = getPrioridadColor(p.prioridad);
                            const alcance = p.alcance || (p.id_orden_equipo ? 'EQUIPO' : 'SERVICIO');

                            // Resolución precisa multiequipo vs cliente vs servicio
                            const oeRel = orden.ordenes_equipos?.find(
                                (e: any) => e.id_orden_equipo === p.id_orden_equipo
                            );
                            const eqObj = oeRel?.equipo || (oeRel as any)?.equipos || p.equipos;
                            const ordenSec = oeRel?.orden_secuencia || p.ordenes_equipos?.orden_secuencia;
                            const sistName = oeRel?.nombre_sistema || p.ordenes_equipos?.nombre_sistema;
                            const eqCode = eqObj?.codigo_equipo ? `[${eqObj.codigo_equipo}] ` : '';
                            const eqName = sistName || eqObj?.nombre_equipo || 'Equipo';
                            const badgeEquipoLabel = ordenSec
                                ? `#${ordenSec} · ${eqCode}${eqName}`
                                : `${eqCode}${eqName}`;

                            const numOrdenOrigen =
                                p.ordenes_servicio?.numero_orden ||
                                orden.hilo_caso?.numero_orden_raiz ||
                                orden.numero_orden;
                            const numVisitaOrigen = p.ordenes_servicio?.numero_visita_caso || 1;
                            const idOrdenOrigen =
                                p.ordenes_servicio?.id_orden_servicio ||
                                p.id_orden_servicio ||
                                orden.id_orden_servicio;

                            return (
                                <div
                                    key={p.id_orden_pendiente}
                                    className={cn(
                                        'rounded-xl border p-4 transition-all relative flex flex-col justify-between gap-3',
                                        isResuelto
                                            ? 'bg-emerald-50/20 border-emerald-200'
                                            : isCancelado
                                            ? 'bg-gray-50 border-gray-200 opacity-60'
                                            : 'bg-white border-amber-200/80 shadow-sm hover:border-amber-300'
                                    )}
                                >
                                    <div>
                                        {/* Header de la card */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-md text-[11px] font-bold border',
                                                        estadoClase
                                                    )}
                                                >
                                                    {getPendienteEstadoLabel(p.estado)}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-md text-[11px] font-semibold',
                                                        prioridadClase
                                                    )}
                                                >
                                                    {p.prioridad}
                                                </span>

                                                {/* Badge de Alcance 360° */}
                                                {alcance === 'CLIENTE' ? (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                                                        <Building2 className="h-3 w-3 text-purple-600" />
                                                        Cliente / Sede
                                                    </span>
                                                ) : alcance === 'SERVICIO' && !p.id_orden_equipo ? (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                                        <Globe className="h-3 w-3 text-amber-600" />
                                                        Continuidad Servicio
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                                                        <Wrench className="h-3 w-3 text-blue-600" />
                                                        {badgeEquipoLabel}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDelete(p.id_orden_pendiente)}
                                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                                    title="Eliminar pendiente"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Descripción */}
                                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                                            {p.descripcion}
                                        </p>

                                        {/* Observaciones */}
                                        {p.observaciones && (
                                            <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <strong className="text-gray-700">Obs:</strong> {p.observaciones}
                                            </p>
                                        )}

                                        {/* Trazabilidad de Origen y Resolución en el Hilo */}
                                        <div className="mt-2.5 space-y-1.5">
                                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                                                <span className="text-slate-600 font-semibold flex items-center gap-1">
                                                    <MapPin className="h-3 w-3 text-slate-500" />
                                                    Origen del hallazgo:
                                                </span>
                                                <Link
                                                    href={`/ordenes/${idOrdenOrigen}`}
                                                    className="font-mono font-bold text-slate-800 hover:text-indigo-700 hover:underline flex items-center gap-1"
                                                >
                                                    <span>
                                                        Visita #{numVisitaOrigen} • {numOrdenOrigen}
                                                    </span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            </div>

                                            {p.orden_resolucion && (
                                                <div
                                                    className={cn(
                                                        'px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs',
                                                        isResuelto
                                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                                            : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                                                    )}
                                                >
                                                    <span className="font-semibold flex items-center gap-1">
                                                        <CornerDownRight className="h-3.5 w-3.5" />
                                                        {isResuelto ? 'Resuelto en:' : 'En gestión en:'}
                                                    </span>
                                                    <Link
                                                        href={`/ordenes/${p.orden_resolucion.id_orden_servicio}`}
                                                        className="font-mono font-bold hover:underline flex items-center gap-1"
                                                    >
                                                        <span>
                                                            Visita #{p.orden_resolucion.numero_visita_caso || 2} •{' '}
                                                            {p.orden_resolucion.numero_orden}
                                                        </span>
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Resolución si existe */}
                                        {p.observaciones_resolucion && (
                                            <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-200">
                                                <p className="font-semibold flex items-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                    Nota de Resolución:
                                                </p>
                                                <p className="mt-0.5">{p.observaciones_resolucion}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer con metadata y botones de acción */}
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-500 flex-wrap">
                                        <div className="flex flex-col gap-0.5">
                                            {p.empleados_ordenes_pendientes_creado_porToempleados?.persona && (
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    <User className="h-3 w-3 text-gray-400" />
                                                    {p.empleados_ordenes_pendientes_creado_porToempleados.persona
                                                        .nombre_completo ||
                                                        p.empleados_ordenes_pendientes_creado_porToempleados.persona
                                                            .primer_nombre}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                {formatDateSafe(p.fecha_creacion)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {!isResuelto && !isCancelado && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFollowUpInitialIds([p.id_orden_pendiente]);
                                                        setFollowUpModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                                                    title="Programar una visita de seguimiento para resolver este pendiente"
                                                >
                                                    <CornerDownRight className="h-3 w-3" />
                                                    <span>Crear Visita</span>
                                                </button>
                                            )}

                                            {!isResuelto && !isCancelado ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedPendiente(p);
                                                        setResolucionEstado('RESUELTO');
                                                        setResolucionNotas(p.observaciones_resolucion || '');
                                                        setIsResolveModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-300 transition-colors cursor-pointer"
                                                >
                                                    Gestionar Estado
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => handleReabrirDirecto(p)}
                                                        className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded border border-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                                        title="Reabrir este pendiente si el problema volvió a presentarse"
                                                    >
                                                        <RotateCcw className="h-3 w-3" />
                                                        <span>Reabrir</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPendiente(p);
                                                            setResolucionEstado(p.estado as any);
                                                            setResolucionNotas(p.observaciones_resolucion || '');
                                                            setIsResolveModalOpen(true);
                                                        }}
                                                        className="px-2 py-0.5 text-gray-500 hover:text-gray-800 text-[11px] font-medium underline cursor-pointer"
                                                    >
                                                        Editar Estado
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal In-Context para Crear Visita de Seguimiento */}
            <ProgramarVisitaModal
                orden={orden}
                isOpen={followUpModalOpen}
                onClose={() => setFollowUpModalOpen(false)}
                initialPendientesIds={followUpInitialIds}
            />

            {/* Modal: Agregar Nuevo Pendiente (3 Alcances: EQUIPO, CLIENTE, SERVICIO) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50/60 border-b border-amber-200/80 flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Plus className="h-5 w-5 text-amber-600" />
                                Registrar Pendiente en Matriz 360°
                            </h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePendiente} className="p-6 space-y-4 overflow-y-auto flex-1">
                            {errorMsg && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* 1. SELECCIÓN DE ALCANCE (3 NIVELES: EQUIPO, CLIENTE, SERVICIO) */}
                            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Wrench className="h-4 w-4 text-amber-600" />
                                        1. Alcance del Requerimiento (3 Niveles) *
                                    </label>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        {listaEquipos.length > 0
                                            ? `${listaEquipos.length} equipo(s) en orden`
                                            : 'Orden general'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {/* Nivel 1: Equipo(s) */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTipoAlcance('EQUIPO');
                                            if (
                                                selectedEquiposIds.length === 0 &&
                                                listaEquipos.length === 1 &&
                                                listaEquipos[0].idOrdenEquipo
                                            ) {
                                                setSelectedEquiposIds([listaEquipos[0].idOrdenEquipo]);
                                            }
                                        }}
                                        disabled={listaEquipos.length === 0}
                                        className={cn(
                                            'p-3 rounded-xl text-left transition-all border flex flex-col justify-between gap-1.5 cursor-pointer relative disabled:opacity-50',
                                            tipoAlcance === 'EQUIPO'
                                                ? 'bg-blue-500/10 border-blue-500 text-blue-950 ring-1 ring-blue-500'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs font-bold">
                                                <Wrench className="h-3.5 w-3.5 text-blue-600" />
                                                Equipo(s)
                                            </span>
                                            {tipoAlcance === 'EQUIPO' && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                                    {selectedEquiposIds.length}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            Repuesto o correctivo propio de una o varias máquinas.
                                        </p>
                                    </button>

                                    {/* Nivel 2: Cliente / Sede */}
                                    <button
                                        type="button"
                                        onClick={() => setTipoAlcance('CLIENTE')}
                                        className={cn(
                                            'p-3 rounded-xl text-left transition-all border flex flex-col justify-between gap-1.5 cursor-pointer relative',
                                            tipoAlcance === 'CLIENTE'
                                                ? 'bg-purple-500/10 border-purple-500 text-purple-950 ring-1 ring-purple-500'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs font-bold">
                                                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                                                Cliente / Sede
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            Cuarto de máquinas, ventilación, obra civil o permisos del cliente.
                                        </p>
                                    </button>

                                    {/* Nivel 3: Continuidad del Servicio */}
                                    <button
                                        type="button"
                                        onClick={() => setTipoAlcance('SERVICIO')}
                                        className={cn(
                                            'p-3 rounded-xl text-left transition-all border flex flex-col justify-between gap-1.5 cursor-pointer relative',
                                            tipoAlcance === 'SERVICIO'
                                                ? 'bg-amber-500/10 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs font-bold">
                                                <Globe className="h-3.5 w-3.5 text-amber-600" />
                                                Servicio / Visita
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            Pruebas o actividades del servicio que continúan en próxima visita.
                                        </p>
                                    </button>
                                </div>

                                {/* Selector multiequipo cuando el alcance es EQUIPO */}
                                {tipoAlcance === 'EQUIPO' && listaEquipos.length > 0 && (
                                    <div className="pt-2.5 border-t border-slate-200 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-700">
                                                Marque los equipos a los que aplica este pendiente:
                                            </span>
                                            {listaEquipos.length > 1 && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAllEquipos}
                                                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                    >
                                                        Seleccionar todos
                                                    </button>
                                                    <span className="text-slate-300">|</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleDeselectAllEquipos}
                                                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                                                    >
                                                        Limpiar
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-0.5">
                                            {listaEquipos.map((eq) => {
                                                const isSelected = eq.idOrdenEquipo
                                                    ? selectedEquiposIds.includes(eq.idOrdenEquipo)
                                                    : false;
                                                const label = eq.nombreSistema || eq.nombreEquipo;
                                                return (
                                                    <div
                                                        key={eq.idOrdenEquipo || eq.idEquipo}
                                                        onClick={() =>
                                                            eq.idOrdenEquipo && toggleEquipoSelection(eq.idOrdenEquipo)
                                                        }
                                                        className={cn(
                                                            'p-2.5 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 cursor-pointer select-none',
                                                            isSelected
                                                                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-400'
                                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                        )}
                                                    >
                                                        <div className="mt-0.5 shrink-0">
                                                            {isSelected ? (
                                                                <CheckSquare className="h-4 w-4 text-blue-600" />
                                                            ) : (
                                                                <Square className="h-4 w-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                                                                    #{eq.secuencia}
                                                                </span>
                                                                {eq.codigoEquipo && (
                                                                    <span className="text-[11px] font-mono font-bold text-slate-600 truncate">
                                                                        {eq.codigoEquipo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="font-bold text-xs truncate mt-0.5">
                                                                {label}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. CATÁLOGO MAESTRO DE PLANTILLAS */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Catálogo de Plantillas Frecuentes
                                    </label>
                                    <span className="text-[11px] font-semibold text-gray-400">
                                        {catalogoItems.length} plantillas disponibles
                                    </span>
                                </div>

                                {selectedCatalogoId ? (
                                    (() => {
                                        const sel = catalogoItems.find(
                                            (c) => c.id_pendiente_catalogo === selectedCatalogoId
                                        );
                                        return (
                                            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-300 rounded-xl flex items-start justify-between gap-3 shadow-xs">
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-200/90 text-amber-900 border border-amber-300 uppercase tracking-wider shrink-0 mt-0.5">
                                                        {sel?.categoria || 'GENERAL'}
                                                    </span>
                                                    <div className="min-w-0">
                                                        {sel?.codigo && (
                                                            <div className="text-[11px] font-mono font-bold text-amber-800">
                                                                {sel.codigo}
                                                            </div>
                                                        )}
                                                        <p className="text-xs font-semibold text-gray-900 line-clamp-2">
                                                            {sel?.descripcion}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCatalogoId(null)}
                                                    className="text-xs font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1 shrink-0 px-2 py-1 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <X className="h-3.5 w-3.5" /> Cambiar
                                                </button>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="space-y-2.5 border border-gray-200 rounded-xl p-3 bg-gray-50/60">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchCatalogo}
                                                onChange={(e) => setSearchCatalogo(e.target.value)}
                                                placeholder="Buscar plantilla por palabra clave o código..."
                                                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-gray-400"
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {categoriasList.map((cat) => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setCatFiltro(cat)}
                                                    className={cn(
                                                        'px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer',
                                                        catFiltro === cat
                                                            ? 'bg-amber-600 text-white shadow-xs'
                                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white shadow-inner">
                                            {loadingCatalogo ? (
                                                <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500">
                                                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> Cargando catálogo...
                                                </div>
                                            ) : (
                                                (() => {
                                                    const items = catalogoItems.filter((item) => {
                                                        const matchCat =
                                                            catFiltro === 'TODAS' || item.categoria === catFiltro;
                                                        const matchSearch =
                                                            !searchCatalogo.trim() ||
                                                            item.descripcion
                                                                ?.toLowerCase()
                                                                .includes(searchCatalogo.toLowerCase()) ||
                                                            item.codigo
                                                                ?.toLowerCase()
                                                                .includes(searchCatalogo.toLowerCase());
                                                        return matchCat && matchSearch;
                                                    });

                                                    if (items.length === 0) {
                                                        return (
                                                            <div className="py-4 text-center text-xs text-gray-400">
                                                                Sin coincidencias. Puede redactar abajo directamente.
                                                            </div>
                                                        );
                                                    }

                                                    return items.map((item) => (
                                                        <button
                                                            key={item.id_pendiente_catalogo}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCatalogoId(item.id_pendiente_catalogo);
                                                                setDescripcionManual(item.descripcion);
                                                            }}
                                                            className="w-full text-left p-2.5 hover:bg-amber-50/70 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                                                        {item.categoria || 'GENERAL'}
                                                                    </span>
                                                                    {item.codigo && (
                                                                        <span className="text-[10px] font-mono text-gray-500 font-semibold">
                                                                            {item.codigo}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs font-medium text-gray-800 line-clamp-1 group-hover:text-amber-900">
                                                                    {item.descripcion}
                                                                </p>
                                                            </div>
                                                            <span className="text-[11px] font-bold text-amber-700 opacity-0 group-hover:opacity-100 shrink-0">
                                                                + Seleccionar
                                                            </span>
                                                        </button>
                                                    ));
                                                })()
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 3. DESCRIPCIÓN DEL PENDIENTE */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Descripción del Pendiente *
                                </label>
                                <textarea
                                    value={descripcionManual}
                                    onChange={(e) => setDescripcionManual(e.target.value)}
                                    placeholder="Detalle el hallazgo, repuesto o adecuación requerida..."
                                    rows={3}
                                    required
                                    className="w-full text-sm p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>

                            {/* 4. PRIORIDAD Y OBSERVACIONES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Prioridad
                                    </label>
                                    <select
                                        value={prioridad}
                                        onChange={(e) => setPrioridad(e.target.value as any)}
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                    >
                                        <option value="NORMAL">Normal (Recomendado)</option>
                                        <option value="ALTA">Alta</option>
                                        <option value="URGENTE">Urgente</option>
                                        <option value="EMERGENCIA">Emergencia</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Observaciones Adicionales
                                    </label>
                                    <input
                                        type="text"
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        placeholder="Medidas, referencia de repuesto, contacto..."
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 shadow-sm shadow-amber-600/20 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                                        </>
                                    ) : tipoAlcance === 'EQUIPO' && selectedEquiposIds.length > 1 ? (
                                        `Guardar Pendiente (${selectedEquiposIds.length} equipos)`
                                    ) : (
                                        'Guardar Pendiente'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Gestionar / Resolver / Reabrir Pendiente */}
            {isResolveModalOpen && selectedPendiente && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-600" />
                                Gestionar Pendiente Técnico
                            </h3>
                            <button
                                onClick={() => setIsResolveModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                                    Pendiente Seleccionado:
                                </p>
                                <p className="text-sm font-semibold text-gray-800">
                                    {selectedPendiente.descripcion}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Actualizar Estado a:
                                </label>
                                <select
                                    value={resolucionEstado}
                                    onChange={(e) => setResolucionEstado(e.target.value as any)}
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-semibold"
                                >
                                    <option value="PENDIENTE">
                                        Pendiente (Abierto / Reabrir hallazgo)
                                    </option>
                                    <option value="EN_GESTION">
                                        En Gestión (Cotizando / Asignado a visita de seguimiento)
                                    </option>
                                    <option value="RESUELTO">Resuelto (Ejecutado o corregido)</option>
                                    <option value="CANCELADO">Cancelado (No aplica o desestimado)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Notas de Resolución / Seguimiento:
                                </label>
                                <textarea
                                    value={resolucionNotas}
                                    onChange={(e) => setResolucionNotas(e.target.value)}
                                    placeholder="Ej: Se instaló repuesto en visita de seguimiento o se aprobó cotización..."
                                    rows={3}
                                    className="w-full text-sm p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsResolveModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdateEstado}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 shadow-sm cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                                        </>
                                    ) : (
                                        'Actualizar Estado'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
