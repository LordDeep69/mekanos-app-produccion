/**
 * MEKANOS S.A.S - Portal Admin
 * Hook reutilizable: Drag & Drop + Paste + Multi-select de imágenes
 *
 * ✅ 02-MAY-2026: Soporte para arrastrar imágenes desde el gestor de archivos,
 * pegar desde portapapeles (Ctrl+V / Cmd+V, ej. desde WhatsApp) y selección múltiple.
 *
 * El paste sólo se activa cuando el mouse está sobre la zona de drop (hover)
 * para evitar que múltiples instancias del hook procesen el mismo evento.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseImageDropPasteOptions {
    /** Callback cuando se reciben archivos válidos */
    onFiles: (files: File[]) => void;
    /** Permitir selección múltiple (default: true) */
    multiple?: boolean;
    /** Tamaño máximo por archivo en bytes (default: 10MB) */
    maxSizeBytes?: number;
    /** Mensaje de error personalizado para tipo inválido */
    onInvalidType?: (fileName: string) => void;
    /** Mensaje de error personalizado para tamaño excedido */
    onMaxSizeExceeded?: (fileName: string, size: number) => void;
    /** Desactivar el hook (ej. mientras sube) */
    disabled?: boolean;
}

export function useImageDropPaste({
    onFiles,
    multiple = true,
    maxSizeBytes = 10 * 1024 * 1024,
    onInvalidType,
    onMaxSizeExceeded,
    disabled = false,
}: UseImageDropPasteOptions) {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);
    const dropZoneRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isHoveredRef = useRef(false);

    /** Filtra y valida archivos de imagen */
    const processFiles = useCallback(
        (rawFiles: FileList | File[]) => {
            if (disabled) return;
            const files = Array.from(rawFiles);
            const valid: File[] = [];

            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    onInvalidType?.(file.name);
                    continue;
                }
                if (file.size > maxSizeBytes) {
                    onMaxSizeExceeded?.(file.name, file.size);
                    continue;
                }
                valid.push(file);
                if (!multiple) break; // solo el primero
            }

            if (valid.length > 0) {
                onFiles(valid);
            }
        },
        [disabled, multiple, maxSizeBytes, onFiles, onInvalidType, onMaxSizeExceeded],
    );

    // ─── HANDLERS (definidos antes del callback ref) ─────────────────────
    const handleDragEnter = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current++;
            if (e.dataTransfer?.types.includes('Files')) {
                setIsDragging(true);
            }
        },
        [],
    );

    const handleDragLeave = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current--;
            if (dragCounterRef.current <= 0) {
                dragCounterRef.current = 0;
                setIsDragging(false);
            }
        },
        [],
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current = 0;
            setIsDragging(false);
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                processFiles(e.dataTransfer.files);
            }
        },
        [processFiles],
    );

    const handleMouseEnter = useCallback(() => { isHoveredRef.current = true; }, []);
    const handleMouseLeave = useCallback(() => { isHoveredRef.current = false; }, []);

    // Callback ref para detectar cuando el elemento se monta/desmonta y registrar listeners
    const setDropZoneRef = useCallback((node: HTMLDivElement | null) => {
        // Remover listeners del nodo anterior si existe
        const prevNode = dropZoneRef.current;
        if (prevNode && !disabled) {
            prevNode.removeEventListener('dragenter', handleDragEnter);
            prevNode.removeEventListener('dragleave', handleDragLeave);
            prevNode.removeEventListener('dragover', handleDragOver);
            prevNode.removeEventListener('drop', handleDrop);
            prevNode.removeEventListener('mouseenter', handleMouseEnter);
            prevNode.removeEventListener('mouseleave', handleMouseLeave);
        }

        dropZoneRef.current = node;

        // Agregar listeners al nuevo nodo si existe y no está deshabilitado
        if (node && !disabled) {
            node.addEventListener('dragenter', handleDragEnter);
            node.addEventListener('dragleave', handleDragLeave);
            node.addEventListener('dragover', handleDragOver);
            node.addEventListener('drop', handleDrop);
            node.addEventListener('mouseenter', handleMouseEnter);
            node.addEventListener('mouseleave', handleMouseLeave);
        }
    }, [disabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleMouseEnter, handleMouseLeave]);

    // ─── PASTE (sólo se procesa si el mouse está sobre la zona) ──────────
    const handlePaste = useCallback(
        (e: ClipboardEvent) => {
            if (disabled) return;
            // Solo procesar si el mouse está sobre ESTA zona o si es un modal (z-50)
            const zone = dropZoneRef.current;
            if (!zone) return;
            const isModal = zone.closest('.fixed.inset-0') !== null;
            if (!isHoveredRef.current && !isModal) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            const imageFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) imageFiles.push(file);
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault();
                e.stopImmediatePropagation();
                processFiles(imageFiles);
            }
        },
        [disabled, processFiles],
    );

    // ─── REGISTRAR LISTENERS A NIVEL DOCUMENT ───────────────────────────
    // 🔒 PREVENIR navegación del browser al arrastrar archivos desde fuera.
    // PREVENIR SIEMPRE default en dragover/drop a nivel document — práctica estándar
    // para drag-drop file uploads.
    useEffect(() => {
        const preventDocumentDefault = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        document.addEventListener('dragover', preventDocumentDefault);
        document.addEventListener('drop', preventDocumentDefault);

        return () => {
            document.removeEventListener('dragover', preventDocumentDefault);
            document.removeEventListener('drop', preventDocumentDefault);
        };
    }, []);

    // Listener de paste a nivel document (siempre activo)
    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, [handlePaste]);

    /** Abre el selector de archivos nativo */
    const openFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    /** onChange del <input type="file"> */
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                processFiles(e.target.files);
            }
            // Reset para poder re-seleccionar el mismo archivo
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        [processFiles],
    );

    return {
        /** Callback ref para el contenedor que recibe drag & drop (usar ref={setDropZoneRef}) */
        setDropZoneRef,
        /** Ref para el <input type="file" hidden */
        fileInputRef,
        /** true mientras se arrastra un archivo sobre la zona */
        isDragging,
        /** Abre el diálogo nativo de archivos */
        openFilePicker,
        /** Handler para el onChange del input file */
        handleInputChange,
        /** Atributos para el input hidden (spread en el JSX) */
        inputProps: {
            type: 'file' as const,
            ref: fileInputRef,
            onChange: handleInputChange,
            accept: 'image/*',
            multiple,
            className: 'hidden' as const,
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDAD: Convertir File a base64 DataURL
// ═══════════════════════════════════════════════════════════════════════════════

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
