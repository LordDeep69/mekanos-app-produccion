/**
 * MEKANOS S.A.S - Portal Admin
 * Tarjeta de Medición Avanzada con Rangos Visibles
 * 
 * Muestra el valor actual, rangos normales/críticos, y permite edición.
 */

'use client';

import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Check,
    ChevronDown,
    ChevronUp,
    Edit2,
    Gauge,
    Loader2,
    MessageSquare,
    X
} from 'lucide-react';
import { useState } from 'react';
import { useUpdateMedicion } from '../hooks/use-ordenes';
import { GaleriaActividadFotos } from './galeria-actividad-fotos';

interface Medicion {
    id_medicion: number;
    id_orden_servicio: number;
    id_actividad_ejecutada?: number | null;
    valor_numerico?: number | null;
    valor_texto?: string | null;
    unidad_medida?: string;
    fuera_de_rango?: boolean;
    nivel_alerta?: string;
    mensaje_alerta?: string;
    observaciones?: string;
    parametros_medicion?: {
        nombre_parametro?: string;
        codigo_parametro?: string;
        unidad_medida?: string;
        // Rangos normales (del backend)
        valorMinimoNormal?: number | null;
        valorMaximoNormal?: number | null;
        valor_minimo_normal?: number | null;
        valor_maximo_normal?: number | null;
        // Rangos críticos (del backend)
        valorMinimoCritico?: number | null;
        valorMaximoCritico?: number | null;
        valor_minimo_critico?: number | null;
        valor_maximo_critico?: number | null;
    };
}

interface MedicionCardAdvancedProps {
    medicion: Medicion;
    idOrdenServicio: number;
    onUpdate?: () => void;
}

function getNivelAlertaColor(nivel?: string, fueraDeRango?: boolean) {
    if (fueraDeRango || nivel === 'CRITICO') {
        return {
            bg: 'bg-red-50 border-red-200',
            badge: 'bg-red-500 text-white',
            text: 'text-red-700',
            icon: 'text-red-500'
        };
    }
    if (nivel === 'ADVERTENCIA') {
        return {
            bg: 'bg-yellow-50 border-yellow-200',
            badge: 'bg-yellow-500 text-white',
            text: 'text-yellow-700',
            icon: 'text-yellow-500'
        };
    }
    return {
        bg: 'bg-green-50 border-green-200',
        badge: 'bg-green-500 text-white',
        text: 'text-green-700',
        icon: 'text-green-500'
    };
}

function RangoVisual({
    valorActual,
    minNormal,
    maxNormal,
    minCritico,
    maxCritico,
    unidad
}: {
    valorActual?: number | null;
    minNormal?: number | null;
    maxNormal?: number | null;
    minCritico?: number | null;
    maxCritico?: number | null;
    unidad?: string;
}) {
    if (minNormal == null && maxNormal == null) {
        return <p className="text-xs text-gray-400 italic">Sin rangos definidos</p>;
    }

    const min = minCritico ?? minNormal ?? 0;
    const max = maxCritico ?? maxNormal ?? 100;
    const range = max - min || 1;

    const minNormalVal = minNormal ?? min;
    const maxNormalVal = maxNormal ?? max;
    const normalStart = ((minNormalVal - min) / range) * 100;
    const normalEnd = ((maxNormalVal - min) / range) * 100;
    const normalWidth = normalEnd - normalStart;

    const valorPos = valorActual !== null && valorActual !== undefined
        ? Math.min(100, Math.max(0, ((valorActual - min) / range) * 100))
        : null;

    return (
        <div className="space-y-2">
            {/* Barra de rango visual */}
            <div className="relative h-3 bg-gradient-to-r from-red-200 via-yellow-100 to-red-200 rounded-full overflow-hidden">
                {/* Zona normal */}
                <div
                    className="absolute h-full bg-green-400 rounded-full"
                    style={{
                        left: `${normalStart}%`,
                        width: `${normalWidth}%`
                    }}
                />
                {/* Indicador de valor actual */}
                {valorPos !== null && (
                    <div
                        className="absolute w-1 h-full bg-blue-600 rounded shadow-lg"
                        style={{ left: `${valorPos}%`, transform: 'translateX(-50%)' }}
                    />
                )}
            </div>

            {/* Leyenda de rangos */}
            <div className="flex justify-between text-[9px] font-bold text-gray-500">
                <span>{minCritico ?? minNormal ?? '?'} {unidad}</span>
                <span className="text-green-600">
                    Normal: {minNormal ?? '?'} - {maxNormal ?? '?'} {unidad}
                </span>
                <span>{maxCritico ?? maxNormal ?? '?'} {unidad}</span>
            </div>
        </div>
    );
}

