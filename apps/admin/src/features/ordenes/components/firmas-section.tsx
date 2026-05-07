/**
 * MEKANOS S.A.S - Portal Admin
 * Sección de Firmas Digitales
 * 
 * Visualización y edición de firmas de técnico y cliente con zoom modal.
 * ✅ 25-FEB-2026: Agregada funcionalidad de edición (dibujar firma / subir imagen)
 */

'use client';

import { useImageDropPaste } from '@/hooks/use-image-drop-paste';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    Clipboard,
    Clock,
    Edit,
    Eraser,
    ExternalLink,
    Loader2,
    Pen,
    Plus,
    Save,
    Upload,
    User,
    UserCheck,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUpdateFirmaOrden } from '../hooks/use-ordenes';

interface Firma {
    id_firma: number;
    id_firma_digital?: number;
    id_orden_servicio: number;
    tipo_firma: 'TECNICO' | 'CLIENTE' | 'ASESOR' | 'GERENTE' | 'OTRO';
    url_firma?: string;
    firma_base64?: string;
    nombre_firmante?: string;
    cargo_firmante?: string;
    fecha_firma?: string;
    fecha_captura?: string;
    ip_captura?: string;
}

interface FirmasSectionProps {
    firmas: Firma[];
    isLoading?: boolean;
    idOrdenServicio: number;
}

