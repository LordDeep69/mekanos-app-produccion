/**
 * MEKANOS S.A.S - Portal Admin
 * Galería de Evidencias Fotográficas con Lightbox
 * 
 * Visualización avanzada de fotos agrupadas por tipo.
 */

'use client';

import { PhotoLightbox, cleanDirectImageUrl, type LightboxImageItem } from '@/components/ui/photo-lightbox';
import { BotonDescargaEvidenciasActividades } from './descargar-evidencias-modal';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Edit2,
    ExternalLink,
    Image as ImageIcon,
    Loader2,
    Save,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Evidencia {
    id_evidencia: number;
    id_orden_servicio: number;
    tipo_evidencia: 'ANTES' | 'DURANTE' | 'DESPUES' | string;
    url_foto?: string;
    ruta_archivo?: string;
    foto_base64?: string;
    descripcion?: string;
    fecha_captura?: string;
    id_actividad_ejecutada?: number;
    id_orden_equipo?: number | null;
    idOrdenEquipo?: number | null;
    actividad_asociada?: {
        descripcion_actividad?: string;
    };
}

interface EvidenciasGalleryProps {
    evidencias: Evidencia[];
    numeroOrden?: string;
    isLoading?: boolean;
    /** Si se establece, solo se muestran evidencias asignadas a este id_orden_equipo */
    idOrdenEquipoFiltro?: number | null;
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
    ANTES: {
        label: 'Antes',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
    },
    DURANTE: {
        label: 'Durante',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
    },
    DESPUES: {
        label: 'Después',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
    },
    GENERAL: {
        label: '📷 Generales',
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
    },
    INSUMOS: {
        label: '📦 Insumos',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
    },
    MEDICION: {
        label: '📏 Medición',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200'
    }
};

function EvidenciaThumbnail({
    evidencia,
    onClick,
    onEdit,
}: {
    evidencia: Evidencia;
    onClick: () => void;
    onEdit?: () => void;
}) {
    const rawUrl = evidencia.ruta_archivo || evidencia.url_foto ||
        (evidencia.foto_base64 ? `data:image/jpeg;base64,${evidencia.foto_base64}` : null);
    const fotoUrl = rawUrl ? cleanDirectImageUrl(rawUrl) : null;

    return (
        <div
            className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-lg"
            onClick={onClick}
        >
            {fotoUrl ? (
                <Image
                    src={fotoUrl}
                    alt={evidencia.descripcion || 'Evidencia'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-auto"
                    unoptimized
                />
            ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                </div>
            )}

            {/* Overlay: pointer-events-none para que el click derecho nativo sobre la foto funcione */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                    {evidencia.actividad_asociada?.descripcion_actividad && (
                        <p className="text-white/80 text-[10px] font-medium truncate mb-0.5">
                            📋 {evidencia.actividad_asociada.descripcion_actividad}
                        </p>
                    )}
                    <p className="text-white text-xs font-medium truncate">
                        {evidencia.tipo_evidencia} - {evidencia.descripcion || 'Sin descripción'}
                    </p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 pointer-events-auto">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-1.5 bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                            title="Editar observación"
                        >
                            <Edit2 className="h-3.5 w-3.5 text-white" />
                        </button>
                    )}
                    <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                </div>
            </div>
        </div>
    );
}

// El antiguo Lightbox ha sido reemplazado por el componente PhotoLightbox unificado.


