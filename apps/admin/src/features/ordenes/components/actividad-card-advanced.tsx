/**
 * MEKANOS S.A.S - Portal Admin
 * Tarjeta de Actividad Avanzada con Estados B/M/C/NA
 * 
 * Permite cambiar el estado de cada actividad del checklist
 * similar a la funcionalidad de la app móvil.
 *
 * ✅ FIX 23-JUL-2026: Items correctivos (problema, fallas, diagnóstico, etc.) ahora
 * usan editor TipTap WYSIWYG en lugar de textarea plano, replicando el patrón de
 * ObservacionesCierreSection. Los saltos de línea y formato (negrita, listas, etc.)
 * se preservan tanto en edición como en el PDF final (que renderiza HTML).
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
import {
    EDITOR_STYLES,
    EditorToolbar,
    EditorContent,
    useRichEditor,
    plainTextToHtml,
    isHtml,
} from './rich-text-editor';

interface Actividad {
    id_actividad_ejecutada: number;
    descripcion_manual?: string;
    sistema?: string;
    estado?: string;
    observaciones?: string;
    ejecutada?: boolean;
    fecha_ejecucion?: string;
    // ✅ FIX 30-ABR-2026: Soporte multi-equipo para fotos
    id_orden_equipo?: number;
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

/**
 * ✅ FIX 23-JUL-2026: Items correctivos editables con editor rico.
 * Lista de descripciones de actividad (catalogo_actividades.descripcion_actividad)
 * que corresponden a campos narrativos correctivos. Para estos, se usa el editor
 * TipTap en lugar de textarea plano.
 *
 * Debe coincidir con los textos usados por pdf.service.ts (mapaDescripcionCampo).
 *
 * ✅ FIX 20-AGO-2026: El editor rico ahora aplica a TODAS las actividades
 * narrativas de cualquier tipo de servicio (preventivo y correctivo), no solo
 * a esta lista. Esta lista se conserva como referencia documentaria del
 * comportamiento original para campos correctivos.
 */
const DESCRIPCIONES_CORRECTIVO_RICO = new Set([
    'DESCRIPCIÓN DEL PROBLEMA REPORTADO',
    'PROBLEMA REPORTADO',
    'FALLAS OBSERVADAS',
    'SÍNTOMAS OBSERVADOS',
    'DIAGNÓSTICO',
    'DIAGNOSTICO',
    'DIAGNÓSTICO Y CAUSA RAÍZ',
    'TRABAJOS REALIZADOS',
    'TRABAJOS PENDIENTES',
    'RECOMENDACIONES',
]);

/**
 * ✅ FIX 20-AGO-2026: Prefijos de observación ESTRUCTURADA que guarda la app
 * móvil en sus inputs especiales (selectores de nivel, SI/NO, horómetro, etc.).
 * Si se edita con HTML, la app móvil deja de reconocer el valor → NO usar
 * editor rico en esas actividades.
 */
const PREFIJOS_MOVIL_ESTRUCTURADOS = [
    'NIVEL: ',
    'ACEITE: ',
    'BATERIA: ',
    'ELECTROLITOS: ',
    'HORAS: ',
    'TEMP: ',
    'RESPUESTA: ',
    'SISTEMAS: ',
    'ESTADO_INICIAL: ',
    'ESTADO_FINAL: ',
];

function observacionTienePrefijoEstructurado(observacion: string): boolean {
    const upper = (observacion || '').toUpperCase();
    return PREFIJOS_MOVIL_ESTRUCTURADOS.some(p => upper.startsWith(p));
}

/**
 * ✅ FIX 20-AGO-2026: Por DESCRIPCIÓN detecta si la actividad usa un input
 * estructurado en la app móvil (aunque aún no tenga valor guardado).
 * Replica _getTipoActividadEspecial de ejecucion_screen.dart para los tipos
 * que guardan valores con prefijo (selectores/números de la app móvil).
 */
