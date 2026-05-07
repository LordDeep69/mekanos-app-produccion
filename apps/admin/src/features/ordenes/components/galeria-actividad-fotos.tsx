/**
 * MEKANOS S.A.S - Portal Admin
 * Galería de Fotos por Actividad
 * 
 * Muestra y permite gestionar fotos ANTES/DURANTE/DESPUÉS para cada actividad.
 */

'use client';

import { fileToBase64, useImageDropPaste } from '@/hooks/use-image-drop-paste';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Clipboard,
    Clock,
    Image as ImageIcon,
    Loader2,
    Plus,
    Trash2,
    Upload,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
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
    // ✅ FIX 30-ABR-2026: Vincular foto al equipo correcto en órdenes multi-equipo
    idOrdenEquipo?: number;
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
    idOrdenEquipo,
    nombreActividad,
    filtroDescripcion
}: GaleriaActividadFotosProps) {
    const queryClient = useQueryClient();
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [tipoActivo, setTipoActivo] = useState<string>('ANTES');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    // ✅ FIX 02-MAY-2026: Soporte drag-drop, paste y multi-file
    const uploadFiles = async (files: File[]) => {
        setIsUploading(true);
        let uploaded = 0;
        try {
            for (const file of files) {
                setUploadProgress(`${uploaded + 1}/${files.length}`);
                const base64 = await fileToBase64(file);
                await apiClient.post('/evidencias-fotograficas/upload-base64', {
                    idOrdenServicio,
                    idActividadEjecutada,
                    ...(idOrdenEquipo ? { idOrdenEquipo } : {}),
                    tipoEvidencia: tipoActivo,
                    descripcion: nombreActividad,
                    nombreArchivo: file.name,
                    base64,
                });
                uploaded++;
            }
            queryClient.invalidateQueries({ queryKey: ['evidencias-actividad'] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            toast.success(files.length === 1 ? 'Foto subida exitosamente' : `${uploaded} fotos subidas exitosamente`);
        } catch (error) {
            console.error('Error uploading:', error);
            toast.error(`Error al subir foto${files.length > 1 ? 's' : ''} (${uploaded}/${files.length} completadas)`);
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    const { setDropZoneRef, inputProps, openFilePicker, isDragging } = useImageDropPaste({
        onFiles: uploadFiles,
        multiple: true,
        disabled: isUploading,
        onInvalidType: (name) => toast.error(`"${name}" no es una imagen válida`),
        onMaxSizeExceeded: (name) => toast.error(`"${name}" supera el límite de 10MB`),
    });

    // ✅ FIX 13-FEB-2026: Merge ambas fuentes (endpoint actividad + orden) para no perder fotos
    // Las fotos de mobile pueden no tener id_actividad_ejecutada (usan descripción),
    // mientras que las fotos subidas desde admin SÍ lo tienen. Debemos combinar ambas.
    const { data: evidenciasData, isLoading } = useQuery({
        queryKey: ['evidencias-actividad', idOrdenServicio, idActividadEjecutada, nombreActividad, filtroDescripcion],
        queryFn: async () => {
            try {
                const seenIds = new Set<number>();
                const merged: any[] = [];

                // 1. Obtener evidencias por id_actividad_ejecutada (endpoint específico)
                if (idActividadEjecutada) {
                    try {
                        const res = await apiClient.get(
                            `/evidencias-fotograficas/actividad/${idActividadEjecutada}`
                        );
                        const data = res.data;
                        const evidencias = Array.isArray(data) ? data : (data.data || []);
                        for (const ev of evidencias) {
                            const evId = ev.id_evidencia ?? ev.idEvidencia ?? 0;
                            if (evId && !seenIds.has(evId)) {
                                seenIds.add(evId);
                                merged.push(ev);
                            }
                        }
                    } catch (err: any) {
                        if (err?.response?.status !== 404) {
                            console.warn('[GaleriaFotos] Error endpoint actividad:', err?.response?.status);
                        }
                    }
                }

                // 2. SIEMPRE buscar por orden y filtrar por descripción (para fotos mobile sin id_actividad)
                const res2 = await apiClient.get(
                    `/evidencias-fotograficas/orden/${idOrdenServicio}`
                );
                const allData = res2.data;
                const todasEvidencias = Array.isArray(allData) ? allData : (allData.data || []);

                const nombreNormalizado = nombreActividad.toLowerCase().trim();
                const filtroNormalizado = (filtroDescripcion || '').toLowerCase().trim();

                for (const e of todasEvidencias) {
                    const evId = e.id_evidencia ?? e.idEvidencia ?? 0;
                    if (evId && seenIds.has(evId)) continue; // ya agregada

                    // Coincidencia por id_actividad_ejecutada
                    if (idActividadEjecutada && (e.idActividadEjecutada === idActividadEjecutada ||
                        e.id_actividad_ejecutada === idActividadEjecutada)) {
                        seenIds.add(evId);
                        merged.push(e);
                        continue;
                    }
                    // Coincidencia por descripción (nombre de actividad o filtro)
                    const desc = (e.descripcion || e.description || '').toLowerCase();
                    if (filtroNormalizado && desc.includes(filtroNormalizado)) {
                        seenIds.add(evId);
                        merged.push(e);
                        continue;
                    }
                    if (desc && nombreNormalizado && desc.includes(nombreNormalizado)) {
                        seenIds.add(evId);
                        merged.push(e);
                        continue;
                    }
                    // Coincidencia inversa
                    if (desc && nombreNormalizado && nombreNormalizado.includes(desc) && desc.length > 5) {
                        seenIds.add(evId);
                        merged.push(e);
                    }
                }

                return { data: merged };
            } catch (err) {
                console.error('[GaleriaFotos] Error cargando evidencias:', err);
                return { data: [] };
            }
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
            const res = await apiClient.delete(`/evidencias-fotograficas/${idEvidencia}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidencias-actividad', idOrdenServicio, idActividadEjecutada] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            queryClient.invalidateQueries({ queryKey: ['ordenes', 'evidencias'] });
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

    // Abrir selector de archivos
    const handleUploadClick = () => openFilePicker();

    const tipoConfig = TIPOS_FOTO.find(t => t.key === tipoActivo) || TIPOS_FOTO[0];

    return (
        <div ref={setDropZoneRef} className={cn(
            "bg-white rounded-lg border overflow-hidden transition-all relative",
            isDragging ? "border-blue-400 border-2 ring-4 ring-blue-100" : "border-gray-200"
        )}>
            {/* Overlay drag-drop */}
            {isDragging && (
                <div className="absolute inset-0 z-20 bg-blue-50/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none rounded-lg">
                    <Upload className="h-8 w-8 text-blue-500 animate-bounce" />
                    <p className="text-sm font-bold text-blue-700">Suelte las imágenes aquí</p>
                    <p className="text-xs text-blue-500">Se subirán como fotos {tipoActivo}</p>
                </div>
            )}
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

            {/* Input hidden para subir archivos (multi-select habilitado) */}
            <input {...inputProps} />

            {/* Grid de fotos */}
            <div className="p-3">
                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {/* Botón de agregar foto con hints de drag-drop y paste */}
                        <button
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            className={cn(
                                "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all",
                                isUploading
                                    ? "border-gray-200 bg-gray-50 cursor-wait"
                                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                            )}
                            title="Clic para seleccionar, arrastrar imágenes o pegar (Ctrl+V)"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                    {uploadProgress && (
                                        <span className="text-[9px] text-gray-400">{uploadProgress}</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5 text-gray-400" />
                                    <span className="text-[10px] text-gray-400">Agregar</span>
                                    <span className="text-[8px] text-gray-300 flex items-center gap-0.5">
                                        <Clipboard className="h-2.5 w-2.5" /> Ctrl+V
                                    </span>
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