export function MedicionCardAdvanced({ medicion, idOrdenServicio, onUpdate }: MedicionCardAdvancedProps) {
    const updateMedicion = useUpdateMedicion();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [valorNumerico, setValorNumerico] = useState<string>(
        medicion.valor_numerico?.toString() ?? ''
    );
    const [observaciones, setObservaciones] = useState(medicion.observaciones || '');

    const parametro = medicion.parametros_medicion;
    const nombreParametro = parametro?.nombre_parametro || 'Parámetro desconocido';
    const unidad = medicion.unidad_medida || parametro?.unidad_medida || '';
    const colors = getNivelAlertaColor(medicion.nivel_alerta, medicion.fuera_de_rango);

    const handleGuardar = async () => {
        if (updateMedicion.isPending) return;

        try {
            await updateMedicion.mutateAsync({
                idMedicion: medicion.id_medicion,
                data: {
                    valorNumerico: valorNumerico ? parseFloat(valorNumerico) : undefined,
                    observaciones: observaciones || undefined,
                },
            });
            setIsEditing(false);
            onUpdate?.();
        } catch (error) {
            console.error('Error al guardar medición:', error);
        }
    };

    const handleCancelar = () => {
        setIsEditing(false);
        setValorNumerico(medicion.valor_numerico?.toString() ?? '');
        setObservaciones(medicion.observaciones || '');
    };

    return (
        <div className={cn(
            "rounded-xl border-2 transition-all duration-200",
            colors.bg,
            isExpanded && "ring-2 ring-blue-200"
        )}>
            {/* Header */}
            <div
                className="p-3 cursor-pointer"
                onClick={() => !isEditing && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-3">
                    {/* Icono y Estado */}
                    <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                        colors.badge
                    )}>
                        <Gauge className="h-6 w-6" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
                            {nombreParametro}
                        </p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <p className={cn("text-2xl font-black", colors.text)}>
                                {medicion.valor_numerico ?? medicion.valor_texto ?? '-'}
                            </p>
                            <span className="text-sm font-bold text-gray-400">{unidad}</span>
                        </div>

                        {/* Alerta inline */}
                        {medicion.fuera_de_rango && (
                            <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className={cn("h-3 w-3", colors.icon)} />
                                <span className={cn("text-[10px] font-bold", colors.text)}>
                                    {medicion.mensaje_alerta || 'Fuera de rango'}
                                </span>
                            </div>
                        )}
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
                    {/* Rango Visual */}
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Rango de Operación
                        </p>
                        <RangoVisual
                            valorActual={medicion.valor_numerico}
                            minNormal={parametro?.valorMinimoNormal ?? parametro?.valor_minimo_normal}
                            maxNormal={parametro?.valorMaximoNormal ?? parametro?.valor_maximo_normal}
                            minCritico={parametro?.valorMinimoCritico ?? parametro?.valor_minimo_critico}
                            maxCritico={parametro?.valorMaximoCritico ?? parametro?.valor_maximo_critico}
                            unidad={unidad}
                        />
                    </div>

                    {/* Modo Edición */}
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                            Editar Valor
                        </button>
                    ) : (
                        <div className="space-y-3 bg-white/80 p-3 rounded-lg border border-blue-100">
                            {/* Input de Valor */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Nuevo Valor ({unidad})
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={valorNumerico}
                                    onChange={(e) => setValorNumerico(e.target.value)}
                                    placeholder="Ingrese valor..."
                                    className="w-full mt-1 px-3 py-2 text-lg font-bold border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Observaciones
                                </label>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Notas sobre esta medición..."
                                    rows={2}
                                    className="w-full mt-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                            </div>

                            {/* Botones */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancelar}
                                    className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center justify-center gap-1"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGuardar}
                                    disabled={updateMedicion.isPending}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    {updateMedicion.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Observación existente */}
                    {medicion.observaciones && !isEditing && (
                        <div className="bg-white/80 rounded-lg p-2 border border-purple-100 flex items-start gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-600 italic">"{medicion.observaciones}"</p>
                        </div>
                    )}

                    {/* Galería de fotos de la medición */}
                    <div className="mt-3">
                        <GaleriaActividadFotos
                            idOrdenServicio={idOrdenServicio}
                            nombreActividad={nombreParametro}
                            filtroDescripcion={nombreParametro}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Resumen de mediciones
 */
export function ResumenMediciones({ mediciones }: { mediciones: Medicion[] }) {
    const contadores = {
        ok: mediciones.filter(m => !m.fuera_de_rango && m.nivel_alerta !== 'CRITICO' && m.nivel_alerta !== 'ADVERTENCIA').length,
        advertencia: mediciones.filter(m => m.nivel_alerta === 'ADVERTENCIA').length,
        critico: mediciones.filter(m => m.fuera_de_rango || m.nivel_alerta === 'CRITICO').length,
    };

    const total = mediciones.length;
    const completadas = mediciones.filter(m => m.valor_numerico !== null || m.valor_texto !== null).length;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 text-sm">Resumen de Mediciones</h4>
                <span className="text-sm font-bold text-purple-600">{completadas}/{total} registradas</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-lg font-black text-green-600">{contadores.ok}</p>
                    <p className="text-[9px] font-bold text-green-700 uppercase">Normal</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-lg font-black text-yellow-600">{contadores.advertencia}</p>
                    <p className="text-[9px] font-bold text-yellow-700 uppercase">Advertencia</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-lg font-black text-red-600">{contadores.critico}</p>
                    <p className="text-[9px] font-bold text-red-700 uppercase">Crítico</p>
                </div>
            </div>
        </div>
    );
}
