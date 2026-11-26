'use client';

import { useImageDropPaste } from '@/hooks/use-image-drop-paste';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clipboard,
  Eraser,
  History,
  Loader2,
  Pen,
  Save,
  Star,
  Trash2,
  Upload,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNATURE DRAWING CANVAS (HTML5 Canvas nativo compartido por OS y Cotizaciones)
// ═══════════════════════════════════════════════════════════════════════════════

export function SignatureCanvas({
  canvasRef,
  hasDrawn,
  setHasDrawn,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasDrawn: boolean;
  setHasDrawn: (drawn: boolean) => void;
}) {
  const [isDrawing, setIsDrawing] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, [canvasRef]);

  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [canvasRef],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [canvasRef]);

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    },
    [getCtx, getPos],
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawing) return;
      const ctx = getCtx();
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasDrawn(true);
    },
    [isDrawing, getCtx, getPos, setHasDrawn],
  );

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawn(false);
  }, [canvasRef, setHasDrawn]);

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ height: '180px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm font-medium select-none">Dibuje su firma aquí</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={clearCanvas}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Eraser className="h-3.5 w-3.5" /> Limpiar lienzo
        </button>
        {hasDrawn && (
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Nueva firma trazada
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL GENÉRICO REUTILIZABLE DE FIRMA DIGITAL (OS + COTIZACIONES CPQ)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DigitalSignatureHistoryItem {
  id_firma_digital: number;
  firma_base64: string;
  veces_usada: number;
  es_estandar?: boolean;
  fecha_captura?: string | null;
}

export interface DigitalSignatureSaveResult {
  firma_base64?: string;
  id_firma_digital?: number;
  nombre_firmante?: string;
  cargo_firmante?: string;
}

export interface DigitalSignatureModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  roleVariant?: 'emisor' | 'cliente';
  existingSignatureDataUri?: string | null;
  showSignerFields?: boolean;
  signerSectionLabel?: string;
  initialNombre?: string;
  initialCargo?: string;
  historyItems?: DigitalSignatureHistoryItem[];
  historyLoading?: boolean;
  historyTitle?: string;
  historyEmptyText?: string;
  isSaving?: boolean;
  onSave: (result: DigitalSignatureSaveResult) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
}

export function normalizeSignatureDataUri(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (
    value.startsWith('data:image/') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }
  return `data:image/png;base64,${value}`;
}

/**
 * Recorta automáticamente el espacio blanco/transparente sobrante alrededor del trazo real
 * de una firma en un HTMLCanvasElement, dejando un padding uniforme (por defecto 6px)
 * y escalando proporcionalmente si supera dimensiones máximas razonables.
 */
export function trimSignatureCanvasToBase64(
  sourceCanvas: HTMLCanvasElement,
  options?: { padding?: number; maxWidth?: number; maxHeight?: number },
): string {
  const padding = options?.padding ?? 6;
  const maxWidth = options?.maxWidth ?? 720;
  const maxHeight = options?.maxHeight ?? 260;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || w <= 0 || h <= 0) {
    return sourceCanvas.toDataURL('image/png').split(',')[1] || '';
  }

  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = rowOffset + x * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      // Píxel con tinta real: visible (alpha > 16) y no blanco puro/casi blanco
      const isInk = a > 16 && !(r >= 242 && g >= 242 && b >= 242);
      if (isInk) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Si no se detectaron píxeles de tinta, retornar el canvas original sin romper
  if (maxX < minX || maxY < minY) {
    return sourceCanvas.toDataURL('image/png').split(',')[1] || '';
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  let targetCropW = cropW;
  let targetCropH = cropH;
  const maxInnerW = Math.max(1, maxWidth - padding * 2);
  const maxInnerH = Math.max(1, maxHeight - padding * 2);
  const scale = Math.min(1, maxInnerW / cropW, maxInnerH / cropH);

  if (scale < 1) {
    targetCropW = Math.max(1, Math.round(cropW * scale));
    targetCropH = Math.max(1, Math.round(cropH * scale));
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetCropW + padding * 2;
  outCanvas.height = targetCropH + padding * 2;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) {
    return sourceCanvas.toDataURL('image/png').split(',')[1] || '';
  }

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    cropW,
    cropH,
    padding,
    padding,
    targetCropW,
    targetCropH,
  );

  return outCanvas.toDataURL('image/png').split(',')[1] || '';
}

/**
 * Aplica el mismo auto-trim a una imagen de firma subida/pegada (sin afectar firmas históricas).
 */
export async function trimUploadedSignatureDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const fallbackBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const img = new window.Image();
    img.onload = () => {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth || img.width;
        tempCanvas.height = img.naturalHeight || img.height;
        const tCtx = tempCanvas.getContext('2d');
        if (!tCtx || tempCanvas.width <= 0 || tempCanvas.height <= 0) {
          resolve(fallbackBase64);
          return;
        }
        tCtx.drawImage(img, 0, 0);
        resolve(
          trimSignatureCanvasToBase64(tempCanvas, { padding: 6, maxWidth: 720, maxHeight: 260 }),
        );
      } catch {
        resolve(fallbackBase64);
      }
    };
    img.onerror = () => resolve(fallbackBase64);
    img.src = dataUrl;
  });
}

