'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Building2,
    CheckCircle2,
    ClipboardList,
    Clock,
    CornerDownRight,
    ExternalLink,
    Globe,
    Loader2,
    Plus,
    RefreshCw,
    Wrench,
    X,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn, formatDateSafe } from '@/lib/utils';
import { getPendienteEstadoColor, getPendienteEstadoLabel, getPrioridadColor } from '@/types/ordenes';

interface ClientePendientesSectionProps {
    clienteId: number;
    equiposCliente?: any[];
}

export function ClientePendientesSection({
    clienteId,
    equiposCliente = [],
}: ClientePendientesSectionProps) {
    const [items, setItems] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filtroAlcance, setFiltroAlcance] = useState<'TODOS' | 'CLIENTE' | 'EQUIPO' | 'SERVICIO'>('TODOS');
    const [filtroEstado, setFiltroEstado] = useState<'ACTIVOS' | 'RESUELTO' | 'TODOS'>('ACTIVOS');

    // Modal Nuevo Pendiente de Cliente / Equipo
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [alcanceNuevo, setAlcanceNuevo] = useState<'CLIENTE' | 'EQUIPO'>('CLIENTE');
    const [idEquipoNuevo, setIdEquipoNuevo] = useState<number | ''>('');
    const [descripcion, setDescripcion] = useState('');
    const [prioridad, setPrioridad] = useState<'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA'>('NORMAL');
    const [observaciones, setObservaciones] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const cargarBacklog = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(
                `/ordenes/backlog-pendientes?idCliente=${clienteId}&estado=TODOS`
            );
            if (res.data?.success) {
                setItems(res.data.data || []);
                setResumen(res.data.resumen || null);
            }
        } catch (err) {
            console.error('Error cargando backlog pendientes cliente:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarBacklog();
    }, [clienteId]);

    const handleCrearPendiente = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descripcion.trim()) return;
        setSubmitting(true);
        try {
            const res = await apiClient.post('/ordenes/pendientes-directos', {
                idCliente: clienteId,
                idEquipo: alcanceNuevo === 'EQUIPO' && idEquipoNuevo ? Number(idEquipoNuevo) : null,
                alcance: alcanceNuevo,
                descripcion: descripcion.trim(),
                prioridad,
                observaciones: observaciones.trim() || undefined,
            });
            if (res.data?.success) {
                setIsAddOpen(false);
                setDescripcion('');
                setObservaciones('');
                setPrioridad('NORMAL');
                await cargarBacklog();
            }
        } catch (err: any) {
            alert(err.message || 'Error registrando pendiente');
        } finally {
            setSubmitting(false);
        }
    };

    const filtrados = items.filter((p) => {
        if (filtroEstado === 'ACTIVOS') {
            if (p.estado !== 'PENDIENTE' && p.estado !== 'EN_GESTION') return false;
        } else if (filtroEstado === 'RESUELTO') {
            if (p.estado !== 'RESUELTO') return false;
        }
        if (filtroAlcance !== 'TODOS') {
            if ((p.alcance || 'EQUIPO') !== filtroAlcance) return false;
        }
        return true;
    });

    const activosIds = items
        .filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION')
        .map((p) => p.id_orden_pendiente);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900">
                                Backlog Central de Pendientes & Hallazgos del Cliente (360°)
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {(resumen?.pendientes || 0) + (resumen?.en_gestion || 0)} activos /{' '}
                                {resumen?.total || 0} total
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Consolidado de pendientes de Equipos ({resumen?.por_alcance?.EQUIPO || 0}),
                            Infraestructura de Sede ({resumen?.por_alcance?.CLIENTE || 0}) y Continuidad de
                            Servicio ({resumen?.por_alcance?.SERVICIO || 0})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={cargarBacklog}
                        className="p-2 text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
                        title="Refrescar backlog"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>+ Nuevo Pendiente de Cliente / Sede</span>
                    </button>
                    {activosIds.length > 0 && (
                        <Link
                            href={`/ordenes/nueva?clienteId=${clienteId}&pendientesIds=${activosIds.join(
                                ','
                            )}&tipoVisita=CORRECTIVO_DERIVADO`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                        >
                            <CornerDownRight className="h-4 w-4" />
                            <span>Programar OT de Resolución ({activosIds.length})</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Filtros de Alcance y Estado */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-400 font-semibold">Alcance:</span>
                    {(
                        [
                            { key: 'TODOS', label: 'Todos los Alcances' },
                            { key: 'EQUIPO', label: `⚙️ Equipos (${resumen?.por_alcance?.EQUIPO || 0})` },
                            { key: 'CLIENTE', label: `🏢 Cliente / Sede (${resumen?.por_alcance?.CLIENTE || 0})` },
                            { key: 'SERVICIO', label: `🛠️ Servicio (${resumen?.por_alcance?.SERVICIO || 0})` },
                        ] as const
                    ).map((op) => (
                        <button
                            key={op.key}
                            onClick={() => setFiltroAlcance(op.key)}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                                filtroAlcance === op.key
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                            )}
                        >
                            {op.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-semibold">Estado:</span>
                    {(
                        [
                            { key: 'ACTIVOS', label: 'Activos' },
                            { key: 'RESUELTO', label: 'Resueltos' },
                            { key: 'TODOS', label: 'Todos' },
                        ] as const
                    ).map((st) => (
                        <button
                            key={st.key}
                            onClick={() => setFiltroEstado(st.key)}
                            className={cn(
                                'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                                filtroEstado === st.key
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                            )}
                        >
                            {st.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de Pendientes */}
            <div className="p-5">
                {loading ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> Cargando backlog 360°...
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                        <p className="text-xs font-bold text-gray-700">
                            No hay pendientes registrados en este filtro para este cliente.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {filtrados.map((p) => {
                            const alcance = p.alcance || 'EQUIPO';
                            const isResuelto = p.estado === 'RESUELTO';
                            return (
                                <div
                                    key={p.id_orden_pendiente}
                                    className={cn(
                                        'p-4 rounded-xl border flex flex-col justify-between gap-2.5',
                                        isResuelto
                                            ? 'bg-emerald-50/30 border-emerald-200'
                                            : 'bg-white border-amber-200/90 shadow-2xs'
                                    )}
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
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded text-[10px] font-bold',
                                                        getPrioridadColor(p.prioridad)
                                                    )}
                                                >
                                                    {p.prioridad}
                                                </span>
                                                {alcance === 'CLIENTE' ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" /> Cliente / Sede
                                                    </span>
                                                ) : alcance === 'SERVICIO' ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                                        <Globe className="h-3 w-3" /> Continuidad Servicio
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                                                        <Wrench className="h-3 w-3" />{' '}
                                                        {p.equipos?.codigo_equipo || 'Equipo'}
                                                    </span>
                                                )}
                                            </div>

                                            {p.ordenes_servicio && (
                                                <Link
                                                    href={`/ordenes/${p.ordenes_servicio.id_orden_servicio}`}
                                                    className="text-[11px] font-mono font-bold text-blue-700 hover:underline flex items-center gap-1"
                                                >
                                                    <span>Origen: {p.ordenes_servicio.numero_orden}</span>
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                </Link>
                                            )}
                                        </div>

                                        <p className="text-sm font-semibold text-gray-900">{p.descripcion}</p>
                                        {p.observaciones && (
                                            <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <strong>Obs:</strong> {p.observaciones}
                                            </p>
                                        )}

                                        {p.orden_resolucion && (
                                            <div className="mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                                                <span className="font-semibold text-indigo-900">
                                                    {isResuelto ? 'Resuelto en:' : 'En gestión en:'}
                                                </span>
                                                <Link
                                                    href={`/ordenes/${p.orden_resolucion.id_orden_servicio}`}
                                                    className="font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1"
                                                >
                                                    <span>
                                                        {p.orden_resolucion.numero_orden} (Visita #
                                                        {p.orden_resolucion.numero_visita_caso || 2})
                                                    </span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDateSafe(p.fecha_creacion)}
                                        </span>
                                        {!isResuelto && !p.orden_resolucion && (
                                            <Link
                                                href={`/ordenes/nueva?clienteId=${clienteId}${
                                                    p.id_equipo ? `&equipoId=${p.id_equipo}` : ''
                                                }&pendientesIds=${p.id_orden_pendiente}${
                                                    p.id_orden_servicio
                                                        ? `&ordenPadreId=${p.id_orden_servicio}&tipoVisita=CORRECTIVO_DERIVADO`
                                                        : ''
                                                }`}
                                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 text-xs"
                                            >
                                                Programar OT →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Nuevo Pendiente Directo */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <Plus className="h-4 w-4 text-amber-600" />
                                Registrar Pendiente en Cuenta del Cliente
                            </h4>
                            <button
                                onClick={() => setIsAddOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCrearPendiente} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAlcanceNuevo('CLIENTE')}
                                    className={cn(
                                        'p-2.5 rounded-xl border text-xs font-bold text-left cursor-pointer',
                                        alcanceNuevo === 'CLIENTE'
                                            ? 'bg-purple-50 border-purple-500 text-purple-900'
                                            : 'border-gray-200 text-gray-600'
                                    )}
                                >
                                    🏢 Cliente / Sede (Locativo)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAlcanceNuevo('EQUIPO')}
                                    className={cn(
                                        'p-2.5 rounded-xl border text-xs font-bold text-left cursor-pointer',
                                        alcanceNuevo === 'EQUIPO'
                                            ? 'bg-blue-50 border-blue-500 text-blue-900'
                                            : 'border-gray-200 text-gray-600'
                                    )}
                                >
                                    ⚙️ Equipo Específico
                                </button>
                            </div>

                            {alcanceNuevo === 'EQUIPO' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Seleccionar Equipo
                                    </label>
                                    <select
                                        value={idEquipoNuevo}
                                        onChange={(e) => setIdEquipoNuevo(e.target.value ? Number(e.target.value) : '')}
                                        required
                                        className="w-full text-sm p-2 border border-gray-300 rounded-xl bg-white"
                                    >
                                        <option value="">-- Seleccione un activo --</option>
                                        {equiposCliente.map((eq: any) => (
                                            <option key={eq.id_equipo} value={eq.id_equipo}>
                                                {eq.codigo_equipo} — {eq.nombre_equipo || eq.tipo || 'Equipo'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Descripción del Requerimiento *
                                </label>
                                <textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    rows={3}
                                    required
                                    placeholder="Ej: Adecuación de rejilla de ventilación del cuarto de planta o iluminación de emergencia..."
                                    className="w-full text-sm p-2.5 border border-gray-300 rounded-xl"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Prioridad
                                    </label>
                                    <select
                                        value={prioridad}
                                        onChange={(e) => setPrioridad(e.target.value as any)}
                                        className="w-full text-sm p-2 border border-gray-300 rounded-xl bg-white"
                                    >
                                        <option value="NORMAL">Normal</option>
                                        <option value="ALTA">Alta</option>
                                        <option value="URGENTE">Urgente</option>
                                        <option value="EMERGENCIA">Emergencia</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Observación
                                    </label>
                                    <input
                                        type="text"
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        placeholder="Detalle adicional..."
                                        className="w-full text-sm p-2 border border-gray-300 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? 'Guardando...' : 'Guardar Pendiente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