export function EvidenciasGallery({ evidencias, isLoading, idOrdenEquipoFiltro = null, numeroOrden }: EvidenciasGalleryProps) {
    const queryClient = useQueryClient();
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [editingEvidenciaId, setEditingEvidenciaId] = useState<number | null>(null);
    const [editDescripcion, setEditDescripcion] = useState('');

    const updateDescripcionMutation = useMutation({
        mutationFn: async ({ id, descripcion }: { id: number; descripcion: string }) => {
            const res = await apiClient.put(`/evidencias-fotograficas/${id}`, { descripcion });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            queryClient.invalidateQueries({ queryKey: ['ordenes', 'evidencias'] });
            toast.success('Observación actualizada');
            setEditingEvidenciaId(null);
            setEditDescripcion('');
        },
        onError: () => {
            toast.error('Error al actualizar observación');
        },
    });

    const handleEditClick = (evidencia: Evidencia) => {
        setEditingEvidenciaId(evidencia.id_evidencia);
        setEditDescripcion(evidencia.descripcion || '');
    };

    const handleSaveDescripcion = (idEvidencia: number) => {
        if (editDescripcion.trim()) {
            updateDescripcionMutation.mutate({ id: idEvidencia, descripcion: editDescripcion.trim() });
        }
    };

    const handleCancelEdit = () => {
        setEditingEvidenciaId(null);
        setEditDescripcion('');
    };

    // GENERAL photos are managed separately in GaleriaFotosGenerales (CRUD)
    // ✅ MULTI-EQUIPO: Si hay filtro por equipo, aplicar antes de agrupar
    const evidenciasFiltradasEquipo = idOrdenEquipoFiltro != null
        ? evidencias.filter((ev) => (ev.id_orden_equipo ?? ev.idOrdenEquipo ?? null) === idOrdenEquipoFiltro)
        : evidencias;
    const evidenciasSinGeneral = evidenciasFiltradasEquipo.filter((ev) => ev.tipo_evidencia !== 'GENERAL');

    const tiposEvidencia = ['ANTES', 'DURANTE', 'DESPUES', 'INSUMOS', 'MEDICION'] as const;
    const evidenciasPorTipo = tiposEvidencia.reduce((acc, tipo) => {
        acc[tipo] = evidenciasSinGeneral.filter((ev) => ev.tipo_evidencia === tipo);
        return acc;
    }, {} as Record<string, Evidencia[]>);

    const otrasEvidencias = evidenciasSinGeneral.filter(
        (ev) => !tiposEvidencia.includes(ev.tipo_evidencia as any)
    );

    const lightboxImages: LightboxImageItem[] = useMemo(() => {
        return evidenciasSinGeneral.map((e) => {
            const rawUrl = e.ruta_archivo || e.url_foto || (e.foto_base64 ? `data:image/jpeg;base64,${e.foto_base64}` : '');
            const fotoUrl = cleanDirectImageUrl(rawUrl);
            return {
                id: e.id_evidencia,
                url: fotoUrl,
                title: e.actividad_asociada?.descripcion_actividad || `Evidencia #${e.id_evidencia}`,
                actividad: e.actividad_asociada?.descripcion_actividad,
                badge: e.tipo_evidencia,
                description: e.descripcion,
                date: e.fecha_captura,
            };
        });
    }, [evidenciasSinGeneral]);

    const handleOpenLightbox = (evidencia: Evidencia) => {
        const index = evidenciasSinGeneral.findIndex((ev) => ev.id_evidencia === evidencia.id_evidencia);
        setLightboxIndex(index >= 0 ? index : null);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                        <Camera className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Evidencias Fotográficas</h4>
                        <p className="text-xs text-gray-500">{evidenciasSinGeneral.length} fotos de actividades</p>
                    </div>
                </div>

                {/* Contadores por tipo y botón de descarga */}
                <div className="flex items-center gap-2">
                    <BotonDescargaEvidenciasActividades
                        numeroOrden={numeroOrden || 'ORDEN'}
                        evidencias={evidenciasSinGeneral}
                    />
                    {tiposEvidencia.map((tipo) => {
                        const config = TIPO_CONFIG[tipo];
                        const count = evidenciasPorTipo[tipo].length;
                        return (
                            <span
                                key={tipo}
                                className={cn(
                                    "px-2 py-1 rounded-full text-xs font-bold border",
                                    config.bgColor,
                                    config.color,
                                    config.borderColor
                                )}
                            >
                                {config.label}: {count}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Contenido */}
            <div className="p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : evidenciasSinGeneral.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Sin evidencias fotográficas</p>
                        <p className="text-sm mt-1">Las fotos capturadas aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tiposEvidencia.map((tipo) => {
                            const fotos = evidenciasPorTipo[tipo];
                            if (fotos.length === 0) return null;

                            const config = TIPO_CONFIG[tipo];

                            return (
                                <div key={tipo}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-bold border",
                                            config.bgColor,
                                            config.color,
                                            config.borderColor
                                        )}>
                                            {config.label}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {fotos.map((foto) => {
                                            const isEditing = editingEvidenciaId === foto.id_evidencia;
                                            return (
                                                <div key={foto.id_evidencia} className="relative">
                                                    {isEditing ? (
                                                        <div className="aspect-square rounded-xl border-2 border-blue-400 bg-blue-50 p-2 flex flex-col gap-2">
                                                            <textarea
                                                                value={editDescripcion}
                                                                onChange={(e) => setEditDescripcion(e.target.value)}
                                                                className="w-full flex-1 text-xs px-2 py-1 border border-blue-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                                                                placeholder="Observación..."
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-1 justify-end">
                                                                <button
                                                                    onClick={handleCancelEdit}
                                                                    className="p-1.5 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                                                    title="Cancelar"
                                                                >
                                                                    <X className="h-3.5 w-3.5 text-gray-600" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSaveDescripcion(foto.id_evidencia)}
                                                                    disabled={updateDescripcionMutation.isPending}
                                                                    className="p-1.5 bg-blue-500 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                                                                    title="Guardar"
                                                                >
                                                                    {updateDescripcionMutation.isPending ? (
                                                                        <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                                                                    ) : (
                                                                        <Save className="h-3.5 w-3.5 text-white" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <EvidenciaThumbnail
                                                            evidencia={foto}
                                                            onClick={() => handleOpenLightbox(foto)}
                                                            onEdit={() => handleEditClick(foto)}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {otrasEvidencias.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                        Otras
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {otrasEvidencias.length} foto{otrasEvidencias.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {otrasEvidencias.map((foto) => {
                                        const isEditing = editingEvidenciaId === foto.id_evidencia;
                                        return (
                                            <div key={foto.id_evidencia} className="relative">
                                                {isEditing ? (
                                                    <div className="aspect-square rounded-xl border-2 border-blue-400 bg-blue-50 p-2 flex flex-col gap-2">
                                                        <textarea
                                                            value={editDescripcion}
                                                            onChange={(e) => setEditDescripcion(e.target.value)}
                                                            className="w-full flex-1 text-xs px-2 py-1 border border-blue-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                                                            placeholder="Observación..."
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-1 justify-end">
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="p-1.5 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                                                title="Cancelar"
                                                            >
                                                                <X className="h-3.5 w-3.5 text-gray-600" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveDescripcion(foto.id_evidencia)}
                                                                disabled={updateDescripcionMutation.isPending}
                                                                className="p-1.5 bg-blue-500 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                                                                title="Guardar"
                                                            >
                                                                {updateDescripcionMutation.isPending ? (
                                                                    <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                                                                ) : (
                                                                    <Save className="h-3.5 w-3.5 text-white" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <EvidenciaThumbnail
                                                        evidencia={foto}
                                                        onClick={() => handleOpenLightbox(foto)}
                                                        onEdit={() => handleEditClick(foto)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Visor Profesional PhotoLightbox */}
            {lightboxIndex !== null && lightboxImages.length > 0 && (
                <PhotoLightbox
                    isOpen={lightboxIndex !== null}
                    images={lightboxImages}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={(newIdx) => setLightboxIndex(newIdx)}
                    canEdit={true}
                    onEdit={(img) => {
                        const target = evidenciasSinGeneral.find(e => e.id_evidencia === Number(img.id));
                        if (target) {
                            setLightboxIndex(null);
                            handleEditClick(target);
                        }
                    }}
                />
            )}
        </div>
    );
}
