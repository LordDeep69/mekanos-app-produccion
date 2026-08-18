/**
 * MEKANOS S.A.S - Portal Admin
 * Galería de Fotos Generales del Servicio
 * 
 * Componente CRUD para gestionar fotos GENERALES (no asociadas a actividad).
 * Permite subir, ver en lightbox y eliminar fotos generales de una orden.
 */

'use client';

import { fileToBase64, useImageDropPaste } from '@/hooks/use-image-drop-paste';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Camera,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clipboard,
    Clock,
    Edit2,
    History,
    Image as ImageIcon,
    LayoutGrid,
    Loader2,
    Plus,
    Save,
    Trash2,
    Upload,
    Wrench,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
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
    id_orden_equipo?: number | null;
    idOrdenEquipo?: number | null;
}

interface GaleriaFotosGeneralesProps {
    idOrdenServicio: number;
    /** Si se establece, solo se muestran fotos asignadas a este id_orden_equipo */
    idOrdenEquipoFiltro?: number | null;
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
    GENERAL: 'bg-teal-500',
};

// ✅ FIX 06-AGO-2026: Selector visual de fase (ANTES/DURANTE/DESPUES/GENERAL)
// Reemplaza la práctica de escribir "ANTES:" a mano en la descripción.
// La fase se inyecta como prefijo "FASE: " para mantener compatibilidad con
// el filtro de galería, el mobile y la clasificación del PDF.
type FaseFoto = 'GENERAL' | 'ANTES' | 'DURANTE' | 'DESPUES';
type FaseOpcion = FaseFoto | 'TODAS';

// ✅ FIX 06-AGO-2026: Descripción por defecto según la fase seleccionada
const FASE_DESCRIPCION_DEFECTO: Record<FaseFoto, string> = {
    GENERAL: 'Foto general del servicio',
    ANTES: 'Foto general de antes',
    DURANTE: 'Foto general de durante',
    DESPUES: 'Foto general de después',
};

const FASES_FOTO: { valor: FaseOpcion; label: string; icono: React.ReactNode; activo: string }[] = [
    { valor: 'TODAS', label: 'Todas', icono: <LayoutGrid className="h-3.5 w-3.5" />, activo: 'border-purple-400 bg-purple-50 text-purple-700' },
    { valor: 'GENERAL', label: 'General', icono: <ImageIcon className="h-3.5 w-3.5" />, activo: 'border-teal-400 bg-teal-50 text-teal-700' },
    { valor: 'ANTES', label: 'Antes', icono: <History className="h-3.5 w-3.5" />, activo: 'border-blue-400 bg-blue-50 text-blue-700' },
    { valor: 'DURANTE', label: 'Durante', icono: <Wrench className="h-3.5 w-3.5" />, activo: 'border-amber-400 bg-amber-50 text-amber-700' },
    { valor: 'DESPUES', label: 'Después', icono: <CheckCircle2 className="h-3.5 w-3.5" />, activo: 'border-green-400 bg-green-50 text-green-700' },
];

function SelectorFase({
    valor,
    onChange,
    incluirTodas = false,
}: {
    valor: FaseOpcion;
    onChange: (v: FaseOpcion) => void;
    /** Mostrar la opción "Todas" (para filtrar la galería) */
    incluirTodas?: boolean;
}) {
    const fases = incluirTodas ? FASES_FOTO : FASES_FOTO.filter((f) => f.valor !== 'TODAS');
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {fases.map((f) => {
                const activo = valor === f.valor;
                return (
                    <button
                        key={f.valor}
                        type="button"
                        onClick={() => onChange(f.valor)}
                        title={activo ? `Fase: ${f.label}` : `Marcar como ${f.label}`}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all",
                            activo
                                ? f.activo + " shadow-sm"
                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        )}
                    >
                        <span className={cn(
                            "flex items-center justify-center rounded-full p-0.5 text-white shrink-0",
                            activo ? "bg-purple-600" : "bg-gray-300"
                        )}>
                            {f.icono}
                        </span>
                        {f.label}
                    </button>
                );
            })}
        </div>
    );
}

function FotoThumbnail({
    evidencia,
    onView,
    onDelete,
    onEdit,
}: {
    evidencia: Evidencia;
    onView: () => void;
    onDelete: () => void;
    onEdit?: () => void;
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
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="p-2 bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                                title="Editar observación"
                            >
                                <Edit2 className="h-4 w-4 text-white" />
                            </button>
                        )}
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
                        {(() => {
                            const { descripcionLimpia } = getSubTipo(evidencia);
                            return descripcionLimpia && (
                                <p className="text-xs text-white/70">{descripcionLimpia}</p>
                            );
                        })()}
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

