/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: HistorialEstados
 *
 * Muestra la línea de tiempo de cambios de estado de una orden de servicio.
 * Endpoint: GET /api/historial-estados-orden/orden/:idOrden
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Clock,
    CheckCircle2,
    Play,
    AlertCircle,
    XCircle,
    FileCheck,
    Calendar,
    User,
    MessageSquare,
    Loader2,
    ChevronDown,
    ChevronUp,
    FileText,
    RefreshCw,
    Lock,
    Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';

export interface HistorialItem {
    id_historial?: number;
    idHistorial?: number;
    id_orden_servicio?: number;
    idOrdenServicio?: number;
    estado_anterior?: string | null;
    estado_nuevo?: string;
    estadoAnterior?: {
        idEstado?: number;
        codigoEstado?: string;
        nombreEstado?: string;
    } | null;
    estadoNuevo?: {
        idEstado?: number;
        codigoEstado?: string;
        nombreEstado?: string;
    } | null;
    motivo?: string | null;
    motivo_cambio?: string | null;
    motivoCambio?: string | null;
    observaciones?: string | null;
    accion?: string | null;
    metadata?: any | null;
    fecha_cambio?: string;
    fechaCambio?: string;
    realizado_por?: number;
    realizadoPor?: number;
    usuario?: {
        id_usuario?: number;
        nombre?: string;
        email?: string;
    } | null;
    usuarioRealizador?: {
        idUsuario?: number;
        email?: string;
    } | null;
}

