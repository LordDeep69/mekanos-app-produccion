/**
 * MEKANOS S.A.S - Portal Admin
 * Galería de Fotos por Actividad
 * 
 * Muestra y permite gestionar fotos ANTES/DURANTE/DESPUÉS para cada actividad.
 */

'use client';

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
import { getSession } from 'next-auth/react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface Evidencia {
    id_evidencia?: number;
    idEvidencia?: number;
    tipo_evidencia?: 'ANTES' | 'DURANTE' | 'DESPUES' | 'INSUMOS' | 'MEDICION';
    tipoEvidencia?: 'ANTES' | 'DURANTE' | 'DESPUES' | 'INSUMOS' | 'MEDICION';
    ruta_archivo?: string;
    rutaArchivo?: string;
    descripcion?: string;
    fecha_captura?: string;
    fechaCaptura?: string;
}

interface GaleriaActividadFotosProps {
    idOrdenServicio: number;
    idActividadEjecutada?: number;
    nombreActividad: string;
    filtroDescripcion?: string;
}

const TIPOS_FOTO = [
    { key: 'ANTES', label: 'Antes', color: 'bg-blue-500', bgLight: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { key: 'DURANTE', label: 'Durante', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    { key: 'DESPUES', label: 'Después', color: 'bg-green-500', bgLight: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
] as const;

// Helpers para normalizar campos camelCase/snake_case
function getEvidenciaId(e: Evidencia): number {
    return e.id_evidencia ?? e.idEvidencia ?? 0;
}
function getEvidenciaTipo(e: Evidencia): string {
    return e.tipo_evidencia ?? e.tipoEvidencia ?? 'ANTES';
}
function getEvidenciaUrl(e: Evidencia): string | undefined {
    return e.ruta_archivo ?? e.rutaArchivo;
}
function getEvidenciaFecha(e: Evidencia): string | undefined {
    return e.fecha_captura ?? e.fechaCaptura;
}

function FotoThumbnail({
    evidencia,
    onView,
    onDelete,
    canDelete
}: {
    evidencia: Evidencia;
    onView: () => void;
    onDelete: () => void;
    canDelete: boolean;
}) {
    const fotoUrl = getEvidenciaUrl(evidencia);

    return (
        <div className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            {fotoUrl ? (
                <>
                    <Image
                        src={fotoUrl}
                        alt={evidencia.descripcion || 'Evidencia'}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                            onClick={onView}
                            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                        >
                            <ZoomIn className="h-4 w-4 text-gray-700" />
                        </button>
                        {canDelete && (
                            <button
                                onClick={onDelete}
                                className="p-2 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <Trash2 className="h-4 w-4 text-white" />
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-300" />
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
    hasNext
}: {
    evidencia: Evidencia;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
}) {
    const fotoUrl = getEvidenciaUrl(evidencia);
    const tipoEv = getEvidenciaTipo(evidencia);
    const fechaEv = getEvidenciaFecha(evidencia);

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
                        <p className="text-sm font-bold">{tipoEv}</p>
                        {evidencia.descripcion && (
                            <p className="text-xs text-white/70">{evidencia.descripcion}</p>
                        )}
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
                            alt={evidencia.descripcion || 'Evidencia'}
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

export function GaleriaActividadFotos({
    idOrdenServicio,
    idActividadEjecutada,
    nombreActividad,
    filtroDescripcion
}: GaleriaActividadFotosProps) {
    const queryClient = useQueryClient();
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [tipoActivo, setTipoActivo] = useState<string>('ANTES');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Obtener evidencias de esta actividad/medición
    // Estrategia: buscar por id_actividad_ejecutada, o por descripción si es medición
    const { data: evidenciasData, isLoading } = useQuery({
        queryKey: ['evidencias-actividad', idOrdenServicio, idActividadEjecutada, nombreActividad, filtroDescripcion],
        queryFn: async () => {
            const session = await getSession();
            const token = (session as any)?.accessToken;

            // 1. Si hay idActividadEjecutada, intentar endpoint específico
            if (idActividadEjecutada) {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/evidencias-fotograficas/actividad/${idActividadEjecutada}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.ok) {
                    const data = await res.json();
                    const evidencias = Array.isArray(data) ? data : (data.data || []);
                    if (evidencias.length > 0) {
                        return { data: evidencias };
                    }
                }
            }

            // 2. Fallback: buscar todas las evidencias de la orden y filtrar
            const res2 = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/evidencias-fotograficas/orden/${idOrdenServicio}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res2.ok) return { data: [] };

            const allData = await res2.json();
            const todasEvidencias = Array.isArray(allData) ? allData : (allData.data || []);

            // Filtrar por id_actividad_ejecutada o por descripción
            const nombreNormalizado = nombreActividad.toLowerCase().trim();
            const filtroNormalizado = (filtroDescripcion || '').toLowerCase().trim();

            const filtered = todasEvidencias.filter((e: any) => {
                // Coincidencia por id
                if (idActividadEjecutada && (e.idActividadEjecutada === idActividadEjecutada ||
                    e.id_actividad_ejecutada === idActividadEjecutada)) {
                    return true;
                }
                // Coincidencia por descripción (nombre de actividad o filtro)
                const desc = (e.descripcion || e.description || '').toLowerCase();
                if (filtroNormalizado && desc.includes(filtroNormalizado)) {
                    return true;
                }
                if (desc && nombreNormalizado && desc.includes(nombreNormalizado)) {
                    return true;
                }
                // Coincidencia inversa
                if (desc && nombreNormalizado && nombreNormalizado.includes(desc) && desc.length > 5) {
                    return true;
                }
                return false;
            });

            return { data: filtered };
        },
        enabled: !!idOrdenServicio && (!!idActividadEjecutada || !!filtroDescripcion || !!nombreActividad),
    });

    const evidencias: Evidencia[] = evidenciasData?.data || [];

    // Agrupar por tipo (normalizar camelCase/snake_case)
    const evidenciasPorTipo = TIPOS_FOTO.reduce((acc, tipo) => {
        acc[tipo.key] = evidencias.filter(e => getEvidenciaTipo(e) === tipo.key);
        return acc;
    }, {} as Record<string, Evidencia[]>);

    const evidenciasActivas = evidenciasPorTipo[tipoActivo] || [];
    const todasLasEvidencias = evidencias;

    // Mutación para eliminar
    const deleteMutation = useMutation({
        mutationFn: async (idEvidencia: number) => {
            const session = await getSession();
            const token = (session as any)?.accessToken;
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/evidencias-fotograficas/${idEvidencia}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (!res.ok) throw new Error('Error al eliminar');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidencias-actividad', idActividadEjecutada] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            toast.success('Evidencia eliminada');
        },
        onError: () => {
            toast.error('Error al eliminar evidencia');
        }
    });

    const handleDelete = (idEvidencia: number) => {
        if (confirm('¿Eliminar esta evidencia?')) {
            deleteMutation.mutate(idEvidencia);
        }
    };

    const handleViewLightbox = (evidencia: Evidencia) => {
        const evId = getEvidenciaId(evidencia);
        const idx = todasLasEvidencias.findIndex(e => getEvidenciaId(e) === evId);
        setLightboxIndex(idx >= 0 ? idx : 0);
    };

    // Subir foto
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes');
            return;
        }

        // Validar tamaño (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('La imagen no puede superar 10MB');
            return;
        }

        setIsUploading(true);
        try {
            const session = await getSession();
            const token = (session as any)?.accessToken;

            // Convertir a base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Enviar al backend usando endpoint atómico que sube a Cloudinary
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/evidencias-fotograficas/upload-base64`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        idOrdenServicio,
                        idActividadEjecutada,
                        tipoEvidencia: tipoActivo,
                        descripcion: nombreActividad,
                        nombreArchivo: file.name,
                        base64: base64,
                    }),
                }
            );

            if (!res.ok) throw new Error('Error al subir');

            queryClient.invalidateQueries({ queryKey: ['evidencias-actividad'] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            toast.success('Foto subida exitosamente');
        } catch (error) {
            console.error('Error uploading:', error);
            toast.error('Error al subir la foto');
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const tipoConfig = TIPOS_FOTO.find(t => t.key === tipoActivo) || TIPOS_FOTO[0];

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <Camera className="h-4 w-4 text-gray-600" />
                <span className="text-xs font-bold text-gray-700">Evidencias Fotográficas</span>
                <span className="text-[10px] text-gray-400 ml-auto">
                    {evidencias.length} foto{evidencias.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Tabs de tipo */}
            <div className="flex border-b border-gray-100">
                {TIPOS_FOTO.map(tipo => {
                    const count = evidenciasPorTipo[tipo.key]?.length || 0;
                    const isActive = tipoActivo === tipo.key;
                    return (
                        <button
                            key={tipo.key}
                            onClick={() => setTipoActivo(tipo.key)}
                            className={cn(
                                "flex-1 px-3 py-2 text-xs font-bold transition-all border-b-2",
                                isActive
                                    ? `${tipo.text} border-current ${tipo.bgLight}`
                                    : "text-gray-400 border-transparent hover:bg-gray-50"
                            )}
                        >
                            {tipo.label}
                            {count > 0 && (
                                <span className={cn(
                                    "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                                    isActive ? tipo.color + " text-white" : "bg-gray-200 text-gray-600"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Input hidden para subir archivos */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {/* Grid de fotos */}
            <div className="p-3">
                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {/* Botón de agregar foto */}
                        <button
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            className={cn(
                                "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all",
                                isUploading
                                    ? "border-gray-200 bg-gray-50 cursor-wait"
                                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                            )}
                        >
                            {isUploading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            ) : (
                                <>
                                    <Plus className="h-5 w-5 text-gray-400" />
                                    <span className="text-[10px] text-gray-400">Agregar</span>
                                </>
                            )}
                        </button>

                        {/* Fotos existentes */}
                        {evidenciasActivas.map(evidencia => (
                            <FotoThumbnail
                                key={getEvidenciaId(evidencia)}
                                evidencia={evidencia}
                                onView={() => handleViewLightbox(evidencia)}
                                onDelete={() => handleDelete(getEvidenciaId(evidencia))}
                                canDelete={true}
                            />
                        ))}

                        {/* Mensaje si no hay fotos */}
                        {evidenciasActivas.length === 0 && !isUploading && (
                            <div className="col-span-2 flex items-center justify-center text-gray-400">
                                <p className="text-xs">Sin fotos {tipoConfig.label.toLowerCase()}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && todasLasEvidencias[lightboxIndex] && (
                <LightboxModal
                    evidencia={todasLasEvidencias[lightboxIndex]}
                    onClose={() => setLightboxIndex(null)}
                    onPrev={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
                    onNext={() => setLightboxIndex(Math.min(todasLasEvidencias.length - 1, lightboxIndex + 1))}
                    hasPrev={lightboxIndex > 0}
                    hasNext={lightboxIndex < todasLasEvidencias.length - 1}
                />
            )}
        </div>
    );
}
