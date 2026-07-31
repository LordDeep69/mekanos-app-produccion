/**
 * MEKANOS S.A.S - Portal Admin
 * Editor de Texto Rico (TipTap) - Componente Compartido
 *
 * WYSIWYG: Negrita, Cursiva, Subrayado, Títulos, Listas, Separador, Undo/Redo.
 * Almacena HTML en la BD; el PDF renderiza el HTML automáticamente via Puppeteer.
 *
 * Reutilizado por:
 * - observaciones-section.tsx (Observaciones de Cierre)
 * - actividad-card-advanced.tsx (campos correctivos: problema, fallas, diagnóstico, etc.)
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
    Bold,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Minus,
    Redo2,
    Undo2,
    Underline as UnderlineIcon,
} from 'lucide-react';

/* ── Estilos CSS para el editor TipTap y HTML renderizado ── */
export const EDITOR_STYLES = `
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

/**
 * Convierte texto plano antiguo a HTML seguro para TipTap.
 * Detecta líneas que empiezan con URGENTE: o IMPORTANTE: y las envuelve en <strong>.
 */
export function plainTextToHtml(text: string): string {
    if (!text) return '';
    // Si ya contiene tags HTML, devolver tal cual
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    // Convertir saltos de línea a <p> y <br>, escapando HTML peligroso
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
 * Detecta si un string contiene tags HTML
 */
export function isHtml(text: string): boolean {
    return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Toolbar minimalista para el editor rico.
 * Solo: Negrita, Cursiva, Subrayado, H2, H3, Listas, Separador, Undo/Redo.
 */
export function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
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
 * Hook que crea una instancia de editor TipTap configurada para texto enriquecido.
 * Reutilizable en múltiples componentes.
 */
export function useRichEditor(initialContent: string) {
    return useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[220px] px-4 py-3 text-sm text-gray-700',
            },
        },
    });
}

/**
 * Exporta EditorContent para conveniencia
 */
export { EditorContent };
