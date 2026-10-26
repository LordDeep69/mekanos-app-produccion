/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: HistorialEstados
 *
 * Muestra la línea de tiempo de cambios de estado de una orden de servicio.
 * Endpoint: GET /api/historial-estados-orden/orden/:idOrden
 */

'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistorialItem {
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
    fecha_cambio?: string;
    fechaCambio?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export function HistorialEstados({ idOrden }: HistorialEstadosProps) {
    const [historial, setHistorial] = useState<HistorialItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        async function fetchHistorial() {
            try {
                const session = await getSession();
                const token = (session as any)?.accessToken;

                const response = await fetch(`${API_URL}/historial-estados-orden/orden/${idOrden}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setHistorial(Array.isArray(data) ? data : data.data || []);
                }
            } catch (error) {
                console.error('Error fetching historial:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (idOrden) {
            fetchHistorial();
        }
    }, [idOrden]);

    if (isLoading) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando historial...</span>
            </div>
        );
    }

    if (historial.length === 0) {
        return null;
    }

    const itemsToShow = isExpanded ? historial : historial.slice(0, 3);

    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    Historial de Estados ({historial.length})
                </h4>
                {historial.length > 3 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                        {isExpanded ? (
                            <>
                                Ver menos <ChevronUp className="h-4 w-4" />
                            </>
                        ) : (
                            <>
                                Ver todos ({historial.length}) <ChevronDown className="h-4 w-4" />
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

                <div className="space-y-4">
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

                        const config = ESTADO_CONFIG[codigoNuevo] || {
                            label: nombreNuevo,
                            color: 'text-gray-600',
                            bgColor: 'bg-gray-100',
                            icon: Clock,
                        };
                        const Icon = config.icon;
                        const isFirst = index === 0;

                        const rawFecha = item.fecha_cambio || item.fechaCambio;
                        const parsedDate = rawFecha ? new Date(rawFecha) : null;
                        const fechaStr =
                            parsedDate && !isNaN(parsedDate.getTime())
                                ? parsedDate.toLocaleString('es-CO', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : 'Fecha registrada';

                        const motivoTexto =
                            item.motivo || item.motivo_cambio || item.motivoCambio || null;
                        const usuarioNombre =
                            item.usuario?.nombre ||
                            item.usuario?.email ||
                            item.usuarioRealizador?.email ||
                            null;

                        return (
                            <div
                                key={item.id_historial || item.idHistorial || index}
                                className="relative flex gap-4 pl-2"
                            >
                                {/* Icono en la línea */}
                                <div
                                    className={cn(
                                        'relative z-10 flex items-center justify-center w-6 h-6 rounded-full',
                                        config.bgColor,
                                        isFirst && 'ring-2 ring-offset-2 ring-blue-500'
                                    )}
                                >
                                    <Icon className={cn('h-3.5 w-3.5', config.color)} />
                                </div>

                                {/* Contenido */}
                                <div className="flex-1 bg-white rounded-lg p-3 shadow-xs border border-gray-100">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    'px-2 py-0.5 rounded-full text-xs font-medium',
                                                    config.bgColor,
                                                    config.color
                                                )}
                                            >
                                                {config.label}
                                            </span>
                                            {nombreAnterior && (
                                                <span className="text-xs text-gray-400">
                                                    ← desde {nombreAnterior}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">{fechaStr}</span>
                                    </div>

                                    {(motivoTexto || item.observaciones) && (
                                        <div className="mt-2 text-sm text-gray-600 flex items-start gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <span>{motivoTexto || item.observaciones}</span>
                                        </div>
                                    )}

                                    {usuarioNombre && (
                                        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span>Por: {usuarioNombre}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