export function DigitalSignatureModal({
  open,
  onClose,
  title,
  subtitle,
  roleVariant = 'emisor',
  existingSignatureDataUri,
  showSignerFields = false,
  signerSectionLabel = 'Datos del Firmante',
  initialNombre = '',
  initialCargo = '',
  historyItems = [],
  historyLoading = false,
  historyTitle = 'Firmas estándares registradas',
  historyEmptyText = 'Sin firmas anteriores registradas.',
  isSaving = false,
  onSave,
  onRemove,
}: DigitalSignatureModalProps) {
  if (!open) return null;

  return (
    <DigitalSignatureModalInner
      key={`${title}-${existingSignatureDataUri ? 'has' : 'none'}-${initialNombre}-${initialCargo}`}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      roleVariant={roleVariant}
      existingSignatureDataUri={existingSignatureDataUri}
      showSignerFields={showSignerFields}
      signerSectionLabel={signerSectionLabel}
      initialNombre={initialNombre}
      initialCargo={initialCargo}
      historyItems={historyItems}
      historyLoading={historyLoading}
      historyTitle={historyTitle}
      historyEmptyText={historyEmptyText}
      isSaving={isSaving}
      onSave={onSave}
      onRemove={onRemove}
    />
  );
}

function DigitalSignatureModalInner({
  onClose,
  title,
  subtitle,
  roleVariant,
  existingSignatureDataUri,
  showSignerFields,
  signerSectionLabel,
  initialNombre,
  initialCargo,
  historyItems,
  historyLoading,
  historyTitle,
  historyEmptyText,
  isSaving,
  onSave,
  onRemove,
}: Omit<DigitalSignatureModalProps, 'open'>) {
  const existingUrl = normalizeSignatureDataUri(existingSignatureDataUri);
  const hasExisting = Boolean(existingUrl);

  const [mode, setMode] = useState<'keep' | 'draw' | 'upload'>(hasExisting ? 'keep' : 'draw');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [nombreFirmante, setNombreFirmante] = useState(initialNombre || '');
  const [cargoFirmante, setCargoFirmante] = useState(initialCargo || '');

  const handleImageFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = String(reader.result || '');
      const trimmedBase64 = await trimUploadedSignatureDataUrl(result);
      setPreviewBase64(trimmedBase64);
      setSelectedHistoryId(null);
    };
    reader.readAsDataURL(file);
  };

  const { setDropZoneRef, inputProps, openFilePicker, isDragging } = useImageDropPaste({
    onFiles: handleImageFiles,
    multiple: false,
    maxSizeBytes: 5 * 1024 * 1024,
    disabled: Boolean(isSaving),
  });

  const hasNewSignature =
    (mode === 'draw' && hasDrawn) || (mode === 'upload' && Boolean(previewBase64));
  const hasSignerChanges =
    Boolean(showSignerFields) &&
    (nombreFirmante.trim() !== (initialNombre || '').trim() ||
      cargoFirmante.trim() !== (initialCargo || '').trim());
  const canSave =
    !isSaving && (hasNewSignature || (hasExisting && mode === 'keep') || hasSignerChanges);

  const isEmisor = roleVariant === 'emisor';
  const HeaderIcon = isEmisor ? UserCheck : User;

  const handleConfirmSave = async () => {
    if (!canSave || isSaving) return;
    const result: DigitalSignatureSaveResult = {};

    if (mode === 'draw' && hasDrawn && canvasRef.current) {
      result.firma_base64 = trimSignatureCanvasToBase64(canvasRef.current, {
        padding: 6,
        maxWidth: 720,
        maxHeight: 260,
      });
    } else if (mode === 'upload' && previewBase64) {
      result.firma_base64 = previewBase64;
      if (selectedHistoryId) {
        result.id_firma_digital = selectedHistoryId;
      }
    }

    if (showSignerFields) {
      result.nombre_firmante = nombreFirmante.trim();
      result.cargo_firmante = cargoFirmante.trim();
    }

    await onSave(result);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            'p-4 text-white flex items-center justify-between bg-gradient-to-r',
            isEmisor ? 'from-emerald-600 to-teal-700' : 'from-slate-700 to-indigo-700',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <HeaderIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-base">{title}</p>
              <p className="text-xs text-white/85">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {showSignerFields && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-600" /> {signerSectionLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre / Representante
                  </label>
                  <input
                    type="text"
                    value={nombreFirmante}
                    onChange={(e) => setNombreFirmante(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cargo / Dependencia
                  </label>
                  <input
                    type="text"
                    value={cargoFirmante}
                    onChange={(e) => setCargoFirmante(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    placeholder="Ej: Gerente, Jefe de Compras..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selector de modo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pen className="h-3.5 w-3.5 text-primary" /> Firma Digital
              </p>
              {hasExisting && mode === 'keep' && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Conservando firma actual
                </span>
              )}
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {hasExisting && (
                <button
                  type="button"
                  onClick={() => setMode('keep')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                    mode === 'keep'
                      ? 'bg-white shadow-xs text-primary'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Firma Actual
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode('draw');
                  setSelectedHistoryId(null);
                }}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  mode === 'draw'
                    ? 'bg-white shadow-xs text-primary'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <Pen className="h-3.5 w-3.5" />
                {hasExisting ? 'Dibujar Nueva' : 'Dibujar Firma'}
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  mode === 'upload'
                    ? 'bg-white shadow-xs text-primary'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                {hasExisting ? 'Subir Nueva Imagen' : 'Subir Imagen'}
              </button>
            </div>

            {/* Modo KEEP */}
            {mode === 'keep' && hasExisting && existingUrl && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-3">
                <div className="relative h-28 w-full max-w-sm bg-white rounded-lg border border-gray-200 p-2 shadow-inner">
                  <Image
                    src={existingUrl}
                    alt="Firma actual registrada"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-between w-full max-w-sm pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Firma actual
                    conservada
                  </span>
                  <button
                    type="button"
                    onClick={() => setMode('draw')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Pen className="h-3 w-3" /> Cambiar firma
                  </button>
                </div>
              </div>
            )}

            {/* Modo DRAW */}
            {mode === 'draw' && (
              <SignatureCanvas
                canvasRef={canvasRef}
                hasDrawn={hasDrawn}
                setHasDrawn={setHasDrawn}
              />
            )}

            {/* Modo UPLOAD */}
            {mode === 'upload' && (
              <div ref={setDropZoneRef} className="space-y-3 relative">
                <input {...inputProps} />
                {isDragging && (
                  <div className="absolute inset-0 z-20 bg-emerald-50/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none rounded-xl border-2 border-dashed border-emerald-400">
                    <Upload className="h-8 w-8 text-emerald-600 animate-bounce" />
                    <p className="text-sm font-bold text-emerald-800">
                      Suelte la imagen de firma aquí
                    </p>
                  </div>
                )}

                {previewBase64 ? (
                  <div className="space-y-3">
                    <div className="relative border-2 border-emerald-200 rounded-xl overflow-hidden bg-white p-4 shadow-inner">
                      <div className="relative h-36 w-full">
                        <Image
                          src={normalizeSignatureDataUri(previewBase64) || ''}
                          alt="Vista previa de firma"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewBase64(null);
                          setSelectedHistoryId(null);
                          openFilePicker();
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" /> Cambiar imagen
                      </button>
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {selectedHistoryId
                          ? 'Firma estándar seleccionada lista para guardar'
                          : 'Imagen cargada lista para guardar'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => openFilePicker()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all',
                      isDragging
                        ? 'border-emerald-400 bg-emerald-50/50'
                        : 'border-gray-300 hover:border-primary/60 hover:bg-slate-50',
                    )}
                  >
                    <Upload className="h-9 w-9 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">
                      Clic, arrastre o pegue una imagen de firma
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (máx. 5MB)</p>
                    <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Upload className="h-3 w-3" /> Arrastrar archivo
                      </span>
                      <span className="flex items-center gap-1">
                        <Clipboard className="h-3 w-3" /> Pegar con Ctrl+V
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Galería de Firmas Estándares (reutilización en 1 clic) */}
            {(historyLoading || (historyItems && historyItems.length > 0)) && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-gray-700">{historyTitle}</p>
                  <span className="text-[10px] text-gray-400">clic en una para usarla</span>
                </div>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : historyItems && historyItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {historyItems.map((f) => {
                      const isSelected =
                        selectedHistoryId === f.id_firma_digital && mode === 'upload';
                      return (
                        <button
                          key={f.id_firma_digital}
                          type="button"
                          onClick={() => {
                            setPreviewBase64(f.firma_base64);
                            setSelectedHistoryId(f.id_firma_digital);
                            setMode('upload');
                          }}
                          className={cn(
                            'relative rounded-lg border-2 overflow-hidden bg-white transition-all hover:shadow-md text-left',
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-200'
                              : f.es_estandar
                                ? 'border-amber-400 ring-1 ring-amber-200'
                                : 'border-gray-200 hover:border-primary/50',
                          )}
                        >
                          <div className="relative h-16 w-full bg-white p-1">
                            <Image
                              src={normalizeSignatureDataUri(f.firma_base64) || ''}
                              alt="Firma estándar"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <div className="px-2 py-1 flex items-center justify-between bg-gray-50">
                            <span className="text-[9px] font-bold text-gray-600">
                              {f.veces_usada} uso{f.veces_usada !== 1 ? 's' : ''}
                            </span>
                            {f.es_estandar && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Estándar
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                    {historyEmptyText}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              Cancelar
            </button>
            {hasExisting && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={isSaving}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Quitar firma
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={!canSave || isSaving}
            className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:opacity-95 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Aplicar Firma
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