interface HistorialEstadosProps {
    idOrden: number;
    orden?: any;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    PROGRAMADA: { label: 'Programada', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Calendar },
    ASIGNADA: { label: 'Asignada', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: User },
    EN_PROCESO: { label: 'En Proceso', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Play },
    EN_ESPERA_REPUESTO: { label: 'Espera Repuesto', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: AlertCircle },
    COMPLETADA: { label: 'Completada', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
    APROBADA: { label: 'Aprobada', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: FileCheck },
    CANCELADA: { label: 'Cancelada', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
};

const ACCION_CONFIG: Record<
    string,
    { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
    MODIFICAR_OBSERVACIONES_CIERRE: {
        label: 'Observaciones Editadas',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-100',
        icon: FileText,
    },
    FINALIZAR: {
        label: 'Cierre del Técnico',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-100',
        icon: CheckCircle2,
    },
    HABILITAR_EDICION_TECNICO: {
        label: 'Edición Técnica Habilitada',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        icon: Unlock,
    },
    REVOCAR_EDICION_TECNICO: {
        label: 'Edición Técnica Revocada',
        color: 'text-slate-700',
        bgColor: 'bg-slate-200',
        icon: Lock,
    },
    RESUBIDA_TECNICO: {
        label: 'Resubida por Técnico',
        color: 'text-teal-700',
        bgColor: 'bg-teal-100',
        icon: RefreshCw,
    },
    TRANSFERIR_DATOS: {
        label: 'Transferencia de Datos',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        icon: Clock,
    },
};

function stripHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
}

/**
 * Los registros históricos de finalización guardan el texto con un prefijo
 * narrativo ("Orden finalizada. ..."). Para mostrar sólo lo que escribió el
 * técnico se elimina ese prefijo; los registros nuevos ya traen el texto puro
 * en metadata.
 */
function stripPrefijoCierre(text: string): string {
    return text
        .replace(/^Orden finalizada\.\s*/i, '')
        .replace(/^Orden corregida y resubida\.\s*/i, '')
        .trim();
}

function formatFechaSegura(rawFecha: any): string {
    if (!rawFecha) return 'Fecha registrada';
    try {
        const d = new Date(rawFecha);
        if (isNaN(d.getTime())) return 'Fecha registrada';
        return d.toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'Fecha registrada';
    }
}

export function HistorialEstados({ idOrden, orden }: HistorialEstadosProps) {
    const [historial, setHistorial] = useState<HistorialItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchHistorial() {
            try {
                const response = await apiClient.get<any>(`/historial-estados-orden/orden/${idOrden}?limit=50`);
                const data = response.data;
                const items = Array.isArray(data) ? data : data?.data || [];
                if (isMounted) {
                    setHistorial(items);
                }
            } catch (error) {
                console.error('Error fetching historial:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        if (idOrden) {
            fetchHistorial();
        } else {
            setIsLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [idOrden, orden?.fecha_modificacion, orden?.observaciones_cierre]);

    if (isLoading) {
        return (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium">Cargando historial de estados...</span>
            </div>
        );
    }

    // 🛡️ ZERO-TRUST FALLBACK: Si no hay historial en DB, sintetizar el estado inicial de la orden
    const itemsCompletos: HistorialItem[] =
        historial.length > 0
            ? historial
            : [
                  {
                      id_historial: 0,
                      estado_nuevo: orden?.estados_orden?.codigo_estado || 'PROGRAMADA',
                      estadoNuevo: {
                          codigoEstado: orden?.estados_orden?.codigo_estado || 'PROGRAMADA',
                          nombreEstado: orden?.estados_orden?.nombre_estado || 'Programada',
                      },
                      motivo_cambio: 'Registro inicial de la orden',
                      observaciones: 'Orden registrada en estado inicial.',
                      fecha_cambio:
                          orden?.fecha_creacion || orden?.fecha_programada || new Date().toISOString(),
                      usuario: {
                          nombre: 'Administrador del Sistema',
                          email: 'admin@mekanos.com',
                      },
                  },
              ];

    const totalItems = itemsCompletos.length;
    const itemsToShow = isExpanded ? itemsCompletos : itemsCompletos.slice(0, 3);

    return (
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Clock className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Historial de Estados</h4>
                        <p className="text-[11px] text-gray-500">
                            {totalItems} {totalItems === 1 ? 'registro' : 'registros'} de trazabilidad
                        </p>
                    </div>
                </div>

                {totalItems > 3 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                        {isExpanded ? (
                            <>
                                Ver menos <ChevronUp className="h-3.5 w-3.5" />
                            </>
                        ) : (
                            <>
                                Ver todos ({totalItems}) <ChevronDown className="h-3.5 w-3.5" />
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="relative pl-1">
                {/* Línea vertical */}
                <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-gray-200" />

                <div className="space-y-3.5">
                    {itemsToShow.map((item, index) => {
                        const codigoNuevo =
                            item.estado_nuevo ||
                            item.estadoNuevo?.codigoEstado ||
                            item.estadoNuevo?.nombreEstado ||
                            'PROGRAMADA';
                        const nombreNuevo =
                            item.estadoNuevo?.nombreEstado ||
                            ESTADO_CONFIG[codigoNuevo]?.label ||
                            codigoNuevo;

                        const codigoAnterior =
                            item.estado_anterior ||
                            item.estadoAnterior?.codigoEstado ||
                            item.estadoAnterior?.nombreEstado ||
                            null;
                        const nombreAnterior = codigoAnterior
                            ? item.estadoAnterior?.nombreEstado ||
                              ESTADO_CONFIG[codigoAnterior]?.label ||
                              codigoAnterior
                            : null;

                        const accionConfig = item.accion ? ACCION_CONFIG[item.accion] : null;
                        const config = accionConfig || ESTADO_CONFIG[codigoNuevo] || {
                            label: nombreNuevo,
                            color: 'text-gray-700',
                            bgColor: 'bg-gray-100',
                            icon: Clock,
                        };
                        const Icon = config.icon;
                        const isFirst = index === 0;

                        const rawFecha = item.fecha_cambio || item.fechaCambio;
                        const fechaStr = formatFechaSegura(rawFecha);

                        const motivoTexto =
                            item.motivo_cambio ||
                            item.motivoCambio ||
                            (item.motivo && item.motivo !== item.observaciones ? item.motivo : null);

                        const meta = (item.metadata ?? {}) as Record<string, unknown>;
                        const metaAnterior =
                            typeof meta.observacion_anterior === 'string'
                                ? meta.observacion_anterior
                                : null;
                        const metaNueva =
                            typeof meta.observacion_nueva === 'string'
                                ? meta.observacion_nueva
                                : null;

                        const esEdicionObservaciones =
                            item.accion === 'MODIFICAR_OBSERVACIONES_CIERRE';
                        const esCierreTecnico =
                            item.accion === 'FINALIZAR' ||
                            item.accion === 'RESUBIDA_TECNICO';

                        // Para cierres antiguos se limpia el prefijo narrativo;
                        // los nuevos ya traen el texto puro en metadata.
                        const rawObservacionesBase =
                            esEdicionObservaciones || esCierreTecnico
                                ? metaNueva ?? item.observaciones
                                : item.observaciones;
                        const rawObservaciones = rawObservacionesBase?.trim() || null;
                        const cleanObservaciones = rawObservaciones
                            ? stripHtml(
                                  esCierreTecnico && !metaNueva
                                      ? stripPrefijoCierre(rawObservaciones)
                                      : rawObservaciones,
                              )
                            : null;
                        const observacionAnterior =
                            esEdicionObservaciones && metaAnterior
                                ? stripHtml(metaAnterior)
                                : null;
                        const tieneObservacionDetalle =
                            !esEdicionObservaciones &&
                            cleanObservaciones &&
                            cleanObservaciones !== motivoTexto &&
                            cleanObservaciones.length > 0;
                        const etiquetaObservacion =
                            item.accion === 'FINALIZAR'
                                ? 'Observación original del técnico:'
                                : item.accion === 'RESUBIDA_TECNICO'
                                  ? 'Observación corregida por el técnico:'
                                  : 'Observación registrada:';

                        const rawEmail = item.usuario?.email || item.usuarioRealizador?.email || '';
                        const fallbackAdmin = rawEmail.includes('admin@') || rawEmail.includes('superpa83') || item.realizado_por === 1;
                        const usuarioNombre =
                            item.usuario?.nombre ||
                            (fallbackAdmin ? 'Administrador del Sistema' : (rawEmail || (item.realizado_por ? `Usuario #${item.realizado_por}` : 'Administrador del Sistema')));

                        const mostrarTransicion =
                            !item.accion &&
                            codigoAnterior &&
                            codigoAnterior !== codigoNuevo &&
                            nombreAnterior;

                        return (
                            <div
                                key={item.id_historial || item.idHistorial || index}
                                className="relative flex items-start gap-3 pl-1"
                            >
                                {/* Icono en la línea */}
                                <div
                                    className={cn(
                                        'relative z-10 flex items-center justify-center w-7 h-7 rounded-full transition-all shrink-0 shadow-2xs',
                                        config.bgColor,
                                        isFirst ? 'ring-2 ring-blue-500 ring-offset-2' : 'border border-gray-200'
                                    )}
                                >
                                    <Icon className={cn('h-3.5 w-3.5', config.color)} />
                                </div>

                                {/* Contenido */}
                                <div className="flex-1 bg-gray-50/80 hover:bg-gray-50 rounded-lg p-3 border border-gray-100 transition-colors">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span
                                                className={cn(
                                                    'px-2 py-0.5 rounded-full text-xs font-bold tracking-tight',
                                                    config.bgColor,
                                                    config.color
                                                )}
                                            >
                                                {config.label}
                                            </span>
                                            {mostrarTransicion && (
                                                <span className="text-[11px] text-gray-400">
                                                    ← desde {nombreAnterior}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-500">{fechaStr}</span>
                                    </div>

                                    {motivoTexto && (
                                        <div className="mt-1.5 text-xs text-gray-600 flex items-start gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                                            <span>{motivoTexto}</span>
                                        </div>
                                    )}

                                    {esEdicionObservaciones ? (
                                        <div className="mt-2 rounded-lg bg-white/95 border border-indigo-100 shadow-2xs overflow-hidden">
                                            <div className="px-2.5 py-1.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                                                <FileText className="h-3 w-3 shrink-0" />
                                                <span>Cambio en observaciones de cierre</span>
                                            </div>
                                            <div className="p-2.5 space-y-2">
                                                <div>
                                                    <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wide mb-1">
                                                        Antes
                                                    </span>
                                                    <div
                                                        className={cn(
                                                            'whitespace-pre-line text-xs leading-relaxed rounded-md px-2 py-1.5 border line-clamp-4 hover:line-clamp-none transition-all cursor-pointer',
                                                            observacionAnterior
                                                                ? 'text-gray-600 bg-gray-50 border-gray-200'
                                                                : 'text-gray-400 bg-gray-50 border-gray-200 italic',
                                                        )}
                                                        title="Clic para expandir / contraer"
                                                    >
                                                        {observacionAnterior || 'Sin observación'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide mb-1">
                                                        Después
                                                    </span>
                                                    <div
                                                        className={cn(
                                                            'whitespace-pre-line text-xs leading-relaxed rounded-md px-2 py-1.5 border line-clamp-4 hover:line-clamp-none transition-all cursor-pointer',
                                                            cleanObservaciones
                                                                ? 'text-gray-800 bg-emerald-50/40 border-emerald-100'
                                                                : 'text-gray-400 bg-gray-50 border-gray-200 italic',
                                                        )}
                                                        title="Clic para expandir / contraer"
                                                    >
                                                        {cleanObservaciones || 'Sin observación (campo vaciado)'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : tieneObservacionDetalle ? (
                                        <div className="mt-2 p-2.5 rounded-lg bg-white/95 border border-gray-200/80 text-xs text-gray-700 shadow-2xs">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-1">
                                                <FileText className="h-3 w-3 text-indigo-500 shrink-0" />
                                                <span>{etiquetaObservacion}</span>
                                            </div>
                                            <div
                                                className="whitespace-pre-line text-gray-700 line-clamp-4 hover:line-clamp-none transition-all cursor-pointer font-sans leading-relaxed"
                                                title="Clic para expandir / contraer"
                                            >
                                                {cleanObservaciones}
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                                        <User className="h-3 w-3 text-gray-400" />
                                        <span>Por: <strong className="font-medium text-gray-700">{usuarioNombre}</strong></span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
