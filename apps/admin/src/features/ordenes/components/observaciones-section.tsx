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
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
    Bold,
    Check,
    Edit2,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Loader2,
    MessageSquareText,
    Minus,
    Undo2,
    Redo2,
    Underline as UnderlineIcon,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUpdateObservacionesCierre } from '../hooks/use-ordenes';

/* ── Estilos CSS para el editor TipTap y HTML renderizado ── */
const EDITOR_STYLES = `
  .obs-editor .tiptap { min-height: 220px; padding: 12px 16px; outline: none; font-size: 0.875rem; line-height: 1.625; color: #374151; }
  .obs-editor .tiptap p { margin: 0 0 0.5rem; }
  .obs-editor .tiptap p:last-child { margin-bottom: 0; }
  .obs-editor .tiptap h2 { font-size: 1.125rem; font-weight: 700; color: #111827; margin: 1rem 0 0.5rem; }
  .obs-editor .tiptap h3 { font-size: 1rem; font-weight: 600; color: #1f2937; margin: 0.75rem 0 0.375rem; }
  .obs-editor .tiptap ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
  .obs-editor .tiptap ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
  .obs-editor .tiptap li { margin: 0.125rem 0; }
  .obs-editor .tiptap hr { border: none; border-top: 2px solid #e5e7eb; margin: 1rem 0; }
  .obs-editor .tiptap strong { font-weight: 700; color: #111827; }
  .obs-editor .tiptap u { text-decoration: underline; }

  .obs-observaciones { font-size: 0.875rem; line-height: 1.625; color: #374151; }
  .obs-observaciones p { margin: 0 0 0.5rem; }
  .obs-observaciones p:last-child { margin-bottom: 0; }
  .obs-observaciones h2 { font-size: 1.125rem; font-weight: 700; color: #111827; margin: 1rem 0 0.5rem; }
  .obs-observaciones h3 { font-size: 1rem; font-weight: 600; color: #1f2937; margin: 0.75rem 0 0.375rem; }
  .obs-observaciones ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
  .obs-observaciones ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
  .obs-observaciones li { margin: 0.125rem 0; }
  .obs-observaciones hr { border: none; border-top: 2px solid #e5e7eb; margin: 1rem 0; }
  .obs-observaciones strong { font-weight: 700; color: #111827; }
  .obs-observaciones u { text-decoration: underline; }
`;

interface ObservacionesCierreSectionProps {
    orden: Orden;
    onUpdate?: () => void;
}

/**
 * Toolbar minimalista para el editor de observaciones.
 * Solo: Negrita, Cursiva, Subrayado, H2, H3, Listas, Separador, Undo/Redo.
 */
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
    if (!editor) return null;

    const btnClass = (active: boolean) =>
        `p-1.5 rounded-md transition-all ${
            active
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`;

    return (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
            {/* Texto */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={btnClass(editor.isActive('bold'))}
                title="Negrita (Ctrl+B)"
            >
                <Bold className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={btnClass(editor.isActive('italic'))}
                title="Cursiva (Ctrl+I)"
            >
                <Italic className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={!editor.can().chain().focus().toggleUnderline().run()}
                className={btnClass(editor.isActive('underline'))}
                title="Subrayado (Ctrl+U)"
            >
                <UnderlineIcon className="h-4 w-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            {/* Títulos */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={btnClass(editor.isActive('heading', { level: 2 }))}
                title="Título 2"
            >
                <Heading2 className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={btnClass(editor.isActive('heading', { level: 3 }))}
                title="Título 3"
            >
                <Heading3 className="h-4 w-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            {/* Listas */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={btnClass(editor.isActive('bulletList'))}
                title="Lista con viñetas"
            >
                <List className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={btnClass(editor.isActive('orderedList'))}
                title="Lista numerada"
            >
                <ListOrdered className="h-4 w-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            {/* Separador */}
            <button
                type="button"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className={btnClass(false)}
                title="Línea separadora"
            >
                <Minus className="h-4 w-4" />
            </button>

            <div className="flex-1" />

            {/* Undo / Redo */}
            <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className={btnClass(false)}
                title="Deshacer"
            >
                <Undo2 className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className={btnClass(false)}
                title="Rehacer"
            >
                <Redo2 className="h-4 w-4" />
            </button>
        </div>
    );
}

/**
 * Convierte texto plano antiguo a HTML seguro para TipTap.
 * Detecta líneas que empiezan con URGENTE: o IMPORTANTE: y las envuelve en <strong>.
 */
function plainTextToHtml(text: string): string {
    if (!text) return '';
    // Si ya contiene tags HTML, devolver tal cual
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    // Convertir saltos de línea a <p> y <br>
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Detectar patrones URGENTE: e IMPORTANTE: y envolver en negrita
    const withBold = escaped.replace(
        /^(URGENTE:|IMPORTANTE:)/gm,
        '<strong>$1</strong>'
    );
    // Envolver en párrafos
    const paragraphs = withBold
        .split('\n\n')
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    return paragraphs || '<p></p>';
}

/**
 * Sección de Observaciones de Cierre - EDITABLE con Editor Rico
 * Usa endpoint ATÓMICO dedicado: PATCH /ordenes/:id/observaciones-cierre
 */
export function ObservacionesCierreSection({ orden, onUpdate }: ObservacionesCierreSectionProps) {
    const updateObservaciones = useUpdateObservacionesCierre();
    const [isEditing, setIsEditing] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
        ],
        content: plainTextToHtml(orden.observaciones_cierre || ''),
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[220px] px-4 py-3 text-sm text-gray-700',
            },
        },
    });

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
                        <EditorToolbar editor={editor} />
                        <EditorContent editor={editor} />
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