function descripcionEsInputEstructurado(descripcion: string): boolean {
    const desc = descripcion.toUpperCase();
    if (desc.includes('(SI/NO)') || desc.includes('(S/N)')) return true;
    if ((desc.includes('NIVEL DE COMBUSTIBLE') || desc.includes('NIVEL COMBUSTIBLE')) && !desc.includes('TANQUE')) return true;
    if (desc.includes('NIVEL DE ACEITE') || desc.includes('NIVEL ACEITE')) return true;
    if (desc.includes('HOROMETRO') || desc.includes('HORÁMETRO') || desc.includes('HORAS DE TRABAJO') || desc.includes('LECTURA DE HORAS')) return true;
    if (desc.includes('ELECTROLITOS')) return true;
    if (desc.includes('CARGA DE BATERIA') && !desc.includes('CARGADOR') && !desc.includes('SISTEMA DE CARGA')) return true;
    if (desc.includes('TEMPERATURA') || desc.includes('TEMP.')) return true;
    // Correctivo estructurados (excluidos intencionalmente del editor rico
    // desde el commit 56b0d5f — son selectores/listas, no narrativa libre)
    if (desc.includes('ESTADO INICIAL DEL EQUIPO') || desc.includes('ESTADO FINAL DEL EQUIPO')) return true;
    if (desc.includes('SISTEMAS AFECTADOS')) return true;
    if (desc.includes('REPUESTOS UTILIZADOS') || desc.includes('MATERIALES E INSUMOS')) return true;
    return false;
}

/**
 * ✅ FIX 20-AGO-2026: ¿La observación de esta actividad es un valor
 * estructurado de la app móvil?
 */
function usaObservacionEstructurada(actividad: Actividad): boolean {
    const desc = actividad.catalogo_actividades?.descripcion_actividad ||
        actividad.descripcion_manual || '';
    if (descripcionEsInputEstructurado(desc)) return true;
    return observacionTienePrefijoEstructurado(actividad.observaciones || '');
}

/**
 * ✅ FIX 20-AGO-2026: Función anterior (borrada).
 * El criterio de editor rico ahora es el opuesto: usaObservacionEstructurada().
 */

/**
 * ✅ La app móvil guarda los campos con prefijos como "PROBLEMA: ", "FALLAS: ",
 * "DIAGNOSTICO: ", "TRABAJOS: ", etc. El editor solo edita el contenido DESPUÉS del
 * prefijo; el prefijo se preserva al guardar para que el backend/PDF lo procese.
 *
 * Si no hay prefijo, se edita el texto completo.
 *
 * Manejo robusto:
 * - Texto plano (clásico): separar prefijo cortando el string.
 * - Texto HTML (guardado por editor): el prefijo siempre es texto plano en el inicio,
 *   antes del primer tag. Si existe, se separa; si no, se edita el HTML completo.
 */
const PREFIJOS_CORRECTIVO = [
    'PROBLEMA: ',
    'SINTOMAS: ',
    'FALLAS: ',
    'DIAGNOSTICO: ',
    'TRABAJOS: ',
    'PENDIENTES: ',
    'RECOMENDACIONES: ',
    'REPUESTOS: ',
    'MATERIALES: ',
    'ESTADO_INICIAL: ',
    'ESTADO_FINAL: ',
    'SISTEMAS: ',
];

interface PrefijoResultado {
    prefijo: string;
    contenido: string;
}

function separarPrefijo(texto: string): PrefijoResultado {
    if (!texto) return { prefijo: '', contenido: '' };

    // Caso texto plano: cortar prefijo directamente
    if (!isHtml(texto)) {
        const upper = texto.toUpperCase();
        for (const p of PREFIJOS_CORRECTIVO) {
            if (upper.startsWith(p)) {
                return {
                    prefijo: texto.substring(0, p.length),
                    contenido: texto.substring(p.length),
                };
            }
        }
        return { prefijo: '', contenido: texto };
    }

    // Caso HTML: el prefijo, si existe, aparece como texto literal al inicio del HTML
    // antes del primer tag "<". Lo separamos extrayendo el segmento inicial.
    const primerMenor = texto.indexOf('<');
    if (primerMenor > 0) {
        const head = texto.substring(0, primerMenor);
        const upperHead = head.toUpperCase();
        for (const p of PREFIJOS_CORRECTIVO) {
            if (upperHead.startsWith(p)) {
                return {
                    prefijo: head.substring(0, p.length),
                    contenido: texto.substring(p.length),
                };
            }
        }
    }
    return { prefijo: '', contenido: texto };
}

