/**
 * MEKANOS S.A.S - Portal Admin
 * Sección de Horarios de Servicio EDITABLES (Hora Entrada / Hora Salida)
 * 
 * Muestra y permite editar fecha_inicio_real y fecha_fin_real de una orden.
 * Usa endpoint ATÓMICO: PATCH /ordenes/:id/horarios-servicio
 * Permite edición incluso en órdenes COMPLETADAS (diseñado para Portal Admin).
 * 
 * Naturaleza de los campos:
 * - fecha_inicio_real: DateTime completo (fecha + hora de entrada del técnico al sitio)
 * - fecha_fin_real: DateTime completo (fecha + hora de salida del técnico del sitio)
 * - duracion_minutos: Int calculado automáticamente por el backend
 */

'use client';

import type { Orden } from '@/types/ordenes';
import {
    Check,
    Clock,
    Edit2,
    Loader2,
    LogIn,
    LogOut,
    Timer,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUpdateHorariosServicio } from '../hooks/use-ordenes';

interface HorariosServicioSectionProps {
    orden: Orden;
}

/**
 * Formatea un DateTime ISO a fecha legible en español
 */
function formatFechaHora(isoStr?: string | null): string {
    if (!isoStr) return '-';
    try {
        return new Date(isoStr).toLocaleString('es-CO', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return 'Fecha inválida';
    }
}

/**
 * Convierte un DateTime ISO a formato datetime-local para input HTML
 * Ejemplo: "2026-02-07T08:00:00.000Z" → "2026-02-07T03:00" (ajustado a zona local)
 */
function toDatetimeLocal(isoStr?: string | null): string {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        // Ajustar a zona local del navegador
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    } catch {
        return '';
    }
}

/**
 * Formatea duración en minutos a texto legible
 */
function formatDuracion(minutos?: number | null): string {
    if (minutos == null) return '-';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas === 0) return `${mins} min`;
    if (mins === 0) return `${horas}h`;
    return `${horas}h ${mins}min`;
}

/**
 * Calcula duración entre dos fechas ISO
 */
function calcularDuracionPreview(inicio?: string, fin?: string): string {
    if (!inicio || !fin) return '-';
    try {
        const d1 = new Date(inicio);
        const d2 = new Date(fin);
        const diffMs = d2.getTime() - d1.getTime();
        if (diffMs <= 0) return 'Inválida';
        const minutos = Math.round(diffMs / 60000);
        return formatDuracion(minutos);
    } catch {
        return '-';
    }
}

