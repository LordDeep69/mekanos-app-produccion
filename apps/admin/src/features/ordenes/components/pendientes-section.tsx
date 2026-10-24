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
import { apiClient } from '@/lib/api/client';
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
    const [searchCatalogo, setSearchCatalogo] = useState('');
    const [catFiltro, setCatFiltro] = useState('TODAS');
    const [categoriasList, setCategoriasList] = useState<string[]>(['TODAS', 'ELECTRICO', 'MECANICO', 'COMBUSTIBLE', 'HIDRAULICO', 'ELECTRONICO', 'INSTRUMENTACION', 'GENERAL']);

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
            apiClient.get('/ordenes/catalogo-pendientes/categorias')
                .then((res) => {
                    if (res.data?.success && Array.isArray(res.data.data)) {
                        setCategoriasList(['TODAS', ...res.data.data]);
                    }
                })
                .catch(() => {});

            apiClient.get('/ordenes/catalogo-pendientes')
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
            const res = await apiClient.post(`/ordenes/${orden.id_orden_servicio}/pendientes`, {
                descripcion: desc,
                idPendienteCatalogo: selectedCatalogoId || undefined,
                idOrdenEquipo: idOrdenEquipo || undefined,
                prioridad,
                observaciones: observaciones.trim() || undefined,
            });
            const data = res.data;
            if (!data?.success) {
                throw new Error(data?.message || 'Error registrando pendiente');
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
            const res = await apiClient.patch(`/ordenes/pendientes/${selectedPendiente.id_orden_pendiente}/estado`, {
                estado: resolucionEstado,
                observaciones_resolucion: resolucionNotas.trim() || undefined,
            });
            const data = res.data;
            if (!data?.success) {
                throw new Error(data?.message || 'Error actualizando estado');
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
            const res = await apiClient.delete(`/ordenes/pendientes/${id}`);
            if (res.data?.success || res.status === 200) {
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
                            // Resolucion precisa multiequipo
                            const oeRel = orden.ordenes_equipos?.find((e: any) => e.id_orden_equipo === p.id_orden_equipo);
                            const ordenSec = oeRel?.orden_secuencia || p.ordenes_equipos?.orden_secuencia;
                            const sistName = oeRel?.nombre_sistema || p.ordenes_equipos?.nombre_sistema;
                            const eqBaseName = p.equipos?.nombre_equipo || p.equipos?.codigo_equipo || oeRel?.equipos?.nombre_equipo;
                            const badgeEquipoLabel = ordenSec ? `#${ordenSec} · ${sistName || eqBaseName || 'Equipo'}` : eqBaseName;

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
                                                {badgeEquipoLabel && (
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
                                            {p.empleados_ordenes_pendientes_creado_porToempleados?.persona && (
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    <User className="h-3 w-3 text-gray-400" />
                                                    {p.empleados_ordenes_pendientes_creado_porToempleados.persona.nombre_completo ||
                                                     p.empleados_ordenes_pendientes_creado_porToempleados.persona.primer_nombre}
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
                            {/* Selector Prominente Multiequipo */}
                            {orden.ordenes_equipos && orden.ordenes_equipos.length > 1 && (
                                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                                            <Wrench className="h-3.5 w-3.5 text-blue-700" />
                                            ¿A qué equipo corresponde este pendiente? *
                                        </label>
                                        <span className="text-[11px] font-semibold text-blue-700">
                                            {orden.ordenes_equipos.length} equipos en orden
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {orden.ordenes_equipos.map((oe: any) => {
                                            const isSelected = idOrdenEquipo === oe.id_orden_equipo;
                                            const label = oe.nombre_sistema || oe.equipos?.nombre_equipo || oe.equipos?.codigo_equipo || `Equipo ${oe.orden_secuencia}`;
                                            return (
                                                <button
                                                    key={oe.id_orden_equipo}
                                                    type="button"
                                                    onClick={() => setIdOrdenEquipo(oe.id_orden_equipo)}
                                                    className={cn(
                                                        'p-2.5 rounded-lg text-left text-xs font-semibold transition-all border flex items-center justify-between gap-2 cursor-pointer',
                                                        isSelected
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                                                    )}
                                                >
                                                    <div className="min-w-0">
                                                        <span className={cn('text-[10px] block font-mono uppercase', isSelected ? 'text-blue-100' : 'text-gray-400')}>
                                                            #{oe.orden_secuencia} {oe.equipos?.codigo_equipo ? `· ${oe.equipos.codigo_equipo}` : ''}
                                                        </span>
                                                        <span className="truncate block font-bold">{label}</span>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="h-4 w-4 text-white shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {errorMsg && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Selección de Catálogo Maestro */}
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
                                        const sel = catalogoItems.find((c) => c.id_pendiente_catalogo === selectedCatalogoId);
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
                                                    onClick={() => {
                                                        setSelectedCatalogoId(null);
                                                    }}
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
                                                placeholder="Buscar por palabra clave o código (ej: Batería, Fuga, Filtro, Radiador)..."
                                                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Filtros por Categoría */}
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

                                        {/* Lista de Plantillas */}
                                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white shadow-inner">
                                            {loadingCatalogo ? (
                                                <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500">
                                                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> Cargando catálogo...
                                                </div>
                                            ) : (() => {
                                                const items = catalogoItems.filter((item) => {
                                                    const matchCat = catFiltro === 'TODAS' || item.categoria === catFiltro;
                                                    const matchSearch =
                                                        !searchCatalogo.trim() ||
                                                        item.descripcion?.toLowerCase().includes(searchCatalogo.toLowerCase()) ||
                                                        item.codigo?.toLowerCase().includes(searchCatalogo.toLowerCase());
                                                    return matchCat && matchSearch;
                                                });

                                                if (items.length === 0) {
                                                    return (
                                                        <div className="py-5 text-center text-xs text-gray-400">
                                                            No se encontraron plantillas coincidentes. Puede redactar abajo directamente.
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
                                            })()}
                                        </div>
                                    </div>
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
