/**
 * MEKANOS S.A.S - Portal Admin
 * Sección de Observaciones de Cierre EDITABLES
 * 
 * Permite ver y editar las observaciones de cierre del técnico.
 * NOTA: Admin puede editar TODO sin restricción de estado.
 */

'use client';

import type { Orden } from '@/types/ordenes';
import {
    Check,
    Edit2,
    Loader2,
    MessageSquareText,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUpdateObservacionesCierre } from '../hooks/use-ordenes';

interface ObservacionesCierreSectionProps {
    orden: Orden;
    onUpdate?: () => void;
}

/**
 * Sección de Observaciones de Cierre - EDITABLE
 * Usa endpoint ATÓMICO dedicado: PATCH /ordenes/:id/observaciones-cierre
 * Permite edición incluso en órdenes COMPLETADAS (diseñado para Portal Admin)
 */
export function ObservacionesCierreSection({ orden, onUpdate }: ObservacionesCierreSectionProps) {
    const updateObservaciones = useUpdateObservacionesCierre();
    const [isEditing, setIsEditing] = useState(false);
    const [observaciones, setObservaciones] = useState(orden.observaciones_cierre || '');

    // Sincronizar cuando cambie la orden
    useEffect(() => {
        setObservaciones(orden.observaciones_cierre || '');
    }, [orden.observaciones_cierre]);

    const handleGuardar = async () => {
        if (updateObservaciones.isPending) return;

        try {
            await updateObservaciones.mutateAsync({
                id: orden.id_orden_servicio,
                observaciones_cierre: observaciones || '',
            });
            setIsEditing(false);
            onUpdate?.();
        } catch (error) {
            console.error('Error al guardar observaciones:', error);
        }
    };

    const handleCancelar = () => {
        setIsEditing(false);
        setObservaciones(orden.observaciones_cierre || '');
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                        <Check className="h-4 w-4 text-white" />
                    </div>
                    Observaciones de Cierre
                </h4>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-all"
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar
                    </button>
                )}
            </div>

            {/* Contenido */}
            <div className="p-4">
                {isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Observaciones del técnico al finalizar el servicio..."
                            rows={4}
                            className="w-full px-4 py-3 text-sm border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                            autoFocus
                        />
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
                                disabled={updateObservaciones.isPending}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50"
                            >
                                {updateObservaciones.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {observaciones ? (
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {observaciones}
                            </p>
                        ) : (
                            <div className="text-center py-6 text-gray-400">
                                <MessageSquareText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">Sin observaciones de cierre</p>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="mt-2 text-green-600 hover:text-green-700 text-xs font-bold underline"
                                >
                                    Agregar observación
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
