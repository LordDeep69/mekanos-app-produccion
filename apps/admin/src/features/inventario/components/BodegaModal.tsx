// ═══════════════════════════════════════════════════════════════════════════════
// BODEGA MODAL - CREACIÓN DE ALMACENES Y UBICACIONES LOGÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { CrearBodegaDto, useCrearBodega } from '@/features/inventario/api/inventario-motor.service';
import { cn } from '@/lib/utils';
import { Check, Loader2, Warehouse, X } from 'lucide-react';
import React, { useState } from 'react';

interface BodegaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function BodegaModal({ isOpen, onClose, onSuccess }: BodegaModalProps) {
    const [formData, setFormData] = useState<CrearBodegaDto>({
        codigo_ubicacion: '',
        zona: '',
        pasillo: '',
        estante: '',
        nivel: '',
        activo: true,
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const crearMutation = useCrearBodega();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.codigo_ubicacion.trim()) {
            setError('El código de ubicación es obligatorio');
            return;
        }
        if (!formData.zona.trim()) {
            setError('La zona o nombre de almacén es obligatorio');
            return;
        }

        try {
            setError(null);
            await crearMutation.mutateAsync({
                ...formData,
                codigo_ubicacion: formData.codigo_ubicacion.trim().toUpperCase(),
                zona: formData.zona.trim(),
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onSuccess?.();
                onClose();
            }, 1200);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al crear la bodega o ubicación');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                {/* Header Corporativo Claro */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                            <Warehouse className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Nueva Bodega / Ubicación</h2>
                            <p className="text-xs text-slate-500">Configuración de almacenes físicos y zonas de acopio</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-600" />
                            Bodega registrada con éxito
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            Código Ubicación *
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: BOD-CENTRAL, EST-A1"
                            value={formData.codigo_ubicacion}
                            onChange={(e) => setFormData({ ...formData, codigo_ubicacion: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            Zona / Almacén *
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Almacén Principal, Taller Mecánico"
                            value={formData.zona}
                            onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                Pasillo
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: P-01"
                                value={formData.pasillo || ''}
                                onChange={(e) => setFormData({ ...formData, pasillo: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                Estante
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: E-03"
                                value={formData.estante || ''}
                                onChange={(e) => setFormData({ ...formData, estante: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                Nivel
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: N-2"
                                value={formData.nivel || ''}
                                onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={crearMutation.isPending || success}
                            className={cn(
                                'px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 shadow-xs transition-colors',
                                'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                            )}
                        >
                            {crearMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Guardar Bodega
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
