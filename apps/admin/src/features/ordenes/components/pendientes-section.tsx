'use client';

import React, { useState, useEffect } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    ClipboardList,
    Clock,
    Filter,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    User,
    Wrench,
    X,
    ExternalLink
} from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { Orden, OrdenPendiente } from '@/types/ordenes';
import { getPendienteEstadoColor, getPrioridadColor } from '@/types/ordenes';

interface PendientesSectionProps {
    orden: Orden;
    onUpdate?: () => void;
}

export function PendientesSection({ orden, onUpdate }: PendientesSectionProps) {
    const [pendientes, setPendientes] = useState<OrdenPendiente[]>(
        orden.ordenes_pendientes || []
    );
    const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [selectedPendiente, setSelectedPendiente] = useState<OrdenPendiente | null>(null);
    const [resolucionNotas, setResolucionNotas] = useState('');
    const [resolucionEstado, setResolucionEstado] = useState<'RESUELTO' | 'EN_GESTION' | 'CANCELADO'>('RESUELTO');

    // Add Form State
    const [catalogoItems, setCatalogoItems] = useState<any[]>([]);
    const [loadingCatalogo, setLoadingCatalogo] = useState(false);
    const [selectedCatalogoId, setSelectedCatalogoId] = useState<number | null>(null);
    const [descripcionManual, setDescripcionManual] = useState('');
    const [prioridad, setPrioridad] = useState<'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA'>('NORMAL');
    const [idOrdenEquipo, setIdOrdenEquipo] = useState<number | null>(null);
    const [observaciones, setObservaciones] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Sync state with props
    useEffect(() => {
        if (orden.ordenes_pendientes) {
            setPendientes(orden.ordenes_pendientes);
        }
    }, [orden.ordenes_pendientes]);

    // Cargar catálogo de pendientes al abrir modal
    useEffect(() => {
        if (isAddModalOpen && catalogoItems.length === 0) {
            setLoadingCatalogo(true);
            fetch('/api/ordenes/catalogo-pendientes')
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && data.data) {
                        setCatalogoItems(data.data);
                    }
                })
                .catch((err) => console.error('Error cargando catalogo pendientes:', err))
                .finally(() => setLoadingCatalogo(false));
        }
    }, [isAddModalOpen, catalogoItems.length]);

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

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/ordenes/${orden.id_orden_servicio}/pendientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descripcion: desc,
                    idPendienteCatalogo: selectedCatalogoId,
                    idOrdenEquipo: idOrdenEquipo || undefined,
                    prioridad,
                    observaciones: observaciones.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Error registrando pendiente');
            }

            setPendientes((prev) => [...prev, data.data]);
            setIsAddModalOpen(false);
            setDescripcionManual('');
            setSelectedCatalogoId(null);
            setObservaciones('');
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
            const res = await fetch(`/api/ordenes/pendientes/${selectedPendiente.id_orden_pendiente}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: resolucionEstado,
                    observaciones_resolucion: resolucionNotas.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Error actualizando estado');
            }

            setPendientes((prev) =>
                prev.map((p) =>
                    p.id_orden_pendiente === selectedPendiente.id_orden_pendiente ? data.data : p
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

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este pendiente técnico?')) return;
        try {
            const res = await fetch(`/api/ordenes/pendientes/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setPendientes((prev) => prev.filter((p) => p.id_orden_pendiente !== id));
                onUpdate?.();
            }
        } catch (err) {
            console.error('Error eliminando pendiente:', err);
        }
    };

    const pendientesFiltrados = pendientes.filter((p) => {
        if (filtroEstado === 'TODOS') return true;
        return p.estado === filtroEstado;
    });

    const totalPendientesActivos = pendientes.filter(
        (p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION'
    ).length;
    const totalResueltos = pendientes.filter((p) => p.estado === 'RESUELTO').length;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header de la Sección */}
            <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                        <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">
                                Trabajos y Repuestos Pendientes
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {pendientes.length} total
                            </span>
                            {totalPendientesActivos > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                    {totalPendientesActivos} activo{totalPendientesActivos > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Trazabilidad y seguimiento post-servicio para cotizaciones y próximos mantenimientos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botón Nuevo Pendiente */}
                    <button
                        onClick={() => {
                            setErrorMsg(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-amber-600/20 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Registrar Pendiente
                    </button>
                </div>
            </div>

            {/* Filtros rápidos */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-medium">Filtrar:</span>
                    {(['TODOS', 'PENDIENTE', 'EN_GESTION', 'RESUELTO', 'CANCELADO'] as const).map((est) => (
                        <button
                            key={est}
                            onClick={() => setFiltroEstado(est)}
                            className={cn(
                                'px-3 py-1 rounded-lg font-medium transition-all',
                                filtroEstado === est
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            )}
                        >
                            {est === 'TODOS'
                                ? 'Todos'
                                : est === 'PENDIENTE'
                                ? 'Pendientes'
                                : est === 'EN_GESTION'
                                ? 'En Gestión'
                                : est === 'RESUELTO'
                                ? 'Resueltos'
                                : 'Cancelados'}
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
                            Sin Pendientes Registrados
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                            Esta orden no tiene trabajos ni repuestos pendientes registrados por el técnico.
                        </p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-700 text-gray-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
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

                            // Equipo display
                            const nombreEquipo = p.equipos?.nombre_equipo || p.equipos?.codigo_equipo;

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
                                                    {p.estado}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-md text-[11px] font-semibold',
                                                        prioridadClase
                                                    )}
                                                >
                                                    {p.prioridad}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md text-[11px] bg-gray-100 text-gray-600 font-medium">
                                                    {p.origen === 'CATALOGO' ? 'Catálogo' : 'Manual'}
                                                </span>
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDelete(p.id_orden_pendiente)}
                                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
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

                                        {/* Resolución si existe */}
                                        {p.observaciones_resolucion && (
                                            <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-200">
                                                <p className="font-semibold flex items-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                    Resolución:
                                                </p>
                                                <p className="mt-0.5">{p.observaciones_resolucion}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer con metadata y botón para resolver */}
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-500">
                                        <div className="flex flex-col gap-0.5">
                                            {nombreEquipo && (
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    <Wrench className="h-3 w-3 text-blue-600" />
                                                    {nombreEquipo}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                {formatDateSafe(p.fecha_creacion)}
                                            </span>
                                        </div>

                                        {/* Botón de cambio de estado */}
                                        {!isResuelto && !isCancelado ? (
                                            <button
                                                onClick={() => {
                                                    setSelectedPendiente(p);
                                                    setResolucionEstado('RESUELTO');
                                                    setResolucionNotas(p.observaciones_resolucion || '');
                                                    setIsResolveModalOpen(true);
                                                }}
                                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-300 transition-colors"
                                            >
                                                Gestionar Estado
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setSelectedPendiente(p);
                                                    setResolucionEstado(p.estado as any);
                                                    setResolucionNotas(p.observaciones_resolucion || '');
                                                    setIsResolveModalOpen(true);
                                                }}
                                                className="px-2 py-0.5 text-gray-500 hover:text-gray-800 text-[11px] font-medium underline"
                                            >
                                                Ver / Editar Estado
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Agregar Nuevo Pendiente */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Plus className="h-5 w-5 text-amber-600" />
                                Registrar Pendiente Técnico
                            </h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePendiente} className="p-6 space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Selección de Catálogo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Seleccionar del Catálogo Estándar
                                </label>
                                {loadingCatalogo ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogo...
                                    </div>
                                ) : (
                                    <select
                                        value={selectedCatalogoId || ''}
                                        onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : null;
                                            setSelectedCatalogoId(val);
                                            if (val) {
                                                const cat = catalogoItems.find((c) => c.id_pendiente_catalogo === val);
                                                if (cat) setDescripcionManual(cat.descripcion);
                                            }
                                        }}
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                    >
                                        <option value="">-- O elija un pendiente predefinido --</option>
                                        {catalogoItems.map((cat) => (
                                            <option key={cat.id_pendiente_catalogo} value={cat.id_pendiente_catalogo}>
                                                [{cat.categoria || 'GENERAL'}] {cat.descripcion}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Descripción manual */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Descripción del Pendiente *
                                </label>
                                <textarea
                                    value={descripcionManual}
                                    onChange={(e) => setDescripcionManual(e.target.value)}
                                    placeholder="Detalle el trabajo o repuesto pendiente (ej: Fuga en manguera de retorno de combustible)..."
                                    rows={3}
                                    required
                                    className="w-full text-sm p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>

                            {/* Prioridad y Equipo */}
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

                                {orden.ordenes_equipos && orden.ordenes_equipos.length > 1 && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                            Equipo Vinculado
                                        </label>
                                        <select
                                            value={idOrdenEquipo || ''}
                                            onChange={(e) => setIdOrdenEquipo(e.target.value ? Number(e.target.value) : null)}
                                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        >
                                            <option value="">Equipo Principal</option>
                                            {orden.ordenes_equipos.map((oe: any) => (
                                                <option key={oe.id_orden_equipo} value={oe.id_orden_equipo}>
                                                    {oe.equipos?.nombre_equipo || oe.equipos?.codigo_equipo || `Equipo ${oe.orden_secuencia}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Observaciones Adicionales
                                </label>
                                <input
                                    type="text"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Datos de referencia, medidas, modelo de repuesto..."
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 shadow-sm shadow-amber-600/20"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                                    ) : (
                                        'Guardar Pendiente'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Gestionar / Resolver Pendiente */}
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
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
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
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="EN_GESTION">En Gestión (Cotizando / En espera repuesto)</option>
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
                                    placeholder="Ej: Se instaló repuesto en orden #OS-2026-008 o se cotizó con cliente..."
                                    rows={3}
                                    className="w-full text-sm p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsResolveModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdateEstado}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 shadow-sm"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
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