export function ActividadCardAdvanced({ actividad, idOrdenServicio, onUpdate }: ActividadCardAdvancedProps) {
    const updateActividad = useUpdateActividad();
    const [isExpanded, setIsExpanded] = useState(false);
    const [observaciones, setObservaciones] = useState(actividad.observaciones || '');
    const [showObservaciones, setShowObservaciones] = useState(false);

    const descripcion = actividad.catalogo_actividades?.descripcion_actividad || actividad.descripcion_manual || 'Sin descripción';
    const estadoActual = actividad.estado as EstadoActividad;
    const estadoConfig = getEstadoConfig(estadoActual);

    // ✅ FIX 23-JUL-2026: Si la actividad es un campo correctivo narrativo
    // (PROBLEMA REPORTADO / FALLAS OBSERVADAS / DIAGNÓSTICO / TRABAJOS / etc.),
    // habilitar editor TipTap en lugar de textarea plano.
    //
    // ✅ FIX 20-AGO-2026: El editor TipTap ahora también aplica a las
    // actividades narrativas de cualquier otro servicio (preventivo, A/B,
    // Bomba/Generador, etc.), no solo correctivos. Solo se mantienen con
    // textarea plano las actividades cuya observación guarda un valor
    // ESTRUCTURADO de la app móvil (NIVEL:/ACEITE:/BATERIA:/RESPUESTA:/etc.)
    // — usar HTML ahí rompería el input especial del técnico.
    const esRico = !usaObservacionEstructurada(actividad);

    // Separar prefijo ("PROBLEMA: ", etc.) del contenido a editar
    const separado = separarPrefijo(actividad.observaciones || '');

    const editor = useRichEditor(
        esRico ? plainTextToHtml(separado.contenido) : ''
    );

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
            let valorAGuardar: string;

            if (esRico && editor) {
                const html = editor.getHTML();
                const contenidoHtml = html === '<p></p>' ? '' : html;
                // Reconstruir observación final = PREFIJO + contenido
                valorAGuardar = (separado.prefijo + contenidoHtml) || null;
            } else {
                valorAGuardar = observaciones || null;
            }

            await updateActividad.mutateAsync({
                idActividad: actividad.id_actividad_ejecutada,
                data: {
                    observaciones: valorAGuardar,
                },
            });
            setShowObservaciones(false);
            onUpdate?.();
        } catch (error) {
            console.error('Error al guardar observaciones:', error);
        }
    };

    const handleCancelarEdicion = () => {
        setShowObservaciones(false);
        // Resetear estado de texto plano
        setObservaciones(actividad.observaciones || '');
        // Resetear editor rico al contenido original
        if (esRico && editor) {
            editor.commands.setContent(plainTextToHtml(separado.contenido));
        }
    };

    return (
        <div className={cn(
            "rounded-xl border-2 transition-all duration-200",
            getEstadoBgColor(estadoActual),
            isExpanded && "ring-2 ring-blue-200"
        )}>
            {/* ✅ Estilos del editor TipTap (sin sangrar; aplica a selectores globales) */}
            <style dangerouslySetInnerHTML={{ __html: EDITOR_STYLES }} />
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
                    ) : esRico && editor ? (
                        /* ✅ Editor TipTap para campos correctivos narrativos */
                        <div className="space-y-2">
                            {separado.prefijo && (
                                <div className="px-3 py-1.5 text-xs font-mono text-purple-700 bg-purple-50 rounded-md border border-purple-200">
                                    Prefijo: <strong>{separado.prefijo.trim()}</strong>
                                    <span className="ml-1 text-purple-400">(se preserva al guardar)</span>
                                </div>
                            )}
                            <div className="obs-editor border-2 border-purple-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
                                <EditorToolbar editor={editor} />
                                <EditorContent editor={editor} />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancelarEdicion}
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
                    ) : (
                        /* Textarea plano para actividades estándar (no narrativas) */
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
                                    onClick={handleCancelarEdicion}
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
                        esRico ? (
                            /* ✅ Renderizado HTML para campos correctivos narrativos */
                            <div className="bg-white/80 rounded-lg p-2 border border-purple-100">
                                {separado.prefijo && (
                                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">
                                        {separado.prefijo.trim()}
                                    </p>
                                )}
                                {separado.contenido ? (
                                    <div
                                        className="prose prose-sm max-w-none text-gray-700 leading-relaxed obs-observaciones"
                                        dangerouslySetInnerHTML={{
                                            __html: isHtml(separado.contenido)
                                                ? separado.contenido
                                                : plainTextToHtml(separado.contenido),
                                        }}
                                    />
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Sin contenido</p>
                                )}
                            </div>
                        ) : (
                            /* Texto plano para observaciones normales */
                            <div className="bg-white/80 rounded-lg p-2 border border-purple-100">
                                <p className="text-xs text-gray-600 italic">&ldquo;{actividad.observaciones}&rdquo;</p>
                            </div>
                        )
                    )}

                    {/* Galería de Fotos ANTES/DURANTE/DESPUÉS */}
                    <GaleriaActividadFotos
                        idOrdenServicio={idOrdenServicio}
                        idActividadEjecutada={actividad.id_actividad_ejecutada}
                        idOrdenEquipo={actividad.id_orden_equipo}
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
