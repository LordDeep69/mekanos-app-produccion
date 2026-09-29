/**
 * MEKANOS S.A.S - Portal Admin
 * Componente Modal y Barra Sutil de Descarga de Evidencias Fotográficas en ZIP
 * 
 * Permite descargar fotos de la orden organizadas en un archivo comprimido .ZIP:
 * 1. Solo Fotos Generales
 * 2. Solo Evidencias Fotográficas (de actividades)
 * 3. Todas las fotos en carpetas estructuradas
 */

'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
    Download,
    FolderDown,
    Camera,
    CheckCircle2,
    Loader2,
    AlertCircle,
    X,
    FileArchive,
    Layers,
    ListChecks,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    descargarEvidenciasZip,
    esEvidenciaGeneral,
    type ModoDescargaEvidencias,
    type EvidenciaParaDescarga,
    type ProgresoDescargaZip,
} from '../utils/descargar-evidencias-zip';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface DescargarEvidenciasModalProps {
    numeroOrden: string;
    evidencias: EvidenciaParaDescarga[];
    idOrdenServicio?: number;
    lotes?: Array<{ idLoteGaleria: number; nombreLote: string }>;
    isOpen: boolean;
    onClose: () => void;
    initialMode?: ModoDescargaEvidencias;
}

export function DescargarEvidenciasModal({
    numeroOrden,
    evidencias,
    idOrdenServicio,
    lotes = [],
    isOpen,
    onClose,
    initialMode = 'TODAS',
}: DescargarEvidenciasModalProps) {
    const [modo, setModo] = useState<ModoDescargaEvidencias>(initialMode);
    const [isDownloading, setIsDownloading] = useState(false);
    const [progreso, setProgreso] = useState<ProgresoDescargaZip | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Obtener lotes si no se pasaron explícitamente
    const { data: lotesData } = useQuery({
        queryKey: ['galeria-lotes', idOrdenServicio],
        queryFn: async () => {
            if (!idOrdenServicio) return [];
            try {
                const res = await apiClient.get(`/galeria-lotes/orden/${idOrdenServicio}`);
                return (res.data || []) as Array<{ idLoteGaleria: number; nombreLote: string }>;
            } catch {
                return [];
            }
        },
        enabled: !!idOrdenServicio && lotes.length === 0,
    });
    const lotesEfectivos = lotes.length > 0 ? lotes : (lotesData || []);

    // Contadores en tiempo real
    const fotosGenerales = useMemo(() => evidencias.filter(esEvidenciaGeneral), [evidencias]);
    const fotosActividades = useMemo(() => evidencias.filter((e) => !esEvidenciaGeneral(e)), [evidencias]);
    const totalFotos = evidencias.length;

    const conteoActual =
        modo === 'GENERALES'
            ? fotosGenerales.length
            : modo === 'ACTIVIDADES'
                ? fotosActividades.length
                : totalFotos;

    const handleIniciarDescarga = async () => {
        if (conteoActual === 0) {
            toast.error('No hay imágenes disponibles para descargar en la opción seleccionada.');
            return;
        }

        setIsDownloading(true);
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const resultado = await descargarEvidenciasZip({
                numeroOrden,
                evidencias,
                modo,
                lotes: lotesEfectivos,
                abortSignal: abortController.signal,
                onProgress: (p) => {
                    setProgreso(p);
                },
            });

            if (resultado.success) {
                toast.success(
                    `¡ZIP descargado exitosamente! ${resultado.descargadas} fotos empaquetadas.`
                );
                // Cerrar modal tras breve pausa
                setTimeout(() => {
                    setIsDownloading(false);
                    setProgreso(null);
                    onClose();
                }, 1500);
            }
        } catch (error: any) {
            if (error?.name === 'AbortError' || abortController.signal.aborted) {
                toast.info('Descarga cancelada');
            } else {
                console.error('[DescargarEvidencias] Error:', error);
                toast.error(error?.message || 'Error al empaquetar las imágenes.');
            }
            setIsDownloading(false);
            setProgreso(null);
        } finally {
            abortControllerRef.current = null;
        }
    };

    const handleCancelar = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsDownloading(false);
        setProgreso(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative">
                    <button
                        onClick={isDownloading ? handleCancelar : onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Cerrar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                            <FolderDown className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">Descargar Evidencias Fotográficas</h3>
                            <p className="text-xs text-white/80">
                                Orden {numeroOrden} · Archivo comprimido .ZIP
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-4">
                    {!isDownloading ? (
                        <>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Seleccione qué grupo de imágenes desea exportar. Cada archivo se nombrará automáticamente con su fase y descripción registrada (ejemplo:{' '}
                                <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono text-indigo-700">
                                    DURANTE_Inspeccion_bomba.jpg
                                </code>
                                ) dentro de una carpeta con el número de la orden.
                            </p>

                            {/* Opciones de descarga */}
                            <div className="space-y-2.5">
                                {/* Opción 1: Todas las fotos */}
                                <button
                                    type="button"
                                    onClick={() => setModo('TODAS')}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between",
                                        modo === 'TODAS'
                                            ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                            modo === 'TODAS' ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                                        )}>
                                            <Layers className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                Todas las Fotos
                                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                    Recomendado
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Estructura organizada en subcarpetas (Generales y Actividades)
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white border rounded-lg text-xs font-bold text-gray-700 shadow-2xs">
                                        {totalFotos} foto{totalFotos !== 1 ? 's' : ''}
                                    </span>
                                </button>

                                {/* Opción 2: Solo Fotos Generales */}
                                <button
                                    type="button"
                                    onClick={() => setModo('GENERALES')}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between",
                                        modo === 'GENERALES'
                                            ? "border-purple-600 bg-purple-50/50 shadow-sm"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                            modo === 'GENERALES' ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500"
                                        )}>
                                            <Camera className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                Solo Fotos Generales del Servicio
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Fotos panorámicas y lotes de galería
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white border rounded-lg text-xs font-bold text-purple-700 shadow-2xs">
                                        {fotosGenerales.length} foto{fotosGenerales.length !== 1 ? 's' : ''}
                                    </span>
                                </button>

                                {/* Opción 3: Solo Evidencias de Actividades */}
                                <button
                                    type="button"
                                    onClick={() => setModo('ACTIVIDADES')}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between",
                                        modo === 'ACTIVIDADES'
                                            ? "border-blue-600 bg-blue-50/50 shadow-sm"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                            modo === 'ACTIVIDADES' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                                        )}>
                                            <ListChecks className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                Solo Evidencias Fotográficas
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Fotos asociadas a cada item/actividad del servicio
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white border rounded-lg text-xs font-bold text-blue-700 shadow-2xs">
                                        {fotosActividades.length} foto{fotosActividades.length !== 1 ? 's' : ''}
                                    </span>
                                </button>
                            </div>

                            {/* Resumen de estructura resultante */}
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-600 flex items-start gap-2.5">
                                <FileArchive className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        Archivo de salida:{' '}
                                        <span className="font-mono text-indigo-600 font-bold">
                                            {numeroOrden}_
                                            {modo === 'GENERALES'
                                                ? 'Fotos_Generales'
                                                : modo === 'ACTIVIDADES'
                                                    ? 'Evidencias_Actividades'
                                                    : 'Todas_Las_Evidencias'}
                                            .zip
                                        </span>
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Al abrirse el archivo ZIP se descomprime una carpeta organizada con el nombre exacto de la orden.
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Estado de descarga y progreso interactivo */
                        <div className="py-6 space-y-4 text-center">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center relative">
                                {progreso?.fase === 'completado' ? (
                                    <CheckCircle2 className="h-7 w-7 text-emerald-600 animate-in zoom-in" />
                                ) : (
                                    <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-gray-900">
                                    {progreso?.fase === 'comprimiendo'
                                        ? 'Empaquetando archivo ZIP...'
                                        : progreso?.fase === 'completado'
                                            ? '¡Descarga completada!'
                                            : 'Descargando imágenes de alta resolución...'}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto truncate">
                                    {progreso?.mensaje || 'Procesando imágenes...'}
                                </p>
                            </div>

                            {/* Barra de progreso */}
                            <div className="space-y-1.5 max-w-sm mx-auto">
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-300 rounded-full",
                                            progreso?.fase === 'completado' ? "bg-emerald-500" : "bg-indigo-600"
                                        )}
                                        style={{ width: `${progreso?.porcentaje || 0}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] font-mono text-gray-500 font-bold">
                                    <span>
                                        {progreso?.actual || 0} de {progreso?.total || conteoActual} fotos
                                    </span>
                                    <span>{progreso?.porcentaje || 0}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    {!isDownloading ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleIniciarDescarga}
                                disabled={conteoActual === 0}
                                className={cn(
                                    "px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2",
                                    conteoActual === 0
                                        ? "bg-gray-300 cursor-not-allowed"
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-indigo-200 active:scale-98"
                                )}
                            >
                                <Download className="h-4 w-4" />
                                Descargar {conteoActual} Foto{conteoActual !== 1 ? 's' : ''} (ZIP)
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCancelar}
                            className="px-4 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                        >
                            Cancelar Descarga
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Barra o Botón Sutil para insertar directamente en la sección 'DOCUMENTOS'
 */
export function BarraSutilDescargaEvidencias({
    numeroOrden,
    evidencias,
    idOrdenServicio,
    lotes = [],
}: {
    numeroOrden: string;
    evidencias: EvidenciaParaDescarga[];
    idOrdenServicio?: number;
    lotes?: Array<{ idLoteGaleria: number; nombreLote: string }>;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [initialMode, setInitialMode] = useState<ModoDescargaEvidencias>('TODAS');

    const fotosGenerales = useMemo(() => evidencias.filter(esEvidenciaGeneral), [evidencias]);
    const fotosActividades = useMemo(() => evidencias.filter((e) => !esEvidenciaGeneral(e)), [evidencias]);
    const total = evidencias.length;

    if (total === 0) return null;

    const handleAbrirConModo = (modoSeleccionado: ModoDescargaEvidencias) => {
        setInitialMode(modoSeleccionado);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-indigo-100 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                        <Camera className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-900">
                                Evidencias Fotográficas de la Orden
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-[10px] font-bold text-indigo-700 shadow-2xs">
                                {total} foto{total !== 1 ? 's' : ''} en total
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            {fotosGenerales.length} generales · {fotosActividades.length} de actividades
                        </p>
                    </div>
                </div>

                {/* Botón sutil de descarga */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleAbrirConModo('TODAS')}
                        className="px-3.5 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 active:scale-98"
                        title="Abrir opciones de descarga de fotos en ZIP"
                    >
                        <Download className="h-3.5 w-3.5 text-indigo-600" />
                        Descargar Fotos (ZIP)
                    </button>
                </div>
            </div>

            <DescargarEvidenciasModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                numeroOrden={numeroOrden}
                idOrdenServicio={idOrdenServicio}
                evidencias={evidencias}
                lotes={lotes}
                initialMode={initialMode}
            />
        </>
    );
}

/**
 * Botón sutil de 1 clic para colocar en el encabezado de Galería de Fotos Generales
 */
export function BotonDescargaFotosGenerales({
    numeroOrden,
    evidencias,
    idOrdenServicio,
    lotes = [],
}: {
    numeroOrden: string;
    evidencias: EvidenciaParaDescarga[];
    idOrdenServicio?: number;
    lotes?: Array<{ idLoteGaleria: number; nombreLote: string }>;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const fotosGenerales = useMemo(() => evidencias.filter(esEvidenciaGeneral), [evidencias]);

    if (fotosGenerales.length === 0) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-2.5 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 hover:border-purple-300 text-purple-700 rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1.5"
                title="Descargar fotos generales en archivo ZIP"
            >
                <Download className="h-3 w-3 text-purple-600" />
                Descargar Generales ({fotosGenerales.length})
            </button>
            <DescargarEvidenciasModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                numeroOrden={numeroOrden}
                idOrdenServicio={idOrdenServicio}
                evidencias={evidencias}
                lotes={lotes}
                initialMode="GENERALES"
            />
        </>
    );
}

/**
 * Botón sutil de 1 clic para colocar en el encabezado de Evidencias de Actividades
 */
export function BotonDescargaEvidenciasActividades({
    numeroOrden,
    evidencias,
    idOrdenServicio,
}: {
    numeroOrden: string;
    evidencias: EvidenciaParaDescarga[];
    idOrdenServicio?: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const fotosActividades = useMemo(() => evidencias.filter((e) => !esEvidenciaGeneral(e)), [evidencias]);

    if (fotosActividades.length === 0) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 text-blue-700 rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1.5"
                title="Descargar fotos de actividades en archivo ZIP"
            >
                <Download className="h-3 w-3 text-blue-600" />
                Descargar Evidencias ({fotosActividades.length})
            </button>
            <DescargarEvidenciasModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                numeroOrden={numeroOrden}
                idOrdenServicio={idOrdenServicio}
                evidencias={evidencias}
                initialMode="ACTIVIDADES"
            />
        </>
    );
}
