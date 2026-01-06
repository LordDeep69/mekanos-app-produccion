/**
 * MEKANOS S.A.S - Portal Admin
 * Vista Detalle de Orden de Servicio - Dashboard Operativo
 * 
 * Ruta: /ordenes/[id]
 * 
 * Tabs:
 * - General: Información principal
 * - Ejecución: Actividades y mediciones
 * - Financiero: Servicios, componentes, gastos
 * - Documentos: Evidencias fotográficas
 */

'use client';

import {
    getClienteNombre,
    getEstadoColor,
    getPrioridadColor,
    getTecnicoLabel,
    getTecnicoNombre,
    useActividadesOrden,
    useAddServicioOrden,
    useAsignarTecnico,
    useCambiarEstadoOrden,
    useCancelarOrden,
    useEvidenciasOrden,
    useFirmasOrden,
    useMedicionesOrden,
    useOrden,
    useRemoveServicioOrden,
    useServiciosComerciales,
    useServiciosOrden,
    useTecnicosSelector,
} from '@/features/ordenes';
import { SelectorCard } from '@/features/ordenes/components/selector-card';
import { cn } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    Camera,
    Check,
    CheckCircle2,
    Clock,
    DollarSign,
    Edit,
    FileText,
    Loader2,
    Play,
    Plus,
    RefreshCw,
    Settings,
    Tag,
    Trash2,
    User,
    Wrench,
    XCircle
} from 'lucide-react';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'general' | 'ejecucion' | 'financiero' | 'documentos';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const TABS: TabConfig[] = [
    { id: 'general', label: 'General', icon: FileText },
    { id: 'ejecucion', label: 'Ejecución', icon: Play },
    { id: 'financiero', label: 'Financiero', icon: DollarSign },
    { id: 'documentos', label: 'Documentos', icon: Camera },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function EstadoBadge({ estado, size = 'md' }: { estado?: string; size?: 'sm' | 'md' | 'lg' }) {
    const labels: Record<string, string> = {
        PROGRAMADA: 'Programada',
        ASIGNADA: 'Asignada',
        EN_PROCESO: 'En Proceso',
        EN_ESPERA_REPUESTO: 'Espera Repuesto',
        COMPLETADA: 'Completada',
        APROBADA: 'Aprobada',
        CANCELADA: 'Cancelada',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-2 text-base',
    };

    return (
        <span className={cn(
            'rounded-full font-medium',
            sizes[size],
            getEstadoColor(estado)
        )}>
            {labels[estado || ''] || estado || 'Sin estado'}
        </span>
    );
}

function PrioridadBadge({ prioridad }: { prioridad?: string }) {
    const labels: Record<string, string> = {
        BAJA: 'Baja',
        NORMAL: 'Normal',
        ALTA: 'Alta',
        URGENTE: 'Urgente',
    };

    return (
        <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getPrioridadColor(prioridad)
        )}>
            {labels[prioridad || ''] || prioridad || 'Normal'}
        </span>
    );
}

function InfoCard({
    icon: Icon,
    label,
    value,
    subvalue,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    subvalue?: string;
}) {
    return (
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Icon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="font-medium text-gray-900 truncate">{value || '-'}</p>
                {subvalue && <p className="text-sm text-gray-500 truncate">{subvalue}</p>}
            </div>
        </div>
    );
}

