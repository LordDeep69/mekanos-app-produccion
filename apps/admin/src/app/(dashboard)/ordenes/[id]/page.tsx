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
    getOrdenes,
    getPrioridadColor,
    getTecnicoLabel,
    getTecnicoNombre,
    transferirDatosOrden,
    useActividadesOrden,
    useAddServicioOrden,
    useAsignarTecnico,
    useCambiarEstadoOrden,
    useCancelarOrden,
    useCreateMedicion,
    useDeleteOrden,
    useEvidenciasOrden,
    useFirmasOrden,
    useMedicionesCompletasOrden,
    useAddComponenteOrden,
    useComponentesOrden,
    useOrden,
    useRemoveComponenteOrden,
    useRemoveServicioOrden,
    useServiciosComerciales,
    useServiciosOrden,
    useTecnicosSelector,
    type ComponenteUsadoOrden
} from '@/features/ordenes';
import {
    useBodegas,
    useComponentesStock,
    type ComponenteStock,
} from '@/features/inventario/api/inventario-motor.service';
import {
    useComponentesCompatiblesEquipo,
    type BomItem,
} from '@/features/equipos';
import { ActividadCardAdvanced, ResumenEstados } from '@/features/ordenes/components/actividad-card-advanced';
import { EdicionTecnicoSection } from '@/features/ordenes/components/edicion-tecnico-section';
import { EvidenciasGallery } from '@/features/ordenes/components/evidencias-gallery';
import { FirmasSection } from '@/features/ordenes/components/firmas-section';
import { GaleriaFotosGenerales } from '@/features/ordenes/components/galeria-fotos-generales';
import { BarraSutilDescargaEvidencias } from '@/features/ordenes/components/descargar-evidencias-modal';
import { GestionInformeSection } from '@/features/ordenes/components/gestion-informe-section';
import { HistorialEmailsSection } from '@/features/ordenes/components/historial-emails-section';
import { HistorialEstados } from '@/features/ordenes/components/historial-estados';
import { HorariosServicioSection } from '@/features/ordenes/components/horarios-servicio-section';
import { MedicionCardAdvanced, ResumenMediciones } from '@/features/ordenes/components/medicion-card-advanced';
import { ObservacionesCierreSection } from '@/features/ordenes/components/observaciones-section';
import { PendientesSection } from '@/features/ordenes/components/pendientes-section';
import { HiloContinuidadCaso } from '@/features/ordenes/components/hilo-continuidad-caso';
import { OrdenEditModal } from '@/features/ordenes/components/orden-edit-modal';
import { SelectorCard } from '@/features/ordenes/components/selector-card';
import { ProgresoRegistroTelemetria } from '@/features/ordenes/components/progreso-registro-telemetria';
import { cn } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    ArrowRightLeft,
    Building2,
    Calendar,
    Camera,
    Check,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    Clock,
    DollarSign,
    Download,
    Edit,
    ExternalLink,
    FileText,
    Loader2,
    MapPin,
    Play,
    Plus,
    RefreshCw,
    Search,
    Settings,
    ShieldCheck,
    Layers,
    Package,
    RotateCcw,
    Tag,
    Trash2,
    User,
    Warehouse,
    Wrench,
    X,
    XCircle
} from 'lucide-react';
import { getSession, useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { buildInformeFilename, descargarInformePorOrdenAutenticado } from '@/lib/pdf-naming';
import { useInvalidarReportes } from '@/features/reportes/hooks/use-reportes';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'general' | 'ejecucion' | 'pendientes' | 'financiero' | 'documentos';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const TABS: TabConfig[] = [
    { id: 'general', label: 'General', icon: FileText },
    { id: 'ejecucion', label: 'Ejecución', icon: Play },
    { id: 'pendientes', label: 'Pendientes & Hallazgos', icon: ClipboardList },
    { id: 'financiero', label: 'Financiero', icon: DollarSign },
    { id: 'documentos', label: 'Documentos', icon: Camera },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function EstadoBadge({ estado, size = 'md' }: { estado?: string; size?: 'sm' | 'md' | 'lg' }) {
    const labels: Record<string, string> = {
        PROGRAMADA: 'Programada',
        ASIGNADA: 'Asignada sin ejecutar',
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
    href,
    isExternal = false,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    subvalue?: string;
    href?: string;
    isExternal?: boolean;
}) {
    const cardContent = (
        <div className={cn(
            "flex items-start gap-3 p-4 bg-gray-50 rounded-lg transition-all",
            href && "hover:bg-blue-50/80 border border-transparent hover:border-blue-200 cursor-pointer group shadow-xs hover:shadow-sm"
        )}>
            <div className={cn(
                "flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm transition-colors",
                href && "group-hover:bg-blue-600 group-hover:text-white"
            )}>
                <Icon className={cn("h-5 w-5 text-gray-600 transition-colors", href && "group-hover:text-white")} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className={cn("text-xs text-gray-500 uppercase tracking-wide font-medium", href && "group-hover:text-blue-600 transition-colors")}>
                        {label}
                    </p>
                    {href && isExternal && (
                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                </div>
                <p className={cn("font-medium text-gray-900 truncate", href && "group-hover:text-blue-700 transition-colors")}>
                    {value || '-'}
                </p>
                {subvalue && (
                    <p className={cn("text-sm text-gray-500 truncate", href && "group-hover:text-gray-700")}>
                        {subvalue}
                    </p>
                )}
            </div>
        </div>
    );

    if (href) {
        return (
            <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                title={isExternal ? `Abrir ficha de ${label} en nueva pestaña` : undefined}
            >
                {cardContent}
            </a>
        );
    }

    return cardContent;
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

function TabGeneral({
    orden,
    onOpenPendientesTab,
}: {
    orden: Orden;
    onOpenPendientesTab?: () => void;
}) {
    const fechaProgramada = formatDisplayDate(orden.fecha_programada);

    const fechaCreacion = orden.fecha_creacion
        ? new Date(orden.fecha_creacion).toLocaleString('es-CO')
        : '-';

    const fechaFinalizacion = orden.fecha_fin_real
        ? new Date(orden.fecha_fin_real).toLocaleString('es-CO')
        : null;

    // ✅ FIX: Solo mostrar banner si tiene fecha_fin_real (servicio realmente finalizado)
    // No mostrar para órdenes recién creadas o estados administrativos
    const servicioFinalizado = !!orden.fecha_fin_real;

    const hilo = orden.hilo_caso;
    const totalesCaso = hilo?.pendientes_totales ?? (orden.ordenes_pendientes?.length || 0);
    const resueltosCaso =
        hilo?.pendientes_resueltos ??
        (orden.ordenes_pendientes || []).filter((p) => p.estado === 'RESUELTO').length;
    const activosCaso =
        hilo?.pendientes_abiertos ??
        (orden.ordenes_pendientes || []).filter(
            (p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION'
        ).length;

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
                            <p className="text-green-100 text-sm">
                                ✅ Fin: {fechaFinalizacion}
                            </p>
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

            {/* Horarios del Servicio - Editable (Hora Entrada / Hora Salida) */}
            <HorariosServicioSection orden={orden} />

            {/* Grid de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard
                    icon={Building2}
                    label="Cliente"
                    value={getClienteNombre(orden)}
                    subvalue={orden.clientes?.persona?.numero_identificacion}
                    href={(orden.clientes?.id_cliente || (orden as any).id_cliente) ? `/clientes/${orden.clientes?.id_cliente || (orden as any).id_cliente}` : undefined}
                    isExternal={true}
                />
                {/* ✅ FIX 18-FEB-2026: Dirección - Priorizar sede sobre cliente padre */}
                <InfoCard
                    icon={MapPin}
                    label={orden.sedes_cliente ? `Dirección (Sede: ${orden.sedes_cliente.nombre_sede})` : 'Dirección'}
                    value={
                        orden.sedes_cliente?.direccion_sede
                        || (orden.clientes?.persona as any)?.direccion_principal
                        || 'Sin dirección'
                    }
                    subvalue={
                        orden.sedes_cliente
                            ? `${orden.sedes_cliente.ciudad_sede || ''} ${orden.sedes_cliente.departamento_sede ? '- ' + orden.sedes_cliente.departamento_sede : ''}`.trim()
                            : (orden.clientes?.persona as any)?.ciudad || undefined
                    }
                />

                {/* MULTI-EQUIPOS: Mostrar lista o equipo principal */}
                {orden.ordenes_equipos && orden.ordenes_equipos.length > 0 ? (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        {orden.ordenes_equipos.length === 1 && (orden.ordenes_equipos[0].equipo?.id_equipo || (orden.ordenes_equipos[0] as any).id_equipo) ? (
                            <a
                                href={`/equipos/${orden.ordenes_equipos[0].equipo?.id_equipo || (orden.ordenes_equipos[0] as any).id_equipo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir ficha técnica en nueva pestaña"
                                className="flex-shrink-0 w-10 h-10 bg-white hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg flex items-center justify-center shadow-sm transition-all group"
                            >
                                <Wrench className="h-5 w-5 transition-colors" />
                            </a>
                        ) : (
                            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <Wrench className="h-5 w-5 text-blue-600" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-blue-600 uppercase tracking-wide font-bold">
                                    Equipos ({orden.ordenes_equipos.length})
                                </p>
                                <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                                    Ficha técnica <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                            </div>
                            <div className="mt-1 space-y-1 max-h-28 overflow-y-auto pr-2">
                                {orden.ordenes_equipos.map((oe) => {
                                    const idEquipo = oe.equipo?.id_equipo || (oe as any).id_equipo;
                                    const codigo = oe.equipo?.codigo_equipo || `Equipo ${oe.orden_secuencia}`;
                                    const nombre = oe.equipo?.nombre_equipo || oe.nombre_sistema;

                                    if (idEquipo) {
                                        return (
                                            <a
                                                key={oe.id_orden_equipo}
                                                href={`/equipos/${idEquipo}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={`Abrir ficha técnica de ${codigo} en nueva pestaña`}
                                                className="flex items-center justify-between gap-2 border-b border-blue-100 last:border-0 py-1.5 px-2 -mx-2 rounded-md hover:bg-blue-100/80 transition-all group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 truncate transition-colors">
                                                        {codigo}
                                                    </p>
                                                    <ExternalLink className="h-3 w-3 text-blue-400 group-hover:text-blue-600 opacity-60 group-hover:opacity-100 transition-all flex-shrink-0" />
                                                </div>
                                                {nombre && (
                                                    <p className="text-[10px] text-gray-500 group-hover:text-gray-700 truncate italic transition-colors">
                                                        {nombre}
                                                    </p>
                                                )}
                                            </a>
                                        );
                                    }

                                    return (
                                        <div key={oe.id_orden_equipo} className="flex items-center justify-between gap-2 border-b border-blue-100 last:border-0 py-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {codigo}
                                            </p>
                                            {nombre && (
                                                <p className="text-[10px] text-gray-500 truncate italic">
                                                    {nombre}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <InfoCard
                        icon={Wrench}
                        label="Equipo"
                        value={orden.equipos?.codigo_equipo}
                        subvalue={orden.equipos?.nombre_equipo}
                        href={(orden.equipos?.id_equipo || (orden as any).id_equipo) ? `/equipos/${orden.equipos?.id_equipo || (orden as any).id_equipo}` : undefined}
                        isExternal={true}
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

            {/* Sección Principal de Contenido: 2 Columnas (Izquierda: Descripción & Observaciones | Derecha: Historial de Estados) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                    {/* Descripción */}
                    {orden.descripcion && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-2xs">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Descripción del Servicio</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{orden.descripcion}</p>
                        </div>
                    )}

                    {/* Observaciones de Cierre - Editables por Admin */}
                    <ObservacionesCierreSection orden={orden} />

                    {/* ✅ 19-OCT-2026: Autorización de edición técnica para orden COMPLETADA */}
                    <EdicionTecnicoSection orden={orden} />
                </div>

                {/* Columna Derecha: Historial de Estados */}
                <div>
                    <HistorialEstados idOrden={orden.id_orden_servicio} orden={orden} />
                </div>
            </div>

            {/* Resumen Compacto de Pendientes y Hallazgos del Caso (Navegación directa a Pestaña) */}
            {totalesCaso > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-2xs">
                    <div className="flex items-center gap-3 text-amber-900 font-medium">
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-gray-900 font-bold block sm:inline">
                                Hallazgos y Pendientes del Caso:{' '}
                            </span>
                            <span>
                                Este caso tiene{' '}
                                <strong className="text-amber-950 font-bold">
                                    {activosCaso} pendientes activos
                                </strong>{' '}
                                en gestión y{' '}
                                <strong className="text-emerald-800 font-bold">
                                    {resueltosCaso} resueltos
                                </strong>
                                .
                            </span>
                        </div>
                    </div>
                    {onOpenPendientesTab && (
                        <button
                            type="button"
                            onClick={onOpenPendientesTab}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-200/80 hover:bg-amber-300/80 border border-amber-300 transition-colors shrink-0 cursor-pointer shadow-2xs"
                        >
                            <span>Ver y Gestionar en Pestaña Pendientes</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-EQUIPO: Helper para agrupar actividades/mediciones por equipo
// Misma estrategia dual que pdf.controller.ts (ideal FK + fallback por índice)
// ═══════════════════════════════════════════════════════════════════════════════

interface EquipoGroup {
    idOrdenEquipo: number;
    idEquipo?: number;
    ordenSecuencia: number;
    codigoEquipo: string;
    nombreEquipo: string;
    nombreSistema?: string;
}

interface ActividadesPorEquipo {
    equipo: EquipoGroup;
    actividades: any[];
}

interface MedicionesPorEquipo {
    equipo: EquipoGroup;
    mediciones: any[];
}

function agruparActividadesPorEquipo(
    actividades: any[],
    equipos: NonNullable<Orden['ordenes_equipos']>,
): ActividadesPorEquipo[] {
    const conEquipo = actividades.filter((a: any) => a.id_orden_equipo != null);
    const sinEquipo = actividades.filter((a: any) => a.id_orden_equipo == null);

    const mapEquipos = equipos.map((oe): EquipoGroup => ({
        idOrdenEquipo: oe.id_orden_equipo,
        idEquipo: oe.equipo?.id_equipo || (oe as any).id_equipo,
        ordenSecuencia: oe.orden_secuencia || 1,
        codigoEquipo: oe.equipo?.codigo_equipo || 'N/A',
        nombreEquipo: oe.equipo?.nombre_equipo || 'Equipo',
        nombreSistema: oe.nombre_sistema,
    }));

    if (conEquipo.length > 0) {
        // CASO IDEAL: actividades tienen id_orden_equipo asignado
        return mapEquipos.map((eq) => ({
            equipo: eq,
            actividades: conEquipo.filter((a: any) => a.id_orden_equipo === eq.idOrdenEquipo),
        }));
    }

    if (sinEquipo.length > 0) {
        // FALLBACK: distribuir por descripción, ordenar por id para determinismo
        const actividadesUnicas = new Map<string, any[]>();
        for (const act of sinEquipo) {
            const key = act.catalogo_actividades?.descripcion_actividad || act.descripcion_manual || 'N/A';
            if (!actividadesUnicas.has(key)) actividadesUnicas.set(key, []);
            actividadesUnicas.get(key)!.push(act);
        }

        return mapEquipos.map((eq, equipoIndex) => ({
            equipo: eq,
            actividades: Array.from(actividadesUnicas.entries()).map(([, acts]) => {
                const ordenados = [...acts].sort((a: any, b: any) => (a.id_actividad_ejecutada || 0) - (b.id_actividad_ejecutada || 0));
                const act = ordenados[equipoIndex] || ordenados[0];
                return { ...act, id_orden_equipo: eq.idOrdenEquipo };
            }),
        }));
    }

    return mapEquipos.map((eq) => ({ equipo: eq, actividades: [] }));
}

function agruparMedicionesPorEquipo(
    mediciones: any[],
    equipos: NonNullable<Orden['ordenes_equipos']>,
): MedicionesPorEquipo[] {
    const conEquipo = mediciones.filter((m: any) => m.id_orden_equipo != null);
    const sinEquipo = mediciones.filter((m: any) => m.id_orden_equipo == null);

    const mapEquipos = equipos.map((oe): EquipoGroup => ({
        idOrdenEquipo: oe.id_orden_equipo,
        idEquipo: oe.equipo?.id_equipo || (oe as any).id_equipo,
        ordenSecuencia: oe.orden_secuencia || 1,
        codigoEquipo: oe.equipo?.codigo_equipo || 'N/A',
        nombreEquipo: oe.equipo?.nombre_equipo || 'Equipo',
        nombreSistema: oe.nombre_sistema,
    }));

    if (conEquipo.length > 0) {
        // CASO IDEAL: mediciones tienen id_orden_equipo asignado
        return mapEquipos.map((eq) => ({
            equipo: eq,
            mediciones: conEquipo.filter((m: any) => m.id_orden_equipo === eq.idOrdenEquipo),
        }));
    }

    if (sinEquipo.length > 0) {
        // FALLBACK: distribuir por nombre de parámetro, ordenar por id_medicion para determinismo
        const medicionesUnicas = new Map<string, any[]>();
        for (const med of sinEquipo) {
            const key = med.parametros_medicion?.nombre_parametro || 'N/A';
            if (!medicionesUnicas.has(key)) medicionesUnicas.set(key, []);
            medicionesUnicas.get(key)!.push(med);
        }

        return mapEquipos.map((eq, equipoIndex) => ({
            equipo: eq,
            mediciones: Array.from(medicionesUnicas.entries()).map(([, meds]) => {
                const ordenados = [...meds].sort((a: any, b: any) => (a.id_medicion || 0) - (b.id_medicion || 0));
                const med = ordenados[equipoIndex] || ordenados[0];
                return { ...med, id_orden_equipo: eq.idOrdenEquipo };
            }),
        }));
    }

    return mapEquipos.map((eq) => ({ equipo: eq, mediciones: [] }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-EQUIPO: Subcomponente header de equipo
// ═══════════════════════════════════════════════════════════════════════════════

const EQUIPO_COLORS = [
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-600', light: 'bg-blue-100' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-600', light: 'bg-emerald-100' },
    { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-600', light: 'bg-violet-100' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-600', light: 'bg-amber-100' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-600', light: 'bg-rose-100' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-600', light: 'bg-cyan-100' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-600', light: 'bg-orange-100' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-600', light: 'bg-indigo-100' },
];

function EquipoHeader({ equipo, index, count }: { equipo: EquipoGroup; index: number; count: number }) {
    const color = EQUIPO_COLORS[index % EQUIPO_COLORS.length];
    const label = equipo.nombreSistema || equipo.nombreEquipo || `Equipo ${equipo.ordenSecuencia}`;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg ${color.bg} border ${color.border}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${color.badge} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                {equipo.ordenSecuencia}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${color.text} break-words leading-tight`} title={label}>{label}</p>
                <p className="text-[10px] text-gray-500 font-mono">{equipo.codigoEquipo}</p>
            </div>
            {equipo.idEquipo && (
                <a
                    href={`/equipos/${equipo.idEquipo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Abrir ficha técnica de ${equipo.codigoEquipo} en nueva pestaña`}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white text-gray-700 hover:text-blue-700 rounded-lg border border-gray-200 text-xs font-semibold transition-all shadow-xs hover:shadow-sm"
                >
                    <span>Ficha técnica</span>
                    <ExternalLink className="h-3 w-3" />
                </a>
            )}
            <span className={`text-[10px] font-bold ${color.text} uppercase tracking-wider`}>
                EQ{equipo.ordenSecuencia}/{count}
            </span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════

function TabEjecucion({ orden }: { orden: Orden }) {
    const [subTab, setSubTab] = useState<'checklist' | 'mediciones'>('checklist');
    const { data: actividadesData, isLoading: isLoadingAct } = useActividadesOrden(orden.id_orden_servicio);
    // ✅ 24-FEB-2026: Usar mediciones-completas para obtener también parámetros sin medir
    const { data: medicionesData, isLoading: isLoadingMed } = useMedicionesCompletasOrden(orden.id_orden_servicio);
    const createMedicion = useCreateMedicion();

    const actividades = actividadesData?.data || [];
    const mediciones = medicionesData?.data || [];
    const parametrosSinMedir = (medicionesData as any)?.parametros_sin_medir || [];

    // ✅ MULTI-EQUIPO: Detectar y agrupar
    const esMultiEquipo = (orden.ordenes_equipos?.length || 0) > 1;
    const equipos = orden.ordenes_equipos || [];
    const [equipoFiltro, setEquipoFiltro] = useState<number | 'todos'>('todos');

    const actividadesPorEquipo = useMemo(() => {
        if (!esMultiEquipo || equipos.length === 0) return null;
        return agruparActividadesPorEquipo(actividades, equipos);
    }, [actividades, equipos, esMultiEquipo]);

    const medicionesPorEquipo = useMemo(() => {
        if (!esMultiEquipo || equipos.length === 0) return null;
        return agruparMedicionesPorEquipo(mediciones, equipos);
    }, [mediciones, equipos, esMultiEquipo]);

    // Actividades/mediciones filtradas según equipo seleccionado
    const actividadesFiltradas = useMemo(() => {
        if (!esMultiEquipo || !actividadesPorEquipo) return actividades;
        if (equipoFiltro === 'todos') return actividades;
        const grupo = actividadesPorEquipo.find((g: ActividadesPorEquipo) => g.equipo.idOrdenEquipo === equipoFiltro);
        return grupo?.actividades || [];
    }, [actividades, actividadesPorEquipo, equipoFiltro, esMultiEquipo]);

    const medicionesFiltradas = useMemo(() => {
        if (!esMultiEquipo || !medicionesPorEquipo) return mediciones;
        if (equipoFiltro === 'todos') return mediciones;
        const grupo = medicionesPorEquipo.find((g: MedicionesPorEquipo) => g.equipo.idOrdenEquipo === equipoFiltro);
        return grupo?.mediciones || [];
    }, [mediciones, medicionesPorEquipo, equipoFiltro, esMultiEquipo]);

    const actividadesCompletadas = actividadesFiltradas.filter((a: any) => a.ejecutada).length;
    const porcentajeProgreso = actividadesFiltradas.length > 0
        ? Math.round((actividadesCompletadas / actividadesFiltradas.length) * 100)
        : 0;

    // Contadores para mediciones
    const medicionesCritico = medicionesFiltradas.filter((m: any) => m.fuera_de_rango || m.nivel_alerta === 'CRITICO').length;

    // ✅ 24-FEB-2026: Estado para crear nueva medición desde parámetro sin medir
    const [creandoParam, setCreandoParam] = useState<number | null>(null);
    const [nuevoValor, setNuevoValor] = useState('');
    const [nuevaObs, setNuevaObs] = useState('');

    const handleCrearMedicion = async (idParametro: number) => {
        if (!nuevoValor && !nuevaObs) return;
        try {
            await createMedicion.mutateAsync({
                idOrden: orden.id_orden_servicio,
                data: {
                    id_parametro_medicion: idParametro,
                    valor_numerico: nuevoValor ? parseFloat(nuevoValor) : undefined,
                    observaciones: nuevaObs || undefined,
                },
            });
            setCreandoParam(null);
            setNuevoValor('');
            setNuevaObs('');
        } catch (err) {
            console.error('Error creando medición:', err);
        }
    };

    // Helper para renderizar el contenido de checklist de un grupo de actividades
    const renderChecklistContent = (acts: any[]) => (
        <div className="space-y-2">
            {acts.map((act: any) => (
                <ActividadCardAdvanced
                    key={act.id_actividad_ejecutada}
                    actividad={act}
                    idOrdenServicio={orden.id_orden_servicio}
                />
            ))}
        </div>
    );

    // Helper para renderizar mediciones de un grupo
    const renderMedicionesContent = (meds: any[]) => (
        <div className="space-y-2">
            {meds.map((med: any) => (
                <MedicionCardAdvanced
                    key={med.id_medicion}
                    medicion={med}
                    idOrdenServicio={orden.id_orden_servicio}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* ✅ MULTI-EQUIPO: Banner indicador */}
            {esMultiEquipo && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Wrench className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-indigo-900 text-sm">Orden Multi-Equipos ({equipos.length} equipos)</h4>
                            <p className="text-[10px] text-indigo-600">Filtre por equipo para ver checklist y mediciones individuales</p>
                        </div>
                    </div>
                    {/* Selector de equipos */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setEquipoFiltro('todos')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                                equipoFiltro === 'todos'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                            )}
                        >
                            Todos
                        </button>
                        {equipos.map((oe, idx) => {
                            const color = EQUIPO_COLORS[idx % EQUIPO_COLORS.length];
                            const isActive = equipoFiltro === oe.id_orden_equipo;
                            const label = oe.nombre_sistema || oe.equipo?.nombre_equipo || `Equipo ${oe.orden_secuencia}`;
                            // Calcular conteo de actividades para este equipo
                            const actGroup = actividadesPorEquipo?.find((g: ActividadesPorEquipo) => g.equipo.idOrdenEquipo === oe.id_orden_equipo);
                            const actCount = actGroup?.actividades.length || 0;
                            const actDone = actGroup?.actividades.filter((a: any) => a.ejecutada).length || 0;

                            return (
                                <button
                                    key={oe.id_orden_equipo}
                                    onClick={() => setEquipoFiltro(oe.id_orden_equipo)}
                                    title={label}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5',
                                        isActive
                                            ? `${color.badge} text-white border-transparent shadow-sm`
                                            : `bg-white ${color.text} ${color.border} hover:${color.bg}`
                                    )}
                                >
                                    <span className={cn(
                                        'w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0',
                                        isActive ? 'bg-white/20' : color.light
                                    )}>
                                        {oe.orden_secuencia}
                                    </span>
                                    <span className="whitespace-nowrap">{label}</span>
                                    <span className={cn(
                                        'text-[9px] px-1 py-0.5 rounded-full shrink-0',
                                        isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                                    )}>
                                        {actDone}/{actCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Progreso General */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h4 className="font-bold text-gray-900">Progreso de Ejecución</h4>
                        <p className="text-xs text-gray-500">
                            {esMultiEquipo && equipoFiltro !== 'todos'
                                ? `Equipo: ${equipos.find(e => e.id_orden_equipo === equipoFiltro)?.equipo?.codigo_equipo || ''}`
                                : 'Avance basado en checklist técnico'}
                        </p>
                    </div>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                        {actividadesCompletadas} / {actividadesFiltradas.length} actividades
                    </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 ease-out"
                        style={{ width: `${porcentajeProgreso}%` }}
                    />
                </div>
                <p className="text-center text-sm font-black text-blue-900 mt-2">{porcentajeProgreso}% COMPLETADO</p>
            </div>

            {/* SubTabs: Checklist | Mediciones */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setSubTab('checklist')}
                        className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${subTab === 'checklist'
                            ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <Play className="h-4 w-4" />
                        Checklist de Actividades
                        <span className={`px-2 py-0.5 rounded-full text-xs ${subTab === 'checklist' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                            {actividadesFiltradas.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setSubTab('mediciones')}
                        className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${subTab === 'mediciones'
                            ? 'text-purple-600 bg-purple-50 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <Settings className="h-4 w-4" />
                        Mediciones Técnicas
                        <span className={`px-2 py-0.5 rounded-full text-xs ${subTab === 'mediciones' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                            {medicionesFiltradas.length}
                        </span>
                        {parametrosSinMedir.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                                +{parametrosSinMedir.length}
                            </span>
                        )}
                        {medicionesCritico > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold">
                                {medicionesCritico} ⚠
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                    {subTab === 'checklist' && (
                        <div className="space-y-3">
                            {isLoadingAct ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : actividadesFiltradas.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Play className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                                    <p className="font-medium">No hay actividades registradas</p>
                                    <p className="text-xs">Las actividades se sincronizan desde la App Móvil</p>
                                </div>
                            ) : esMultiEquipo && actividadesPorEquipo && equipoFiltro === 'todos' ? (
                                /* ✅ MULTI-EQUIPO: Vista agrupada por equipo */
                                <div className="space-y-4">
                                    <ResumenEstados actividades={actividades} />
                                    {actividadesPorEquipo.map((grupo: ActividadesPorEquipo, idx: number) => (
                                        <div key={grupo.equipo.idOrdenEquipo} className="space-y-2">
                                            <EquipoHeader
                                                equipo={grupo.equipo}
                                                index={idx}
                                                count={equipos.length}
                                            />
                                            {grupo.actividades.length > 0 ? (
                                                renderChecklistContent(grupo.actividades)
                                            ) : (
                                                <p className="text-xs text-gray-400 pl-11 py-2">Sin actividades para este equipo</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Vista normal (orden simple o equipo filtrado) */
                                <>
                                    <ResumenEstados actividades={actividadesFiltradas} />
                                    {renderChecklistContent(actividadesFiltradas)}
                                </>
                            )}
                        </div>
                    )}

                    {subTab === 'mediciones' && (
                        <div className="space-y-3">
                            {isLoadingMed ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                </div>
                            ) : medicionesFiltradas.length === 0 && parametrosSinMedir.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Settings className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                                    <p className="font-medium">Sin mediciones de campo</p>
                                </div>
                            ) : (
                                <>
                                    {medicionesFiltradas.length > 0 && (
                                        <ResumenMediciones mediciones={medicionesFiltradas} totalParametros={medicionesFiltradas.length + parametrosSinMedir.length} />
                                    )}

                                    {/* Mediciones registradas */}
                                    {esMultiEquipo && medicionesPorEquipo && equipoFiltro === 'todos' ? (
                                        /* ✅ MULTI-EQUIPO: Vista agrupada por equipo */
                                        <div className="space-y-4">
                                            {medicionesPorEquipo.map((grupo: MedicionesPorEquipo, idx: number) => (
                                                <div key={grupo.equipo.idOrdenEquipo} className="space-y-2">
                                                    <EquipoHeader
                                                        equipo={grupo.equipo}
                                                        index={idx}
                                                        count={equipos.length}
                                                    />
                                                    {grupo.mediciones.length > 0 ? (
                                                        renderMedicionesContent(grupo.mediciones)
                                                    ) : (
                                                        <p className="text-xs text-gray-400 pl-11 py-2">Sin mediciones para este equipo</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : medicionesFiltradas.length > 0 ? (
                                        /* Vista normal */
                                        renderMedicionesContent(medicionesFiltradas)
                                    ) : null}

                                    {/* ✅ 24-FEB-2026: Parámetros sin medir (para que admin pueda registrarlos) */}
                                    {parametrosSinMedir.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="h-px flex-1 bg-amber-200" />
                                                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider px-2">
                                                    Parámetros Sin Registrar ({parametrosSinMedir.length})
                                                </span>
                                                <div className="h-px flex-1 bg-amber-200" />
                                            </div>

                                            {parametrosSinMedir.map((param: any) => (
                                                <div
                                                    key={param.id_parametro_medicion}
                                                    className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 transition-all duration-200"
                                                >
                                                    <div className="p-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-amber-100 border border-amber-200">
                                                                <Settings className="h-6 w-6 text-amber-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
                                                                    {param.nombre_parametro}
                                                                </p>
                                                                <p className="text-sm text-amber-600 font-medium mt-0.5">
                                                                    Sin registrar — {param.unidad_medida}
                                                                </p>
                                                                {param.es_obligatorio && (
                                                                    <span className="text-[10px] font-bold text-red-500">OBLIGATORIO</span>
                                                                )}
                                                            </div>

                                                            {creandoParam !== param.id_parametro_medicion ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setCreandoParam(param.id_parametro_medicion);
                                                                        setNuevoValor('');
                                                                        setNuevaObs('');
                                                                    }}
                                                                    className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-all flex items-center gap-1"
                                                                >
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    Registrar
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setCreandoParam(null)}
                                                                    className="flex-shrink-0 px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Formulario inline para crear medición */}
                                                        {creandoParam === param.id_parametro_medicion && (
                                                            <div className="mt-3 space-y-2 bg-white/80 p-3 rounded-lg border border-amber-100">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                                        Valor ({param.unidad_medida})
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={nuevoValor}
                                                                        onChange={(e) => setNuevoValor(e.target.value)}
                                                                        placeholder={`Ingrese valor en ${param.unidad_medida}...`}
                                                                        className="w-full mt-1 px-3 py-2 text-lg font-bold border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                                                        autoFocus
                                                                    />
                                                                    {param.valor_minimo_normal != null && param.valor_maximo_normal != null && (
                                                                        <p className="text-[10px] text-gray-400 mt-1">
                                                                            Rango normal: {Number(param.valor_minimo_normal)} - {Number(param.valor_maximo_normal)} {param.unidad_medida}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                                        Observaciones (opcional)
                                                                    </label>
                                                                    <textarea
                                                                        value={nuevaObs}
                                                                        onChange={(e) => setNuevaObs(e.target.value)}
                                                                        placeholder="Notas sobre esta medición..."
                                                                        rows={2}
                                                                        className="w-full mt-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setCreandoParam(null)}
                                                                        className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center justify-center gap-1"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleCrearMedicion(param.id_parametro_medicion)}
                                                                        disabled={createMedicion.isPending || (!nuevoValor && !nuevaObs)}
                                                                        className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                                                    >
                                                                        {createMedicion.isPending ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Check className="h-3.5 w-3.5" />
                                                                        )}
                                                                        Guardar Medición
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TabFinanciero({ orden }: { orden: Orden }) {
    const [isAddServicioOpen, setIsAddServicioOpen] = useState(false);
    const [isDespacharRepuestoOpen, setIsDespacharRepuestoOpen] = useState(false);
    const [reintegrandoId, setReintegrandoId] = useState<number | null>(null);
    const [componenteAReintegrar, setComponenteAReintegrar] = useState<ComponenteUsadoOrden | null>(null);
    const [servicioAEliminar, setServicioAEliminar] = useState<any | null>(null);

    const { data: serviciosData, isLoading } = useServiciosOrden(orden.id_orden_servicio);
    const { data: componentesData, isLoading: isLoadingComponentes } = useComponentesOrden(orden.id_orden_servicio);
    const removeServicio = useRemoveServicioOrden();
    const removeComponente = useRemoveComponenteOrden();

    const servicios = serviciosData?.data || [];
    const componentes = componentesData?.data || [];
    const itemsBodegaCount = componentes.filter((c) => c.origen_componente === 'BODEGA').length;
    const itemsCompraDirectaCount = componentes.filter((c) => c.origen_componente === 'COMPRA_DIRECTA').length;
    const itemsClienteCount = componentes.filter((c) => c.origen_componente === 'CLIENTE').length;
    const resumenComp = componentesData?.resumen || {
        total_items: componentes.length,
        unidades_totales: componentes.reduce((s, c) => s + Number(c.cantidad || 0), 0),
        costo_total_bodega: 0,
        costo_total_compra_directa: 0,
        costo_total_general: Number(orden.total_componentes) || 0,
    };

    const totalServiciosVivo = Number(orden.total_servicios) || 0;
    const totalComponentesVivo =
        componentesData?.resumen !== undefined
            ? Number(componentesData.resumen.costo_total_general || 0)
            : Number(orden.total_componentes) || 0;
    const totalGastosVivo = Number(orden.total_gastos) || 0;
    const totalGeneralVivo = totalServiciosVivo + totalComponentesVivo + totalGastosVivo;

    const handleConfirmarEliminarServicio = async () => {
        if (!servicioAEliminar) return;
        try {
            await removeServicio.mutateAsync({
                idOrden: orden.id_orden_servicio,
                idDetalle: servicioAEliminar.id_detalle_servicio,
            });
            toast.success('Servicio retirado de la orden exitosamente');
            setServicioAEliminar(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error al eliminar el servicio');
        }
    };

    const handleConfirmarReintegro = async (motivo: string) => {
        if (!componenteAReintegrar) return;
        const comp = componenteAReintegrar;
        const esBodega = comp.origen_componente === 'BODEGA' && comp.id_componente;
        try {
            setReintegrandoId(comp.id_componente_usado);
            await removeComponente.mutateAsync({
                idOrden: orden.id_orden_servicio,
                idUso: comp.id_componente_usado,
                motivo: motivo || `Reintegro desde Orden ${orden.numero_orden}`,
            });
            toast.success(
                esBodega
                    ? `Repuesto reintegrado a ${comp.bodega_codigo || 'Bodega WMS'} con contra-asiento en Kardex`
                    : comp.origen_componente === 'CLIENTE'
                    ? 'Registro de repuesto suministrado por cliente retirado de la orden'
                    : 'Registro de compra directa retirado de la orden'
            );
            setComponenteAReintegrar(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error al reintegrar el repuesto');
        } finally {
            setReintegrandoId(null);
        }
    };

    const esOrdenCancelada = orden.estados_orden?.codigo_estado === 'CANCELADA';
    const esLiquidacionPostCierre =
        orden.estados_orden?.codigo_estado === 'COMPLETADA' ||
        orden.estados_orden?.codigo_estado === 'APROBADA';

    return (
        <div className="space-y-6">
            {/* Resumen financiero */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Servicios</p>
                    <p className="text-2xl font-bold text-blue-900">${totalServiciosVivo.toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Repuestos & WMS</p>
                        <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            {resumenComp.total_items} ítems
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-950">${totalComponentesVivo.toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Gastos</p>
                    <p className="text-2xl font-bold text-orange-900">${totalGastosVivo.toLocaleString('es-CO')}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm ring-2 ring-purple-200">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Total General</p>
                    <p className="text-2xl font-bold text-purple-900">${totalGeneralVivo.toLocaleString('es-CO')}</p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════
                SECCIÓN ENTERPRISE: REPUESTOS & INSUMOS CONSUMIDOS (TRAZABILIDAD WMS)
                ═══════════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Package className="h-5 w-5 text-amber-600" />
                                Repuestos & Insumos de la Orden (WMS / Registro / Cliente)
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Bodega WMS: {itemsBodegaCount}
                            </span>
                            {itemsCompraDirectaCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Registro / Compra Directa: {itemsCompraDirectaCount}
                                </span>
                            )}
                            {itemsClienteCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-800 border border-violet-200">
                                    Suministro Cliente: {itemsClienteCount}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Total Unid.: {resumenComp.unidades_totales}
                            </span>
                            {esLiquidacionPostCierre && (
                                <span
                                    title="Habilitado para liquidación administrativa de insumos omitidos en cierre de campo"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                >
                                    <ShieldCheck className="h-3 w-3" />
                                    Liquidación Administrativa Activa
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Elija si el artículo aplica descuento físico de stock (Bodega WMS + Kardex), si es solo registro/compra directa sin tocar inventario, o suministrado por el cliente
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={esOrdenCancelada}
                        onClick={() => setIsDespacharRepuestoOpen(true)}
                        title={esOrdenCancelada ? 'No se pueden asociar repuestos a una orden cancelada' : 'Despachar de bodega WMS, registrar compra directa o suministro del cliente'}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                        Despachar / Registrar Repuesto
                    </button>
                </div>

                {isLoadingComponentes ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
                    </div>
                ) : componentes.length === 0 ? (
                    <div className="text-center py-10 px-4 text-slate-500">
                        <Package className="h-11 w-11 mx-auto mb-2.5 text-slate-300" />
                        <p className="font-semibold text-slate-700 text-sm">No hay repuestos ni insumos asociados a esta orden</p>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                            Utilice <strong>Despachar / Registrar Repuesto</strong> para descargar materiales de bodega (con Kardex), registrar un repuesto sin descuento de stock o documentar un insumo suministrado por el cliente.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-4 py-3">Código / Repuesto</th>
                                    <th className="px-4 py-3">Modalidad / Bodega & Lote</th>
                                    <th className="px-4 py-3">Efecto en Inventario / Kardex</th>
                                    <th className="px-4 py-3 text-right">Cant.</th>
                                    <th className="px-4 py-3 text-right">Costo Unit.</th>
                                    <th className="px-4 py-3 text-right text-emerald-700">Subtotal</th>
                                    <th className="px-4 py-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {componentes.map((c) => {
                                    const isReintegrando = reintegrandoId === c.id_componente_usado;
                                    const esCliente = c.origen_componente === 'CLIENTE';
                                    return (
                                        <tr key={c.id_componente_usado} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {c.id_componente ? (
                                                        <a
                                                            href={`/inventario/${c.id_componente}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Abrir ficha maestra en Inventario WMS"
                                                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-800 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                                                        >
                                                            {c.sku || `ART-${c.id_componente}`}
                                                            <ExternalLink className="h-3 w-3 opacity-70" />
                                                        </a>
                                                    ) : (
                                                        <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                            MANUAL
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-bold text-slate-900">{c.descripcion}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    {c.referencia_fabricante && c.referencia_fabricante !== 'S/R'
                                                        ? `Ref: ${c.referencia_fabricante}`
                                                        : 'Ref: Estándar'}
                                                    {c.marca && c.marca !== 'GENÉRICO' ? ` • Marca: ${c.marca}` : ''}
                                                    {c.observaciones ? ` • Nota: ${c.observaciones.replace(/OS #\d+/g, orden.numero_orden)}` : ''}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {c.origen_componente === 'BODEGA' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                            <Warehouse className="h-3 w-3" />
                                                            {c.bodega_codigo ? `[${c.bodega_codigo}] ${c.bodega_nombre || 'Almacén'}` : 'BODEGA WMS'}
                                                        </span>
                                                    ) : esCliente ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-800 border border-violet-200">
                                                            SUMINISTRADO POR CLIENTE
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            REGISTRO / COMPRA DIRECTA
                                                        </span>
                                                    )}
                                                    {c.codigo_lote && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                                            <Layers className="h-3 w-3 text-amber-700" />
                                                            Lote: {c.codigo_lote}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {c.id_movimiento_inventario ? (
                                                    <div className="space-y-0.5">
                                                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                            KARDEX #{c.id_movimiento_inventario}
                                                        </span>
                                                        {c.fecha_uso && (
                                                            <p className="text-[10px] text-slate-400">
                                                                {new Date(c.fecha_uso).toLocaleString('es-CO')}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : esCliente ? (
                                                    <span className="text-[11px] text-violet-700 font-medium">
                                                        Trazabilidad técnica (Sin descuento WMS)
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-500 italic">
                                                        Sin descuento de stock WMS
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-sm font-bold text-slate-900">
                                                {Number(c.cantidad)} <span className="text-[10px] font-semibold text-slate-500">{c.unidad || 'UND'}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-sm font-mono text-slate-700">
                                                {esCliente ? (
                                                    <span className="text-xs text-violet-700 font-semibold">$0</span>
                                                ) : (
                                                    `$${Number(c.costo_unitario || 0).toLocaleString('es-CO')}`
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-sm font-mono font-bold text-emerald-800">
                                                {esCliente ? (
                                                    <span className="text-xs font-semibold text-violet-700">$0 (Cliente)</span>
                                                ) : (
                                                    `$${Number(c.costo_total || 0).toLocaleString('es-CO')}`
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    disabled={isReintegrando}
                                                    onClick={() => setComponenteAReintegrar(c)}
                                                    title={
                                                        c.origen_componente === 'BODEGA'
                                                            ? 'Reintegrar repuesto al almacén WMS y revertir cargo en la orden'
                                                            : 'Quitar registro de la orden (no afecta stock de bodega)'
                                                    }
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    {isReintegrando ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                    )}
                                                    {c.origen_componente === 'BODEGA' ? 'Reintegrar' : 'Quitar Registro'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
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
                                                onClick={() => setServicioAEliminar(s)}
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

            {/* Modal Enterprise para despachar repuesto WMS o compra directa a la orden */}
            {isDespacharRepuestoOpen && (
                <ModalDespacharRepuestoOrden
                    isOpen={isDespacharRepuestoOpen}
                    onClose={() => setIsDespacharRepuestoOpen(false)}
                    orden={orden}
                />
            )}

            {/* Modal Enterprise para confirmar reintegro físico a bodega WMS */}
            {componenteAReintegrar && (
                <ModalConfirmarReintegro
                    isOpen={!!componenteAReintegrar}
                    onClose={() => setComponenteAReintegrar(null)}
                    componente={componenteAReintegrar}
                    orden={orden}
                    onConfirm={handleConfirmarReintegro}
                    isPending={removeComponente.isPending || !!reintegrandoId}
                />
            )}

            {/* Modal Enterprise para confirmar eliminación de servicio facturado */}
            {servicioAEliminar && (
                <ModalConfirmarEliminarServicio
                    isOpen={!!servicioAEliminar}
                    onClose={() => setServicioAEliminar(null)}
                    servicio={servicioAEliminar}
                    orden={orden}
                    onConfirm={handleConfirmarEliminarServicio}
                    isPending={removeServicio.isPending}
                />
            )}
        </div>
    );
}

function ModalConfirmarReintegro({
    isOpen,
    onClose,
    componente,
    orden,
    onConfirm,
    isPending,
}: {
    isOpen: boolean;
    onClose: () => void;
    componente: ComponenteUsadoOrden;
    orden: Orden;
    onConfirm: (motivo: string) => Promise<void>;
    isPending: boolean;
}) {
    const [motivo, setMotivo] = useState('');
    const esBodega = componente.origen_componente === 'BODEGA' && !!componente.id_componente;
    const costoTotal = Number(componente.costo_total || 0);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onConfirm(motivo.trim());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'p-2.5 rounded-xl border shadow-2xs',
                            esBodega
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                        )}>
                            <RotateCcw className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                {esBodega ? 'Confirmar Reintegro Físico a Bodega' : 'Quitar Registro de la Orden'}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-500">Orden de Servicio:</span>
                                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                                    {orden.numero_orden}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Ficha Resumen del Repuesto */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                    {componente.sku || `ART-${componente.id_componente || 'EXT'}`}
                                </span>
                                <p className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                                    {componente.descripcion}
                                </p>
                            </div>
                            <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg shrink-0">
                                -${costoTotal.toLocaleString('es-CO')} COP
                            </span>
                        </div>

                        {/* Metadatos Logísticos */}
                        <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-200 text-xs">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cantidad</span>
                                <span className="font-bold text-slate-900 text-sm">
                                    {Number(componente.cantidad)} {componente.unidad || 'UND'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    {esBodega ? 'Bodega Destino' : 'Modalidad'}
                                </span>
                                <span className="font-semibold text-slate-800 truncate block">
                                    {esBodega
                                        ? `[${componente.bodega_codigo || 'BOD'}] ${componente.bodega_nombre || 'Bodega'}`
                                        : componente.origen_componente === 'CLIENTE'
                                        ? 'Suministrado por el Cliente ($0)'
                                        : 'Solo Registro / Compra Directa'}
                                </span>
                            </div>
                            {componente.codigo_lote && (
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Lote Físico</span>
                                    <span className="font-mono font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        {componente.codigo_lote}
                                    </span>
                                </div>
                            )}
                            {componente.id_movimiento_inventario && (
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Asiento Kardex Origen</span>
                                    <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        KARDEX #{componente.id_movimiento_inventario}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alerta de Auditoría Zero-Trust */}
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-start gap-2.5 shadow-2xs">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-900 leading-relaxed">
                            {esBodega ? (
                                <>
                                    Esta operación ejecutará un <strong>contra-asiento inmutable de ENTRADA por DEVOLUCIÓN en el Kardex</strong>, incrementará el saldo físico del almacén/lote y descontará <strong>${costoTotal.toLocaleString('es-CO')} COP</strong> del costo acumulado de la orden.
                                </>
                            ) : (
                                <>
                                    Esta operación retirará el registro de la orden (<strong>sin afectar el inventario físico de bodega ni el Kardex</strong>) y ajustará <strong>${costoTotal.toLocaleString('es-CO')} COP</strong> en el balance de la orden.
                                </>
                            )}
                        </div>
                    </div>

                    {/* Input opcional de justificación */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                            Motivo / Justificación de la Devolución (Opcional)
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Material sobrante no instalado / Error de digitación / Sustituido en campo..."
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className={cn(
                                'px-4 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer',
                                esBodega
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-rose-600 hover:bg-rose-700',
                                isPending && 'opacity-60 cursor-not-allowed'
                            )}
                        >
                            {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            {esBodega ? 'Confirmar Reintegro a Bodega' : 'Confirmar Eliminación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ModalConfirmarEliminarServicio({
    isOpen,
    onClose,
    servicio,
    orden,
    onConfirm,
    isPending,
}: {
    isOpen: boolean;
    onClose: () => void;
    servicio: any;
    orden: Orden;
    onConfirm: () => Promise<void>;
    isPending: boolean;
}) {
    if (!isOpen || !servicio) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Eliminar Servicio de la Orden</h3>
                            <span className="font-mono text-xs text-slate-500">{orden.numero_orden}</span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{servicio.catalogo_servicios?.codigo_servicio}</span>
                        <p className="text-sm font-bold text-slate-900">{servicio.catalogo_servicios?.nombre_servicio}</p>
                        <p className="text-xs text-slate-600 font-mono pt-1">
                            Subtotal: ${Number(servicio.subtotal || 0).toLocaleString('es-CO')} COP
                        </p>
                    </div>
                    <p className="text-xs text-slate-600">
                        ¿Confirmas que deseas retirar este servicio de la orden? El valor del servicio se descontará del balance total.
                    </p>
                    <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                        <button type="button" onClick={onClose} disabled={isPending} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isPending}
                            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Eliminar Servicio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalDespacharRepuestoOrden({
    isOpen,
    onClose,
    orden,
}: {
    isOpen: boolean;
    onClose: () => void;
    orden: Orden;
}) {
    const { data: session } = useSession();
    const usuarioId = Number((session?.user as any)?.id) || 1;

    const [origen, setOrigen] = useState<'BODEGA' | 'COMPRA_DIRECTA' | 'CLIENTE'>('BODEGA');
    const [modoManual, setModoManual] = useState(false);
    const [avisoAutoCambio, setAvisoAutoCambio] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [componenteSeleccionado, setComponenteSeleccionado] = useState<ComponenteStock | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchDropdownRef = useRef<HTMLDivElement>(null);

    const [bodegaSalida, setBodegaSalida] = useState<string>('');
    const [loteSalida, setLoteSalida] = useState<string>('');
    const [cantidad, setCantidad] = useState<string>('1');
    const [costoUnitario, setCostoUnitario] = useState<string>('');
    const [descripcionDirecta, setDescripcionDirecta] = useState<string>('');
    const [observaciones, setObservaciones] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const cantidadSugeridaBomRef = useRef<number | null>(null);

    const idEquipoPrincipal =
        (orden as any).id_equipo ||
        orden.equipos?.id_equipo ||
        orden.ordenes_equipos?.[0]?.equipo?.id_equipo ||
        (orden.ordenes_equipos?.[0] as any)?.id_equipo ||
        0;
    const codigoEquipoPrincipal =
        orden.equipos?.codigo_equipo ||
        orden.ordenes_equipos?.[0]?.equipo?.codigo_equipo ||
        null;

    const { data: bomCompatible = [] } = useComponentesCompatiblesEquipo(Number(idEquipoPrincipal));

    const { data: componentesData, isLoading: isLoadingComp } = useComponentesStock({
        busqueda: busqueda || undefined,
        limit: 12,
    });
    const { data: bodegas = [] } = useBodegas();
    const addComponenteMutation = useAddComponenteOrden();

    // Click outside listener para contraer el dropdown de búsqueda de artículos
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    // Bodegas efectivas del componente con resolución Zero-Trust (.bodegas o .lotes_activos)
    const bodegasEfectivas = useMemo(() => {
        if (componenteSeleccionado?.bodegas && componenteSeleccionado.bodegas.length > 0) {
            return componenteSeleccionado.bodegas;
        }
        if (componenteSeleccionado?.lotes_activos && componenteSeleccionado.lotes_activos.length > 0) {
            const bMap = new Map<number, { id_ubicacion: number; codigo: string; nombre: string; stock: number }>();
            for (const l of componenteSeleccionado.lotes_activos) {
                const cod = l.bodega_codigo || (l as any).bodega || 'BOD-CENTRAL';
                const idU = l.id_ubicacion || (cod === 'BOD-FLUIDOS' ? 2 : cod === 'MOVIL-01' ? 3 : 1);
                const nom = l.bodega_nombre || (l as any).zona || (idU === 2 ? 'Almacén de Lubricantes y Químicos' : idU === 3 ? 'Unidad Móvil' : 'Bodega Central Taller');
                const exist = bMap.get(idU) || { id_ubicacion: idU, codigo: cod, nombre: nom, stock: 0 };
                exist.stock += Number(l.cantidad_actual || 0);
                bMap.set(idU, exist);
            }
            return Array.from(bMap.values());
        }
        if (componenteSeleccionado && componenteSeleccionado.stock_actual > 0) {
            return [{
                id_ubicacion: 1,
                codigo: 'BOD-CENTRAL',
                nombre: 'Bodega Central Taller',
                stock: componenteSeleccionado.stock_actual,
            }];
        }
        return [];
    }, [componenteSeleccionado]);

    const lotesActivosEfectivos = useMemo(() => {
        if (!componenteSeleccionado?.lotes_activos) return [];
        return componenteSeleccionado.lotes_activos.map((l: any) => {
            const cod = l.bodega_codigo || l.bodega || 'BOD-CENTRAL';
            const idU = l.id_ubicacion || (cod === 'BOD-FLUIDOS' ? 2 : cod === 'MOVIL-01' ? 3 : 1);
            return {
                ...l,
                id_ubicacion: idU,
                bodega_codigo: cod,
                bodega_nombre: l.bodega_nombre || l.zona || 'Bodega Central Taller',
            };
        });
    }, [componenteSeleccionado]);

    // Auto-seleccionar la primera bodega con stock > 0 cuando se elige un componente
    useEffect(() => {
        if (!isOpen || bodegas.length === 0) return;
        const defaultId = bodegas[0].id_ubicacion.toString();
        if (!componenteSeleccionado) {
            if (!bodegaSalida) setBodegaSalida(defaultId);
            return;
        }
        const bList = (componenteSeleccionado.bodegas && componenteSeleccionado.bodegas.length > 0)
            ? componenteSeleccionado.bodegas
            : bodegasEfectivas;
        const conSaldo = bList.find((b) => b.stock > 0);
        const bestId = conSaldo ? conSaldo.id_ubicacion.toString() : defaultId;
        setBodegaSalida(bestId);
        setLoteSalida('');
        const precioRef = componenteSeleccionado.precio_compra ?? componenteSeleccionado.precio_venta ?? 0;
        setCostoUnitario(origen === 'CLIENTE' ? '0' : precioRef > 0 ? precioRef.toString() : '');

        const maxStockDisp = conSaldo ? conSaldo.stock : (bodegasEfectivas.find(b => b.id_ubicacion === parseInt(bestId, 10))?.stock ?? 0);
        const sugerida = cantidadSugeridaBomRef.current;
        if (origen === 'BODEGA') {
            if (maxStockDisp > 0) {
                setCantidad(sugerida && sugerida > 0 ? Math.min(sugerida, maxStockDisp).toString() : '1');
            } else {
                setCantidad(sugerida && sugerida > 0 ? sugerida.toString() : '1');
            }
        } else {
            setCantidad(sugerida && sugerida > 0 ? sugerida.toString() : '1');
        }
        cantidadSugeridaBomRef.current = null;
    }, [isOpen, componenteSeleccionado, bodegasEfectivas, bodegas]);

    const seleccionarDesdeBom = (bom: BomItem) => {
        const existente = (componentesData?.data || []).find((c) => c.id_componente === bom.id_componente);
        cantidadSugeridaBomRef.current = bom.cantidad_requerida || 1;
        setModoManual(false);
        if (bom.stock_actual <= 0 && origen === 'BODEGA') {
            setOrigen('COMPRA_DIRECTA');
            setAvisoAutoCambio(
                `El artículo homologado «${bom.descripcion}» tiene 0 unidades físicas en bodega. Se activó automáticamente la modalidad «Solo Registro / Compra Directa (Sin descuento de stock)» con ${bom.cantidad_requerida} ${bom.unidad}. También puede elegir «Suministrado por el Cliente».`
            );
        } else {
            setAvisoAutoCambio(null);
        }
        if (existente) {
            setComponenteSeleccionado({
                ...existente,
                bodegas: bom.bodegas && bom.bodegas.length > 0 ? bom.bodegas : existente.bodegas,
            });
        } else {
            setComponenteSeleccionado({
                id_componente: bom.id_componente,
                codigo: bom.sku || `ART-${bom.id_componente}`,
                referencia: bom.referencia_fabricante || '',
                nombre: bom.descripcion,
                marca: bom.marca || '',
                categoria: bom.aplicacion_label,
                unidad: bom.unidad || 'UND',
                stock_actual: bom.stock_actual,
                stock_minimo: bom.stock_minimo,
                estado_stock: (bom.estado_stock === 'INSUFICIENTE' ? 'BAJO' : bom.estado_stock) as any,
                precio_compra: bom.precio_compra,
                precio_venta: bom.precio_venta ?? bom.precio_compra,
                valor_inventario: bom.stock_actual * bom.precio_compra,
                activo: true,
                bodegas: bom.bodegas || [],
                lotes_activos: [],
            });
        }
        setShowDropdown(false);
        setError(null);
    };

    if (!isOpen) return null;

    const bodegaSalidaId = parseInt(bodegaSalida, 10);
    const stockEnBodegaSalida =
        bodegasEfectivas.find((b) => b.id_ubicacion === bodegaSalidaId)?.stock ?? 0;

    const cantidadNum = parseFloat(cantidad) || 0;
    const costoNum = origen === 'CLIENTE' ? 0 : parseFloat(costoUnitario) || 0;
    const subtotalEstimado = origen === 'CLIENTE' ? 0 : cantidadNum * costoNum;
    const cantidadExcedida = origen === 'BODEGA' && !!componenteSeleccionado && (stockEnBodegaSalida <= 0 || cantidadNum > stockEnBodegaSalida);

    // Control reactivo estricto de la cantidad ingresada
    const handleCantidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valStr = e.target.value;
        if (valStr === '') {
            setCantidad('');
            setError(null);
            return;
        }
        const valNum = parseFloat(valStr);
        if (origen === 'BODEGA' && componenteSeleccionado && stockEnBodegaSalida > 0) {
            if (valNum > stockEnBodegaSalida) {
                setCantidad(stockEnBodegaSalida.toString());
                setError(`Cantidad limitada al stock disponible en bodega (${stockEnBodegaSalida} ${componenteSeleccionado.unidad || 'UND'})`);
                toast.warning(`Stock máximo disponible: ${stockEnBodegaSalida} ${componenteSeleccionado.unidad || 'UND'}`);
                return;
            }
        }
        setError(null);
        setCantidad(valStr);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (cantidadNum <= 0) {
            setError('La cantidad debe ser mayor a 0');
            return;
        }

        if (origen === 'BODEGA') {
            if (!componenteSeleccionado) {
                setError('Debe seleccionar un artículo del Catálogo Maestro WMS');
                return;
            }
            if (cantidadNum > stockEnBodegaSalida) {
                const bodNom = bodegas.find((b) => b.id_ubicacion === bodegaSalidaId)?.zona || 'la bodega seleccionada';
                setError(`Stock insuficiente en ${bodNom}. Disponible: ${stockEnBodegaSalida} ${componenteSeleccionado.unidad || 'UND'}. Si solo desea registrarlo sin descontar stock, elija «Solo Registro / Compra Directa» o «Suministrado por el Cliente».`);
                return;
            }

            try {
                await addComponenteMutation.mutateAsync({
                    idOrden: orden.id_orden_servicio,
                    data: {
                        id_componente: componenteSeleccionado.id_componente,
                        cantidad: cantidadNum,
                        origen_componente: 'BODEGA',
                        id_ubicacion: bodegaSalida ? parseInt(bodegaSalida, 10) : undefined,
                        id_lote: loteSalida ? parseInt(loteSalida, 10) : undefined,
                        costo_unitario: costoNum > 0 ? costoNum : undefined,
                        observaciones: observaciones.trim() || undefined,
                        realizado_por: usuarioId,
                    },
                });
                toast.success('Repuesto despachado de Bodega WMS con asiento en Kardex exitosamente');
                onClose();
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Error al despachar repuesto del almacén');
            }
        } else {
            const descResuelta = modoManual
                ? descripcionDirecta.trim()
                : (componenteSeleccionado?.nombre || componenteSeleccionado?.referencia || descripcionDirecta.trim());
            if (!descResuelta && !componenteSeleccionado) {
                setError('Seleccione un artículo del Catálogo Maestro o escriba la descripción del ítem manual');
                return;
            }
            try {
                await addComponenteMutation.mutateAsync({
                    idOrden: orden.id_orden_servicio,
                    data: {
                        id_componente: modoManual ? undefined : componenteSeleccionado?.id_componente,
                        descripcion: descResuelta,
                        cantidad: cantidadNum,
                        unidad: modoManual ? 'UND' : componenteSeleccionado?.unidad || 'UND',
                        origen_componente: origen,
                        costo_unitario: origen === 'CLIENTE' ? 0 : costoNum,
                        observaciones: observaciones.trim() || undefined,
                        realizado_por: usuarioId,
                    },
                });
                toast.success(
                    origen === 'CLIENTE'
                        ? 'Repuesto suministrado por el cliente registrado para trazabilidad técnica ($0)'
                        : 'Repuesto registrado en la orden exitosamente (Sin descuento de stock WMS)'
                );
                onClose();
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Error al registrar el repuesto en la orden');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
                {/* Header Corporativo */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'p-2 rounded-xl border shadow-2xs',
                            origen === 'BODEGA'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : origen === 'CLIENTE'
                                ? 'bg-violet-50 text-violet-700 border-violet-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                        )}>
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900">
                                    Asociar Repuesto / Insumo a Orden
                                </h2>
                                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                    {orden.numero_orden}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Elija si aplica descuento físico de bodega (WMS + Kardex) o si es solo registro / suministro del cliente
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Cuerpo con Scroll Interno */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="p-5 overflow-y-auto space-y-4 flex-1">
                        {/* Selector Explícito de 3 Modalidades */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setOrigen('BODEGA');
                                    setModoManual(false);
                                    setAvisoAutoCambio(null);
                                    setError(null);
                                }}
                                className={cn(
                                    'p-2.5 text-left rounded-lg transition-all cursor-pointer border',
                                    origen === 'BODEGA'
                                        ? 'bg-white text-slate-900 shadow-xs border-amber-300 ring-1 ring-amber-200'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                )}
                            >
                                <div className="flex items-center gap-1.5 text-xs font-bold">
                                    <Warehouse className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>1. Descuento Bodega WMS</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                    Descuenta stock físico, lote FIFO y Kardex
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setOrigen('COMPRA_DIRECTA');
                                    setAvisoAutoCambio(null);
                                    setError(null);
                                    if (componenteSeleccionado && (!costoUnitario || costoUnitario === '0')) {
                                        const refP = componenteSeleccionado.precio_compra ?? 0;
                                        if (refP > 0) setCostoUnitario(String(refP));
                                    }
                                    if (cantidad === '0') setCantidad('1');
                                }}
                                className={cn(
                                    'p-2.5 text-left rounded-lg transition-all cursor-pointer border',
                                    origen === 'COMPRA_DIRECTA'
                                        ? 'bg-white text-slate-900 shadow-xs border-blue-300 ring-1 ring-blue-200'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                )}
                            >
                                <div className="flex items-center gap-1.5 text-xs font-bold">
                                    <DollarSign className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                    <span>2. Solo Registro / Compra</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                    Sin descuento de stock • Imputa costo a la OT
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setOrigen('CLIENTE');
                                    setAvisoAutoCambio(null);
                                    setError(null);
                                    setCostoUnitario('0');
                                    if (cantidad === '0') setCantidad('1');
                                }}
                                className={cn(
                                    'p-2.5 text-left rounded-lg transition-all cursor-pointer border',
                                    origen === 'CLIENTE'
                                        ? 'bg-white text-slate-900 shadow-xs border-violet-300 ring-1 ring-violet-200'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                )}
                            >
                                <div className="flex items-center gap-1.5 text-xs font-bold">
                                    <ShieldCheck className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                                    <span>3. Suministro Cliente</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                    Solo trazabilidad técnica • Costo $0 Mekanos
                                </p>
                            </button>
                        </div>

                        {avisoAutoCambio && (
                            <div className="p-3 text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 shadow-2xs">
                                <Package className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                <span className="font-medium leading-relaxed">{avisoAutoCambio}</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 shadow-2xs">
                                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                <span className="font-medium text-xs leading-relaxed">{error}</span>
                            </div>
                        )}

                        {/* Sugerencia Inteligente BOM del Equipo (Siempre visible en las 3 modalidades) */}
                        {bomCompatible.length > 0 && (
                            <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5 text-blue-600" />
                                        Referencias BOM Homologadas de {codigoEquipoPrincipal || 'este Equipo'} ({bomCompatible.length})
                                    </span>
                                    {idEquipoPrincipal > 0 && (
                                        <a
                                            href={`/equipos/${idEquipoPrincipal}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                                        >
                                            <span>Ver BOM 360°</span>
                                            <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {bomCompatible.map((b) => {
                                        const isSelected = !modoManual && componenteSeleccionado?.id_componente === b.id_componente;
                                        const tieneStock = b.stock_actual > 0;
                                        const esAlt = b.rol_repuesto === 'ALTERNATIVO';
                                        return (
                                            <button
                                                key={b.id_componente_equipo}
                                                type="button"
                                                onClick={() => seleccionarDesdeBom(b)}
                                                className={cn(
                                                    'text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all flex items-center gap-2 cursor-pointer',
                                                    isSelected
                                                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                                        : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 shadow-2xs'
                                                )}
                                                title={`${b.aplicacion_label} (${esAlt ? 'Homólogo' : 'Titular'}): ${b.descripcion} • Req: ${b.cantidad_requerida} ${b.unidad}`}
                                            >
                                                <span className={cn(
                                                    'font-mono text-[10px] font-bold px-1.5 py-0.5 rounded',
                                                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                                                )}>
                                                    {b.sku || `ART-${b.id_componente}`}
                                                </span>
                                                <span className="font-semibold truncate max-w-[150px]">
                                                    {b.aplicacion_label} {esAlt ? '(Homólogo)' : ''}
                                                </span>
                                                <span className={cn(
                                                    'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap',
                                                    isSelected
                                                        ? 'bg-blue-500 text-white'
                                                        : tieneStock
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                )}>
                                                    Req: {b.cantidad_requerida} • {tieneStock ? `Bodega: ${b.stock_actual}` : 'Bajo pedido (0)'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Buscador Universal del Catálogo Maestro o Ítem Manual */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    {modoManual
                                        ? 'Descripción Manual del Repuesto / Insumo *'
                                        : 'Artículo del Catálogo Maestro *'}
                                </label>
                                {origen !== 'BODEGA' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModoManual((v) => !v);
                                            setError(null);
                                        }}
                                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                                    >
                                        {modoManual
                                            ? '← Buscar en el Catálogo Maestro'
                                            : '¿No está en catálogo? Escribir ítem manual'}
                                    </button>
                                )}
                            </div>

                            {modoManual && origen !== 'BODEGA' ? (
                                <input
                                    type="text"
                                    placeholder="Ej: Abrazadera industrial 4 pulgadas en acero inoxidable (Factura POS #981)"
                                    value={descripcionDirecta}
                                    onChange={(e) => setDescripcionDirecta(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-2xs hover:border-slate-400 transition-all"
                                    required
                                />
                            ) : componenteSeleccionado ? (
                                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300/60">
                                                {componenteSeleccionado.codigo || `ART-${componenteSeleccionado.id_componente}`}
                                            </span>
                                            <p className="text-sm font-bold text-slate-900">
                                                {componenteSeleccionado.nombre || componenteSeleccionado.referencia}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setComponenteSeleccionado(null);
                                                setBusqueda('');
                                                setShowDropdown(false);
                                            }}
                                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
                                        >
                                            Cambiar artículo
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Ref: <span className="font-semibold text-slate-700">{componenteSeleccionado.referencia}</span> | Marca: <span className="font-semibold text-slate-700">{componenteSeleccionado.marca || 'N/A'}</span>
                                    </p>
                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                        <span className="text-slate-500 font-medium">En Almacén WMS:</span>
                                        <span className={cn(
                                            'font-bold px-2 py-0.5 rounded border',
                                            componenteSeleccionado.stock_actual > 0
                                                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                                : 'text-slate-700 bg-slate-100 border-slate-200'
                                        )}>
                                            {componenteSeleccionado.stock_actual} {componenteSeleccionado.unidad || 'UND'}
                                        </span>
                                        {componenteSeleccionado.precio_compra && componenteSeleccionado.precio_compra > 0 && (
                                            <span className="text-slate-500 text-[11px]">
                                                • Costo catálogo: <strong>${Number(componenteSeleccionado.precio_compra).toLocaleString('es-CO')} COP</strong>
                                            </span>
                                        )}
                                    </div>
                                    {origen === 'BODEGA' && bodegasEfectivas.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                                            <span className="text-[11px] text-slate-500 font-medium">Desglose por Bodega:</span>
                                            {bodegasEfectivas.map((b) => (
                                                <span
                                                    key={b.id_ubicacion}
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-700 shadow-2xs"
                                                >
                                                    <span className="font-semibold text-slate-500">{b.codigo}:</span>
                                                    <span className="font-bold text-slate-900">{b.stock}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div ref={searchDropdownRef} className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar en Catálogo Maestro por código (ART-2026), referencia o nombre..."
                                            value={busqueda}
                                            onChange={(e) => {
                                                setBusqueda(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') setShowDropdown(false);
                                            }}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-2xs transition-all hover:border-slate-400"
                                        />
                                    </div>

                                    {showDropdown && (
                                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                                            {isLoadingComp ? (
                                                <div className="p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                                                    Consultando Catálogo Maestro...
                                                </div>
                                            ) : (componentesData?.data || []).length === 0 ? (
                                                <p className="p-4 text-xs text-slate-500 text-center font-medium">No se encontraron componentes</p>
                                            ) : (
                                                (componentesData?.data || []).map((comp) => (
                                                    <button
                                                        key={comp.id_componente}
                                                        type="button"
                                                        onClick={() => {
                                                            if (comp.stock_actual <= 0 && origen === 'BODEGA') {
                                                                setOrigen('COMPRA_DIRECTA');
                                                                setAvisoAutoCambio(
                                                                    `El artículo «${comp.nombre || comp.referencia}» tiene 0 unidades en bodega; se seleccionó automáticamente «Solo Registro / Compra Directa (Sin descuento de stock)».`
                                                                );
                                                            } else {
                                                                setAvisoAutoCambio(null);
                                                            }
                                                            setComponenteSeleccionado(comp);
                                                            setShowDropdown(false);
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-amber-50/60 flex items-center justify-between transition-colors cursor-pointer group"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 group-hover:bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                    {comp.codigo || `ART-${comp.id_componente}`}
                                                                </span>
                                                                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                                                                    {comp.nombre || comp.referencia}
                                                                </p>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 mt-0.5">REF: {comp.referencia} • Marca: {comp.marca || 'S/M'}</p>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-3">
                                                            <span className={cn(
                                                                'text-xs font-bold block',
                                                                comp.stock_actual > 0 ? 'text-emerald-700' : 'text-blue-700'
                                                            )}>
                                                                {comp.stock_actual > 0
                                                                    ? `En bodega: ${comp.stock_actual} ${comp.unidad || 'UND'}`
                                                                    : '0 en bodega (Solo registro)'}
                                                            </span>
                                                            {comp.precio_compra ? (
                                                                <span className="text-[10px] text-slate-400 font-mono">${Number(comp.precio_compra).toLocaleString('es-CO')}</span>
                                                            ) : null}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {origen === 'BODEGA' ? (
                            <>
                                {/* Banner de Lotes Físicos Disponibles (FIFO/FEFO) */}
                                {lotesActivosEfectivos.length > 0 && (
                                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-2 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                                <Layers className="h-4 w-4 text-amber-700" />
                                                Lotes Físicos Disponibles (Sugerencia FIFO/FEFO)
                                            </span>
                                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 uppercase">
                                                {lotesActivosEfectivos.length} {lotesActivosEfectivos.length === 1 ? 'lote' : 'lotes'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                            {lotesActivosEfectivos.map((lote) => (
                                                <span
                                                    key={lote.id_lote}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-lg font-mono text-[11px] text-slate-800 shadow-2xs"
                                                >
                                                    <strong className="text-amber-950">{lote.codigo_lote}</strong>: {lote.cantidad_actual} {componenteSeleccionado?.unidad || 'UND'}
                                                    {lote.fecha_vencimiento && (
                                                        <span className="text-[10px] text-slate-400 font-sans">
                                                            (Vence: {new Date(lote.fecha_vencimiento).toLocaleDateString('es-CO')})
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bodega Origen y Cantidad */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Bodega Origen *
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={bodegaSalida}
                                                onChange={(e) => {
                                                    const newBodId = e.target.value;
                                                    setBodegaSalida(newBodId);
                                                    setLoteSalida('');
                                                    const newStock = bodegasEfectivas.find((b) => b.id_ubicacion === parseInt(newBodId, 10))?.stock ?? 0;
                                                    if (parseFloat(cantidad) > newStock && newStock > 0) {
                                                        setCantidad(newStock.toString());
                                                    }
                                                }}
                                                className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all appearance-none cursor-pointer truncate"
                                                required
                                            >
                                                {bodegas.map((b) => {
                                                    const s = bodegasEfectivas.find((x) => x.id_ubicacion === b.id_ubicacion)?.stock ?? 0;
                                                    const zonaCorta = (b.zona || 'Bodega')
                                                        .replace('Almacén de Lubricantes y Químicos', 'Almacén Lubricantes')
                                                        .replace('Bodega Central Taller', 'Taller Central')
                                                        .replace('Unidad Móvil Servicio', 'Unidad Móvil');
                                                    return (
                                                        <option key={b.id_ubicacion} value={b.id_ubicacion} className="text-slate-800 py-1 font-medium">
                                                            [{b.codigo_ubicacion}] (Disp: {s} {componenteSeleccionado?.unidad || 'UND'}) • {zonaCorta}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                Cantidad a Despachar *
                                            </label>
                                            {componenteSeleccionado && stockEnBodegaSalida > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCantidad(stockEnBodegaSalida.toString());
                                                        setError(null);
                                                    }}
                                                    className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    Usar Máx ({stockEnBodegaSalida})
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="any"
                                            max={stockEnBodegaSalida > 0 ? stockEnBodegaSalida : 1}
                                            disabled={!!componenteSeleccionado && stockEnBodegaSalida <= 0}
                                            value={cantidad}
                                            onChange={handleCantidadChange}
                                            className={cn(
                                                'w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold shadow-2xs transition-all focus:outline-none focus:ring-2',
                                                componenteSeleccionado && stockEnBodegaSalida <= 0
                                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                    : cantidadNum > stockEnBodegaSalida && origen === 'BODEGA' && !!componenteSeleccionado
                                                    ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-500/30 focus:border-rose-500'
                                                    : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:ring-amber-500/30 focus:border-amber-500'
                                            )}
                                            required
                                        />
                                        {componenteSeleccionado && (
                                            <div className="mt-1 flex items-center justify-between text-[11px]">
                                                {stockEnBodegaSalida > 0 ? (
                                                    <span className={cn(
                                                        'font-semibold flex items-center gap-1',
                                                        cantidadNum > stockEnBodegaSalida ? 'text-rose-600' : 'text-emerald-700'
                                                    )}>
                                                        {cantidadNum > stockEnBodegaSalida
                                                            ? `⚠️ La cantidad no puede exceder el stock disponible (${stockEnBodegaSalida})`
                                                            : `✓ Disponible en bodega: ${stockEnBodegaSalida} ${componenteSeleccionado.unidad || 'UND'}`}
                                                    </span>
                                                ) : (
                                                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                                                        0 en esta bodega — cambie a «Solo Registro / Compra» o «Suministro Cliente» arriba.
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Selector de Lote FIFO y Costo Unitario */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Lote a Despachar (FIFO)
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={loteSalida}
                                                onChange={(e) => setLoteSalida(e.target.value)}
                                                className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all appearance-none cursor-pointer truncate"
                                            >
                                                <option value="" className="text-slate-700 py-1 font-medium">
                                                    Automático FIFO / FEFO (Recomendado)
                                                </option>
                                                {lotesActivosEfectivos
                                                    .filter((l) => !bodegaSalida || l.id_ubicacion === parseInt(bodegaSalida, 10))
                                                    .map((lote) => (
                                                        <option key={lote.id_lote} value={lote.id_lote} className="text-slate-800 py-1 font-medium">
                                                            [{lote.codigo_lote}] ({lote.cantidad_actual} {componenteSeleccionado?.unidad || 'UND'}) {lote.fecha_vencimiento ? `• Vto: ${new Date(lote.fecha_vencimiento).toLocaleDateString('es-CO')}` : ''}
                                                        </option>
                                                    ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Costo Unitario Imputado ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder="Automático según catálogo"
                                            value={costoUnitario}
                                            onChange={(e) => setCostoUnitario(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold font-mono text-slate-900 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Cantidad Utilizada / Registrada * {componenteSeleccionado?.unidad ? `(${componenteSeleccionado.unidad})` : ''}
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        {origen === 'CLIENTE'
                                            ? 'Costo Imputado a Mekanos ($)'
                                            : 'Costo Unitario Imputado ($) *'}
                                    </label>
                                    {origen === 'CLIENTE' ? (
                                        <div className="w-full px-3.5 py-2.5 bg-violet-50/70 border border-violet-200 rounded-xl text-xs font-bold font-mono text-violet-800">
                                            $0 COP (Suministrado por el cliente)
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder="0"
                                            value={costoUnitario}
                                            onChange={(e) => setCostoUnitario(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold font-mono text-slate-900 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                                            required
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Observaciones / Soporte Técnico
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Reemplazo preventivo durante mantenimiento de 250h..."
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                            />
                        </div>

                        {/* Preview Financiero e Impacto en Inventario */}
                        <div className={cn(
                            'p-4 rounded-xl flex items-center justify-between shadow-2xs border',
                            origen === 'BODEGA'
                                ? 'bg-emerald-50/80 border-emerald-200'
                                : origen === 'CLIENTE'
                                ? 'bg-violet-50/80 border-violet-200'
                                : 'bg-blue-50/80 border-blue-200'
                        )}>
                            <div>
                                <p className={cn(
                                    'text-[11px] font-bold uppercase tracking-wider',
                                    origen === 'BODEGA' ? 'text-emerald-800' : origen === 'CLIENTE' ? 'text-violet-800' : 'text-blue-800'
                                )}>
                                    {origen === 'BODEGA'
                                        ? `Impacto WMS & Financiero en ${orden.numero_orden}`
                                        : origen === 'CLIENTE'
                                        ? `Trazabilidad Técnica (Suministro Cliente) en ${orden.numero_orden}`
                                        : `Registro sin Descuento de Stock en ${orden.numero_orden}`}
                                </p>
                                <p className={cn(
                                    'text-xs mt-0.5',
                                    origen === 'BODEGA' ? 'text-emerald-700' : origen === 'CLIENTE' ? 'text-violet-700' : 'text-blue-700'
                                )}>
                                    {origen === 'BODEGA'
                                        ? 'Descuenta existencias físicas de bodega/lote, genera asiento CONSUMO_OS en Kardex y suma al total de la orden'
                                        : origen === 'CLIENTE'
                                        ? 'No descuenta stock de almacén ni suma cobro de Mekanos ($0); queda documentado en la OT, Informe PDF e Historial del Equipo'
                                        : 'No descuenta stock físico de bodega ni afecta Kardex; imputa el costo a la orden y al Historial Clínico del Equipo'}
                                </p>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                                <span className={cn(
                                    'text-[10px] font-bold uppercase block',
                                    origen === 'BODEGA' ? 'text-emerald-700' : origen === 'CLIENTE' ? 'text-violet-700' : 'text-blue-700'
                                )}>
                                    Subtotal a Imputar
                                </span>
                                <span className={cn(
                                    'text-lg font-black font-mono',
                                    origen === 'BODEGA' ? 'text-emerald-950' : origen === 'CLIENTE' ? 'text-violet-950' : 'text-blue-950'
                                )}>
                                    ${subtotalEstimado.toLocaleString('es-CO')} COP
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Sticky */}
                    <div className="px-5 py-3.5 bg-slate-50/90 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200/60 rounded-xl font-medium transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={addComponenteMutation.isPending || cantidadNum <= 0 || (origen === 'BODEGA' && (!componenteSeleccionado || cantidadExcedida))}
                            className={cn(
                                'px-5 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
                                origen === 'BODEGA'
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : origen === 'CLIENTE'
                                    ? 'bg-violet-600 hover:bg-violet-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            )}
                        >
                            {addComponenteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            {origen === 'BODEGA'
                                ? `Despachar de Bodega a ${orden.numero_orden}`
                                : origen === 'CLIENTE'
                                ? `Registrar Suministro Cliente en ${orden.numero_orden}`
                                : `Registrar en ${orden.numero_orden} (Sin Descuento Stock)`}
                        </button>
                    </div>
                </form>
            </div>
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
    const queryClient = useQueryClient();
    const invalidateReportes = useInvalidarReportes();
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const { data: evidenciasData, isLoading: isLoadingEv } = useEvidenciasOrden(orden.id_orden_servicio);
    const { data: firmasData, isLoading: isLoadingFi } = useFirmasOrden(orden.id_orden_servicio);

    // ✅ MULTI-EQUIPO: Detectar y habilitar filtro por equipo
    const esMultiEquipo = (orden.ordenes_equipos?.length || 0) > 1;
    const equipos = orden.ordenes_equipos || [];
    const [equipoFiltro, setEquipoFiltro] = useState<number | 'todos'>('todos');

    // ✅ FIX 05-ENE-2026 / 02-OCT-2026: Obtener URL y metadatos de descarga del PDF desde documentos_generados
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
    const vecesDescargado = pdfData?.data?.veces_descargado ?? 0;
    const fechaUltimaDescarga = pdfData?.data?.fecha_ultima_descarga || null;

    const handleDescargarInformeDesdeOrden = async () => {
        try {
            setIsDownloadingPdf(true);
            const filenameCanonico = buildInformeFilename({
                fechaServicio: orden.fecha_fin_real || orden.fecha_inicio_real || orden.fecha_programada,
                codigoTipoServicio: orden.tipos_servicio?.codigo_tipo,
                nombreTipoServicio: orden.tipos_servicio?.nombre_tipo,
                codigoTipoEquipo: (orden.equipos as any)?.tipos_equipo?.codigo_tipo,
                nombreTipoEquipo: (orden.equipos as any)?.tipos_equipo?.nombre_tipo,
                nombreCliente: orden.clientes?.persona?.nombre_comercial
                    || orden.clientes?.persona?.razon_social
                    || (orden.clientes?.nombre_sede ? orden.clientes.nombre_sede : null),
                nombreEquipo: orden.equipos?.nombre_equipo || (orden.equipos as any)?.nombre,
                numeroOrden: orden.numero_orden,
            });

            await descargarInformePorOrdenAutenticado(apiClient, orden.id_orden_servicio, filenameCanonico);
            invalidateReportes();
            void queryClient.invalidateQueries({ queryKey: ['orden-pdf-url', orden.id_orden_servicio] });
            toast.success('Informe PDF descargado correctamente');
        } catch (error) {
            console.error('[Orden] Error descargando informe:', error);
            if (urlPdf) {
                window.open(urlPdf, '_blank');
            } else {
                toast.error('No se pudo descargar el informe. Verifique su conexión.');
            }
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const evidencias = evidenciasData?.data || [];
    const firmas = firmasData?.data || [];



    return (
        <div className="space-y-6">
            {/* Gestión de Informe PDF - NUEVO */}
            <GestionInformeSection orden={orden} />

            {/* Historial de Emails Enviados - FIX 18-FEB-2026 */}
            <HistorialEmailsSection idOrden={orden.id_orden_servicio} />

            {/* ✅ MULTI-EQUIPO: Filtro por equipo para fotos/evidencias */}
            {esMultiEquipo && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Camera className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-indigo-900 text-sm">Orden Multi-Equipos ({equipos.length} equipos)</h4>
                            <p className="text-[10px] text-indigo-600">Filtre por equipo para ver las fotos de cada equipo</p>
                        </div>
                    </div>
                    {/* Selector de equipos */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setEquipoFiltro('todos')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                                equipoFiltro === 'todos'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                            )}
                        >
                            Todos
                        </button>
                        {equipos.map((oe, idx) => {
                            const color = EQUIPO_COLORS[idx % EQUIPO_COLORS.length];
                            const isActive = equipoFiltro === oe.id_orden_equipo;
                            const label = oe.nombre_sistema || oe.equipo?.nombre_equipo || `Equipo ${oe.orden_secuencia}`;
                            return (
                                <button
                                    key={oe.id_orden_equipo}
                                    onClick={() => setEquipoFiltro(oe.id_orden_equipo)}
                                    title={label}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5',
                                        isActive
                                            ? `${color.badge} text-white border-transparent shadow-sm`
                                            : `bg-white ${color.text} ${color.border} hover:${color.bg}`
                                    )}
                                >
                                    <span className={cn(
                                        'w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0',
                                        isActive ? 'bg-white/20' : color.light
                                    )}>
                                        {oe.orden_secuencia}
                                    </span>
                                    <span className="whitespace-nowrap">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Firmas Digitales - Componente Avanzado */}
            <FirmasSection firmas={firmas} isLoading={isLoadingFi} idOrdenServicio={orden.id_orden_servicio} orden={orden} />

            {/* ✅ Barra Sutil de Descarga de Evidencias Fotográficas */}
            <BarraSutilDescargaEvidencias
                numeroOrden={orden.numero_orden || `OS-${orden.id_orden_servicio}`}
                evidencias={evidencias}
                idOrdenServicio={orden.id_orden_servicio}
                orden={orden}
            />

            {/* Fotos Generales del Servicio - CRUD */}
            <GaleriaFotosGenerales
                idOrdenServicio={orden.id_orden_servicio}
                numeroOrden={orden.numero_orden || `OS-${orden.id_orden_servicio}`}
                idOrdenEquipoFiltro={esMultiEquipo && equipoFiltro !== 'todos' ? equipoFiltro : null}
                orden={orden}
            />

            {/* Evidencias Fotográficas - Componente Avanzado con Lightbox */}
            <EvidenciasGallery
                evidencias={evidencias}
                numeroOrden={orden.numero_orden || `OS-${orden.id_orden_servicio}`}
                isLoading={isLoadingEv}
                idOrdenEquipoFiltro={esMultiEquipo && equipoFiltro !== 'todos' ? equipoFiltro : null}
                orden={orden}
            />

            {/* Documentos Generados (Informe PDF) - Salida Oficial */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    Documentos de Salida
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                            <FileText className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-red-900">Informe de Servicio Técnico (PDF)</p>
                                {vecesDescargado > 0 && (
                                    <span
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        title={
                                            `Descargado ${vecesDescargado} vez${vecesDescargado !== 1 ? 'es' : ''}` +
                                            (fechaUltimaDescarga ? `\nÚltima descarga: ${new Date(fechaUltimaDescarga).toLocaleString('es-CO')}` : '')
                                        }
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                        Descargado {vecesDescargado} vez{vecesDescargado !== 1 ? 'es' : ''}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-red-700 mt-0.5">
                                {fechaUltimaDescarga
                                    ? `Última descarga: ${new Date(fechaUltimaDescarga).toLocaleString('es-CO')}`
                                    : 'Generado automáticamente al marcar la orden como COMPLETADA'}
                            </p>
                        </div>
                    </div>
                    {orden.estados_orden?.codigo_estado === 'COMPLETADA' || orden.estados_orden?.codigo_estado === 'APROBADA' ? (
                        <button
                            type="button"
                            onClick={handleDescargarInformeDesdeOrden}
                            disabled={isDownloadingPdf}
                            className={cn(
                                "px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            )}
                        >
                            {isDownloadingPdf ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {isDownloadingPdf ? 'Descargando...' : 'Descargar PDF'}
                        </button>
                    ) : (
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest self-center">No generado aún</span>
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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [transferSearchText, setTransferSearchText] = useState('');
    const [transferSearchResults, setTransferSearchResults] = useState<any[]>([]);
    const [transferSelectedOrder, setTransferSelectedOrder] = useState<any | null>(null);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferSearching, setTransferSearching] = useState(false);
    // 🛡️ 03-OCT-2026: la clave del payload es `estadisticas` (ver transferirDatosOrden
    // en ordenes.service.ts). El tipo declaraba `stats`, así que el resumen de
    // conteos que se muestra al usuario quedaba siempre en undefined aunque la
    // transferencia hubiera copiado todo correctamente. Tipo explícito para que
    // TypeScript detecte esta clase de desalineación en el futuro.
    const [transferResult, setTransferResult] = useState<{
        success: boolean;
        message: string;
        estadisticas?: {
            camposDirectos: boolean;
            ordenesEquipos: number;
            actividadesEjecutadas: number;
            evidenciasFotograficas: number;
            medicionesServicio: number;
            componentesUsados: number;
            ordenesActividadesPlan: number;
        };
    } | null>(null);

    const router = useRouter();
    const { data, isLoading, isError, refetch } = useOrden(id);
    const { data: tecnicos } = useTecnicosSelector();

    const cambiarEstado = useCambiarEstadoOrden();
    const asignarTecnico = useAsignarTecnico();
    const cancelarOrden = useCancelarOrden();
    const deleteOrden = useDeleteOrden();

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

    // ✅ FIX 13-MAR-2026: Buscar órdenes para transferencia
    const handleTransferSearch = async () => {
        if (!transferSearchText.trim()) return;
        setTransferSearching(true);
        setTransferSelectedOrder(null);
        try {
            const result = await getOrdenes({ busqueda: transferSearchText.trim(), limit: 10 });
            const filtradas = (result.data || []).filter((o: any) => o.id_orden_servicio !== orden?.id_orden_servicio);
            setTransferSearchResults(filtradas);
        } catch (err) {
            console.error('Error buscando órdenes:', err);
            setTransferSearchResults([]);
        } finally {
            setTransferSearching(false);
        }
    };

    // ✅ FIX 13-MAR-2026: Ejecutar transferencia de datos
    const handleTransferirDatos = async () => {
        if (!orden || !transferSelectedOrder) return;
        setTransferLoading(true);
        setTransferResult(null);
        try {
            const result = await transferirDatosOrden(
                orden.id_orden_servicio,
                transferSelectedOrder.id_orden_servicio
            );
            setTransferResult({
                success: true,
                message: result.message,
                estadisticas: result.estadisticas,
            });
            refetch();
        } catch (error: any) {
            setTransferResult({
                success: false,
                message: error?.response?.data?.message || error?.message || 'Error al transferir datos',
            });
        } finally {
            setTransferLoading(false);
        }
    };

    const handleDeleteOrden = async () => {
        if (!orden) return;
        if (deleteConfirmText !== orden.numero_orden) {
            toast.error('Debe escribir el n\u00famero de orden exacto para confirmar');
            return;
        }
        try {
            await deleteOrden.mutateAsync(orden.id_orden_servicio);
            setIsDeleteModalOpen(false);
            setDeleteConfirmText('');
            router.push('/ordenes');
        } catch (error) {
            console.error('Error al eliminar orden:', error);
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
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Órdenes
                    </button>
                </div>
            </div>
        );
    }

    const estadoActual = orden.estados_orden?.codigo_estado;
    // 🛡️ FUENTE ÚNICA DE VERDAD (03-OCT-2026): antes era una lista hardcodeada
    // ['COMPLETADA','CANCELADA'] que el backend no compartía. Esa divergencia era
    // justamente lo que escondía el botón "Transferir Datos" en órdenes ASIGNADA.
    // Ahora se lee `es_estado_final` de la fila de estados_orden: la misma fuente que
    // usa el backend, de modo que UI y API no puedan discrepar.
    // Fallback defensivo si la relación no viniera cargada.
    const esEstadoFinal =
        orden.estados_orden?.es_estado_final ?? ['COMPLETADA', 'CANCELADA'].includes(estadoActual || '');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Órdenes
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-gray-900 font-mono">
                            {orden.numero_orden}
                        </h1>
                        <EstadoBadge estado={estadoActual} size="lg" />
                        <PrioridadBadge prioridad={orden.prioridad} />
                        {orden.edicion_tecnico_habilitada && estadoActual === 'COMPLETADA' && (
                            <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"
                                title="Un administrador autorizó al técnico a corregir y resubir esta orden desde la app móvil"
                            >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Edición técnica
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                        {(() => {
                            const idCli = orden.clientes?.id_cliente || (orden as any).id_cliente;
                            const clienteNombre = getClienteNombre(orden);
                            return idCli ? (
                                <a
                                    href={`/clientes/${idCli}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Abrir ficha de ${clienteNombre} en nueva pestaña`}
                                    className="flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium transition-colors group"
                                >
                                    <Building2 className="h-4 w-4 text-blue-600" />
                                    <span className="group-hover:underline">{clienteNombre}</span>
                                    <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                </a>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {clienteNombre}
                                </span>
                            );
                        })()}

                        {/* Equipos: Enlace a ficha técnica en nueva pestaña */}
                        {orden.ordenes_equipos && orden.ordenes_equipos.length > 0 ? (
                            orden.ordenes_equipos.length === 1 ? (
                                (() => {
                                    const oe = orden.ordenes_equipos[0];
                                    const idEq = oe.equipo?.id_equipo || (oe as any).id_equipo || orden.equipos?.id_equipo || (orden as any).id_equipo;
                                    const cod = oe.equipo?.codigo_equipo || orden.equipos?.codigo_equipo || 'Equipo';
                                    return idEq ? (
                                        <a
                                            href={`/equipos/${idEq}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Abrir ficha técnica de ${cod} en nueva pestaña`}
                                            className="flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium transition-colors group"
                                        >
                                            <Wrench className="h-4 w-4 text-blue-600" />
                                            <span className="group-hover:underline">{cod}</span>
                                            <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                        </a>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            <Wrench className="h-4 w-4" />
                                            {cod}
                                        </span>
                                    );
                                })()
                            ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-gray-500 font-medium text-xs">Equipos:</span>
                                    {orden.ordenes_equipos.map((oe, idx) => {
                                        const idEq = oe.equipo?.id_equipo || (oe as any).id_equipo;
                                        const cod = oe.equipo?.codigo_equipo || `EQ-${oe.orden_secuencia}`;
                                        return (
                                            <span key={oe.id_orden_equipo} className="flex items-center">
                                                {idEq ? (
                                                    <a
                                                        href={`/equipos/${idEq}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title={`Abrir ficha técnica de ${cod} en nueva pestaña`}
                                                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs flex items-center gap-0.5"
                                                    >
                                                        {cod}
                                                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                                    </a>
                                                ) : (
                                                    <span className="font-mono text-xs text-gray-700">{cod}</span>
                                                )}
                                                {idx < (orden.ordenes_equipos?.length || 0) - 1 && (
                                                    <span className="text-gray-300 mx-1">,</span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            )
                        ) : orden.equipos?.codigo_equipo ? (
                            (() => {
                                const idEq = orden.equipos?.id_equipo || (orden as any).id_equipo;
                                return idEq ? (
                                    <a
                                        href={`/equipos/${idEq}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`Abrir ficha técnica de ${orden.equipos.codigo_equipo} en nueva pestaña`}
                                        className="flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium transition-colors group"
                                    >
                                        <Wrench className="h-4 w-4 text-blue-600" />
                                        <span className="group-hover:underline">{orden.equipos.codigo_equipo}</span>
                                        <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                    </a>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <Wrench className="h-4 w-4" />
                                        {orden.equipos.codigo_equipo}
                                    </span>
                                );
                            })()
                        ) : null}
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
                                label="Editar Orden"
                                variant="primary"
                                onClick={() => setIsEditModalOpen(true)}
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
                    {/* 🛡️ Transferencia de datos (03-OCT-2026).
                        El gate anterior era una lista ['EN_PROCESO','APROBADA'] que
                        contradecía al backend, que sí acepta cualquier estado no final.
                        Por eso el botón NO aparecía en ASIGNADA pese a que la operación
                        era válida. Ahora se usa la misma regla que el servidor. */}
                    {!esEstadoFinal && (
                        <ActionButton
                            icon={ArrowRightLeft}
                            label="Transferir Datos"
                            onClick={() => {
                                setIsTransferModalOpen(true);
                                setTransferSearchText('');
                                setTransferSearchResults([]);
                                setTransferSelectedOrder(null);
                                setTransferResult(null);
                            }}
                        />
                    )}
                    <ActionButton
                        icon={Trash2}
                        label="Eliminar"
                        variant="danger"
                        onClick={() => setIsDeleteModalOpen(true)}
                    />
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

            {/* Modal de Edici\u00f3n de Orden */}
            <OrdenEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                orden={orden}
            />

            {/* Modal de Transferencia de Datos */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                        <div className="p-5 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                                Transferir Datos a esta Orden
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Copiar todos los datos de otra orden hacia <strong className="font-mono text-blue-700">{orden.numero_orden}</strong>
                            </p>
                        </div>

                        {/* Resultado */}
                        {transferResult ? (
                            <div className="p-6 space-y-4">
                                <div className={cn(
                                    "p-4 rounded-xl border flex items-start gap-3",
                                    transferResult.success
                                        ? "bg-green-50 border-green-200"
                                        : "bg-red-50 border-red-200"
                                )}>
                                    {transferResult.success ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <p className={cn("font-bold", transferResult.success ? "text-green-800" : "text-red-800")}>
                                            {transferResult.success ? 'Transferencia Exitosa' : 'Error en Transferencia'}
                                        </p>
                                        <p className={cn("text-sm mt-1", transferResult.success ? "text-green-700" : "text-red-700")}>
                                            {transferResult.message}
                                        </p>
                                        {transferResult.estadisticas && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                {/* Nota: `ordenesEquipos` siempre es 0 por diseño —
                                                    los equipos NO se transfieren. Se conserva la fila
                                                    para no cambiar el layout, con el valor real. */}
                                                <span className="text-green-700">Equipos: <strong>{transferResult.estadisticas.ordenesEquipos}</strong> <span className="text-green-500">(conservados)</span></span>
                                                <span className="text-green-700">Actividades: <strong>{transferResult.estadisticas.actividadesEjecutadas}</strong></span>
                                                <span className="text-green-700">Evidencias: <strong>{transferResult.estadisticas.evidenciasFotograficas}</strong></span>
                                                <span className="text-green-700">Mediciones: <strong>{transferResult.estadisticas.medicionesServicio}</strong></span>
                                                <span className="text-green-700">Componentes: <strong>{transferResult.estadisticas.componentesUsados}</strong></span>
                                                <span className="text-green-700">Plan Act.: <strong>{transferResult.estadisticas.ordenesActividadesPlan}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => { setIsTransferModalOpen(false); setTransferResult(null); }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {/* Búsqueda de orden origen */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                                            Buscar Orden Origen
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={transferSearchText}
                                                onChange={(e) => setTransferSearchText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTransferSearch(); } }}
                                                placeholder="Ej: OS-202603-0049"
                                                className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                            <button
                                                onClick={handleTransferSearch}
                                                disabled={!transferSearchText.trim() || transferSearching}
                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                            >
                                                {transferSearching ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Resultados de búsqueda */}
                                    {transferSearchResults.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500 font-medium">
                                                {transferSearchResults.length} orden(es) encontrada(s) - Seleccione la orden origen:
                                            </p>
                                            {transferSearchResults.map((o: any) => (
                                                <button
                                                    key={o.id_orden_servicio}
                                                    onClick={() => setTransferSelectedOrder(o)}
                                                    className={cn(
                                                        "w-full text-left p-3 rounded-xl border-2 transition-all",
                                                        transferSelectedOrder?.id_orden_servicio === o.id_orden_servicio
                                                            ? "border-blue-500 bg-blue-50"
                                                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-bold text-sm text-gray-900">{o.numero_orden}</span>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                            getEstadoColor(o.estados_orden?.codigo_estado)
                                                        )}>
                                                            {o.estados_orden?.nombre_estado || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                                        {getClienteNombre(o)} - {o.equipos?.codigo_equipo || 'Sin equipo'}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {transferSearchResults.length === 0 && transferSearchText && !transferSearching && (
                                        <p className="text-sm text-gray-400 text-center py-4">
                                            No se encontraron órdenes. Intente con otro término.
                                        </p>
                                    )}

                                    {/* Resumen de transferencia */}
                                    {transferSelectedOrder && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                                            <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                Confirmar Transferencia
                                            </p>
                                            <p className="text-sm text-amber-700">
                                                Se copiarán <strong>TODOS</strong> los datos de:
                                            </p>
                                            <div className="flex items-center gap-2 text-sm font-mono">
                                                <span className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                                    {transferSelectedOrder.numero_orden}
                                                </span>
                                                <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                                                <span className="font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                    {orden.numero_orden}
                                                </span>
                                            </div>
                                            <p className="text-xs text-amber-600 mt-1">
                                                Esto incluye: actividades, evidencias, mediciones, firmas, componentes y observaciones.
                                                Los datos existentes en la orden destino serán reemplazados.
                                            </p>
                                            <div className="text-xs text-amber-700 bg-amber-100/60 rounded-lg p-2.5 space-y-1">
                                                <p className="font-semibold flex items-center gap-1.5">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    Se conservan (no se transfieren):
                                                </p>
                                                <p>
                                                    • <strong>Técnico asignado</strong> — sigue siendo {(() => {
                                                        const p = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
                                                        const nombre = p
                                                            ? [p.primer_nombre, p.primer_apellido].filter(Boolean).join(' ').trim()
                                                            : '';
                                                        return nombre || 'el de la orden destino';
                                                    })()}
                                                </p>
                                                <p>
                                                    • <strong>Equipos</strong> — se mantiene {orden.equipos?.codigo_equipo || 'el de la orden destino'}
                                                </p>
                                                <p className="text-amber-600">
                                                    La operación queda registrada en el historial de estados para auditoría.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                                    <button
                                        onClick={() => setIsTransferModalOpen(false)}
                                        disabled={transferLoading}
                                        className="flex-1 py-2.5 px-4 text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleTransferirDatos}
                                        disabled={!transferSelectedOrder || transferLoading}
                                        className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {transferLoading ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Transfiriendo...</>
                                        ) : (
                                            <><ArrowRightLeft className="h-4 w-4" /> Transferir Datos</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Eliminación (HARD DELETE) */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                        <div className="p-6 border-b border-red-100 bg-red-50">
                            <h2 className="text-xl font-bold text-red-900 flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-red-600" />
                                Eliminar Orden Permanentemente
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800 font-medium text-sm">
                                    Esta acci\u00f3n es <strong>IRREVERSIBLE</strong>. Se eliminar\u00e1n permanentemente:
                                </p>
                                <ul className="mt-2 text-sm text-red-700 space-y-1">
                                    <li>\u2022 Todas las actividades ejecutadas</li>
                                    <li>\u2022 Todas las mediciones registradas</li>
                                    <li>\u2022 Todas las evidencias fotogr\u00e1ficas</li>
                                    <li>\u2022 Componentes, gastos y servicios</li>
                                    <li>\u2022 Historial de estados y emails</li>
                                    <li>\u2022 Informes PDF generados</li>
                                    <li>\u2022 Firmas digitales vinculadas</li>
                                </ul>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Para confirmar, escriba el n\u00famero de orden: <strong className="text-red-600 font-mono">{orden.numero_orden}</strong>
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder={orden.numero_orden}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(''); }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteOrden}
                                disabled={deleteConfirmText !== orden.numero_orden || deleteOrden.isPending}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all',
                                    deleteConfirmText === orden.numero_orden
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                )}
                            >
                                {deleteOrden.isPending ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</>
                                ) : (
                                    <><Trash2 className="h-4 w-4" /> Eliminar Permanentemente</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ HILO DE CONTINUIDAD DEL CASO (Visita 1 ──▶ Visita N) */}
            <HiloContinuidadCaso
                orden={orden}
                onOpenPendientesTab={() => setActiveTab('pendientes')}
            />

            {/* ✅ FEATURE ESTILO SYTEX: Panel de Telemetría y Lectura en Tiempo Real */}
            <ProgresoRegistroTelemetria
                idOrden={orden.id_orden_servicio}
                onVerChecklistTab={() => setActiveTab('ejecucion')}
                onVerMedicionesTab={() => setActiveTab('ejecucion')}
                onVerDocumentosTab={() => setActiveTab('documentos')}
            />

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-4 -mb-px overflow-x-auto">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        const totalCasoPendientes =
                            orden.hilo_caso?.pendientes_totales ??
                            (orden.ordenes_pendientes?.length || 0);
                        const activosCasoPendientes =
                            orden.hilo_caso?.pendientes_abiertos ??
                            (orden.ordenes_pendientes || []).filter(
                                (p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION'
                            ).length;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                                    isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                {tab.id === 'pendientes' && totalCasoPendientes > 0 && (
                                    <span
                                        className={cn(
                                            'px-2 py-0.5 rounded-full text-[11px] font-bold',
                                            activosCasoPendientes > 0
                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        )}
                                    >
                                        {activosCasoPendientes > 0
                                            ? `${activosCasoPendientes} activos / ${totalCasoPendientes}`
                                            : `${totalCasoPendientes}`}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Contenido del tab */}
            <div className="min-h-[400px]">
                {activeTab === 'general' && (
                    <TabGeneral
                        orden={orden}
                        onOpenPendientesTab={() => setActiveTab('pendientes')}
                    />
                )}
                {activeTab === 'ejecucion' && <TabEjecucion orden={orden} />}
                {activeTab === 'pendientes' && <PendientesSection orden={orden} />}
                {activeTab === 'financiero' && <TabFinanciero orden={orden} />}
                {activeTab === 'documentos' && <TabDocumentos orden={orden} />}
            </div>
        </div>
    );
}