function getTipoFirmaConfig(tipo: string) {
    switch (tipo) {
        case 'TECNICO':
            return {
                label: 'Técnico',
                icon: UserCheck,
                bgGradient: 'from-blue-500 to-indigo-600',
                bgLight: 'bg-blue-50',
                borderColor: 'border-blue-200',
                textColor: 'text-blue-700'
            };
        case 'CLIENTE':
            return {
                label: 'Cliente',
                icon: User,
                bgGradient: 'from-purple-500 to-pink-600',
                bgLight: 'bg-purple-50',
                borderColor: 'border-purple-200',
                textColor: 'text-purple-700'
            };
        case 'ASESOR':
            return {
                label: 'Asesor',
                icon: User,
                bgGradient: 'from-green-500 to-emerald-600',
                bgLight: 'bg-green-50',
                borderColor: 'border-green-200',
                textColor: 'text-green-700'
            };
        default:
            return {
                label: tipo,
                icon: Pen,
                bgGradient: 'from-gray-500 to-gray-600',
                bgLight: 'bg-gray-50',
                borderColor: 'border-gray-200',
                textColor: 'text-gray-700'
            };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNATURE DRAWING CANVAS (native HTML5 Canvas - zero dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

function SignatureCanvas({ onSave, onCancel, isLoading }: {
    onSave: (base64: string) => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const getCtx = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        return ctx;
    }, []);

    const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
    }, []);

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
    }, []);

    const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const ctx = getCtx();
        if (!ctx) return;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    }, [getCtx, getPos]);

    const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const ctx = getCtx();
        if (!ctx) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasDrawn(true);
    }, [isDrawing, getCtx, getPos]);

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
    }, []);

    const handleSave = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        onSave(base64);
    }, [hasDrawn, onSave]);

    return (
        <div className="space-y-3">
            <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
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
                        <p className="text-gray-300 text-sm font-medium">Dibuje su firma aqui</p>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                    <Eraser className="h-4 w-4" /> Limpiar
                </button>
                <div className="flex-1" />
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasDrawn || isLoading}
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Firma
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT SIGNATURE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function EditFirmaModal({ tipo, idOrdenServicio, firma, onClose }: {
    tipo: 'TECNICO' | 'CLIENTE';
    idOrdenServicio: number;
    firma?: Firma | null;
    onClose: () => void;
}) {
    const config = getTipoFirmaConfig(tipo);
    const Icon = config.icon;
    const updateFirma = useUpdateFirmaOrden();
    const [mode, setMode] = useState<'draw' | 'upload'>('draw');
    const [previewBase64, setPreviewBase64] = useState<string | null>(null);
    const [nombreFirmante, setNombreFirmante] = useState(firma?.nombre_firmante || '');
    const [cargoFirmante, setCargoFirmante] = useState(firma?.cargo_firmante || '');

    // ✅ FIX 02-MAY-2026: Soporte drag-drop y paste para firma
    const handleImageFiles = useCallback((files: File[]) => {
        const file = files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            setPreviewBase64(base64);
        };
        reader.readAsDataURL(file);
    }, []);

    const { setDropZoneRef, inputProps, openFilePicker, isDragging } = useImageDropPaste({
        onFiles: handleImageFiles,
        multiple: false,
        maxSizeBytes: 5 * 1024 * 1024,
        disabled: updateFirma.isPending,
    });

    const handleSaveDrawn = useCallback((base64: string) => {
        updateFirma.mutate({
            idOrden: idOrdenServicio,
            tipo,
            data: {
                firma_base64: base64,
                ...(tipo === 'CLIENTE' && nombreFirmante ? { nombre_firmante: nombreFirmante } : {}),
                ...(tipo === 'CLIENTE' && cargoFirmante ? { cargo_firmante: cargoFirmante } : {}),
            },
        }, {
            onSuccess: () => onClose(),
        });
    }, [updateFirma, idOrdenServicio, tipo, nombreFirmante, cargoFirmante, onClose]);

    const handleSaveUploaded = useCallback(() => {
        if (!previewBase64) return;
        updateFirma.mutate({
            idOrden: idOrdenServicio,
            tipo,
            data: {
                firma_base64: previewBase64,
                ...(tipo === 'CLIENTE' && nombreFirmante ? { nombre_firmante: nombreFirmante } : {}),
                ...(tipo === 'CLIENTE' && cargoFirmante ? { cargo_firmante: cargoFirmante } : {}),
            },
        }, {
            onSuccess: () => onClose(),
        });
    }, [previewBase64, updateFirma, idOrdenServicio, tipo, nombreFirmante, cargoFirmante, onClose]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn(
                    "p-4 text-white flex items-center justify-between bg-gradient-to-r",
                    config.bgGradient
                )}>
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                            <p className="font-bold">{firma ? 'Editar' : 'Agregar'} Firma {config.label}</p>
                            <p className="text-xs text-white/80">Dibuje o suba una imagen de firma</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Mode Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setMode('draw')}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                                mode === 'draw' ? "bg-white shadow-sm text-indigo-700" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Pen className="h-4 w-4" /> Dibujar Firma
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('upload')}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                                mode === 'upload' ? "bg-white shadow-sm text-indigo-700" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Upload className="h-4 w-4" /> Subir Imagen
                        </button>
                    </div>

                    {/* Client-specific fields */}
                    {tipo === 'CLIENTE' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre del firmante</label>
                                <input
                                    type="text"
                                    value={nombreFirmante}
                                    onChange={(e) => setNombreFirmante(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    placeholder="Nombre completo"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Cargo</label>
                                <input
                                    type="text"
                                    value={cargoFirmante}
                                    onChange={(e) => setCargoFirmante(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    placeholder="Ej: Jefe de Mantenimiento"
                                />
                            </div>
                        </div>
                    )}

                    {/* Draw Mode */}
                    {mode === 'draw' && (
                        <SignatureCanvas
                            onSave={handleSaveDrawn}
                            onCancel={onClose}
                            isLoading={updateFirma.isPending}
                        />
                    )}

                    {/* Upload Mode */}
                    {mode === 'upload' && (
                        <div ref={setDropZoneRef} className="space-y-3 relative">
                            <input {...inputProps} />

                            {/* Overlay drag-drop */}
                            {isDragging && (
                                <div className="absolute inset-0 z-20 bg-indigo-50/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none rounded-xl border-2 border-dashed border-indigo-400">
                                    <Upload className="h-8 w-8 text-indigo-500 animate-bounce" />
                                    <p className="text-sm font-bold text-indigo-700">Suelte la imagen de firma aquí</p>
                                </div>
                            )}

                            {previewBase64 ? (
                                <div className="space-y-3">
                                    <div className="relative border-2 border-indigo-200 rounded-xl overflow-hidden bg-white p-4">
                                        <div className="relative h-40 w-full">
                                            <Image
                                                src={`data:image/png;base64,${previewBase64}`}
                                                alt="Vista previa de firma"
                                                fill
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setPreviewBase64(null); openFilePicker(); }}
                                            className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <Upload className="h-4 w-4" /> Cambiar imagen
                                        </button>
                                        <div className="flex-1" />
                                        <button type="button" onClick={onClose} disabled={updateFirma.isPending} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveUploaded}
                                            disabled={updateFirma.isPending}
                                            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {updateFirma.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Guardar Firma
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => openFilePicker()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                                        isDragging
                                            ? "border-indigo-400 bg-indigo-50/50"
                                            : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                                    )}
                                >
                                    <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-gray-600">Clic, arrastre o pegue una imagen</p>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                                    <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-300">
                                        <span className="flex items-center gap-1"><Upload className="h-3 w-3" /> Arrastrar</span>
                                        <span className="flex items-center gap-1"><Clipboard className="h-3 w-3" /> Ctrl+V</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIRMA CARD (with edit button)
// ═══════════════════════════════════════════════════════════════════════════════

function FirmaCard({ firma, onEdit }: { firma: Firma; onEdit?: () => void }) {
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const config = getTipoFirmaConfig(firma.tipo_firma);
    const Icon = config.icon;

    const firmaUrl = firma.url_firma || (firma.firma_base64 ? `data:image/png;base64,${firma.firma_base64}` : null);
    const fechaFirma = (firma.fecha_firma || firma.fecha_captura)
        ? new Date(firma.fecha_firma || firma.fecha_captura!).toLocaleString('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
        : null;

    return (
        <>
            <div className={cn(
                "rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg",
                config.bgLight,
                config.borderColor
            )}>
                {/* Header */}
                <div className={cn(
                    "p-3 text-white flex items-center gap-3 bg-gradient-to-r",
                    config.bgGradient
                )}>
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">Firma {config.label}</p>
                        {firma.nombre_firmante && (
                            <p className="text-xs text-white/80 truncate">{firma.nombre_firmante}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                title="Editar firma"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                        <CheckCircle2 className="h-5 w-5 text-white/80" />
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-3">
                    {/* Imagen de firma */}
                    {firmaUrl ? (
                        <div
                            className="relative bg-white rounded-lg border border-gray-200 p-2 cursor-pointer group"
                            onClick={() => setIsZoomOpen(true)}
                        >
                            <div className="relative h-24 w-full">
                                <Image
                                    src={firmaUrl}
                                    alt={`Firma de ${firma.nombre_firmante || config.label}`}
                                    fill
                                    className="object-contain"
                                    unoptimized={firmaUrl.startsWith('data:')}
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all flex items-center justify-center">
                                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-all drop-shadow-lg" />
                            </div>
                        </div>
                    ) : (
                        <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                            <Pen className="h-8 w-8" />
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="mt-3 space-y-1.5">
                        {firma.cargo_firmante && (
                            <p className={cn("text-xs font-medium", config.textColor)}>
                                {firma.cargo_firmante}
                            </p>
                        )}
                        {fechaFirma && (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{fechaFirma}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Zoom */}
            {isZoomOpen && firmaUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setIsZoomOpen(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header del modal */}
                        <div className={cn(
                            "p-4 text-white flex items-center justify-between bg-gradient-to-r",
                            config.bgGradient
                        )}>
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5" />
                                <div>
                                    <p className="font-bold">Firma {config.label}</p>
                                    <p className="text-xs text-white/80">{firma.nombre_firmante}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsZoomOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Imagen ampliada */}
                        <div className="p-6 bg-gray-50">
                            <div className="relative h-64 w-full bg-white rounded-xl border border-gray-200 p-4">
                                <Image
                                    src={firmaUrl}
                                    alt={`Firma de ${firma.nombre_firmante || config.label}`}
                                    fill
                                    className="object-contain"
                                    unoptimized={firmaUrl.startsWith('data:')}
                                />
                            </div>
                        </div>

                        {/* Detalles */}
                        <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Firmante</p>
                                    <p className="font-medium text-gray-900">{firma.nombre_firmante || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Cargo</p>
                                    <p className="font-medium text-gray-900">{firma.cargo_firmante || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Fecha</p>
                                    <p className="font-medium text-gray-900">{fechaFirma || '-'}</p>
                                </div>
                                {firma.url_firma && (
                                    <div>
                                        <a
                                            href={firma.url_firma}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Ver original
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIRMA PENDIENTE (with add button)
// ═══════════════════════════════════════════════════════════════════════════════

function FirmaPendiente({ tipo, onAdd }: { tipo: string; onAdd?: () => void }) {
    const config = getTipoFirmaConfig(tipo);
    const Icon = config.icon;

    return (
        <div className={cn(
            "rounded-xl border-2 border-dashed overflow-hidden",
            config.borderColor
        )}>
            <div className={cn(
                "p-3 flex items-center gap-3",
                config.bgLight
            )}>
                <div className={cn(
                    "p-2 rounded-lg",
                    "bg-gray-200"
                )}>
                    <Icon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-sm text-gray-400">Firma {config.label}</p>
                    <p className="text-xs text-gray-400">Pendiente</p>
                </div>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg transition-colors"
                        title="Agregar firma"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                )}
                <Clock className="h-5 w-5 text-gray-300" />
            </div>

            <div className="p-3">
                <div
                    className={cn(
                        "h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200",
                        onAdd && "cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-200 transition-all"
                    )}
                    onClick={onAdd}
                >
                    <div className="text-center text-gray-400">
                        {onAdd ? (
                            <>
                                <Plus className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                <p className="text-xs font-medium">Agregar firma</p>
                            </>
                        ) : (
                            <>
                                <Pen className="h-6 w-6 mx-auto mb-1 opacity-30" />
                                <p className="text-xs font-medium">Sin firma</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function FirmasSection({ firmas, isLoading, idOrdenServicio }: FirmasSectionProps) {
    const firmaTecnico = firmas.find(f => f.tipo_firma === 'TECNICO');
    const firmaCliente = firmas.find(f => f.tipo_firma === 'CLIENTE');
    const otrasFirmas = firmas.filter(f => !['TECNICO', 'CLIENTE'].includes(f.tipo_firma));

    const firmasRequeridas = 2;
    const firmasCompletadas = (firmaTecnico ? 1 : 0) + (firmaCliente ? 1 : 0);

    const [editModal, setEditModal] = useState<{ tipo: 'TECNICO' | 'CLIENTE'; firma?: Firma | null } | null>(null);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                        <Pen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Firmas Digitales</h4>
                        <p className="text-xs text-gray-500">
                            {firmasCompletadas}/{firmasRequeridas} firmas requeridas
                        </p>
                    </div>
                </div>

                {/* Badge de estado */}
                <div className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold",
                    firmasCompletadas === firmasRequeridas
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                )}>
                    {firmasCompletadas === firmasRequeridas ? '✓ Completo' : 'Pendiente'}
                </div>
            </div>

            {/* Grid de firmas */}
            <div className="p-4">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
                        <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Firma Técnico */}
                        {firmaTecnico ? (
                            <FirmaCard
                                firma={firmaTecnico}
                                onEdit={() => setEditModal({ tipo: 'TECNICO', firma: firmaTecnico })}
                            />
                        ) : (
                            <FirmaPendiente
                                tipo="TECNICO"
                                onAdd={() => setEditModal({ tipo: 'TECNICO', firma: null })}
                            />
                        )}

                        {/* Firma Cliente */}
                        {firmaCliente ? (
                            <FirmaCard
                                firma={firmaCliente}
                                onEdit={() => setEditModal({ tipo: 'CLIENTE', firma: firmaCliente })}
                            />
                        ) : (
                            <FirmaPendiente
                                tipo="CLIENTE"
                                onAdd={() => setEditModal({ tipo: 'CLIENTE', firma: null })}
                            />
                        )}
                    </div>
                )}

                {/* Otras firmas adicionales */}
                {otrasFirmas.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            Firmas Adicionales
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {otrasFirmas.map((firma) => (
                                <FirmaCard key={firma.id_firma || firma.id_firma_digital} firma={firma} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Edición de Firma */}
            {editModal && (
                <EditFirmaModal
                    tipo={editModal.tipo}
                    idOrdenServicio={idOrdenServicio}
                    firma={editModal.firma}
                    onClose={() => setEditModal(null)}
                />
            )}
        </div>
    );
}