export function HorariosServicioSection({ orden }: HorariosServicioSectionProps) {
    const updateHorarios = useUpdateHorariosServicio();
    const [isEditing, setIsEditing] = useState(false);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Sincronizar cuando cambie la orden
    useEffect(() => {
        setFechaInicio(toDatetimeLocal(orden.fecha_inicio_real));
        setFechaFin(toDatetimeLocal(orden.fecha_fin_real));
    }, [orden.fecha_inicio_real, orden.fecha_fin_real]);

    // No mostrar si no hay datos de servicio realizado
    const tieneHorarios = orden.fecha_inicio_real || orden.fecha_fin_real;

    // Estado bloqueado (APROBADA/CANCELADA)
    const estadoCodigo = orden.estados_orden?.codigo_estado || '';
    const esBloqueado = ['APROBADA', 'CANCELADA'].includes(estadoCodigo);

    // Calcular duración existente
    const duracionActual = (() => {
        if (!orden.fecha_inicio_real || !orden.fecha_fin_real) return null;
        const d1 = new Date(orden.fecha_inicio_real);
        const d2 = new Date(orden.fecha_fin_real);
        const diffMs = d2.getTime() - d1.getTime();
        return Math.round(diffMs / 60000);
    })();

    const handleGuardar = async () => {
        if (updateHorarios.isPending) return;

        // Construir payload solo con campos modificados
        const data: { fecha_inicio_real?: string; fecha_fin_real?: string } = {};

        if (fechaInicio) {
            data.fecha_inicio_real = new Date(fechaInicio).toISOString();
        }
        if (fechaFin) {
            data.fecha_fin_real = new Date(fechaFin).toISOString();
        }

        if (!data.fecha_inicio_real && !data.fecha_fin_real) return;

        try {
            await updateHorarios.mutateAsync({
                id: orden.id_orden_servicio,
                data,
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error al guardar horarios:', error);
        }
    };

    const handleCancelar = () => {
        setIsEditing(false);
        setFechaInicio(toDatetimeLocal(orden.fecha_inicio_real));
        setFechaFin(toDatetimeLocal(orden.fecha_fin_real));
    };

    // Preview de duración mientras edita
    const duracionPreview = isEditing
        ? calcularDuracionPreview(
            fechaInicio ? new Date(fechaInicio).toISOString() : undefined,
            fechaFin ? new Date(fechaFin).toISOString() : undefined,
        )
        : null;

    // Si no tiene horarios y no está en un estado que los tendría, no mostrar
    if (!tieneHorarios && !['EN_PROCESO', 'COMPLETADA'].includes(estadoCodigo)) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                        <Clock className="h-4 w-4 text-white" />
                    </div>
                    Horarios del Servicio
                </h4>
                {!isEditing && !esBloqueado && tieneHorarios && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all"
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar
                    </button>
                )}
            </div>

            {/* Contenido */}
            <div className="p-4">
                {isEditing ? (
                    /* ═══════ MODO EDICIÓN ═══════ */
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Hora de Entrada */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                                    <LogIn className="h-3.5 w-3.5 text-green-600" />
                                    Hora de Entrada
                                </label>
                                <input
                                    type="datetime-local"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>

                            {/* Hora de Salida */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                                    <LogOut className="h-3.5 w-3.5 text-red-600" />
                                    Hora de Salida
                                </label>
                                <input
                                    type="datetime-local"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Preview de duración */}
                        {duracionPreview && duracionPreview !== '-' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                                <Timer className="h-4 w-4 text-indigo-600" />
                                <span className="text-sm font-medium text-indigo-700">
                                    Duración estimada: <strong>{duracionPreview}</strong>
                                </span>
                                {duracionPreview === 'Inválida' && (
                                    <span className="text-xs text-red-500 font-bold ml-2">
                                        La salida debe ser posterior a la entrada
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={handleCancelar}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                            >
                                <X className="h-4 w-4" />
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardar}
                                disabled={updateHorarios.isPending || duracionPreview === 'Inválida'}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50"
                            >
                                {updateHorarios.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Guardar Horarios
                            </button>
                        </div>
                    </div>
                ) : tieneHorarios ? (
                    /* ═══════ MODO LECTURA CON DATOS ═══════ */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Hora Entrada */}
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex-shrink-0 w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <LogIn className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-green-600 uppercase tracking-wide font-bold">Hora de Entrada</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatFechaHora(orden.fecha_inicio_real)}
                                </p>
                            </div>
                        </div>

                        {/* Hora Salida */}
                        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex-shrink-0 w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <LogOut className="h-4 w-4 text-red-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-red-600 uppercase tracking-wide font-bold">Hora de Salida</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatFechaHora(orden.fecha_fin_real)}
                                </p>
                            </div>
                        </div>

                        {/* Duración */}
                        <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="flex-shrink-0 w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <Timer className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-indigo-600 uppercase tracking-wide font-bold">Duración</p>
                                <p className="text-sm font-bold text-indigo-900">
                                    {formatDuracion(duracionActual)}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ═══════ SIN DATOS ═══════ */
                    <div className="text-center py-6 text-gray-400">
                        <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">Sin horarios registrados</p>
                        <p className="text-xs mt-1">Los horarios se registran cuando el técnico finaliza el servicio desde la App Móvil</p>
                    </div>
                )}
            </div>
        </div>
    );
}
