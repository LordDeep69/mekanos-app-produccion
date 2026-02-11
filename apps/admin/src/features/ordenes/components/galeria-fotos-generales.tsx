/**
 * MEKANOS S.A.S - Portal Admin
 * Galería de Fotos Generales del Servicio
 * 
 * Componente CRUD para gestionar fotos GENERALES (no asociadas a actividad).
 * Permite subir, ver en lightbox y eliminar fotos generales de una orden.
 */

'use client';

import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Clock,
    Image as ImageIcon,
    Loader2,
    Plus,
    Trash2,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface Evidencia {
    id_evidencia?: number;
    idEvidencia?: number;
    tipo_evidencia?: string;
    tipoEvidencia?: string;
    ruta_archivo?: string;
    rutaArchivo?: string;
    descripcion?: string;
    fecha_captura?: string;
    fechaCaptura?: string;
}

interface GaleriaFotosGeneralesProps {
    idOrdenServicio: number;
}

function getEvId(e: Evidencia): number {
    return e.id_evidencia ?? e.idEvidencia ?? 0;
}
function getEvTipo(e: Evidencia): string {
    return e.tipo_evidencia ?? e.tipoEvidencia ?? '';
}
function getEvUrl(e: Evidencia): string | undefined {
    return e.ruta_archivo ?? e.rutaArchivo;
}
function getEvFecha(e: Evidencia): string | undefined {
    return e.fecha_captura ?? e.fechaCaptura;
}

// ✅ FIX 07-FEB-2026: Extraer sub-tipo (ANTES/DURANTE/DESPUES) del prefijo de descripción
function getSubTipo(e: Evidencia): { subTipo: string; descripcionLimpia: string } {
    const desc = e.descripcion || '';
    const match = desc.match(/^(ANTES|DURANTE|DESPUES|DESPUÉS):\s*(.*)/i);
    if (match) {
        return { subTipo: match[1].toUpperCase().replace('DESPUÉS', 'DESPUES'), descripcionLimpia: match[2] || '' };
    }
    return { subTipo: '', descripcionLimpia: desc };
}

const SUB_TIPO_ORDER: Record<string, number> = { ANTES: 0, DURANTE: 1, DESPUES: 2 };
const SUB_TIPO_COLORS: Record<string, string> = {
    ANTES: 'bg-blue-500',
    DURANTE: 'bg-amber-500',
    DESPUES: 'bg-green-500',
};

function FotoThumbnail({
    evidencia,
    onView,
    onDelete,
}: {
    evidencia: Evidencia;
    onView: () => void;
    onDelete: () => void;
}) {
    const fotoUrl = getEvUrl(evidencia);
    const { subTipo, descripcionLimpia } = getSubTipo(evidencia);

    return (
        <div className="group relative aspect-square rounded-xl overflow-hidden border-2 border-purple-200 bg-purple-50/30 hover:border-purple-400 transition-all hover:shadow-lg">
            {fotoUrl ? (
                <>
                    <Image
                        src={fotoUrl}
                        alt={descripcionLimpia || 'Foto general'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); onView(); }}
                            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                        >
                            <ZoomIn className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                        >
                            <Trash2 className="h-4 w-4 text-white" />
                        </button>
                    </div>
                    {/* Sub-tipo badge (ANTES/DURANTE/DESPUES) */}
                    {subTipo && (
                        <div className={cn(
                            "absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white shadow-sm",
                            SUB_TIPO_COLORS[subTipo] || 'bg-gray-500'
                        )}>
                            {subTipo}
                        </div>
                    )}
                    {descripcionLimpia && (
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                            <p className="text-white text-[10px] truncate">{descripcionLimpia}</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-purple-200" />
                </div>
            )}
        </div>
    );
}

