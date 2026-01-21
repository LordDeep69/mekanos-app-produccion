/**
 * MEKANOS S.A.S - Portal Admin
 * Tarjeta de Actividad Avanzada con Estados B/M/C/NA
 * 
 * Permite cambiar el estado de cada actividad del checklist
 * similar a la funcionalidad de la app móvil.
 */

'use client';

import { cn } from '@/lib/utils';
import {
    Check,
    ChevronDown,
    ChevronUp,
    Loader2,
    MessageSquare,
    X
} from 'lucide-react';
import { useState } from 'react';
import type { EstadoActividad } from '../api/ordenes.service';
import { useUpdateActividad } from '../hooks/use-ordenes';
import { GaleriaActividadFotos } from './galeria-actividad-fotos';

interface Actividad {
    id_actividad_ejecutada: number;
    descripcion_manual?: string;
    sistema?: string;
    estado?: string;
    observaciones?: string;
    ejecutada?: boolean;
    fecha_ejecucion?: string;
    catalogo_actividades?: {
        descripcion_actividad?: string;
        codigo_actividad?: string;
    };
}

interface ActividadCardAdvancedProps {
    actividad: Actividad;
    idOrdenServicio: number;
    onUpdate?: () => void;
}

const ESTADOS_CONFIG = [
    { value: 'B', label: 'Bueno', short: 'B', color: 'bg-green-500 hover:bg-green-600 text-white', border: 'border-green-500' },
    { value: 'M', label: 'Malo', short: 'M', color: 'bg-red-500 hover:bg-red-600 text-white', border: 'border-red-500' },
    { value: 'C', label: 'Crítico', short: 'C', color: 'bg-orange-500 hover:bg-orange-600 text-white', border: 'border-orange-500' },
    { value: 'R', label: 'Regular', short: 'R', color: 'bg-yellow-500 hover:bg-yellow-600 text-white', border: 'border-yellow-500' },
    { value: null, label: 'N/A', short: 'N/A', color: 'bg-gray-400 hover:bg-gray-500 text-white', border: 'border-gray-400' },
] as const;

function getEstadoConfig(estado?: string | null) {
    return ESTADOS_CONFIG.find(e => e.value === estado) || ESTADOS_CONFIG[4]; // Default N/A
}

function getEstadoBgColor(estado?: string | null) {
    switch (estado) {
        case 'B': return 'bg-green-50 border-green-200';
        case 'M': return 'bg-red-50 border-red-200';
        case 'C': return 'bg-orange-50 border-orange-200';
        case 'R': return 'bg-yellow-50 border-yellow-200';
        default: return 'bg-gray-50 border-gray-200';
    }
}

