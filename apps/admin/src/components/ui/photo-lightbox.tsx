/**
 * MEKANOS S.A.S - Portal Admin
 * PhotoLightbox: Visor Profesional y Ultra-Moderno de Imágenes
 * 
 * Características:
 * - Atajos de teclado completos (Flechas, Esc, +, -, 0, R, L, F, T)
 * - Zoom focal inteligente (50% a 500%) con rueda de ratón (wheel) y botones
 * - Paneo fluido (Drag & Pan) con ratón o táctil al ampliar
 * - Rotación 90° y volteo horizontal (Flip)
 * - Tira de miniaturas inferior (Filmstrip) interactiva con auto-scroll
 * - Modo Pantalla Completa nativo (Fullscreen API)
 * - Descarga directa de imagen en alta resolución
 * - Apertura en nueva pestaña y copia de URL
 * - Leyenda con fase (Antes/Durante/Después), fecha, actividad y descripción
 * - Estética Glassmorphism con backdrop-blur y animaciones fluidas
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  FlipHorizontal,
  Info,
  Keyboard,
  Link2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface LightboxImageItem {
  id: string | number;
  url: string;
  title?: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  date?: string;
  actividad?: string;
  equipo?: string;
  metadata?: Record<string, any>;
  downloadUrl?: string;
}

export interface PhotoLightboxProps {
  isOpen: boolean;
  images: LightboxImageItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
  onEdit?: (image: LightboxImageItem) => void;
  onDelete?: (image: LightboxImageItem) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

/**
 * Limpia y normaliza una URL de imagen para visualización directa en navegador.
 * Remueve flags que obligan a descargar (como fl_attachment de Cloudinary o ?download=true).
 */
export function cleanDirectImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  // Quitar flags de descarga forzada de Cloudinary (ej: fl_attachment, fl_attachment:filename)
  clean = clean.replace(/\/fl_attachment:[^/]+\//g, '/').replace(/\/fl_attachment\//g, '/');
  // Quitar query params de forzar descarga
  clean = clean.replace(/([?&])download=true&?/gi, '$1').replace(/[?&]$/, '');
  clean = clean.replace(/response-content-disposition=attachment/gi, 'response-content-disposition=inline');
  return clean;
}

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ANTES: { bg: 'bg-blue-500/90', text: 'text-white', border: 'border-blue-400' },
  DURANTE: { bg: 'bg-amber-500/90', text: 'text-white', border: 'border-amber-400' },
  DESPUES: { bg: 'bg-emerald-500/90', text: 'text-white', border: 'border-emerald-400' },
  'DESPUÉS': { bg: 'bg-emerald-500/90', text: 'text-white', border: 'border-emerald-400' },
  GENERAL: { bg: 'bg-purple-500/90', text: 'text-white', border: 'border-purple-400' },
  INSUMOS: { bg: 'bg-orange-500/90', text: 'text-white', border: 'border-orange-400' },
  MEDICION: { bg: 'bg-indigo-500/90', text: 'text-white', border: 'border-indigo-400' },
};