function ActionButton({
    icon: Icon,
    label,
    onClick,
    variant = 'default',
    disabled,
}: {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    variant?: 'default' | 'primary' | 'success' | 'danger';
    disabled?: boolean;
}) {
    const variants = {
        default: 'border-gray-300 text-gray-700 hover:bg-gray-50',
        primary: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
        success: 'border-green-600 bg-green-600 text-white hover:bg-green-700',
        danger: 'border-red-600 text-red-600 hover:bg-red-50',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-all',
                variants[variant],
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABS DE CONTENIDO
// ═══════════════════════════════════════════════════════════════════════════════

function formatDisplayDate(dateStr?: string) {
    if (!dateStr) return 'Sin programar';
    try {
        // ✅ FIX TIMEZONE: Extraer solo la parte de fecha (YYYY-MM-DD) y crear fecha local
        // Evita problemas de timezone cuando el string viene como ISO con UTC
        const datePart = dateStr.split('T')[0]; // "2026-01-05T00:00:00.000Z" → "2026-01-05"
        const [year, month, day] = datePart.split('-').map(Number);
        // Crear fecha local (sin conversión UTC)
        const localDate = new Date(year, month - 1, day);
        return localDate.toLocaleDateString('es-CO', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    } catch (e) {
        return 'Fecha inválida';
    }
}

function TabGeneral({ orden }: { orden: Orden }) {
    const fechaProgramada = formatDisplayDate(orden.fecha_programada);

    const fechaCreacion = orden.fecha_creacion
        ? new Date(orden.fecha_creacion).toLocaleString('es-CO')
        : '-';

    const fechaFinalizacion = orden.fecha_fin_real
        ? new Date(orden.fecha_fin_real).toLocaleString('es-CO')
        : null;

    const horaInicio = orden.fecha_inicio_real
        ? new Date(orden.fecha_inicio_real).toLocaleString('es-CO')
        : null;

    // ✅ FIX: Solo mostrar banner si tiene fecha_fin_real (servicio realmente finalizado)
    // No mostrar para órdenes recién creadas o estados administrativos
    const servicioFinalizado = !!orden.fecha_fin_real;

    return (
        <div className="space-y-6">
            {/* Banner de Orden Completada - Solo si tiene fecha_fin_real */}
            {servicioFinalizado && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold">Servicio Finalizado</h3>
                            <div className="text-green-100 text-sm space-y-0.5">
                                {horaInicio && <p>🕐 Inicio: {horaInicio}</p>}
                                <p>✅ Fin: {fechaFinalizacion}</p>
                            </div>
                        </div>
                        {orden.informes?.[0]?.url_pdf && (
                            <a
                                href={orden.informes[0].url_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white text-green-700 rounded-xl font-bold text-sm hover:bg-green-50 transition-all shadow-lg"
                            >
                                <FileText className="h-4 w-4" />
                                Ver Informe PDF
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Grid de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard
                    icon={Building2}
                    label="Cliente"
                    value={getClienteNombre(orden)}
                    subvalue={orden.clientes?.persona?.numero_identificacion}
                />

                {/* MULTI-EQUIPOS: Mostrar lista o equipo principal */}
                {orden.ordenes_equipos && orden.ordenes_equipos.length > 0 ? (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Wrench className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-blue-600 uppercase tracking-wide font-bold">Equipos ({orden.ordenes_equipos.length})</p>
                            <div className="mt-1 space-y-1 max-h-24 overflow-y-auto pr-2">
                                {orden.ordenes_equipos.map((oe) => (
                                    <div key={oe.id_orden_equipo} className="flex items-center justify-between gap-2 border-b border-blue-100 last:border-0 pb-1 last:pb-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {oe.equipo.codigo_equipo}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate italic">
                                            {oe.equipo.nombre_equipo}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <InfoCard
                        icon={Wrench}
                        label="Equipo"
                        value={orden.equipos?.codigo_equipo}
                        subvalue={orden.equipos?.nombre_equipo}
                    />
                )}

                <InfoCard
                    icon={User}
                    label="Técnico Asignado"
                    value={getTecnicoNombre(orden)}
                />
                <InfoCard
                    icon={Settings}
                    label="Tipo de Servicio"
                    value={orden.tipos_servicio?.nombre_tipo || orden.tipos_servicio?.codigo_tipo}
                />
                <InfoCard
                    icon={Calendar}
                    label="Fecha Programada"
                    value={fechaProgramada}
                />
                <InfoCard
                    icon={Clock}
                    label="Fecha Creación"
                    value={fechaCreacion}
                />
            </div>

            {/* Descripción */}
            {orden.descripcion && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Descripción</h4>
                    <p className="text-gray-600">{orden.descripcion}</p>
                </div>
            )}

            {/* Observaciones */}
            {orden.observaciones && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h4 className="text-sm font-medium text-amber-800 mb-2">Observaciones</h4>
                    <p className="text-amber-700">{orden.observaciones}</p>
                </div>
            )}

            {/* Timeline de estados (placeholder) */}
            <div className="bg-white rounded-lg border p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Historial de Estados</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Historial disponible próximamente</span>
                </div>
            </div>
        </div>
    );
}

function TabEjecucion({ orden }: { orden: Orden }) {
    const { data: actividadesData, isLoading: isLoadingAct } = useActividadesOrden(orden.id_orden_servicio);
    const { data: medicionesData, isLoading: isLoadingMed } = useMedicionesOrden(orden.id_orden_servicio);

    const actividades = actividadesData?.data || [];
    const mediciones = medicionesData?.data || [];

    const actividadesCompletadas = actividades.filter((a: any) => a.ejecutada).length;
    const porcentajeProgreso = actividades.length > 0
        ? Math.round((actividadesCompletadas / actividades.length) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Progreso */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-bold text-gray-900">Progreso de Ejecución</h4>
                        <p className="text-xs text-gray-500">Avance basado en checklist técnico</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                        {actividadesCompletadas} / {actividades.length} actividades
                    </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                    <div
                        className="bg-blue-600 h-full transition-all duration-500 ease-out"
                        style={{ width: `${porcentajeProgreso}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Inicio del servicio</p>
                    <p className="text-sm font-black text-blue-900">{porcentajeProgreso}% COMPLETADO</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cierre técnico</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Actividades */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Play className="h-5 w-5 text-blue-600" />
                            Checklist de Actividades
                        </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px] p-2 space-y-2">
                        {isLoadingAct ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : actividades.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Play className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                                <p className="font-medium">No hay actividades registradas</p>
                                <p className="text-xs">Las actividades se sincronizan desde la App Móvil</p>
                            </div>
                        ) : (
                            actividades.map((act: any) => (
                                <div
                                    key={act.id_actividad_ejecutada}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-xl border transition-all",
                                        act.ejecutada
                                            ? "bg-green-50 border-green-100"
                                            : "bg-white border-gray-100 opacity-60"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border",
                                        act.ejecutada
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "border-gray-300 bg-white text-transparent"
                                    )}>
                                        <Check className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={cn(
                                            "text-sm font-bold",
                                            act.ejecutada ? "text-green-900" : "text-gray-700"
                                        )}>
                                            {act.id_actividad_catalogo ? act.catalogo_actividades?.descripcion_actividad : act.descripcion_manual}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {act.sistema && (
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                                                    {act.sistema}
                                                </span>
                                            )}
                                            {act.fecha_ejecucion && (
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(act.fecha_ejecucion).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        {act.observaciones && (
                                            <p className="text-xs text-gray-500 mt-1 italic border-l-2 border-gray-200 pl-2">
                                                "{act.observaciones}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Mediciones */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-purple-600" />
                            Mediciones Técnicas
                        </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px] p-2">
                        {isLoadingMed ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : mediciones.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Settings className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                                <p className="font-medium">Sin mediciones de campo</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {mediciones.map((med: any) => (
                                    <div
                                        key={med.id_medicion}
                                        className={cn(
                                            "p-3 rounded-xl border flex flex-col justify-between transition-all",
                                            med.fuera_de_rango ? "bg-red-50 border-red-100 ring-1 ring-red-200" : "bg-white border-gray-100"
                                        )}
                                    >
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                                {med.parametros_medicion?.nombre_parametro}
                                            </p>
                                            <p className={cn(
                                                "text-xl font-black mt-1",
                                                med.fuera_de_rango ? "text-red-700" : "text-blue-900"
                                            )}>
                                                {med.valor_numerico ?? med.valor_texto}
                                                <span className="text-xs font-bold text-gray-400 ml-1">
                                                    {med.unidad_medida}
                                                </span>
                                            </p>
                                        </div>
                                        {med.fuera_de_rango && (
                                            <div className="mt-2 flex items-center gap-1.5 text-red-600 font-bold text-[10px] animate-pulse">
                                                <AlertCircle className="h-3 w-3" />
                                                FUERA DE RANGO
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabFinanciero({ orden }: { orden: Orden }) {
    const [isAddServicioOpen, setIsAddServicioOpen] = useState(false);
    const { data: serviciosData, isLoading } = useServiciosOrden(orden.id_orden_servicio);
    const removeServicio = useRemoveServicioOrden();

    const servicios = serviciosData?.data || [];

    const handleRemove = async (idDetalle: number) => {
        if (window.confirm('¿Deseas eliminar este servicio de la orden?')) {
            await removeServicio.mutateAsync({
                idOrden: orden.id_orden_servicio,
                idDetalle
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Resumen financiero */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Servicios</p>
                    <p className="text-2xl font-bold text-blue-900">${(Number(orden.total_servicios) || 0).toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Componentes</p>
                    <p className="text-2xl font-bold text-green-900">${(Number(orden.total_componentes) || 0).toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Gastos</p>
                    <p className="text-2xl font-bold text-orange-900">${(Number(orden.total_gastos) || 0).toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm ring-2 ring-purple-200">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Total General</p>
                    <p className="text-2xl font-bold text-purple-900">${(Number(orden.total_general) || 0).toLocaleString('es-CO')}</p>
                </div>
            </div>

            {/* Detalle de servicios */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Servicios Facturados
                    </h4>
                    <button
                        onClick={() => setIsAddServicioOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold transition-all shadow-sm shadow-blue-100"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Servicio
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : servicios.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                        <p className="font-medium">No hay servicios asociados</p>
                        <p className="text-sm">Agrega servicios del catálogo comercial para presupuestar la orden</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-6 py-3">Servicio</th>
                                    <th className="px-6 py-3 text-right">Cant.</th>
                                    <th className="px-6 py-3 text-right">Unitario</th>
                                    <th className="px-6 py-3 text-right">Desc.</th>
                                    <th className="px-6 py-3 text-right text-blue-600">Subtotal</th>
                                    <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {servicios.map((s: any) => (
                                    <tr key={s.id_detalle_servicio} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-gray-900">{s.catalogo_servicios?.nombre_servicio}</p>
                                            <p className="text-[10px] font-mono text-gray-400 uppercase">{s.catalogo_servicios?.codigo_servicio}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">{Number(s.cantidad)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">${Number(s.precio_unitario).toLocaleString('es-CO')}</td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-orange-600">-{s.descuento_porcentaje}%</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-blue-700">${Number(s.subtotal).toLocaleString('es-CO')}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRemove(s.id_detalle_servicio)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para agregar servicio */}
            {isAddServicioOpen && (
                <ModalAddServicio
                    isOpen={isAddServicioOpen}
                    onClose={() => setIsAddServicioOpen(false)}
                    idOrden={orden.id_orden_servicio}
                />
            )}
        </div>
    );
}

function ModalAddServicio({ isOpen, onClose, idOrden }: { isOpen: boolean; onClose: () => void; idOrden: number }) {
    const { data: catalogo, isLoading: isLoadingCat } = useServiciosComerciales({ activo: true });
    const addServicio = useAddServicioOrden();

    const [selectedId, setSelectedId] = useState<number | undefined>();
    const [cantidad, setCantidad] = useState(1);
    const [precioCustom, setPrecioCustom] = useState<string>('');
    const [descuento, setDescuento] = useState(0);

    const handleAdd = async () => {
        if (!selectedId) return;

        const servicio = catalogo?.find(s => s.id_servicio === selectedId);

        await addServicio.mutateAsync({
            idOrden,
            data: {
                id_servicio: selectedId,
                cantidad,
                precio_unitario: precioCustom ? Number(precioCustom) : servicio?.precio_base,
                descuento_porcentaje: descuento,
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-blue-600" />
                        Agregar Servicio Comercial
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <XCircle className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">Seleccionar del Catálogo *</label>
                        <SelectorCard
                            items={catalogo || []}
                            selectedId={selectedId}
                            onSelect={(item: any, id) => {
                                setSelectedId(id);
                                setPrecioCustom(item.precio_base?.toString() || '');
                            }}
                            getLabel={(s: any) => s.nombre_servicio}
                            getSubtitle={(s: any) => `$${(s.precio_base || 0).toLocaleString('es-CO')} • ${s.codigo_servicio}`}
                            renderIcon={() => <Tag className="h-5 w-5" />}
                            getId={(s: any) => s.id_servicio}
                            isLoading={isLoadingCat}
                            searchPlaceholder="Buscar por nombre..."
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Descuento (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={descuento}
                                    onChange={(e) => setDescuento(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-orange-600 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> Precio Unitario (Personalizado)
                            </label>
                            <input
                                type="number"
                                value={precioCustom}
                                onChange={(e) => setPrecioCustom(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-green-700"
                                placeholder="0"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">
                                Por defecto usa el precio base del catálogo.
                            </p>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-4">
                            <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1">Cálculo Estimado</p>
                            <p className="text-2xl font-black text-blue-900">
                                ${((Number(precioCustom) || 0) * cantidad * (1 - descuento / 100)).toLocaleString('es-CO')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={!selectedId || addServicio.isPending}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50"
                    >
                        {addServicio.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                        Confirmar Item
                    </button>
                </div>
            </div>
        </div>
    );
}

function TabDocumentos({ orden }: { orden: Orden }) {
    const { data: evidenciasData, isLoading: isLoadingEv } = useEvidenciasOrden(orden.id_orden_servicio);
    const { data: firmasData, isLoading: isLoadingFi } = useFirmasOrden(orden.id_orden_servicio);

    // ✅ FIX 05-ENE-2026: Obtener URL del PDF desde documentos_generados
    const { data: pdfData } = useQuery({
        queryKey: ['orden-pdf-url', orden.id_orden_servicio],
        queryFn: async () => {
            const session = await getSession();
            const token = (session as any)?.accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ordenes/${orden.id_orden_servicio}/pdf-url`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.json();
        },
        enabled: orden.estados_orden?.codigo_estado === 'COMPLETADA' || orden.estados_orden?.codigo_estado === 'APROBADA',
    });
    const urlPdf = pdfData?.data?.url || null;

    const evidencias = evidenciasData?.data || [];
    const firmas = firmasData?.data || [];

    const firmaTecnico = firmas.find((f: any) => f.tipo_firma === 'TECNICO');
    const firmaCliente = firmas.find((f: any) => f.tipo_firma === 'CLIENTE');

    // ✅ MEJORADO: Agrupar evidencias por tipo (ANTES/DURANTE/DESPUÉS) y luego por descripción
    const tiposEvidencia = ['ANTES', 'DURANTE', 'DESPUES'] as const;
    const evidenciasPorTipo = tiposEvidencia.reduce((acc: any, tipo) => {
        acc[tipo] = evidencias.filter((ev: any) => ev.tipo_evidencia === tipo);
        return acc;
    }, {} as Record<string, any[]>);

    // Agrupar evidencias sin tipo conocido
    const otrasEvidencias = evidencias.filter((ev: any) =>
        !tiposEvidencia.includes(ev.tipo_evidencia)
    );

    return (
        <div className="space-y-6">
            {/* Firmas Digitales */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    Firmas de Conformidad
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Firma Técnico */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 flex flex-col items-center">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-4">Firma del Técnico</p>
                        {isLoadingFi ? (
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500 my-4" />
                        ) : firmaTecnico ? (
                            <div className="bg-white p-2 rounded-lg border border-gray-200 w-full">
                                <img
                                    src={firmaTecnico.firma_base64?.startsWith('data:')
                                        ? firmaTecnico.firma_base64
                                        : `data:image/png;base64,${firmaTecnico.firma_base64}`}
                                    alt="Firma Técnico"
                                    className="h-32 object-contain mx-auto"
                                />
                                <div className="mt-2 text-center border-t border-gray-50 pt-2">
                                    <p className="text-sm font-bold text-gray-900">{firmaTecnico.nombre_firmante}</p>
                                    <p className="text-[10px] text-gray-500 uppercase">{firmaTecnico.cargo_firmante || 'Técnico Responsable'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 italic">
                                <User className="h-12 w-12 mb-2 opacity-20" />
                                <p className="text-sm">Pendiente de firma</p>
                            </div>
                        )}
                    </div>

                    {/* Firma Cliente */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 flex flex-col items-center">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-4">Firma del Cliente</p>
                        {isLoadingFi ? (
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500 my-4" />
                        ) : firmaCliente ? (
                            <div className="bg-white p-2 rounded-lg border border-gray-200 w-full">
                                <img
                                    src={firmaCliente.firma_base64?.startsWith('data:')
                                        ? firmaCliente.firma_base64
                                        : `data:image/png;base64,${firmaCliente.firma_base64}`}
                                    alt="Firma Cliente"
                                    className="h-32 object-contain mx-auto"
                                />
                                <div className="mt-2 text-center border-t border-gray-50 pt-2">
                                    <p className="text-sm font-bold text-gray-900">{firmaCliente.nombre_firmante}</p>
                                    <p className="text-[10px] text-gray-500 uppercase">{firmaCliente.cargo_firmante || 'Cliente / Autorizador'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 italic">
                                <User className="h-12 w-12 mb-2 opacity-20" />
                                <p className="text-sm">Pendiente de firma</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Evidencias Fotográficas */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <Camera className="h-5 w-5 text-blue-600" />
                        Evidencias Fotográficas
                    </h4>
                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                        {evidencias.length} fotos
                    </span>
                </div>

                <div className="p-6">
                    {isLoadingEv ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : evidencias.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Camera className="h-16 w-16 mx-auto mb-3 text-gray-200" />
                            <p className="font-medium">No hay evidencias registradas</p>
                            <p className="text-sm">Las fotos se capturan desde la app móvil durante el servicio</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Secciones por tipo de evidencia */}
                            {(['ANTES', 'DURANTE', 'DESPUES'] as const).map((tipo) => {
                                const fotos = evidenciasPorTipo[tipo] || [];
                                if (fotos.length === 0) return null;

                                const colores = {
                                    ANTES: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-500', text: 'text-amber-700' },
                                    DURANTE: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-500', text: 'text-blue-700' },
                                    DESPUES: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-500', text: 'text-green-700' },
                                };
                                const color = colores[tipo];
                                const labels = { ANTES: 'Antes del Servicio', DURANTE: 'Durante el Servicio', DESPUES: 'Después del Servicio' };

                                return (
                                    <div key={tipo} className={`${color.bg} ${color.border} border rounded-xl p-4`}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className={`${color.badge} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                                                {labels[tipo]}
                                            </span>
                                            <span className={`text-xs ${color.text} font-medium`}>
                                                {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {fotos.map((foto: any) => (
                                                <div
                                                    key={foto.id_evidencia}
                                                    className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-500 transition-all cursor-zoom-in shadow-sm"
                                                >
                                                    <img
                                                        src={foto.ruta_archivo}
                                                        alt={foto.descripcion || 'Evidencia'}
                                                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                                        }}
                                                    />
                                                    <div className="p-2 bg-white">
                                                        <p className="text-xs text-gray-700 font-medium line-clamp-2">
                                                            {foto.descripcion || 'Sin descripción'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Otras evidencias sin categoría */}
                            {otrasEvidencias.length > 0 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            Otras Evidencias
                                        </span>
                                        <span className="text-xs text-gray-600 font-medium">
                                            {otrasEvidencias.length} foto{otrasEvidencias.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {otrasEvidencias.map((foto: any) => (
                                            <div
                                                key={foto.id_evidencia}
                                                className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-500 transition-all cursor-zoom-in shadow-sm"
                                            >
                                                <img
                                                    src={foto.ruta_archivo}
                                                    alt={foto.descripcion || 'Evidencia'}
                                                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                                    }}
                                                />
                                                <div className="p-2 bg-white">
                                                    <p className="text-xs text-gray-700 font-medium line-clamp-2">
                                                        {foto.descripcion || foto.tipo_evidencia || 'Sin descripción'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Documentos Generados (Informe PDF) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    Documentos de Salida
                </h4>
                <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <FileText className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-red-900">Informe de Servicio Técnico (PDF)</p>
                        <p className="text-xs text-red-700">Se genera automáticamente al marcar la orden como COMPLETADA</p>
                    </div>
                    {orden.estados_orden?.codigo_estado === 'COMPLETADA' || orden.estados_orden?.codigo_estado === 'APROBADA' ? (
                        <a
                            href={urlPdf || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                "px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2",
                                !urlPdf && "opacity-50 cursor-not-allowed pointer-events-none"
                            )}
                        >
                            <FileText className="h-4 w-4" />
                            {urlPdf ? 'Descargar PDF' : 'PDF no disponible'}
                        </a>
                    ) : (
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">No generado aún</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALES OPERATIVOS
// ═══════════════════════════════════════════════════════════════════════════════

function ModalAsignarTecnico({
    isOpen,
    onClose,
    tecnicos,
    onAsignar,
    isLoading
}: {
    isOpen: boolean;
    onClose: () => void;
    tecnicos: any[];
    onAsignar: (id: number) => void;
    isLoading: boolean;
}) {
    const [selectedId, setSelectedId] = useState<number | undefined>();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Asignar Técnico Principal
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <XCircle className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-500 mb-4">
                        Selecciona el técnico responsable de ejecutar este servicio.
                        La orden pasará a estado <strong>ASIGNADA</strong>.
                    </p>

                    <SelectorCard
                        items={tecnicos}
                        selectedId={selectedId}
                        onSelect={(_, id) => setSelectedId(id)}
                        getLabel={getTecnicoLabel}
                        getSubtitle={(t) => t.cargo || 'Técnico'}
                        renderIcon={() => <User className="h-5 w-5" />}
                        getId={(t) => t.id_empleado}
                        searchPlaceholder="Buscar técnico por nombre..."
                        emptyMessage="No hay técnicos disponibles"
                    />
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => selectedId && onAsignar(selectedId)}
                        disabled={!selectedId || isLoading}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                        Confirmar Asignación
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalCancelarOrden({
    isOpen,
    onClose,
    motivo,
    setMotivo,
    onConfirm,
    isLoading
}: {
    isOpen: boolean;
    onClose: () => void;
    motivo: string;
    setMotivo: (val: string) => void;
    onConfirm: () => void;
    isLoading: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-red-100 flex items-center justify-between bg-red-50">
                    <h2 className="text-xl font-bold text-red-900 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Cancelar Orden
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-200 rounded-full transition-colors">
                        <XCircle className="h-5 w-5 text-red-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Esta acción es irreversible. Por favor, indica el motivo de la cancelación para el historial de auditoría.
                    </p>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Motivo de Cancelación *</label>
                        <textarea
                            required
                            rows={3}
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm resize-none transition-all"
                            placeholder="Ej: El cliente solicitó posponer el servicio indefinidamente..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all"
                    >
                        Volver
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!motivo.trim() || isLoading}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        Confirmar Cancelación
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrdenDetallePage() {
    const params = useParams();
    const id = Number(params.id);
    const [activeTab, setActiveTab] = useState<TabId>('general');

    // Estados para Modales
    const [isAsignarModalOpen, setIsAsignarModalOpen] = useState(false);
    const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');

    const { data, isLoading, isError, refetch } = useOrden(id);
    const { data: tecnicos } = useTecnicosSelector();

    const cambiarEstado = useCambiarEstadoOrden();
    const asignarTecnico = useAsignarTecnico();
    const cancelarOrden = useCancelarOrden();

    const orden = data?.data;

    const handleCambiarEstado = async (nuevoEstado: string) => {
        if (!orden) return;

        // Confirmación para estados críticos
        if (nuevoEstado === 'EN_PROCESO' && !orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados) {
            toast.error('Debe asignar un técnico antes de iniciar el trabajo');
            setIsAsignarModalOpen(true);
            return;
        }

        try {
            await cambiarEstado.mutateAsync({
                id: orden.id_orden_servicio,
                data: { nuevoEstado }
            });
            refetch();
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    const handleAsignarTecnico = async (tecnicoId: number) => {
        if (!orden) return;
        try {
            await asignarTecnico.mutateAsync({
                id: orden.id_orden_servicio,
                tecnicoId
            });
            setIsAsignarModalOpen(false);
            refetch();
        } catch (error) {
            console.error('Error al asignar técnico:', error);
        }
    };

    const handleCancelarOrden = async () => {
        if (!orden || !motivoCancelacion.trim()) return;
        try {
            await cancelarOrden.mutateAsync({
                id: orden.id_orden_servicio,
                motivo: motivoCancelacion
            });
            setIsCancelarModalOpen(false);
            setMotivoCancelacion('');
            refetch();
        } catch (error) {
            console.error('Error al cancelar orden:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-500">Cargando orden...</p>
            </div>
        );
    }

    if (isError || !orden) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Orden no encontrada</h2>
                <p className="text-gray-500 mb-4">No se pudo cargar la información de la orden</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Reintentar
                    </button>
                    <Link
                        href="/ordenes"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Órdenes
                    </Link>
                </div>
            </div>
        );
    }

    const estadoActual = orden.estados_orden?.codigo_estado;
    const esEstadoFinal = ['COMPLETADA', 'APROBADA', 'CANCELADA'].includes(estadoActual || '');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <Link
                        href="/ordenes"
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Órdenes
                    </Link>

                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-gray-900 font-mono">
                            {orden.numero_orden}
                        </h1>
                        <EstadoBadge estado={estadoActual} size="lg" />
                        <PrioridadBadge prioridad={orden.prioridad} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {getClienteNombre(orden)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Wrench className="h-4 w-4" />
                            {orden.equipos?.codigo_equipo}
                        </span>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2">
                    <ActionButton
                        icon={RefreshCw}
                        label="Refrescar"
                        onClick={() => refetch()}
                    />
                    {!esEstadoFinal && (
                        <>
                            <ActionButton
                                icon={Edit}
                                label="Editar"
                                variant="default"
                            />
                            {estadoActual === 'PROGRAMADA' && (
                                <ActionButton
                                    icon={User}
                                    label="Asignar Técnico"
                                    variant="primary"
                                    onClick={() => setIsAsignarModalOpen(true)}
                                />
                            )}
                            {estadoActual === 'ASIGNADA' && (
                                <ActionButton
                                    icon={Play}
                                    label="Iniciar Trabajo"
                                    variant="success"
                                    onClick={() => handleCambiarEstado('EN_PROCESO')}
                                />
                            )}
                            {['PROGRAMADA', 'ASIGNADA'].includes(estadoActual || '') && (
                                <ActionButton
                                    icon={XCircle}
                                    label="Cancelar"
                                    variant="danger"
                                    onClick={() => setIsCancelarModalOpen(true)}
                                />
                            )}
                        </>
                    )}
                    {estadoActual === 'COMPLETADA' && (
                        <ActionButton
                            icon={CheckCircle2}
                            label="Aprobar"
                            variant="success"
                            onClick={() => handleCambiarEstado('APROBADA')}
                        />
                    )}
                </div>
            </div>

            {/* Modales Operativos */}
            {isAsignarModalOpen && (
                <ModalAsignarTecnico
                    isOpen={isAsignarModalOpen}
                    onClose={() => setIsAsignarModalOpen(false)}
                    tecnicos={tecnicos || []}
                    onAsignar={handleAsignarTecnico}
                    isLoading={asignarTecnico.isPending}
                />
            )}

            {isCancelarModalOpen && (
                <ModalCancelarOrden
                    isOpen={isCancelarModalOpen}
                    onClose={() => setIsCancelarModalOpen(false)}
                    motivo={motivoCancelacion}
                    setMotivo={setMotivoCancelacion}
                    onConfirm={handleCancelarOrden}
                    isLoading={cancelarOrden.isPending}
                />
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-4 -mb-px">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                    isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Contenido del tab */}
            <div className="min-h-[400px]">
                {activeTab === 'general' && <TabGeneral orden={orden} />}
                {activeTab === 'ejecucion' && <TabEjecucion orden={orden} />}
                {activeTab === 'financiero' && <TabFinanciero orden={orden} />}
                {activeTab === 'documentos' && <TabDocumentos orden={orden} />}
            </div>
        </div>
    );
}
