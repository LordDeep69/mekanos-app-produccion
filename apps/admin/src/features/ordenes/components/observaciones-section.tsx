/**
 * MEKANOS S.A.S - Portal Admin
 * Sección de Observaciones de Cierre - Editor Rico Mínimo
 *
 * Editor WYSIWYG con TipTap: Negrita, Cursiva, Subrayado, Títulos, Listas.
 * Almacena HTML en la BD (columna text sin límite).
 * El PDF renderiza el HTML automáticamente via Puppeteer.
 */

'use client';

import type { Orden } from '@/types/ordenes';
import {
    EDITOR_STYLES,
    EditorToolbar,
    EditorContent,
    useRichEditor,
    plainTextToHtml,
} from './rich-text-editor';
import {
    Check,
    Edit2,
    FileText,
    Loader2,
    MessageSquareText,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUpdateObservacionesCierre } from '../hooks/use-ordenes';
import { useTiposServicio } from '@/features/catalogos';
import { toast } from 'sonner';

interface ObservacionesCierreSectionProps {
    orden: Orden;
    onUpdate?: () => void;
}

/**
 * Sección de Observaciones de Cierre - EDITABLE con Editor Rico
 * Usa endpoint ATÓMICO dedicado: PATCH /ordenes/:id/observaciones-cierre
 * Permite insertar opcionalmente la plantilla base del tipo de servicio sin sobreescribir texto existente.
 */
export function ObservacionesCierreSection({ orden, onUpdate }: ObservacionesCierreSectionProps) {
    const updateObservaciones = useUpdateObservacionesCierre();
    const [isEditing, setIsEditing] = useState(false);

    // Consulta de tipos de servicio para tener acceso a plantillas
    const { data: tiposServicioResp } = useTiposServicio({ activo: true, limit: 100 });
    const listaTipos = tiposServicioResp?.data || [];

    const idTipoActual = orden.tipos_servicio?.id_tipo_servicio || (orden as any).id_tipo_servicio;
    const tipoActualCatalog = listaTipos.find(t => t.id_tipo_servicio === idTipoActual);
    const plantillaActual = orden.tipos_servicio?.plantilla_observacion || tipoActualCatalog?.plantilla_observacion || null;
    const nombreTipoActual = orden.tipos_servicio?.nombre_tipo || tipoActualCatalog?.nombre_tipo || 'Servicio';

    const editor = useRichEditor(plainTextToHtml(orden.observaciones_cierre || ''));

    // Sincronizar cuando cambie la orden (fuera del editor)
    useEffect(() => {
        if (editor && !isEditing) {
            const newContent = plainTextToHtml(orden.observaciones_cierre || '');
            const currentContent = editor.getHTML();
            if (currentContent !== newContent) {
                editor.commands.setContent(newContent);
            }
        }
    }, [orden.observaciones_cierre, editor, isEditing]);

    const handleInsertarPlantilla = (plantillaHtml: string) => {
        if (!editor || !plantillaHtml) return;
        const isEmpty = editor.getText().trim() === '';

        if (isEmpty) {
            // Reemplaza el párrafo vacío preservando el historial de deshacer/rehacer (Undo/Redo)
            editor.chain().focus().selectAll().insertContent(plantillaHtml).run();
            toast.success('Plantilla insertada');
        } else {
            // Anexa al final del texto existente sin texto residual, separadores innecesarios ni cabeceras extrañas
            editor
                .chain()
                .focus()
                .setTextSelection(editor.state.doc.content.size)
                .insertContent(`<p></p>${plantillaHtml}`)
                .run();
            toast.success('Plantilla anexada al texto existente');
        }
    };

    const handleGuardar = async () => {
        if (!editor || updateObservaciones.isPending) return;

        const html = editor.getHTML();
        // No guardar el párrafo vacío por defecto de TipTap
        const content = html === '<p></p>' ? '' : html;

        try {
            await updateObservaciones.mutateAsync({
                id: orden.id_orden_servicio,
                observaciones_cierre: content,
            });
            setIsEditing(false);
            onUpdate?.();
        } catch (error) {
            console.error('Error al guardar observaciones:', error);
        }
    };

    const handleCancelar = () => {
        setIsEditing(false);
        editor?.commands.setContent(plainTextToHtml(orden.observaciones_cierre || ''));
    };

    const observaciones = orden.observaciones_cierre || '';

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: EDITOR_STYLES }} />
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
                    <div className="obs-editor space-y-3 border-2 border-green-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
                        {/* Barra de plantilla de servicio opcional */}
                        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-b border-emerald-100 p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 font-bold text-emerald-800">
                                    <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                    Plantilla de Servicio:
                                </span>
                                {plantillaActual ? (
                                    <button
                                        type="button"
                                        onClick={() => handleInsertarPlantilla(plantillaActual)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                        title="Inserta la plantilla base configurada para este tipo de servicio"
                                    >
                                        <FileText className="h-3 w-3" />
                                        Insertar plantilla de "{nombreTipoActual}"
                                    </button>
                                ) : (
                                    <span className="text-gray-500 italic text-[11px]">
                                        "{nombreTipoActual}" no tiene plantilla configurada
                                    </span>
                                )}
                            </div>
                        </div>

                        {editor && (
                            <>
                                <EditorToolbar editor={editor} />
                                <EditorContent editor={editor} />
                            </>
                        )}
                        <div className="flex gap-2 justify-end px-4 pb-3">
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
                            <div
                                className="prose prose-sm max-w-none text-gray-700 leading-relaxed obs-observaciones"
                                dangerouslySetInnerHTML={{ __html: observaciones }}
                            />
                        ) : (
                            <div className="text-center py-6 text-gray-400">
                                <MessageSquareText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">Sin observaciones de cierre</p>
                                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-green-600 hover:text-green-700 text-xs font-bold underline"
                                    >
                                        Agregar observación
                                    </button>
                                    {plantillaActual && (
                                        <>
                                            <span className="text-gray-300">•</span>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(true);
                                                    setTimeout(() => {
                                                        handleInsertarPlantilla(plantillaActual);
                                                    }, 60);
                                                }}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                                            >
                                                <FileText className="h-3 w-3 text-emerald-600" />
                                                Iniciar con plantilla de {nombreTipoActual}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
