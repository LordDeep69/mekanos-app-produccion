/**
 * MEKANOS S.A.S - Portal Admin
 * Galería de Evidencias Fotográficas con Lightbox
 * 
 * Visualización avanzada de fotos agrupadas por tipo.
 */

'use client';

import { cn } from '@/lib/utils';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    ExternalLink,
    Image as ImageIcon,
    Loader2,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

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
    actividad_asociada?: {
        descripcion_actividad?: string;
    };
}

interface EvidenciasGalleryProps {
    evidencias: Evidencia[];
    isLoading?: boolean;
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
    onClick
}: {
    evidencia: Evidencia;
    onClick: () => void;
}) {
    const fotoUrl = evidencia.ruta_archivo || evidencia.url_foto ||
        (evidencia.foto_base64 ? `data:image/jpeg;base64,${evidencia.foto_base64}` : null);

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
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized={fotoUrl.startsWith('data:')}
                />
            ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    {evidencia.actividad_asociada?.descripcion_actividad && (
                        <p className="text-white/80 text-[10px] font-medium truncate mb-0.5">
                            📋 {evidencia.actividad_asociada.descripcion_actividad}
                        </p>
                    )}
                    <p className="text-white text-xs font-medium truncate">
                        {evidencia.tipo_evidencia} - {evidencia.descripcion || 'Sin descripción'}
                    </p>
                </div>
                <div className="absolute top-2 right-2">
                    <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
                </div>
            </div>
        </div>
    );
}

function Lightbox({
    evidencias,
    currentIndex,
    onClose,
    onPrev,
    onNext
}: {
    evidencias: Evidencia[];
    currentIndex: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    const evidencia = evidencias[currentIndex];
    const fotoUrl = evidencia.ruta_archivo || evidencia.url_foto ||
        (evidencia.foto_base64 ? `data:image/jpeg;base64,${evidencia.foto_base64}` : null);

    const tipoConfig = TIPO_CONFIG[evidencia.tipo_evidencia] || TIPO_CONFIG.ANTES;
    const fechaCaptura = evidencia.fecha_captura
        ? new Date(evidencia.fecha_captura).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
        : null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onClick={onClose}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 bg-black/50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border",
                        tipoConfig.bgColor,
                        tipoConfig.color,
                        tipoConfig.borderColor
                    )}>
                        {tipoConfig.label}
                    </span>
                    <span className="text-white/60 text-sm">
                        {currentIndex + 1} / {evidencias.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {evidencia.url_foto && (
                        <>
                            <a
                                href={evidencia.url_foto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                            <a
                                href={evidencia.url_foto}
                                download
                                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Download className="h-5 w-5" />
                            </a>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Imagen */}
            <div
                className="flex-1 flex items-center justify-center p-4 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón anterior */}
                {evidencias.length > 1 && (
                    <button
                        onClick={onPrev}
                        className="absolute left-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                )}

                {/* Imagen principal */}
                {fotoUrl && (
                    <div className="relative max-w-5xl max-h-[70vh] w-full h-full">
                        <Image
                            src={fotoUrl}
                            alt={evidencia.descripcion || 'Evidencia'}
                            fill
                            className="object-contain"
                            unoptimized={fotoUrl.startsWith('data:')}
                        />
                    </div>
                )}

                {/* Botón siguiente */}
                {evidencias.length > 1 && (
                    <button
                        onClick={onNext}
                        className="absolute right-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                )}
            </div>

            {/* Footer con metadata */}
            <div
                className="p-4 bg-black/50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="max-w-3xl mx-auto space-y-2">
                    {/* Actividad asociada (leyenda principal) */}
                    {evidencia.actividad_asociada?.descripcion_actividad && (
                        <div className="text-center">
                            <span className="text-white/50 text-xs uppercase tracking-wider">Actividad:</span>
                            <p className="text-white font-bold text-sm">
                                📋 {evidencia.actividad_asociada.descripcion_actividad}
                            </p>
                        </div>
                    )}
                    {/* Descripción de la foto */}
                    {evidencia.descripcion && (
                        <p className="text-white/80 text-center text-sm">
                            {evidencia.tipo_evidencia} - {evidencia.descripcion}
                        </p>
                    )}
                    {/* Metadata */}
                    <div className="flex items-center justify-center gap-4 text-white/60 text-xs">
                        {fechaCaptura && (
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {fechaCaptura}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function EvidenciasGallery({ evidencias, isLoading }: EvidenciasGalleryProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // GENERAL photos are managed separately in GaleriaFotosGenerales (CRUD)
    const evidenciasSinGeneral = evidencias.filter((ev) => ev.tipo_evidencia !== 'GENERAL');

    const tiposEvidencia = ['ANTES', 'DURANTE', 'DESPUES', 'INSUMOS', 'MEDICION'] as const;
    const evidenciasPorTipo = tiposEvidencia.reduce((acc, tipo) => {
        acc[tipo] = evidenciasSinGeneral.filter((ev) => ev.tipo_evidencia === tipo);
        return acc;
    }, {} as Record<string, Evidencia[]>);

    const otrasEvidencias = evidenciasSinGeneral.filter(
        (ev) => !tiposEvidencia.includes(ev.tipo_evidencia as any)
    );

    const handleOpenLightbox = (evidencia: Evidencia) => {
        const index = evidenciasSinGeneral.findIndex((ev) => ev.id_evidencia === evidencia.id_evidencia);
        setLightboxIndex(index);
    };

    const handlePrev = () => {
        if (lightboxIndex !== null) {
            setLightboxIndex((lightboxIndex - 1 + evidenciasSinGeneral.length) % evidenciasSinGeneral.length);
        }
    };

    const handleNext = () => {
        if (lightboxIndex !== null) {
            setLightboxIndex((lightboxIndex + 1) % evidenciasSinGeneral.length);
        }
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

                {/* Contadores por tipo */}
                <div className="flex items-center gap-2">
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
                                        {fotos.map((foto) => (
                                            <EvidenciaThumbnail
                                                key={foto.id_evidencia}
                                                evidencia={foto}
                                                onClick={() => handleOpenLightbox(foto)}
                                            />
                                        ))}
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
                                    {otrasEvidencias.map((foto) => (
                                        <EvidenciaThumbnail
                                            key={foto.id_evidencia}
                                            evidencia={foto}
                                            onClick={() => handleOpenLightbox(foto)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <Lightbox
                    evidencias={evidenciasSinGeneral}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
        </div>
    );
}
