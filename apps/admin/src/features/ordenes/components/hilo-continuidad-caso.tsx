'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    ArrowRight,
    Building2,
    Calendar,
    CheckCircle2,
    CheckSquare,
    Clock,
    CornerDownRight,
    DollarSign,
    ExternalLink,
    GitBranch,
    Globe,
    Layers,
    Loader2,
    Plus,
    Settings,
    Square,
    Target,
    User,
    Wrench,
    X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { cn, formatDateSafe } from '@/lib/utils';
import type { Orden, OrdenPendiente } from '@/types/ordenes';
import {
    getClienteNombre,
    getEstadoColor,
    getPendienteEstadoColor,
    getPendienteEstadoLabel,
    getPrioridadColor,
    getTecnicoLabel,
    getTipoVisitaLabel,
} from '@/types/ordenes';
import {
    useCrearOrden,
    useTecnicosSelector,
    useTiposServicio,
} from '@/features/ordenes';

interface HiloContinuidadCasoProps {
    orden: Orden;
    onOpenPendientesTab?: () => void;
}

export interface ProgramarVisitaModalProps {
    orden: Orden;
    isOpen: boolean;
    onClose: () => void;
    initialPendientesIds?: number[];
}

const TIPO_VISITA_META: Record<string, { label: string; badgeClass: string }> = {
    INICIAL: {
        label: 'Visita Inicial',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    CONTINUACION: {
        label: 'Continuación Operativa',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    CORRECTIVO_DERIVADO: {
        label: 'Correctivo Derivado',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    GARANTIA: {
        label: 'Visita por Garantía',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    },
};

export function ProgramarVisitaModal({
    orden,
    isOpen,
    onClose,
    initialPendientesIds,
}: ProgramarVisitaModalProps) {
    const router = useRouter();
    const crearOrden = useCrearOrden();
    const { data: tiposServicio = [], isLoading: loadingTipos } = useTiposServicio({ activo: true });
    const { data: tecnicosRaw = [], isLoading: loadingTecnicos } = useTecnicosSelector();

    const tecnicosActivos = useMemo(() => {
        return (tecnicosRaw || []).filter((t: any) => {
            const nombre = getTecnicoLabel(t).toUpperCase();
            if (nombre.includes('KARL MAX') || nombre.includes('SHERLOCK HOLMES')) return false;
            if (t.empleado_activo === false || t.es_tecnico === false) return false;
            return true;
        });
    }, [tecnicosRaw]);

    const hilo = orden.hilo_caso;
    const rootOrderId = hilo?.id_orden_raiz || orden.id_orden_padre || orden.id_orden_servicio;
    const rootOrderNumero =
        hilo?.numero_orden_raiz || orden.orden_padre?.numero_orden || orden.numero_orden;
    const nextVisitaNum = (hilo?.total_visitas || 1) + 1;
    const idCliente = orden.clientes?.id_cliente || orden.id_cliente;

    // Equipos heredados de la orden actual
    const equiposHeredados = useMemo(() => {
        if (orden.ordenes_equipos && orden.ordenes_equipos.length > 0) {
            return orden.ordenes_equipos
                .map((oe: any) => {
                    const eq = oe.equipo || oe.equipos;
                    return {
                        id_equipo: (eq?.id_equipo || oe.id_equipo) as number,
                        codigo_equipo: eq?.codigo_equipo || `EQ-${oe.orden_secuencia || 1}`,
                        nombre_equipo: eq?.nombre_equipo || oe.nombre_sistema || 'Equipo',
                    };
                })
                .filter((e) => Boolean(e.id_equipo));
        }
        const fallbackId = orden.equipos?.id_equipo || orden.id_equipo;
        if (fallbackId) {
            return [
                {
                    id_equipo: fallbackId,
                    codigo_equipo: orden.equipos?.codigo_equipo || `EQ-${fallbackId}`,
                    nombre_equipo: orden.equipos?.nombre_equipo || 'Equipo Principal',
                },
            ];
        }
        return [];
    }, [orden]);

    // Pendientes activos de todo el caso (PENDIENTE o EN_GESTION)
    const pendientesActivosCaso = useMemo(() => {
        const map = new Map<number, OrdenPendiente>();
        const sourceList = [
            ...(hilo?.pendientes_caso || []),
            ...(orden.ordenes_pendientes || []),
            ...(orden.pendientes_asignados_resolver || []),
        ];
        for (const p of sourceList) {
            if (p && (p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION')) {
                map.set(p.id_orden_pendiente, p);
            }
        }
        return Array.from(map.values());
    }, [hilo?.pendientes_caso, orden.ordenes_pendientes, orden.pendientes_asignados_resolver]);

    const [tipoVisita, setTipoVisita] = useState<'CORRECTIVO_DERIVADO' | 'CONTINUACION' | 'GARANTIA'>(
        pendientesActivosCaso.length > 0 ? 'CORRECTIVO_DERIVADO' : 'CONTINUACION'
    );
    const [tipoServicioId, setTipoServicioId] = useState<number>(
        orden.tipos_servicio?.id_tipo_servicio || (orden as any).id_tipo_servicio || 0
    );
    const [fechaProgramada, setFechaProgramada] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [prioridad, setPrioridad] = useState<'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA'>(
        orden.prioridad || 'ALTA'
    );
    const [tecnicoId, setTecnicoId] = useState<number | undefined>(
        orden.id_tecnico_asignado ||
            orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_empleado ||
            undefined
    );
    const [selectedPendientesIds, setSelectedPendientesIds] = useState<number[]>([]);
    const [observacionInicial, setObservacionInicial] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Inicializar estado cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null);
            const defaultIds =
                initialPendientesIds && initialPendientesIds.length > 0
                    ? initialPendientesIds
                    : pendientesActivosCaso.map((p) => p.id_orden_pendiente);
            setSelectedPendientesIds(defaultIds);
            setTipoVisita(
                pendientesActivosCaso.length > 0 ? 'CORRECTIVO_DERIVADO' : 'CONTINUACION'
            );

            const defaultTipoServ =
                orden.tipos_servicio?.id_tipo_servicio ||
                (orden as any).id_tipo_servicio ||
                tiposServicio[0]?.id_tipo_servicio ||
                0;
            setTipoServicioId(defaultTipoServ);

            setTecnicoId(
                orden.id_tecnico_asignado ||
                    orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_empleado ||
                    undefined
            );

            const resumenPendientes =
                defaultIds.length > 0
                    ? `Visita #${nextVisitaNum} de seguimiento al caso ${rootOrderNumero} para ejecutar y cerrar ${defaultIds.length} pendiente(s) activo(s).`
                    : `Visita #${nextVisitaNum} de continuidad técnica vinculada al caso ${rootOrderNumero}.`;
            setObservacionInicial(resumenPendientes);
        }
    }, [isOpen, initialPendientesIds, pendientesActivosCaso, nextVisitaNum, rootOrderNumero, orden, tiposServicio]);

    // Si tiposServicio carga después de abrir el modal y tipoServicioId es 0, seleccionar el primero o un correctivo
    useEffect(() => {
        if (isOpen && !tipoServicioId && tiposServicio.length > 0) {
            const corr = tiposServicio.find((t: any) =>
                (t.nombre_tipo || '').toUpperCase().includes('CORRECTIVO')
            );
            setTipoServicioId(corr?.id_tipo_servicio || tiposServicio[0].id_tipo_servicio);
        }
    }, [isOpen, tipoServicioId, tiposServicio]);

    if (!isOpen) return null;

    const togglePendiente = (id: number) => {
        setSelectedPendientesIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!idCliente) {
            setErrorMsg('No se pudo determinar el cliente de la orden.');
            return;
        }
        if (equiposHeredados.length === 0) {
            setErrorMsg('No se encontraron equipos asociados a la orden.');
            return;
        }
        if (!tipoServicioId) {
            setErrorMsg('Seleccione un tipo de servicio para la nueva visita.');
            return;
        }
        if (!fechaProgramada) {
            setErrorMsg('Seleccione la fecha programada para la visita.');
            return;
        }

        try {
            const res = await crearOrden.mutateAsync({
                clienteId: Number(idCliente),
                sedeClienteId: orden.id_sede || orden.sedes_cliente?.id_sede || undefined,
                equipoId: Number(equiposHeredados[0].id_equipo),
                equiposIds: equiposHeredados.map((eq) => Number(eq.id_equipo)),
                tipoServicioId: Number(tipoServicioId),
                fechaProgramada,
                prioridad,
                tecnicoId: tecnicoId ? Number(tecnicoId) : undefined,
                descripcion:
                    observacionInicial.trim() ||
                    `Visita #${nextVisitaNum} vinculada al caso ${rootOrderNumero}`,
                idOrdenPadre: Number(rootOrderId),
                tipoVisita,
                idsPendientesAResolver: selectedPendientesIds,
            });

            onClose();
            if (res?.data?.id_orden_servicio) {
                router.push(`/ordenes/${res.data.id_orden_servicio}`);
            }
        } catch (err: any) {
            setErrorMsg(
                err?.response?.data?.message ||
                    err?.message ||
                    'Ocurrió un error al programar la visita de seguimiento'
            );
        }
    };

    const queryParams = new URLSearchParams();
    queryParams.set('ordenPadreId', String(rootOrderId));
    queryParams.set('ordenOrigenId', String(orden.id_orden_servicio));
    if (idCliente) queryParams.set('clienteId', String(idCliente));
    if (equiposHeredados[0]?.id_equipo) {
        queryParams.set('equipoId', String(equiposHeredados[0].id_equipo));
    }
    queryParams.set('tipoVisita', tipoVisita);
    if (selectedPendientesIds.length > 0) {
        queryParams.set('pendientesIds', selectedPendientesIds.join(','));
    }
    const wizardAvanzadoHref = `/ordenes/nueva?${queryParams.toString()}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header Ejecutivo */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300">
                            <GitBranch className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-base text-white">
                                    Programar Visita #{nextVisitaNum} de Seguimiento
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                                    {orden.hilo_caso?.codigo_caso || rootOrderNumero.replace(/^OS-/, 'CASO-')} ({rootOrderNumero})
                                </span>
                            </div>
                            {orden.hilo_caso?.nombre_caso && (
                                <p className="text-xs font-bold text-indigo-200 mt-0.5">
                                    📋 Caso: {orden.hilo_caso.nombre_caso}
                                </p>
                            )}
                            <p className="text-xs text-slate-300 mt-0.5">
                                Creación directa en 1 solo paso heredando cliente, equipo(s) y pendientes activos del caso.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Cuerpo del Modal */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* 1. Resumen de Contexto Heredado (Bloqueado para Cero Fricción) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2.5">
                            <Building2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Cliente Heredado
                                </span>
                                <span className="font-bold text-slate-900 truncate block">
                                    {getClienteNombre(orden)}
                                </span>
                                {orden.sedes_cliente?.nombre_sede && (
                                    <span className="text-[11px] text-slate-500">
                                        Sede: {orden.sedes_cliente.nombre_sede}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                            <Wrench className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Equipo(s) a Intervenir ({equiposHeredados.length})
                                </span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {equiposHeredados.map((eq) => (
                                        <span
                                            key={eq.id_equipo}
                                            className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold text-[11px]"
                                        >
                                            {eq.codigo_equipo}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Selección Automática de Pendientes Activos del Caso */}
                    <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-indigo-600" />
                                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                                    Pendientes Activos del Caso a Resolver en Visita #{nextVisitaNum}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                                    {selectedPendientesIds.length} / {pendientesActivosCaso.length} seleccionados
                                </span>
                            </div>

                            {pendientesActivosCaso.length > 0 && (
                                <div className="flex items-center gap-2 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedPendientesIds(
                                                pendientesActivosCaso.map((p) => p.id_orden_pendiente)
                                            )
                                        }
                                        className="font-bold text-indigo-700 hover:underline cursor-pointer"
                                    >
                                        Marcar todos
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPendientesIds([])}
                                        className="font-medium text-slate-500 hover:underline cursor-pointer"
                                    >
                                        Ninguno
                                    </button>
                                </div>
                            )}
                        </div>

                        {pendientesActivosCaso.length === 0 ? (
                            <p className="text-xs text-slate-600 bg-white/80 p-3 rounded-lg border border-indigo-100">
                                No hay pendientes abiertos en este caso. La visita se creará como seguimiento general del expediente.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {pendientesActivosCaso.map((p) => {
                                    const checked = selectedPendientesIds.includes(p.id_orden_pendiente);
                                    const alcance = p.alcance || 'EQUIPO';
                                    const numOrigen = p.ordenes_servicio?.numero_orden || rootOrderNumero;
                                    const numVisitaOrigen = p.ordenes_servicio?.numero_visita_caso || 1;
                                    return (
                                        <div
                                            key={p.id_orden_pendiente}
                                            onClick={() => togglePendiente(p.id_orden_pendiente)}
                                            className={cn(
                                                'p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer select-none',
                                                checked
                                                    ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/30'
                                                    : 'bg-white/60 border-slate-200 opacity-75 hover:opacity-100'
                                            )}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                {checked ? (
                                                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                                                ) : (
                                                    <Square className="h-4 w-4 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                    <span
                                                        className={cn(
                                                            'px-1.5 py-0.2 rounded text-[10px] font-bold border',
                                                            getPendienteEstadoColor(p.estado)
                                                        )}
                                                    >
                                                        {getPendienteEstadoLabel(p.estado)}
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {alcance === 'CLIENTE'
                                                            ? '🏢 Cliente / Sede'
                                                            : alcance === 'SERVICIO'
                                                            ? '🛠️ Servicio'
                                                            : `🔧 ${p.equipos?.codigo_equipo || 'Equipo'}`}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-indigo-700 font-semibold">
                                                        Origen: Visita #{numVisitaOrigen} ({numOrigen})
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 leading-snug">
                                                    {p.descripcion}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 3. Configuración Operativa de la Visita */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Naturaleza de la Visita *
                            </label>
                            <select
                                value={tipoVisita}
                                onChange={(e) => setTipoVisita(e.target.value as any)}
                                className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-semibold text-slate-800"
                            >
                                <option value="CORRECTIVO_DERIVADO">
                                    Correctivo Derivado (Resolver pendientes)
                                </option>
                                <option value="CONTINUACION">
                                    Continuación Operativa (Mismo trabajo)
                                </option>
                                <option value="GARANTIA">
                                    Visita por Garantía (Reintervención sin cobro)
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Tipo de Servicio *
                            </label>
                            <select
                                value={tipoServicioId}
                                onChange={(e) => setTipoServicioId(Number(e.target.value))}
                                disabled={loadingTipos}
                                className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-semibold text-slate-800"
                            >
                                <option value={0}>Seleccione tipo de servicio...</option>
                                {tiposServicio.map((t: any) => (
                                    <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>
                                        {t.nombre_tipo} ({t.codigo_tipo})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Fecha Programada *
                            </label>
                            <input
                                type="date"
                                value={fechaProgramada}
                                onChange={(e) => setFechaProgramada(e.target.value)}
                                required
                                className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-semibold text-slate-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Técnico Asignado
                            </label>
                            <select
                                value={tecnicoId || ''}
                                onChange={(e) =>
                                    setTecnicoId(e.target.value ? Number(e.target.value) : undefined)
                                }
                                disabled={loadingTecnicos}
                                className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-semibold text-slate-800"
                            >
                                <option value="">Dejar sin asignar por ahora</option>
                                {tecnicosActivos.map((t: any) => (
                                    <option key={t.id_empleado} value={t.id_empleado}>
                                        {getTecnicoLabel(t)} {t.cargo ? `— ${t.cargo}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Instrucción / Alcance para la Visita #{nextVisitaNum}
                        </label>
                        <textarea
                            value={observacionInicial}
                            onChange={(e) => setObservacionInicial(e.target.value)}
                            rows={2}
                            placeholder="Describa las labores a realizar en esta visita de seguimiento..."
                            className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    </div>

                    {/* Footer de Acciones - STICKY BOTTOM SIEMPRE VISIBLE */}
                    <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-20">
                        <Link
                            href={wizardAvanzadoHref}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                        >
                            <span>¿Necesita cambiar equipos? Ir al asistente de 3 pasos</span>
                            <ExternalLink className="h-3 w-3" />
                        </Link>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={crearOrden.isPending}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {crearOrden.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Creando Visita #{nextVisitaNum}...</span>
                                    </>
                                ) : (
                                    <>
                                        <CornerDownRight className="h-4 w-4" />
                                        <span>
                                            Confirmar y Crear Visita #{nextVisitaNum} (
                                            {selectedPendientesIds.length} pendiente
                                            {selectedPendientesIds.length === 1 ? '' : 's'})
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function HiloContinuidadCaso({ orden, onOpenPendientesTab }: HiloContinuidadCasoProps) {
    const queryClient = useQueryClient();
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

    const hilo = orden.hilo_caso;
    const codigoCaso =
        hilo?.codigo_caso ||
        (hilo?.numero_orden_raiz || orden.orden_padre?.numero_orden || orden.numero_orden || '').replace(
            /^OS-/,
            'CASO-'
        );
    const numeroOrdenRaiz =
        hilo?.numero_orden_raiz || orden.orden_padre?.numero_orden || orden.numero_orden;
    const [nombreCasoLocal, setNombreCasoLocal] = useState(
        hilo?.nombre_caso || orden.nombre_caso || ''
    );
    const [estadoCasoLocal, setEstadoCasoLocal] = useState(
        hilo?.estado_caso || orden.estado_caso || 'ABIERTO'
    );
    const [editandoNombreCaso, setEditandoNombreCaso] = useState(false);
    const [guardandoCaso, setGuardandoCaso] = useState(false);

    useEffect(() => {
        setNombreCasoLocal(hilo?.nombre_caso || orden.nombre_caso || '');
        setEstadoCasoLocal(hilo?.estado_caso || orden.estado_caso || 'ABIERTO');
    }, [hilo?.nombre_caso, hilo?.estado_caso, orden.nombre_caso, orden.estado_caso]);

    const guardarIdentidadCaso = async (nuevoNombre?: string, nuevoEstado?: string) => {
        setGuardandoCaso(true);
        try {
            const payload: any = {};
            if (nuevoNombre !== undefined) payload.nombre_caso = nuevoNombre;
            if (nuevoEstado !== undefined) payload.estado_caso = nuevoEstado;
            await apiClient.patch(`/ordenes/${orden.id_orden_servicio}/caso`, payload);
            if (nuevoNombre !== undefined) setNombreCasoLocal(nuevoNombre);
            if (nuevoEstado !== undefined) setEstadoCasoLocal(nuevoEstado);
            setEditandoNombreCaso(false);
            queryClient.invalidateQueries({ queryKey: ['ordenes'] });
        } catch (e) {
            console.error('Error actualizando identidad del caso:', e);
        } finally {
            setGuardandoCaso(false);
        }
    };

    const pendientesPropiosAbiertos = (
        hilo?.pendientes_caso ||
        orden.ordenes_pendientes ||
        []
    ).filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION');

    const esMultivisita =
        Boolean(hilo?.es_multivisita) ||
        Boolean(orden.id_orden_padre) ||
        (orden.numero_visita_caso ?? 1) > 1;

    const formatCOP = (val: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(val || 0);

    const totalesCaso = hilo?.pendientes_totales ?? (orden.ordenes_pendientes?.length || 0);
    const resueltosCaso =
        hilo?.pendientes_resueltos ??
        (orden.ordenes_pendientes || []).filter((p) => p.estado === 'RESUELTO').length;
    const activosCaso =
        hilo?.pendientes_abiertos ??
        (orden.ordenes_pendientes || []).filter(
            (p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION'
        ).length;

    const esCasoReal =
        esMultivisita ||
        totalesCaso > 0 ||
        Boolean(orden.nombre_caso?.trim()) ||
        (estadoCasoLocal === 'ABIERTO' && Boolean(hilo?.nombre_caso?.trim()));

    // Si es una visita única/aislada sin encadenamiento ni pendientes, mostrar barra ejecutiva sutil
    if (!esCasoReal) {
        return (
            <>
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-2xs">
                    <div className="flex items-center gap-2.5 text-slate-700">
                        <div className="p-1.5 bg-slate-200/80 rounded-lg text-slate-600">
                            <GitBranch className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                            Esta orden se ejecuta como una <strong>Visita Puntual Independiente</strong>. No pertenece a un expediente multi-visita.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shrink-0"
                    >
                        <Plus className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Iniciar Caso / Programar Visita de Seguimiento</span>
                    </button>
                </div>

                <ProgramarVisitaModal
                    orden={orden}
                    isOpen={isFollowUpModalOpen}
                    onClose={() => setIsFollowUpModalOpen(false)}
                    initialPendientesIds={[]}
                />
            </>
        );
    }

    // Si es un caso base de 1 sola visita, mostrar barra ejecutiva de caso base
    if (!esMultivisita) {
        return (
            <>
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-sm border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shrink-0">
                            <GitBranch className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                                    Trazabilidad Continua del Caso (Visita #1 • Inicial)
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/30 text-white border border-indigo-400/40">
                                    {codigoCaso}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        guardarIdentidadCaso(
                                            undefined,
                                            estadoCasoLocal === 'ABIERTO' ? 'CERRADO' : 'ABIERTO'
                                        )
                                    }
                                    disabled={guardandoCaso}
                                    title="Alternar estado del Caso Base (Abierto / Cerrado)"
                                    className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition-colors cursor-pointer',
                                        estadoCasoLocal === 'ABIERTO'
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                                            : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                                    )}
                                >
                                    {estadoCasoLocal === 'ABIERTO' ? '🟢 Caso Abierto' : '🔒 Caso Cerrado / Aislado'}
                                </button>
                                {pendientesPropiosAbiertos.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={onOpenPendientesTab}
                                        className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 transition-colors cursor-pointer"
                                    >
                                        {totalesCaso} Totales • {activosCaso} Activos / {resueltosCaso} Resueltos
                                    </button>
                                )}
                            </div>

                            {editandoNombreCaso ? (
                                <div className="mt-2 flex items-center gap-2 max-w-xl">
                                    <input
                                        type="text"
                                        value={nombreCasoLocal}
                                        onChange={(e) => setNombreCasoLocal(e.target.value)}
                                        placeholder="Ingrese el nombre característico del caso base..."
                                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-indigo-400/60 text-white text-xs font-semibold outline-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={guardandoCaso}
                                        onClick={() => guardarIdentidadCaso(nombreCasoLocal, 'ABIERTO')}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditandoNombreCaso(false)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs font-bold text-white truncate">
                                        {nombreCasoLocal || 'Sin título de caso asignado'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setEditandoNombreCaso(true)}
                                        className="text-[11px] text-indigo-300 hover:text-white underline shrink-0 cursor-pointer"
                                    >
                                        Editar nombre del caso
                                    </button>
                                </div>
                            )}

                            <p className="text-xs text-slate-300 mt-0.5">
                                ¿El escenario requiere una segunda intervención, montaje de repuestos o garantía? Programe una visita de seguimiento en 1 clic manteniendo el mismo caso técnico.
                            </p>

                            {/* Banner Inteligente caso resuelto en visita única */}
                            {estadoCasoLocal === 'ABIERTO' && totalesCaso > 0 && activosCaso === 0 && (
                                <div className="mt-2 p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                                    <span className="text-xs text-emerald-200 font-semibold">
                                        🎉 Pendientes 100% resueltos. ¿Cerrar expediente?
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => guardarIdentidadCaso(undefined, 'CERRADO')}
                                        disabled={guardandoCaso}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                                    >
                                        <Lock className="h-3 w-3" />
                                        <span>🔒 Cerrar Caso</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 border border-indigo-400/30 cursor-pointer"
                    >
                        <CornerDownRight className="h-4 w-4" />
                        <span>Programar Visita de Seguimiento / Garantía</span>
                    </button>
                </div>

                <ProgramarVisitaModal
                    orden={orden}
                    isOpen={isFollowUpModalOpen}
                    onClose={() => setIsFollowUpModalOpen(false)}
                />
            </>
        );
    }

    const visitas = hilo?.visitas || [];
    const metaActual =
        TIPO_VISITA_META[orden.tipo_visita || 'INICIAL'] || TIPO_VISITA_META.INICIAL;

    return (
        <>
            <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden">
                {/* Barra Superior Consolidada del Expediente */}
                <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300 shrink-0">
                            <GitBranch className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-300">
                                    Hilo de Continuidad del Caso
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/30 text-white border border-indigo-400/40">
                                    {codigoCaso} (Orden Raíz: {numeroOrdenRaiz})
                                </span>
                                <span
                                    className={cn(
                                        'px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                                        metaActual.badgeClass
                                    )}
                                >
                                    Visita #{orden.numero_visita_caso || 1} • {metaActual.label}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        guardarIdentidadCaso(
                                            undefined,
                                            estadoCasoLocal === 'ABIERTO' ? 'CERRADO' : 'ABIERTO'
                                        )
                                    }
                                    disabled={guardandoCaso}
                                    title="Alternar estado del Caso Base (Abierto / Cerrado)"
                                    className={cn(
                                        'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-colors cursor-pointer',
                                        estadoCasoLocal === 'ABIERTO'
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                                            : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                                    )}
                                >
                                    {estadoCasoLocal === 'ABIERTO' ? '🟢 Caso Abierto' : '🔒 Caso Cerrado'}
                                </button>
                            </div>

                            {editandoNombreCaso ? (
                                <div className="mt-2 flex items-center gap-2 max-w-xl">
                                    <input
                                        type="text"
                                        value={nombreCasoLocal}
                                        onChange={(e) => setNombreCasoLocal(e.target.value)}
                                        placeholder="Nombre característico del caso..."
                                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-indigo-400/60 text-white text-xs font-semibold outline-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={guardandoCaso}
                                        onClick={() => guardarIdentidadCaso(nombreCasoLocal)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditandoNombreCaso(false)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm font-extrabold text-white truncate">
                                        📋 {nombreCasoLocal || `Expediente ${codigoCaso}`}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setEditandoNombreCaso(true)}
                                        className="text-[11px] text-indigo-300 hover:text-white underline shrink-0 cursor-pointer"
                                    >
                                        Renombrar caso
                                    </button>
                                </div>
                            )}

                            <p className="text-xs text-slate-300 mt-0.5">
                                Secuencia de visitas vinculadas a este mismo caso técnico.
                            </p>
                        </div>
                    </div>

                    {/* Pills Consolidadas del Caso */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs">
                            <span className="text-slate-300 block text-[10px] uppercase font-bold">
                                Total Visitas
                            </span>
                            <span className="font-extrabold text-white flex items-center gap-1">
                                <Layers className="h-3.5 w-3.5 text-indigo-300" />
                                {hilo?.total_visitas || visitas.length} intervención(es)
                            </span>
                        </div>

                        <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs">
                            <span className="text-slate-300 block text-[10px] uppercase font-bold">
                                Inversión Acumulada Caso
                            </span>
                            <span className="font-extrabold text-emerald-300 flex items-center gap-1 font-mono">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                                {formatCOP(hilo?.inversion_acumulada || 0)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={onOpenPendientesTab}
                            title="Ver Matriz Completa de Pendientes y Hallazgos del Caso"
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-left transition-colors cursor-pointer"
                        >
                            <span className="text-slate-300 block text-[10px] uppercase font-bold">
                                Pendientes del Caso ↗
                            </span>
                            <span className="font-extrabold text-white flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span>{totalesCaso} Totales</span>
                                <span className="text-slate-400">•</span>
                                <span className={activosCaso > 0 ? 'text-amber-300' : 'text-slate-300'}>
                                    {activosCaso} Activos
                                </span>
                                <span className="text-slate-400">/</span>
                                <span className="text-emerald-300">{resueltosCaso} Resueltos</span>
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsFollowUpModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all border border-indigo-400/40 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Nueva Visita</span>
                        </button>
                    </div>
                </div>

                {/* Banner Inteligente: Todos los pendientes resueltos */}
                {estadoCasoLocal === 'ABIERTO' && totalesCaso > 0 && activosCaso === 0 && (
                    <div className="mx-5 my-3 p-3.5 bg-gradient-to-r from-emerald-500/20 via-emerald-600/15 to-emerald-500/10 border border-emerald-400/40 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 text-emerald-100">
                            <span className="text-xl">🎉</span>
                            <div>
                                <p className="text-xs font-bold text-white">
                                    ¡Todos los pendientes técnicos de este caso han sido resueltos! ({resueltosCaso} de {totalesCaso} resueltos)
                                </p>
                                <p className="text-[11px] text-emerald-200">
                                    ¿Desea marcar el Caso <strong>{codigoCaso}</strong> como <strong>CASO CERRADO</strong>?
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => guardarIdentidadCaso(undefined, 'CERRADO')}
                            disabled={guardandoCaso}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Lock className="h-3.5 w-3.5" />
                            <span>{guardandoCaso ? 'Cerrando caso...' : '🔒 Marcar Caso como CERRADO'}</span>
                        </button>
                    </div>
                )}

                {/* Línea de Tiempo Horizontal Interactiva (Visita 1 ──▶ Visita 2 ──▶ [+ Nueva Visita]) */}
                <div className="p-4 bg-gradient-to-b from-indigo-50/50 to-white overflow-x-auto">
                    <div className="flex items-stretch gap-2 min-w-max">
                        {visitas.map((v, idx) => {
                            const esActual = v.id_orden_servicio === orden.id_orden_servicio;
                            const codigoEstado = v.estados_orden?.codigo_estado || '';
                            const nombreEstado = v.estados_orden?.nombre_estado || codigoEstado;

                            const pOriginados = (hilo?.pendientes_caso || []).filter(
                                (p) => p.id_orden_servicio === v.id_orden_servicio
                            ).length;
                            const pAsignados = (hilo?.pendientes_caso || []).filter(
                                (p) => p.id_orden_resolucion === v.id_orden_servicio
                            ).length;

                            return (
                                <React.Fragment key={v.id_orden_servicio}>
                                    <Link
                                        href={`/ordenes/${v.id_orden_servicio}`}
                                        className={cn(
                                            'group relative rounded-xl p-3.5 border-2 transition-all w-72 min-w-[275px] shrink-0 flex flex-col justify-between gap-2.5',
                                            esActual
                                                ? 'bg-indigo-50/90 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                                : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70'
                                        )}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider',
                                                        esActual
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-slate-100 text-slate-700'
                                                    )}
                                                >
                                                    Visita #{v.numero_visita_caso || idx + 1}
                                                    {esActual ? ' • ACTUAL' : ''}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                                        getEstadoColor(codigoEstado)
                                                    )}
                                                >
                                                    {nombreEstado}
                                                </span>
                                            </div>

                                            {/* Código completo de la orden en su propia línea sin truncar jamás */}
                                            <div className="font-mono font-bold text-sm text-slate-900 group-hover:text-indigo-700 whitespace-nowrap tracking-tight">
                                                {v.numero_orden}
                                            </div>

                                            {/* Naturaleza y servicio en línea secundaria */}
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                <span className="text-[10px] font-sans font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                                                    {getTipoVisitaLabel(v.tipo_visita || (idx === 0 ? 'INICIAL' : 'CONTINUACION'))}
                                                </span>
                                                <span className="text-[11px] text-slate-600 truncate font-medium max-w-[150px]">
                                                    {v.tipos_servicio?.nombre_tipo || orden.tipos_servicio?.nombre_tipo || 'Servicio Técnico'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1 truncate">
                                                <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                                {v.fecha_programada
                                                    ? formatDateSafe(v.fecha_programada)
                                                    : 'Sin fecha'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {pOriginados > 0 && (
                                                    <span
                                                        className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]"
                                                        title={`${pOriginados} hallazgo(s) originado(s) en esta visita`}
                                                    >
                                                        +{pOriginados} hallazgos
                                                    </span>
                                                )}
                                                {pAsignados > 0 && (
                                                    <span
                                                        className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]"
                                                        title={`${pAsignados} pendiente(s) en gestión/resueltos en esta visita`}
                                                    >
                                                        🎯 {pAsignados}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Flecha conectora */}
                                    <div className="flex items-center justify-center px-1 text-indigo-400">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                </React.Fragment>
                            );
                        })}

                        {/* Tarjeta Final: [+ Programar Siguiente Visita] */}
                        <button
                            type="button"
                            onClick={() => setIsFollowUpModalOpen(true)}
                            className="rounded-xl p-3.5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/80 transition-all w-56 flex flex-col items-center justify-center text-center gap-1.5 text-indigo-700 group cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                                <Plus className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold">
                                + Programar Visita #{(hilo?.total_visitas || visitas.length) + 1}
                            </span>
                            <span className="text-[10px] text-indigo-600/80 leading-tight">
                                Continuación, Correctivo Derivado o Garantía en 1 paso
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <ProgramarVisitaModal
                orden={orden}
                isOpen={isFollowUpModalOpen}
                onClose={() => setIsFollowUpModalOpen(false)}
            />
        </>
    );
}
