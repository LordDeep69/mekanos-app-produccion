/**
 * MEKANOS S.A.S - Portal Admin
 * Historial de Estados de Orden
 * 
 * Timeline visual de cambios de estado de la orden.
 */

'use client';

import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Clock,
    History,
    Loader2,
    PlayCircle,
    User,
    XCircle
} from 'lucide-react';
import { getSession } from 'next-auth/react';

interface HistorialEstado {
    id_historial: number;
    id_orden_servicio: number;
    estado_anterior?: string;
    estado_nuevo: string;
    fecha_cambio: string;
    observaciones?: string;
    cambiado_por?: {
        id_empleado: number;
        persona?: {
            primer_nombre?: string;
            primer_apellido?: string;
        };
    };
}

interface HistorialEstadosProps {
    idOrden: number;
}

function getEstadoIcon(estado?: string) {
    switch (estado) {
        case 'PROGRAMADA':
            return Calendar;
        case 'ASIGNADA':
            return User;
        case 'EN_PROCESO':
            return PlayCircle;
        case 'COMPLETADA':
            return CheckCircle2;
        case 'APROBADA':
            return CheckCircle2;
        case 'CANCELADA':
            return XCircle;
        case 'EN_ESPERA_REPUESTO':
            return Clock;
        default:
            return AlertCircle;
    }
}

function getEstadoColor(estado?: string) {
    switch (estado) {
        case 'PROGRAMADA':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'ASIGNADA':
            return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case 'EN_PROCESO':
            return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'COMPLETADA':
            return 'bg-green-100 text-green-700 border-green-200';
        case 'APROBADA':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'CANCELADA':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'EN_ESPERA_REPUESTO':
            return 'bg-orange-100 text-orange-700 border-orange-200';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
}

function getEstadoLabel(estado?: string) {
    const labels: Record<string, string> = {
        PROGRAMADA: 'Programada',
        ASIGNADA: 'Asignada',
        EN_PROCESO: 'En Proceso',
        EN_ESPERA_REPUESTO: 'Espera Repuesto',
        COMPLETADA: 'Completada',
        APROBADA: 'Aprobada',
        CANCELADA: 'Cancelada',
    };
    return labels[estado || ''] || estado || 'Desconocido';
}

function HistorialItem({ item, isFirst, isLast }: { item: HistorialEstado; isFirst: boolean; isLast: boolean }) {
    const Icon = getEstadoIcon(item.estado_nuevo);
    const fechaCambio = new Date(item.fecha_cambio).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const nombreUsuario = item.cambiado_por?.persona
        ? `${item.cambiado_por.persona.primer_nombre || ''} ${item.cambiado_por.persona.primer_apellido || ''}`.trim()
        : 'Sistema';

    return (
        <div className="relative flex gap-4">
            {/* Línea conectora */}
            {!isLast && (
                <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Icono */}
            <div className={cn(
                "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2",
                getEstadoColor(item.estado_nuevo)
            )}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Contenido */}
            <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        {/* Transición de estados */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {item.estado_anterior && (
                                <>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-bold border",
                                        getEstadoColor(item.estado_anterior)
                                    )}>
                                        {getEstadoLabel(item.estado_anterior)}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                </>
                            )}
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-bold border",
                                getEstadoColor(item.estado_nuevo)
                            )}>
                                {getEstadoLabel(item.estado_nuevo)}
                            </span>
                        </div>

                        {/* Usuario y fecha */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {nombreUsuario}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {fechaCambio}
                            </span>
                        </div>
                    </div>

                    {isFirst && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                            Actual
                        </span>
                    )}
                </div>

                {/* Observaciones */}
                {item.observaciones && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
                        {item.observaciones}
                    </p>
                )}
            </div>
        </div>
    );
}

export function HistorialEstados({ idOrden }: HistorialEstadosProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['orden-historial', idOrden],
        queryFn: async () => {
            const session = await getSession();
            const token = (session as any)?.accessToken;
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/ordenes/${idOrden}/historial-estados`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                throw new Error('Error al obtener historial');
            }
            return res.json();
        },
        enabled: !!idOrden,
    });

    const historial: HistorialEstado[] = data?.data || [];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-gray-600 to-slate-700 rounded-xl shadow-sm">
                    <History className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">Historial de Estados</h4>
                    <p className="text-xs text-gray-500">{historial.length} cambios registrados</p>
                </div>
            </div>

            {/* Contenido */}
            <div className="p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-gray-400">
                        <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Error al cargar historial</p>
                    </div>
                ) : historial.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">Sin historial de cambios</p>
                        <p className="text-xs mt-1">Los cambios de estado aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {historial.map((item, index) => (
                            <HistorialItem
                                key={item.id_historial}
                                item={item}
                                isFirst={index === 0}
                                isLast={index === historial.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