export function ActividadCardAdvanced({ actividad, idOrdenServicio, onUpdate }: ActividadCardAdvancedProps) {
    const updateActividad = useUpdateActividad();
    const [isExpanded, setIsExpanded] = useState(false);
    const [observaciones, setObservaciones] = useState(actividad.observaciones || '');
    const [showObservaciones, setShowObservaciones] = useState(false);

    const descripcion = actividad.catalogo_actividades?.descripcion_actividad || actividad.descripcion_manual || 'Sin descripción';
    const estadoActual = actividad.estado as EstadoActividad;
    const estadoConfig = getEstadoConfig(estadoActual);

    const handleEstadoChange = async (nuevoEstado: EstadoActividad) => {
        if (updateActividad.isPending) return;

        try {
            await updateActividad.mutateAsync({
                idActividad: actividad.id_actividad_ejecutada,
                data: {
                    estado: nuevoEstado,
                    ejecutada: nuevoEstado !== null,
                },
            });
            onUpdate?.();
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    const handleGuardarObservaciones = async () => {
        if (updateActividad.isPending) return;

        try {
            await updateActividad.mutateAsync({
                idActividad: actividad.id_actividad_ejecutada,
                data: {
                    observaciones: observaciones || undefined,
                },
            });
            setShowObservaciones(false);
            onUpdate?.();
        } catch (error) {
            console.error('Error al guardar observaciones:', error);
        }
    };

    return (
        <div className={cn(
            "rounded-xl border-2 transition-all duration-200",
            getEstadoBgColor(estadoActual),
            isExpanded && "ring-2 ring-blue-200"
        )}>
            {/* Header */}
            <div
                className="p-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-3">
                    {/* Indicador de Estado */}
                    <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shadow-sm",
                        estadoConfig.color
                    )}>
                        {estadoActual ? estadoActual : 'N/A'}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight">
                            {descripcion}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {actividad.sistema && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">
                                    {actividad.sistema}
                                </span>
                            )}
                            {actividad.observaciones && (
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <MessageSquare className="h-2.5 w-2.5" />
                                    Nota
                                </span>
                            )}
                            {actividad.fecha_ejecucion && (
                                <span className="text-[10px] text-gray-400">
                                    {new Date(actividad.fecha_ejecucion).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Chevron */}
                    <div className="flex-shrink-0 text-gray-400">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </div>
            </div>

            {/* Panel Expandido */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-200/50 pt-3">
                    {/* Botones de Estado */}
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Cambiar Estado
                        </p>
                        <div className="flex gap-2">
                            {ESTADOS_CONFIG.map((e) => (
                                <button
                                    key={e.short}
                                    onClick={() => handleEstadoChange(e.value as EstadoActividad)}
                                    disabled={updateActividad.isPending}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg font-bold text-xs transition-all border-2",
                                        estadoActual === e.value
                                            ? `${e.color} ${e.border} ring-2 ring-offset-1 ring-blue-400`
                                            : `bg-white ${e.border} text-gray-700 hover:opacity-80`,
                                        updateActividad.isPending && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {updateActividad.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            {estadoActual === e.value && <Check className="h-3 w-3 inline mr-0.5" />}
                                            {e.short}
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Observaciones */}
                    {!showObservaciones ? (
                        <button
                            onClick={() => setShowObservaciones(true)}
                            className="w-full py-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {actividad.observaciones ? 'Editar Observación' : 'Agregar Observación'}
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <textarea
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                placeholder="Escribe una observación sobre esta actividad..."
                                rows={3}
                                className="w-full px-3 py-2 text-sm border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowObservaciones(false);
                                        setObservaciones(actividad.observaciones || '');
                                    }}
                                    className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center justify-center gap-1"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGuardarObservaciones}
                                    disabled={updateActividad.isPending}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    {updateActividad.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mostrar observación existente */}
                    {actividad.observaciones && !showObservaciones && (
                        <div className="bg-white/80 rounded-lg p-2 border border-purple-100">
                            <p className="text-xs text-gray-600 italic">"{actividad.observaciones}"</p>
                        </div>
                    )}

                    {/* Galería de Fotos ANTES/DURANTE/DESPUÉS */}
                    <GaleriaActividadFotos
                        idOrdenServicio={idOrdenServicio}
                        idActividadEjecutada={actividad.id_actividad_ejecutada}
                        nombreActividad={descripcion}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Resumen de estados del checklist
 */
export function ResumenEstados({ actividades }: { actividades: Actividad[] }) {
    const contadores = {
        B: actividades.filter(a => a.estado === 'B').length,
        M: actividades.filter(a => a.estado === 'M').length,
        C: actividades.filter(a => a.estado === 'C').length,
        R: actividades.filter(a => a.estado === 'R').length,
        pendientes: actividades.filter(a => !a.estado || !a.ejecutada).length,
    };

    const total = actividades.length;
    const completadas = total - contadores.pendientes;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 text-sm">Resumen del Checklist</h4>
                <span className="text-sm font-black text-blue-600">{porcentaje}%</span>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                <div
                    className="bg-blue-600 h-full transition-all duration-500"
                    style={{ width: `${porcentaje}%` }}
                />
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-lg font-black text-green-600">{contadores.B}</p>
                    <p className="text-[9px] font-bold text-green-700 uppercase">Bueno</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-lg font-black text-red-600">{contadores.M}</p>
                    <p className="text-[9px] font-bold text-red-700 uppercase">Malo</p>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-lg font-black text-orange-600">{contadores.C}</p>
                    <p className="text-[9px] font-bold text-orange-700 uppercase">Crítico</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-lg font-black text-yellow-600">{contadores.R}</p>
                    <p className="text-[9px] font-bold text-yellow-700 uppercase">Regular</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-lg font-black text-gray-600">{contadores.pendientes}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Pendiente</p>
                </div>
            </div>
        </div>
    );
}