export function GaleriaFotosGenerales({ idOrdenServicio, idOrdenEquipoFiltro = null }: GaleriaFotosGeneralesProps) {
    const queryClient = useQueryClient();
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [descripcionNueva, setDescripcionNueva] = useState('');
    // ✅ FIX 06-AGO-2026: Selector único de fase — filtra la galería y define
    // la fase de las fotos a subir (TODAS ⇒ se suben como GENERAL)
    const [filtroFase, setFiltroFase] = useState<FaseOpcion>('TODAS');

    // ✅ FIX 02-MAY-2026: Soporte drag-drop, paste y multi-file
    const uploadFiles = async (files: File[]) => {
        setIsUploading(true);
        let uploaded = 0;
        try {
            // ✅ FIX 06-AGO-2026: La fase se toma del selector único (Ver).
            // Si no hay descripción, usar texto por defecto según la fase.
            const faseSubida: FaseFoto = filtroFase === 'TODAS' ? 'GENERAL' : filtroFase;
            const descripcionBase = descripcionNueva.trim();
            const descripcionFinal = faseSubida === 'GENERAL'
                ? (descripcionBase || FASE_DESCRIPCION_DEFECTO.GENERAL)
                : descripcionBase
                    ? `${faseSubida}: ${descripcionBase}`
                    : `${faseSubida}: ${FASE_DESCRIPCION_DEFECTO[faseSubida]}`;
            for (const file of files) {
                setUploadProgress(`${uploaded + 1}/${files.length}`);
                const base64 = await fileToBase64(file);
                await apiClient.post('/evidencias-fotograficas/upload-base64', {
                    idOrdenServicio,
                    tipoEvidencia: 'GENERAL',
                    descripcion: descripcionFinal,
                    nombreArchivo: file.name,
                    base64,
                });
                uploaded++;
            }
            queryClient.invalidateQueries({ queryKey: ['evidencias-generales', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            setDescripcionNueva('');
            toast.success(files.length === 1 ? 'Foto general subida exitosamente' : `${uploaded} fotos generales subidas`);
        } catch (error) {
            console.error('Error uploading general photo:', error);
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

    const fotosGeneralesRaw: Evidencia[] = evidenciasData?.data || [];

    // ✅ MULTI-EQUIPO: Filtrar por id_orden_equipo si se especifica
    const fotosGenerales: Evidencia[] = idOrdenEquipoFiltro != null
        ? fotosGeneralesRaw.filter((e) => (e.id_orden_equipo ?? e.idOrdenEquipo ?? null) === idOrdenEquipoFiltro)
        : fotosGeneralesRaw;

    // ✅ FIX 06-AGO-2026: Filtrar la galería por fase seleccionada
    // (GENERAL = fotos sin prefijo de fase; ANTES/DURANTE/DESPUES = con prefijo)
    const fotosFiltradas: Evidencia[] = useMemo(() => {
        if (filtroFase === 'TODAS') return fotosGenerales;
        return fotosGenerales.filter((e) => {
            const { subTipo } = getSubTipo(e);
            if (filtroFase === 'GENERAL') return !subTipo;
            return subTipo === filtroFase;
        });
    }, [fotosGenerales, filtroFase]);

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

    // ✅ Edición inline de observación
    const [editingEvidenciaId, setEditingEvidenciaId] = useState<number | null>(null);
    const [editDescripcion, setEditDescripcion] = useState('');
    // ✅ FIX 06-AGO-2026: Fase seleccionada al editar (detectada del prefijo existente)
    const [editFase, setEditFase] = useState<FaseFoto>('GENERAL');

    const updateDescripcionMutation = useMutation({
        mutationFn: async ({ id, descripcion }: { id: number; descripcion: string }) => {
            const res = await apiClient.put(`/evidencias-fotograficas/${id}`, { descripcion });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidencias-generales', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            toast.success('Observación actualizada');
            setEditingEvidenciaId(null);
            setEditDescripcion('');
            setEditFase('GENERAL');
        },
        onError: () => {
            toast.error('Error al actualizar observación');
        },
    });

    const handleEditClick = (evidencia: Evidencia) => {
        // ✅ FIX 06-AGO-2026: Detectar fase actual del prefijo y pre-seleccionarla
        const { subTipo, descripcionLimpia } = getSubTipo(evidencia);
        setEditingEvidenciaId(getEvId(evidencia));
        setEditFase(subTipo === 'ANTES' || subTipo === 'DURANTE' || subTipo === 'DESPUES' ? subTipo : 'GENERAL');
        setEditDescripcion(descripcionLimpia || evidencia.descripcion || '');
    };

    const handleSaveDescripcion = (idEvidencia: number) => {
        // ✅ FIX 06-AGO-2026: Reconstruir descripción con prefijo de fase seleccionado
        const texto = editDescripcion.trim();
        const descripcionFinal = editFase === 'GENERAL'
            ? texto
            : texto
                ? `${editFase}: ${texto}`
                : `${editFase}:`;
        updateDescripcionMutation.mutate({ id: idEvidencia, descripcion: descripcionFinal });
    };

    const handleCancelEdit = () => {
        setEditingEvidenciaId(null);
        setEditDescripcion('');
        setEditFase('GENERAL');
    };

    const handleViewLightbox = (evidencia: Evidencia) => {
        const evId = getEvId(evidencia);
        const idx = fotosFiltradas.findIndex((e) => getEvId(e) === evId);
        setLightboxIndex(idx >= 0 ? idx : 0);
    };

    // Abrir selector de archivos
    const handleUploadClick = () => openFilePicker();

    return (
        <div ref={setDropZoneRef} className={cn(
            "bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all relative",
            isDragging ? "border-purple-400 ring-4 ring-purple-100" : "border-purple-200"
        )}>
            {/* Overlay drag-drop */}
            {isDragging && (
                <div className="absolute inset-0 z-20 bg-purple-50/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none rounded-xl">
                    <Upload className="h-10 w-10 text-purple-500 animate-bounce" />
                    <p className="text-base font-bold text-purple-700">Suelte las imágenes aquí</p>
                    <p className="text-xs text-purple-500">Se subirán como fotos generales del servicio</p>
                </div>
            )}

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
                            {fotosGenerales.length > 0 && (
                                <> · {filtroFase !== 'TODAS' ? `${fotosFiltradas.length} de ` : ''}{fotosGenerales.length} foto{fotosGenerales.length !== 1 ? 's' : ''}</>
                            )}
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
                    title="Clic para seleccionar, arrastrar imágenes o pegar (Ctrl+V)"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {uploadProgress && <span>{uploadProgress}</span>}
                        </>
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    {isUploading ? 'Subiendo...' : 'Agregar Foto'}
                </button>
            </div>

            {/* Hidden file input (multi-select habilitado) */}
            <input {...inputProps} />

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
                {/* ✅ FIX 06-AGO-2026: Selector único de fase — filtra la galería
                    y define la fase de las fotos a subir (TODAS ⇒ GENERAL) */}
                <div className="mb-3 flex items-center gap-2 flex-wrap border-b border-purple-50 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-purple-500 shrink-0">
                        Ver
                    </span>
                    <SelectorFase
                        valor={filtroFase}
                        onChange={setFiltroFase}
                        incluirTodas
                    />
                </div>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    </div>
                ) : fotosGenerales.length === 0 ? (
                    <div
                        onClick={handleUploadClick}
                        className="text-center py-8 text-purple-300 cursor-pointer hover:bg-purple-50/50 rounded-xl transition-colors"
                    >
                        <Camera className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="font-medium text-sm">Sin fotos generales</p>
                        <p className="text-xs mt-1 text-purple-400">
                            Clic, arrastrar imágenes o pegar con Ctrl+V
                        </p>
                        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-purple-300">
                            <span className="flex items-center gap-1"><Upload className="h-3 w-3" /> Arrastrar</span>
                            <span className="flex items-center gap-1"><Clipboard className="h-3 w-3" /> Ctrl+V</span>
                        </div>
                    </div>
                ) : fotosFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 rounded-xl">
                        <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="font-medium text-sm">Sin fotos en esta fase</p>
                        <p className="text-xs mt-1 text-gray-300">
                            Elige otra fase o selecciona "Todas"
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {fotosFiltradas.map((evidencia) => {
                            const evId = getEvId(evidencia);
                            const isEditing = editingEvidenciaId === evId;
                            return (
                                <div key={evId} className="relative">
                                    {isEditing ? (
                                        <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-2 flex flex-col gap-2 min-h-[170px]">
                                            <SelectorFase
                                                valor={editFase}
                                                onChange={(v) => { if (v !== 'TODAS') setEditFase(v); }}
                                            />
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
                                                    onClick={() => handleSaveDescripcion(evId)}
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
                                        <FotoThumbnail
                                            evidencia={evidencia}
                                            onView={() => handleViewLightbox(evidencia)}
                                            onDelete={() => handleDelete(evId)}
                                            onEdit={() => handleEditClick(evidencia)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && fotosFiltradas[lightboxIndex] && (
                <LightboxModal
                    evidencia={fotosFiltradas[lightboxIndex]}
                    onClose={() => setLightboxIndex(null)}
                    onPrev={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
                    onNext={() => setLightboxIndex(Math.min(fotosFiltradas.length - 1, lightboxIndex + 1))}
                    hasPrev={lightboxIndex > 0}
                    hasNext={lightboxIndex < fotosFiltradas.length - 1}
                    currentIndex={lightboxIndex}
                    total={fotosFiltradas.length}
                />
            )}
        </div>
    );
}
