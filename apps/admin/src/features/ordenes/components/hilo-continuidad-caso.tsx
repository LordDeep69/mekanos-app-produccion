'use client';

import React from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    CornerDownRight,
    DollarSign,
    GitBranch,
    Layers,
    Plus,
    ShieldAlert,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import { getEstadoColor } from '@/types/ordenes';

interface HiloContinuidadCasoProps {
    orden: Orden;
}

const TIPO_VISITA_META: Record<string, { label: string; badgeClass: string }> = {
    INICIAL: {
        label: 'Visita Inicial (Raíz)',
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

export function HiloContinuidadCaso({ orden }: HiloContinuidadCasoProps) {
    const hilo = orden.hilo_caso;
    const idCliente = orden.clientes?.id_cliente || orden.id_cliente;
    const idEquipoPrincipal =
        orden.ordenes_equipos?.[0]?.equipo?.id_equipo ||
        (orden.ordenes_equipos?.[0] as any)?.id_equipo ||
        orden.equipos?.id_equipo ||
        orden.id_equipo;

    const rootOrderId = hilo?.id_orden_raiz || orden.id_orden_padre || orden.id_orden_servicio;
    const pendientesPropiosAbiertos = (orden.ordenes_pendientes || []).filter(
        (p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION'
    );

    const tipoSugerido =
        pendientesPropiosAbiertos.length > 0 ? 'CORRECTIVO_DERIVADO' : 'CONTINUACION';

    const queryParams = new URLSearchParams();
    queryParams.set('ordenPadreId', String(rootOrderId));
    queryParams.set('ordenOrigenId', String(orden.id_orden_servicio));
    if (idCliente) queryParams.set('clienteId', String(idCliente));
    if (idEquipoPrincipal) queryParams.set('equipoId', String(idEquipoPrincipal));
    queryParams.set('tipoVisita', tipoSugerido);
    if (pendientesPropiosAbiertos.length > 0) {
        queryParams.set(
            'pendientesIds',
            pendientesPropiosAbiertos.map((p) => p.id_orden_pendiente).join(',')
        );
    }

    const followUpHref = `/ordenes/nueva?${queryParams.toString()}`;
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

    // Si es una visita única sin encadenamiento aún, mostrar barra ejecutiva compacta para encadenar
    if (!esMultivisita) {
        return (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-sm border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shrink-0">
                        <GitBranch className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                                Trazabilidad Continua de Escenario (Visita #1 • Inicial)
                            </span>
                            {pendientesPropiosAbiertos.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                    {pendientesPropiosAbiertos.length} pendiente(s) abierto(s) en esta orden
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                            ¿El escenario requiere una segunda intervención, montaje de repuestos o garantía? Encadene una visita manteniendo un único expediente técnico.
                        </p>
                    </div>
                </div>

                <Link
                    href={followUpHref}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 border border-indigo-400/30 cursor-pointer"
                >
                    <CornerDownRight className="h-4 w-4" />
                    <span>Programar Visita de Seguimiento / Garantía</span>
                </Link>
            </div>
        );
    }

    const visitas = hilo?.visitas || [];
    const metaActual =
        TIPO_VISITA_META[orden.tipo_visita || 'INICIAL'] || TIPO_VISITA_META.INICIAL;

    return (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden">
            {/* Barra Superior Consolidada del Expediente */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300 shrink-0">
                        <GitBranch className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-300">
                                Hilo de Continuidad del Caso
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/30 text-white border border-indigo-400/40">
                                Caso Raíz: {hilo?.numero_orden_raiz || orden.orden_padre?.numero_orden || orden.numero_orden}
                            </span>
                            <span
                                className={cn(
                                    'px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                                    metaActual.badgeClass
                                )}
                            >
                                Visita #{orden.numero_visita_caso || 1} • {metaActual.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                            Secuencia fractal de intervenciones vinculadas al mismo escenario técnico y activo(s).
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

                    <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs">
                        <span className="text-slate-300 block text-[10px] uppercase font-bold">
                            Pendientes del Caso
                        </span>
                        <span className="font-extrabold text-amber-300 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            {hilo?.pendientes_resueltos ?? 0} resueltos /{' '}
                            <span className={(hilo?.pendientes_abiertos ?? 0) > 0 ? 'text-amber-300' : 'text-slate-300'}>
                                {hilo?.pendientes_abiertos ?? 0} abiertos
                            </span>
                        </span>
                    </div>

                    <Link
                        href={followUpHref}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all border border-indigo-400/40 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Nueva Visita</span>
                    </Link>
                </div>
            </div>

            {/* Línea de Tiempo Horizontal Interactiva (Visita 1 ──▶ Visita 2 ──▶ [+ Nueva Visita]) */}
            <div className="p-4 bg-gradient-to-b from-indigo-50/50 to-white overflow-x-auto">
                <div className="flex items-stretch gap-2 min-w-max">
                    {visitas.map((v, idx) => {
                        const esActual = v.id_orden_servicio === orden.id_orden_servicio;
                        const codigoEstado = v.estados_orden?.codigo_estado || '';
                        const nombreEstado = v.estados_orden?.nombre_estado || codigoEstado;
                        const tecnicoPersona =
                            v.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
                        const tecnicoNombre = tecnicoPersona
                            ? `${tecnicoPersona.primer_nombre || ''} ${tecnicoPersona.primer_apellido || ''}`.trim()
                            : 'Sin técnico';

                        const pOriginados = v.ordenes_pendientes?.length || 0;
                        const pAsignados = v.pendientes_asignados_resolver?.length || 0;

                        return (
                            <React.Fragment key={v.id_orden_servicio}>
                                <Link
                                    href={`/ordenes/${v.id_orden_servicio}`}
                                    className={cn(
                                        'group relative rounded-xl p-3.5 border-2 transition-all w-64 flex flex-col justify-between gap-2',
                                        esActual
                                            ? 'bg-indigo-50/90 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70'
                                    )}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1">
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

                                        <div className="font-mono font-bold text-sm text-slate-900 group-hover:text-indigo-700 flex items-center justify-between">
                                            <span>{v.numero_orden}</span>
                                            <span className="text-[10px] font-sans font-semibold text-slate-500">
                                                {v.tipo_visita || 'INICIAL'}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                                            {v.tipos_servicio?.nombre_tipo || 'Servicio Técnico'}
                                        </p>
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
                                                    title={`${pAsignados} pendiente(s) asignado(s) para resolver en esta visita`}
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
                    <Link
                        href={followUpHref}
                        className="rounded-xl p-3.5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/80 transition-all w-56 flex flex-col items-center justify-center text-center gap-1.5 text-indigo-700 group cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                            <Plus className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold">
                            + Programar Visita #{(hilo?.total_visitas || visitas.length) + 1}
                        </span>
                        <span className="text-[10px] text-indigo-600/80 leading-tight">
                            Continuación, Correctivo Derivado o Garantía
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
