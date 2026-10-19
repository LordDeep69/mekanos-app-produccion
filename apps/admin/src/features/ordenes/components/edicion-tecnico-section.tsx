/**
 * MEKANOS S.A.S - Portal Admin
 * Autorización de Edición Técnica por Orden (19-OCT-2026)
 *
 * Permite a un administrador habilitar o revocar, para UNA orden COMPLETADA,
 * la capacidad del técnico asignado de corregir y resubir el servicio desde
 * la app móvil.
 *
 * Fuente de verdad: backend (finalizacion-orden.service.ts). Este panel solo
 * gestiona la decisión administrativa; no habilita edición en otros estados.
 */

'use client';

import type { Orden } from '@/types/ordenes';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    History,
    Loader2,
    Lock,
    ShieldCheck,
    Unlock,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { useUpdateEdicionTecnico } from '../hooks/use-ordenes';

interface EdicionTecnicoSectionProps {
    orden: Orden;
}

export function EdicionTecnicoSection({ orden }: EdicionTecnicoSectionProps) {
    const [motivo, setMotivo] = useState('');
    const [confirmAction, setConfirmAction] = useState<'enable' | 'revoke' | null>(null);
    const updateEdicion = useUpdateEdicionTecnico();

    const codigoEstado = orden.estados_orden?.codigo_estado?.toUpperCase() || '';
    const habilitada = orden.edicion_tecnico_habilitada === true;

    // Regla de negocio: solo órdenes COMPLETADAS son elegibles.
    if (codigoEstado !== 'COMPLETADA') {
        return null;
    }

    const fechaDecision = orden.edicion_tecnico_fecha_autorizacion
        ? new Date(orden.edicion_tecnico_fecha_autorizacion).toLocaleString('es-CO')
        : null;

    const ejecutar = (habilitar: boolean) => {
        updateEdicion.mutate(
            {
                id: orden.id_orden_servicio,
                data: {
                    habilitada: habilitar,
                    motivo: motivo.trim() || undefined,
                },
            },
            {
                onSettled: () => {
                    setConfirmAction(null);
                    setMotivo('');
                },
            },
        );
    };

    return (
        <div className="bg-white rounded-xl border-2 border-amber-200 shadow-sm overflow-hidden">
            {/* Encabezado */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm leading-tight">Edición del técnico</h4>
                        <p className="text-[11px] text-amber-50/90">
                            Autorización puntual para corregir esta orden COMPLETADA
                        </p>
                    </div>
                </div>

                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        habilitada
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-white/15 text-white border-white/30'
                    }`}
                >
                    {habilitada ? (
                        <>
                            <Unlock className="h-3.5 w-3.5" />
                            HABILITADA
                        </>
                    ) : (
                        <>
                            <Lock className="h-3.5 w-3.5" />
                            BLOQUEADA
                        </>
                    )}
                </span>
            </div>

            <div className="p-4 space-y-4">
                {/* Explicación */}
                <p className="text-sm text-gray-600 leading-relaxed">
                    {habilitada ? (
                        <>
                            El técnico asignado puede abrir esta orden en la app, corregir
                            actividades, mediciones, evidencias u observaciones, y resubirla.
                            La app detecta este permiso automáticamente (sync cada 5 min o al
                            abrir la orden) y lo revoca en cuanto se desactive aquí.
                        </>
                    ) : (
                        <>
                            La orden está completada y bloqueada para el técnico. Si olvidó
                            registrar algo, puedes autorizar una corrección puntual. Solo aplica
                            a esta orden y no cambia el estado a APROBADA ni a EN_PROCESO.
                        </>
                    )}
                </p>

                {/* Estado actual / metadatos */}
                {habilitada && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                            <CheckCircle2 className="h-4 w-4" />
                            Edición autorizada
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-emerald-800">
                            <span className="inline-flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Por: {orden.edicion_tecnico_autorizada_por ? `usuario #${orden.edicion_tecnico_autorizada_por}` : 'Administrador'}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {fechaDecision || 'Fecha no registrada'}
                            </span>
                        </div>
                        {orden.edicion_tecnico_motivo && (
                            <p className="text-xs text-emerald-800 italic flex items-start gap-1.5">
                                <History className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                Motivo: {orden.edicion_tecnico_motivo}
                            </p>
                        )}
                    </div>
                )}

                {/* Confirmación */}
                {confirmAction ? (
                    <div
                        className={`rounded-lg border-2 p-3 space-y-3 ${
                            confirmAction === 'enable'
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-red-300 bg-red-50'
                        }`}
                    >
                        <div className="flex items-start gap-2">
                            <AlertTriangle
                                className={`h-5 w-5 flex-shrink-0 ${
                                    confirmAction === 'enable' ? 'text-amber-600' : 'text-red-600'
                                }`}
                            />
                            <p
                                className={`text-sm font-medium ${
                                    confirmAction === 'enable' ? 'text-amber-900' : 'text-red-900'
                                }`}
                            >
                                {confirmAction === 'enable'
                                    ? 'El técnico podrá modificar y resubir esta orden completada. Cada cambio quedará auditado en el historial.'
                                    : 'El técnico perderá el acceso de edición. Si está trabajando en la app, el botón de resubida desaparecerá y el backend rechazará cualquier envío.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                disabled={updateEdicion.isPending}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                            >
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => ejecutar(confirmAction === 'enable')}
                                disabled={updateEdicion.isPending}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg transition-all disabled:opacity-50 ${
                                    confirmAction === 'enable'
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {updateEdicion.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : confirmAction === 'enable' ? (
                                    <Unlock className="h-3.5 w-3.5" />
                                ) : (
                                    <Lock className="h-3.5 w-3.5" />
                                )}
                                {confirmAction === 'enable' ? 'Confirmar habilitación' : 'Confirmar revocación'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label
                                htmlFor="motivo-edicion-tecnico"
                                className="block text-xs font-bold text-gray-700 mb-1.5"
                            >
                                {habilitada
                                    ? 'Motivo de la revocación (opcional)'
                                    : 'Motivo de la autorización (opcional)'}
                            </label>
                            <textarea
                                id="motivo-edicion-tecnico"
                                value={motivo}
                                onChange={(event) => setMotivo(event.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder={
                                    habilitada
                                        ? 'Ej.: La corrección ya fue validada; se bloquea nuevamente la orden.'
                                        : 'Ej.: El técnico olvidó registrar la medición de presión y la evidencia final.'
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-y"
                            />
                            <p className="mt-1 text-right text-[11px] text-gray-400">
                                {motivo.length}/500
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                            {habilitada ? (
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction('revoke')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-all"
                                >
                                    <Lock className="h-4 w-4" />
                                    Revocar edición
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction('enable')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-sm"
                                >
                                    <Unlock className="h-4 w-4" />
                                    Habilitar edición
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <p className="text-[11px] text-gray-400 flex items-start gap-1.5">
                    <History className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    Cada habilitación y revocación se registra en el historial de estados con el
                    usuario, la fecha y el motivo.
                </p>
            </div>
        </div>
    );
}
