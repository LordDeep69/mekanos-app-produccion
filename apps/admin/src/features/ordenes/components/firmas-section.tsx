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
    History,
    Loader2,
    Pen,
    Plus,
    Save,
    Star,
    Upload,
    User,
    UserCheck,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useFirmasHistorialTecnico, useUpdateFirmaOrden } from '../hooks/use-ordenes';
import type { UpdateFirmaOrdenDto } from '../api/ordenes.service';

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
    orden?: any;
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

function SignatureCanvas({
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
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        return ctx;
    }, [canvasRef]);

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
    }, [canvasRef]);

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
    }, [isDrawing, getCtx, getPos, setHasDrawn]);

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
// EDIT SIGNATURE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function EditFirmaModal({ tipo, idOrdenServicio, firma, onClose, orden }: {
    tipo: 'TECNICO' | 'CLIENTE';
    idOrdenServicio: number;
    firma?: Firma | null;
    onClose: () => void;
    orden?: any;
}) {
    const config = getTipoFirmaConfig(tipo);
    const Icon = config.icon;
    const updateFirma = useUpdateFirmaOrden();
    const historialQuery = useFirmasHistorialTecnico(idOrdenServicio, tipo === 'TECNICO');
    const firmasHistorial = historialQuery.data?.data || [];

    // URL o base64 de la firma existente
    const existingFirmaUrl = firma?.url_firma || (firma?.firma_base64
        ? (firma.firma_base64.startsWith('data:') ? firma.firma_base64 : `data:image/png;base64,${firma.firma_base64}`)
        : null);
    const hasExistingSignature = !!existingFirmaUrl;

    // Modo de firma:
    // Si ya existe firma registrada: por defecto 'keep' (Conservar firma actual).
    // Si no existe firma registrada: por defecto 'draw' (Dibujar firma).
    const [mode, setMode] = useState<'keep' | 'draw' | 'upload'>(hasExistingSignature ? 'keep' : 'draw');

    // Canvas de dibujo
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Subida de imagen
    const [previewBase64, setPreviewBase64] = useState<string | null>(null);

    // Datos del cliente (nombre y cargo)
    const initialNombre = firma?.nombre_firmante || orden?.nombre_quien_recibe || '';
    const initialCargo = firma?.cargo_firmante || orden?.cargo_quien_recibe || '';
    const [nombreFirmante, setNombreFirmante] = useState(initialNombre);
    const [cargoFirmante, setCargoFirmante] = useState(initialCargo);

    // Soporte drag-drop y paste para firma
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

    // Validar si se puede guardar:
    // - Si hay firma existente, el usuario puede guardar cualquier cambio (nombre, cargo, o nueva firma).
    // - Si no hay firma existente, puede guardar si trazó una firma, subió imagen, o ingresó datos del cliente.
    const hasNewSignature = (mode === 'draw' && hasDrawn) || (mode === 'upload' && !!previewBase64);
    const hasClientData = tipo === 'CLIENTE' && (nombreFirmante.trim().length > 0 || cargoFirmante.trim().length > 0);
    const canSave = !updateFirma.isPending && (hasExistingSignature || hasNewSignature || hasClientData);

    const handleSave = async () => {
        if (!canSave || updateFirma.isPending) return;

        const data: UpdateFirmaOrdenDto = {};

        // 1. Firma (solo si el usuario trazó o subió una nueva firma)
        if (mode === 'draw' && hasDrawn && canvasRef.current) {
            const canvas = canvasRef.current;
            const base64 = canvas.toDataURL('image/png').split(',')[1];
            data.firma_base64 = base64;
        } else if (mode === 'upload' && previewBase64) {
            data.firma_base64 = previewBase64;
        }

        // 2. Datos de cliente (nombre y cargo)
        if (tipo === 'CLIENTE') {
            data.nombre_firmante = nombreFirmante.trim();
            data.cargo_firmante = cargoFirmante.trim();
        }

        try {
            await updateFirma.mutateAsync({
                idOrden: idOrdenServicio,
                tipo,
                data,
            });
            onClose();
        } catch {
            // Error manejado en useUpdateFirmaOrden
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn(
                    "p-4 text-white flex items-center justify-between bg-gradient-to-r",
                    config.bgGradient
                )}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-bold text-base">
                                {firma ? 'Editar' : 'Registrar'} Firma y Datos {config.label === 'Cliente' ? 'del Cliente' : 'del Técnico'}
                            </p>
                            <p className="text-xs text-white/80">
                                {tipo === 'CLIENTE'
                                    ? 'Modifique de forma independiente el cargo, el nombre o la firma'
                                    : 'Dibuje o suba una imagen de firma para el técnico'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body con scroll */}
                <div className="p-5 space-y-5 overflow-y-auto flex-1">
                    {/* Campos específicos del cliente */}
                    {tipo === 'CLIENTE' && (
                        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-purple-600" /> Datos de Quien Recibe / Firma
                                </label>
                                <span className="text-[10px] text-purple-600 font-medium">
                                    Edite solo el cargo, solo el nombre o ambos
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Nombre de quien recibe / firmante
                                    </label>
                                    <input
                                        type="text"
                                        value={nombreFirmante}
                                        onChange={(e) => setNombreFirmante(e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white transition-all shadow-xs"
                                        placeholder="Nombre completo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Cargo
                                    </label>
                                    <input
                                        type="text"
                                        value={cargoFirmante}
                                        onChange={(e) => setCargoFirmante(e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white transition-all shadow-xs"
                                        placeholder="Ej: Jefe de Mantenimiento, Administrador..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sección Firma */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Pen className="h-3.5 w-3.5 text-indigo-600" /> Firma Digital
                            </p>
                            {hasExistingSignature && mode === 'keep' && (
                                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Conservando firma actual
                                </span>
                            )}
                        </div>

                        {/* Mode Tabs */}
                        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                            {hasExistingSignature && (
                                <button
                                    type="button"
                                    onClick={() => setMode('keep')}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                                        mode === 'keep'
                                            ? "bg-white shadow-xs text-indigo-700"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Firma Actual
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setMode('draw')}
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                                    mode === 'draw'
                                        ? "bg-white shadow-xs text-indigo-700"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Pen className="h-3.5 w-3.5" /> {hasExistingSignature ? 'Dibujar Nueva' : 'Dibujar Firma'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('upload')}
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                                    mode === 'upload'
                                        ? "bg-white shadow-xs text-indigo-700"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Upload className="h-3.5 w-3.5" /> {hasExistingSignature ? 'Subir Nueva Imagen' : 'Subir Imagen'}
                            </button>
                        </div>

                        {/* Modo KEEP: Mostrar firma actual */}
                        {mode === 'keep' && hasExistingSignature && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-3">
                                <div className="relative h-28 w-full max-w-sm bg-white rounded-lg border border-gray-200 p-2 shadow-inner">
                                    <Image
                                        src={existingFirmaUrl!}
                                        alt="Firma actual registrada"
                                        fill
                                        className="object-contain"
                                        unoptimized={existingFirmaUrl!.startsWith('data:')}
                                    />
                                </div>
                                <div className="flex items-center justify-between w-full max-w-sm pt-1">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Firma actual conservada
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setMode('draw')}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                    >
                                        <Pen className="h-3 w-3" /> Cambiar firma
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-500 text-center">
                                    Esta firma se mantendrá sin cambios. Si solo desea modificar el cargo o nombre, edítelos arriba y presione &quot;Guardar Cambios&quot;.
                                </p>
                            </div>
                        )}

                        {/* Firmas estándares del técnico (historial agrupado por hash) */}
                        {tipo === 'TECNICO' && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <History className="h-4 w-4 text-blue-600" />
                                    <p className="text-sm font-bold text-gray-700">Firmas estándares del técnico</p>
                                    <span className="text-[10px] text-gray-400">clic en una para usarla</span>
                                </div>
                                {historialQuery.isLoading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                    </div>
                                ) : firmasHistorial.length === 0 ? (
                                    <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                                        Sin firmas anteriores registradas para este técnico.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {firmasHistorial.map((f) => (
                                            <button
                                                key={f.id_firma_digital}
                                                type="button"
                                                onClick={() => {
                                                    setPreviewBase64(f.firma_base64);
                                                    setMode('upload');
                                                }}
                                                className={cn(
                                                    "relative rounded-lg border-2 overflow-hidden bg-white transition-all hover:shadow-md text-left",
                                                    f.es_estandar
                                                        ? "border-amber-400 ring-2 ring-amber-200"
                                                        : "border-gray-200 hover:border-blue-300"
                                                )}
                                            >
                                                <div className="relative h-16 w-full bg-white">
                                                    <Image
                                                        src={`data:image/png;base64,${f.firma_base64}`}
                                                        alt="Firma estándar del técnico"
                                                        fill
                                                        className="object-contain"
                                                        unoptimized
                                                    />
                                                </div>
                                                <div className="px-2 py-1.5 flex items-center justify-between bg-gray-50">
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
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Modo DRAW: Dibujar */}
                        {mode === 'draw' && (
                            <SignatureCanvas
                                canvasRef={canvasRef}
                                hasDrawn={hasDrawn}
                                setHasDrawn={setHasDrawn}
                            />
                        )}

                        {/* Modo UPLOAD: Subir imagen */}
                        {mode === 'upload' && (
                            <div ref={setDropZoneRef} className="space-y-3 relative">
                                <input {...inputProps} />

                                {isDragging && (
                                    <div className="absolute inset-0 z-20 bg-indigo-50/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none rounded-xl border-2 border-dashed border-indigo-400">
                                        <Upload className="h-8 w-8 text-indigo-500 animate-bounce" />
                                        <p className="text-sm font-bold text-indigo-700">Suelte la imagen de firma aquí</p>
                                    </div>
                                )}

                                {previewBase64 ? (
                                    <div className="space-y-3">
                                        <div className="relative border-2 border-indigo-200 rounded-xl overflow-hidden bg-white p-4 shadow-inner">
                                            <div className="relative h-36 w-full">
                                                <Image
                                                    src={`data:image/png;base64,${previewBase64}`}
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
                                                onClick={() => { setPreviewBase64(null); openFilePicker(); }}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                <Upload className="h-3.5 w-3.5" /> Cambiar imagen
                                            </button>
                                            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Imagen cargada lista para guardar
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => openFilePicker()}
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all",
                                            isDragging
                                                ? "border-indigo-400 bg-indigo-50/50"
                                                : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                                        )}
                                    >
                                        <Upload className="h-9 w-9 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-gray-600">Clic, arrastre o pegue una imagen de firma</p>
                                        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (max 5MB)</p>
                                        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-400">
                                            <span className="flex items-center gap-1"><Upload className="h-3 w-3" /> Arrastrar archivo</span>
                                            <span className="flex items-center gap-1"><Clipboard className="h-3 w-3" /> Pegar con Ctrl+V</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Modal con botones claros */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={updateFirma.isPending}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave || updateFirma.isPending}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updateFirma.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Guardando cambios...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
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

export function FirmasSection({ firmas, isLoading, idOrdenServicio, orden }: FirmasSectionProps) {
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
                    orden={orden}
                />
            )}
        </div>
    );
}
