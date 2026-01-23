/**
 * MEKANOS S.A.S - Portal Admin
 * Modal de Edición de Orden de Servicio
 * 
 * Permite editar: Técnico, Fecha, Prioridad, Observaciones
 */

'use client';

import { cn } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import {
    AlertTriangle,
    Calendar,
    Check,
    Clock,
    Loader2,
    Save,
    User,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTecnicosSelector } from '../hooks/use-catalogos';
import { useAsignarTecnico, useUpdateOrden } from '../hooks/use-ordenes';

interface OrdenEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    orden: Orden;
}

const PRIORIDADES = [
    { value: 'NORMAL', label: 'Normal', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 'ALTA', label: 'Alta', color: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
    { value: 'URGENTE', label: 'Urgente', color: 'bg-orange-100 text-orange-700 border-orange-400' },
    { value: 'EMERGENCIA', label: 'Emergencia', color: 'bg-red-100 text-red-700 border-red-400' },
];

export function OrdenEditModal({ isOpen, onClose, orden }: OrdenEditModalProps) {
    const { data: tecnicos = [], isLoading: isLoadingTecnicos } = useTecnicosSelector();
    const updateOrden = useUpdateOrden();
    const asignarTecnico = useAsignarTecnico();

    // Obtener ID del técnico actual desde la relación
    const tecnicoActualId = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_empleado;

    // Form state
    const [formData, setFormData] = useState({
        tecnicoId: tecnicoActualId?.toString() || '',
        fechaProgramada: orden.fecha_programada?.split('T')[0] || '',
        prioridad: orden.prioridad || 'NORMAL',
        observaciones: orden.observaciones || '',
    });

    // Reset form when orden changes
    useEffect(() => {
        const tecId = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_empleado;
        setFormData({
            tecnicoId: tecId?.toString() || '',
            fechaProgramada: orden.fecha_programada?.split('T')[0] || '',
            prioridad: orden.prioridad || 'NORMAL',
            observaciones: orden.observaciones || '',
        });
    }, [orden]);

    const handleSave = async () => {
        try {
            // 1. Actualizar campos generales de la orden
            await updateOrden.mutateAsync({
                id: orden.id_orden_servicio,
                data: {
                    fecha_programada: formData.fechaProgramada || undefined,
                    prioridad: formData.prioridad as 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA',
                    observaciones_tecnico: formData.observaciones || undefined,
                },
            });

            // 2. Si cambió el técnico, asignarlo
            const nuevoTecnicoId = formData.tecnicoId ? Number(formData.tecnicoId) : null;

            if (nuevoTecnicoId && nuevoTecnicoId !== tecnicoActualId) {
                await asignarTecnico.mutateAsync({
                    id: orden.id_orden_servicio,
                    tecnicoId: nuevoTecnicoId,
                });
            }

            onClose();
        } catch (error) {
            console.error('Error al actualizar orden:', error);
        }
    };

    const isLoading = updateOrden.isPending || asignarTecnico.isPending;
    const estadoCodigo = orden.estados_orden?.codigo_estado || '';
    const isEstadoFinal = ['APROBADA', 'CANCELADA'].includes(estadoCodigo);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                Editar Orden
                            </h2>
                            <p className="text-blue-100 text-sm mt-0.5">{orden.numero_orden}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Warning si estado final */}
                {isEstadoFinal && (
                    <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <p className="text-sm text-amber-800">
                            Esta orden está en estado <strong>{orden.estados_orden?.nombre_estado}</strong> y no puede ser editada.
                        </p>
                    </div>
                )}

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Técnico Asignado */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <User className="h-4 w-4 text-blue-600" />
                            Técnico Asignado
                        </label>
                        <select
                            value={formData.tecnicoId}
                            onChange={(e) => setFormData({ ...formData, tecnicoId: e.target.value })}
                            disabled={isEstadoFinal || isLoadingTecnicos}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">Sin asignar</option>
                            {tecnicos.map((t: any) => (
                                <option key={t.id_empleado} value={t.id_empleado}>
                                    {t.persona?.nombre_completo || t.persona?.primer_nombre} {t.persona?.primer_apellido || ''} - {t.cargo || 'Técnico'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha y Prioridad en grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fecha Programada */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                Fecha Programada
                            </label>
                            <input
                                type="date"
                                value={formData.fechaProgramada}
                                onChange={(e) => setFormData({ ...formData, fechaProgramada: e.target.value })}
                                disabled={isEstadoFinal}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Prioridad */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <Clock className="h-4 w-4 text-orange-600" />
                                Prioridad
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRIORIDADES.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => !isEstadoFinal && setFormData({ ...formData, prioridad: p.value as typeof formData.prioridad })}
                                        disabled={isEstadoFinal}
                                        className={cn(
                                            "px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all",
                                            formData.prioridad === p.value
                                                ? `${p.color} ring-2 ring-offset-1 ring-blue-500`
                                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
                                            isEstadoFinal && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {formData.prioridad === p.value && (
                                            <Check className="h-3 w-3 inline mr-1" />
                                        )}
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <AlertTriangle className="h-4 w-4 text-purple-600" />
                            Observaciones Generales
                        </label>
                        <textarea
                            rows={4}
                            value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            disabled={isEstadoFinal}
                            placeholder="Observaciones del técnico o administrador sobre esta orden..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Este campo será visible en el reporte PDF final.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-bold transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading || isEstadoFinal}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Save className="h-5 w-5" />
                        )}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