export function PhotoLightbox({
  isOpen,
  images,
  currentIndex: initialIndex,
  onClose,
  onNavigate,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const filmstripRef = useRef<HTMLDivElement | null>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement | null>(null);

  // Sincronizar índice inicial si cambia externamente
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const currentImage = images[index];

  // Restablecer transformaciones (zoom, pan, rotación)
  const resetTransform = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
  }, []);

  // Navegar a otra foto
  const goToIndex = useCallback((newIdx: number) => {
    if (images.length === 0) return;
    const bounded = (newIdx + images.length) % images.length;
    setIndex(bounded);
    resetTransform();
    setIsLoadingImage(true);
    onNavigate?.(bounded);
  }, [images.length, onNavigate, resetTransform]);

  const goNext = useCallback(() => goToIndex(index + 1), [goToIndex, index]);
  const goPrev = useCallback(() => goToIndex(index - 1), [goToIndex, index]);

  // Controles de Zoom
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(5, Number((prev + 0.25).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(0.5, Number((prev - 0.25).toFixed(2)));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Rotaciones
  const handleRotateCw = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  const handleRotateCcw = useCallback(() => {
    setRotation((r) => (r - 90 + 360) % 360);
  }, []);

  const handleFlipH = useCallback(() => {
    setFlipH((f) => !f);
  }, []);

  // Doble clic para alternar zoom (Fit <-> 2x)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  }, [zoom]);

  // Zoom con rueda de ratón (Wheel)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom((prev) => {
      const next = Math.min(5, Math.max(0.5, Number((prev + delta).toFixed(2))));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Paneo (Mouse Drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // IMPORTANTE: Solo permitir drag con el botón izquierdo principal (button === 0)
    // El botón derecho (button === 2) pasa directamente para el menú contextual nativo del navegador
    if (e.button !== 0) return;
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan.x, pan.y, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [dragStart.x, dragStart.y, isDragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Preparar URL directa visualizable para la etiqueta <img> (convierte base64 a ObjectURL si es necesario)
  const [displayUrl, setDisplayUrl] = useState<string>('');

  useEffect(() => {
    if (!currentImage?.url) {
      setDisplayUrl('');
      return;
    }

    const rawUrl = currentImage.url;

    if (rawUrl.startsWith('data:')) {
      try {
        const arr = rawUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const objectUrl = URL.createObjectURL(blob);
        setDisplayUrl(objectUrl);
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch {
        setDisplayUrl(rawUrl);
      }
    } else {
      setDisplayUrl(cleanDirectImageUrl(rawUrl));
    }
  }, [currentImage?.url]);

  // Pantalla Completa
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      // Ignorar restricciones del navegador si las hay
    }
  }, []);

  // Abrir imagen directamente en una nueva pestaña (SIN forzar descarga)
  const handleOpenNewTab = useCallback(() => {
    if (!currentImage?.url) return;
    const url = currentImage.url;

    if (url.startsWith('data:')) {
      try {
        const arr = url.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          toast.error('La ventana emergente fue bloqueada por el navegador');
        }
        return;
      } catch (e) {
        console.error('Error al abrir imagen base64:', e);
      }
    }

    const cleanUrl = cleanDirectImageUrl(url);
    const win = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      toast.error('La ventana emergente fue bloqueada por el navegador');
    }
  }, [currentImage]);

  // Descargar imagen
  const handleDownload = useCallback(async () => {
    if (!currentImage?.url) return;
    try {
      toast.info('Descargando imagen...');
      const cleanUrl = cleanDirectImageUrl(currentImage.url);
      const response = await fetch(cleanUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = cleanUrl.split('.').pop()?.split('?')[0] || 'jpg';
      a.download = `mekanos-foto-${currentImage.id || Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Imagen descargada exitosamente');
    } catch {
      window.open(cleanDirectImageUrl(currentImage.url), '_blank');
    }
  }, [currentImage]);

  // Copiar enlace directo de la imagen
  const handleCopyLink = useCallback(() => {
    if (!currentImage?.url) return;
    const cleanUrl = cleanDirectImageUrl(currentImage.url);
    navigator.clipboard.writeText(cleanUrl);
    toast.success('Enlace directo de la imagen copiado al portapapeles');
  }, [currentImage]);

  // Copiar imagen directamente al portapapeles (igual que 'Copiar Imagen' nativo)
  const handleCopyImage = useCallback(async () => {
    if (!currentImage?.url) return;
    try {
      toast.info('Copiando imagen al portapapeles...');
      let blob: Blob;
      if (currentImage.url.startsWith('data:')) {
        const arr = currentImage.url.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const cleanUrl = cleanDirectImageUrl(currentImage.url);
        const res = await fetch(cleanUrl);
        blob = await res.blob();
      }

      if (blob.type === 'image/png') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } else {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = currentImage.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (pngBlob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        }
      }
      toast.success('Imagen copiada al portapapeles');
    } catch {
      const cleanUrl = cleanDirectImageUrl(currentImage.url);
      navigator.clipboard.writeText(cleanUrl);
      toast.success('Enlace de la imagen copiado al portapapeles');
    }
  }, [currentImage]);

  // Auto-scroll del filmstrip para que la miniatura activa sea visible
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [index]);

  // Atajos de teclado globales
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar interceptar si se está escribiendo en un input
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          resetTransform();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleRotateCw();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handleRotateCcw();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setShowThumbnails((prev) => !prev);
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          handleOpenNewTab();
          break;
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleCopyImage();
          }
          break;
        case 'd':
        case 'D':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleDownload();
          }
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowDetails((prev) => !prev);
          break;
        case 'h':
        case 'H':
        case '?':
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
        case 'Home':
          e.preventDefault();
          goToIndex(0);
          break;
        case 'End':
          e.preventDefault();
          goToIndex(images.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    goNext,
    goPrev,
    goToIndex,
    handleCopyImage,
    handleDownload,
    handleOpenNewTab,
    handleRotateCcw,
    handleRotateCw,
    handleZoomIn,
    handleZoomOut,
    images.length,
    onClose,
    resetTransform,
    toggleFullscreen,
  ]);

  // Sincronizar estado al salir de fullscreen con Esc del navegador
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!isOpen || !currentImage) return null;

  const badgeStyle = currentImage.badge
    ? BADGE_COLORS[currentImage.badge.toUpperCase()] || {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: 'border-blue-400',
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none text-white overflow-hidden animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. BARRA SUPERIOR FLOTANTE (TOOLBAR)                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <header className="relative z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Izquierda: Contador y Título */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>
              {index + 1} / {images.length}
            </span>
          </div>

          {currentImage.badge && badgeStyle && (
            <span
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm',
                badgeStyle.bg,
                badgeStyle.text,
                badgeStyle.border
              )}
            >
              {currentImage.badge}
            </span>
          )}

          {currentImage.title && (
            <span className="hidden md:inline-block text-sm font-semibold text-white/90 truncate max-w-[280px]">
              {currentImage.title}
            </span>
          )}
        </div>

        {/* Centro: Herramientas de Zoom, Rotación y Transformación */}
        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-xl px-2 py-1 rounded-2xl border border-white/15 shadow-2xl">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-2 hover:bg-white/15 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            title="Alejar (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            onClick={resetTransform}
            className="px-2.5 py-1 hover:bg-white/15 rounded-xl text-xs font-mono font-bold transition-all min-w-[52px] text-center"
            title="Restablecer tamaño (0)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="p-2 hover:bg-white/15 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            title="Acercar (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-1" />

          <button
            onClick={handleRotateCw}
            className="p-2 hover:bg-white/15 rounded-xl transition-all"
            title="Rotar 90° horario (R)"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <button
            onClick={handleFlipH}
            className={cn(
              'p-2 hover:bg-white/15 rounded-xl transition-all',
              flipH && 'bg-blue-600/40 text-blue-300'
            )}
            title="Voltear horizontal"
          >
            <FlipHorizontal className="h-4 w-4" />
          </button>

          <button
            onClick={resetTransform}
            className="p-2 hover:bg-white/15 rounded-xl transition-all text-white/70 hover:text-white"
            title="Reiniciar vista"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Derecha: Acciones secundarias y Cerrar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className={cn(
              'p-2 hover:bg-white/15 rounded-xl transition-all text-white/80',
              showHelp && 'bg-white/20 text-white'
            )}
            title="Atajos de teclado (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowThumbnails((prev) => !prev)}
            className={cn(
              'p-2 hover:bg-white/15 rounded-xl transition-all text-white/80',
              showThumbnails && 'bg-white/20 text-white'
            )}
            title="Alternar tira de miniaturas (T)"
          >
            <Layers className="h-4 w-4" />
          </button>

          <button
            onClick={handleOpenNewTab}
            className="p-2 hover:bg-white/15 rounded-xl transition-all text-white/80 hover:text-white"
            title="Abrir imagen en nueva pestaña (O)"
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          <button
            onClick={handleCopyImage}
            className="p-2 hover:bg-white/15 rounded-xl transition-all text-white/80 hover:text-white"
            title="Copiar imagen al portapapeles (C)"
          >
            <Copy className="h-4 w-4" />
          </button>

          <button
            onClick={handleCopyLink}
            className="p-2 hover:bg-white/15 rounded-xl transition-all text-white/80 hover:text-white"
            title="Copiar enlace directo"
          >
            <Link2 className="h-4 w-4" />
          </button>

          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/15 rounded-xl transition-all text-white/80 hover:text-white"
            title="Descargar imagen (D)"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/15 rounded-xl transition-all text-white/80 hover:text-white"
            title="Pantalla completa (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          <div className="w-px h-5 bg-white/20 mx-1" />

          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(currentImage)}
              className="p-2 bg-blue-600/80 hover:bg-blue-600 rounded-xl transition-all text-white shadow-sm"
              title="Editar descripción"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(currentImage)}
              className="p-2 bg-red-600/80 hover:bg-red-600 rounded-xl transition-all text-white shadow-sm"
              title="Eliminar foto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 bg-white/15 hover:bg-red-600/90 rounded-xl transition-all text-white ml-1"
            title="Cerrar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. ÁREA CENTRAL DEL VISOR DE IMAGEN                                    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          'relative flex-1 flex items-center justify-center overflow-hidden',
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Botón Foto Anterior */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3.5 bg-black/60 hover:bg-blue-600/80 backdrop-blur-md rounded-full text-white border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-2xl"
            title="Foto anterior (←)"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}

        {/* Indicador de Carga */}
        {isLoadingImage && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Imagen con Transformación Dinámica */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
            transformOrigin: 'center center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl || currentImage?.url}
            alt={currentImage?.description || currentImage?.title || 'Foto'}
            className="max-h-[82vh] max-w-[92vw] object-contain drop-shadow-2xl rounded-sm pointer-events-auto select-none"
            onLoad={() => setIsLoadingImage(false)}
            draggable={false}
          />
        </div>

        {/* Botón Foto Siguiente */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3.5 bg-black/60 hover:bg-blue-600/80 backdrop-blur-md rounded-full text-white border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-2xl"
            title="Foto siguiente (→)"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}

        {/* Ayuda de Atajos de Teclado (Overlay flotante) */}
        {showHelp && (
          <div
            className="absolute top-4 right-4 z-40 bg-neutral-900/95 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl text-xs max-w-xs space-y-2 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold flex items-center gap-1.5 text-blue-400">
                <Keyboard className="h-4 w-4" /> Atajos de Teclado
              </span>
              <button
                onClick={() => setShowHelp(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-white/80 font-mono">
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">←</kbd> / <kbd className="px-1.5 py-0.5 bg-white/10 rounded">→</kbd> Anterior / Siguiente</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">+</kbd> / <kbd className="px-1.5 py-0.5 bg-white/10 rounded">-</kbd> Zoom In / Out</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">R</kbd> Rotar 90° horario</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">L</kbd> Rotar antihorario</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">O</kbd> Abrir en pestaña</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">C</kbd> Copiar imagen</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">D</kbd> Descargar foto</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">0</kbd> Restablecer zoom</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">F</kbd> Pantalla completa</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">T</kbd> Ver / Ocultar tirilla</div>
              <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd> Salir del visor</div>
            </div>
            <p className="text-[10px] text-white/50 pt-1 border-t border-white/10">
              💡 Tip: Click derecho sobre la foto permite &apos;Copiar imagen&apos; y &apos;Abrir en nueva pestaña&apos; nativamente.
            </p>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. PANEL DE DETALLES Y METADATA                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showDetails && (
        <footer className="relative z-30 px-6 py-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px] space-y-0.5">
            {currentImage.actividad && (
              <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                <span>📋 Actividad:</span>
                <span className="text-white font-bold">{currentImage.actividad}</span>
              </p>
            )}

            {currentImage.description && (
              <p className="text-sm font-medium text-white/90 leading-tight">
                {currentImage.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-[11px] text-white/60">
              {currentImage.date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-white/50" />
                  {new Date(currentImage.date).toLocaleString('es-CO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              )}

              {currentImage.equipo && (
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-white/80">
                  ⚙️ {currentImage.equipo}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowDetails(false)}
            className="text-white/40 hover:text-white/80 text-[11px] flex items-center gap-1"
            title="Ocultar leyenda"
          >
            <Info className="h-3.5 w-3.5" />
            <span>Ocultar datos</span>
          </button>
        </footer>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. TIRA DE MINIATURAS INFERIOR (FILMSTRIP SCRUBBER)                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showThumbnails && images.length > 1 && (
        <div
          ref={filmstripRef}
          className="relative z-30 px-4 py-2.5 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          {images.map((img, idx) => {
            const isActive = idx === index;
            const subBadge = img.badge ? BADGE_COLORS[img.badge.toUpperCase()] : null;
            return (
              <button
                key={`${img.id}-${idx}`}
                ref={isActive ? activeThumbnailRef : null}
                onClick={() => goToIndex(idx)}
                className={cn(
                  'relative h-16 w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 group focus:outline-none',
                  isActive
                    ? 'border-blue-400 ring-2 ring-blue-500/50 scale-105 shadow-xl'
                    : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/60'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Miniatura ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-white drop-shadow bg-black/60 px-1 rounded">
                  {idx + 1}
                </span>

                {subBadge && (
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 px-1 rounded text-[8px] font-bold uppercase',
                      subBadge.bg,
                      subBadge.text
                    )}
                  >
                    {img.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