function LightboxModal({
    evidencia,
    onClose,
    onPrev,
    onNext,
    hasPrev,
    hasNext,
    currentIndex,
    total,
}: {
    evidencia: Evidencia;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    currentIndex: number;
    total: number;
}) {
    const fotoUrl = getEvUrl(evidencia);
    const fechaEv = getEvFecha(evidencia);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="relative max-w-4xl max-h-[85vh] w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10 flex justify-between items-center">
                    <div className="text-white">
                        <p className="text-sm font-bold">📷 Foto General</p>
                        {evidencia.descripcion && (
                            <p className="text-xs text-white/70">{evidencia.descripcion}</p>
                        )}
                        <p className="text-xs text-white/50 mt-0.5">
                            {currentIndex + 1} / {total}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Imagen */}
                {fotoUrl && (
                    <div className="relative w-full h-[70vh]">
                        <Image
                            src={fotoUrl}
                            alt={evidencia.descripcion || 'Foto general'}
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                )}

                {/* Navegación */}
                {hasPrev && (
                    <button
                        onClick={onPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                )}
                {hasNext && (
                    <button
                        onClick={onNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                )}

                {/* Footer */}
                {fechaEv && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                        <div className="flex items-center gap-2 text-white/70 text-xs">
                            <Clock className="h-3 w-3" />
                            {new Date(fechaEv).toLocaleString('es-CO')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function GaleriaFotosGenerales({ idOrdenServicio }: GaleriaFotosGeneralesProps) {
    const queryClient = useQueryClient();
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [descripcionNueva, setDescripcionNueva] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✅ FIX 09-FEB-2026: Usar apiClient con interceptor auth
    const { data: evidenciasData, isLoading } = useQuery({
        queryKey: ['evidencias-generales', idOrdenServicio],
        queryFn: async () => {
            try {
                const res = await apiClient.get(
                    `/evidencias-fotograficas/orden/${idOrdenServicio}`
                );
                const allData = res.data;
                const todasEvidencias = Array.isArray(allData) ? allData : (allData.data || []);

                // Filter GENERAL photos: tipo_evidencia='GENERAL' OR description has sub-type prefix
                // ✅ DEFENSE-IN-DEPTH 07-FEB-2026: Also catch photos from mobile apps that
                // weren't rebuilt (sent as ANTES/DURANTE/DESPUES with "SUBTIPO: " prefix in description)
                const GENERAL_PREFIX_RE = /^(ANTES|DURANTE|DESPUES):\s/i;
                const generales = todasEvidencias.filter((e: any) => {
                    const tipo = (e.tipo_evidencia ?? e.tipoEvidencia ?? '').toUpperCase();
                    const desc = e.descripcion ?? '';
                    return tipo === 'GENERAL' || GENERAL_PREFIX_RE.test(desc);
                });

                // ✅ FIX 07-FEB-2026: Ordenar por sub-tipo (ANTES → DURANTE → DESPUES)
                const sorted = generales.sort((a: Evidencia, b: Evidencia) => {
                    const { subTipo: stA } = getSubTipo(a);
                    const { subTipo: stB } = getSubTipo(b);
                    return (SUB_TIPO_ORDER[stA] ?? 99) - (SUB_TIPO_ORDER[stB] ?? 99);
                });

                return { data: sorted };
            } catch (err) {
                console.error('[GaleriaFotosGenerales] Error:', err);
                return { data: [] };
            }
        },
        enabled: !!idOrdenServicio,
    });

    const fotosGenerales: Evidencia[] = evidenciasData?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (idEvidencia: number) => {
            const res = await apiClient.delete(`/evidencias-fotograficas/${idEvidencia}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidencias-generales', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            toast.success('Foto general eliminada');
        },
        onError: () => {
            toast.error('Error al eliminar foto general');
        },
    });

    const handleDelete = (idEvidencia: number) => {
        if (confirm('¿Eliminar esta foto general?')) {
            deleteMutation.mutate(idEvidencia);
        }
    };

    const handleViewLightbox = (evidencia: Evidencia) => {
        const evId = getEvId(evidencia);
        const idx = fotosGenerales.findIndex((e) => getEvId(e) === evId);
        setLightboxIndex(idx >= 0 ? idx : 0);
    };

    // Upload
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('La imagen no puede superar 10MB');
            return;
        }

        setIsUploading(true);
        try {
            // Convert to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // ✅ FIX 09-FEB-2026: Usar apiClient con interceptor auth
            await apiClient.post('/evidencias-fotograficas/upload-base64', {
                idOrdenServicio,
                tipoEvidencia: 'GENERAL',
                descripcion: descripcionNueva.trim() || 'Foto general del servicio',
                nombreArchivo: file.name,
                base64: base64,
            });

            queryClient.invalidateQueries({ queryKey: ['evidencias-generales', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            setDescripcionNueva('');
            toast.success('Foto general subida exitosamente');
        } catch (error) {
            console.error('Error uploading general photo:', error);
            toast.error('Error al subir la foto general');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-sm">
                        <Camera className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-purple-900">Fotos Generales del Servicio</h4>
                        <p className="text-xs text-purple-600">
                            Fotos no asociadas a actividades específicas
                            {fotosGenerales.length > 0 && ` · ${fotosGenerales.length} foto${fotosGenerales.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>

                {/* Upload button */}
                <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                        isUploading
                            ? "bg-gray-100 text-gray-400 cursor-wait"
                            : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
                    )}
                >
                    {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    {isUploading ? 'Subiendo...' : 'Agregar Foto'}
                </button>
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {/* Optional description input */}
            <div className="px-4 pt-3">
                <input
                    type="text"
                    value={descripcionNueva}
                    onChange={(e) => setDescripcionNueva(e.target.value)}
                    placeholder="Descripción opcional para la próxima foto..."
                    className="w-full px-3 py-1.5 border border-purple-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                />
            </div>

            {/* Grid de fotos */}
            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    </div>
                ) : fotosGenerales.length === 0 ? (
                    <div className="text-center py-8 text-purple-300">
                        <Camera className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="font-medium text-sm">Sin fotos generales</p>
                        <p className="text-xs mt-1 text-purple-400">
                            Haz clic en &quot;Agregar Foto&quot; para subir fotos generales del servicio
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {fotosGenerales.map((evidencia) => (
                            <FotoThumbnail
                                key={getEvId(evidencia)}
                                evidencia={evidencia}
                                onView={() => handleViewLightbox(evidencia)}
                                onDelete={() => handleDelete(getEvId(evidencia))}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && fotosGenerales[lightboxIndex] && (
                <LightboxModal
                    evidencia={fotosGenerales[lightboxIndex]}
                    onClose={() => setLightboxIndex(null)}
                    onPrev={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
                    onNext={() => setLightboxIndex(Math.min(fotosGenerales.length - 1, lightboxIndex + 1))}
                    hasPrev={lightboxIndex > 0}
                    hasNext={lightboxIndex < fotosGenerales.length - 1}
                    currentIndex={lightboxIndex}
                    total={fotosGenerales.length}
                />
            )}
        </div>
    );
}
