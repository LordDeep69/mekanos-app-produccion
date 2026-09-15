/**
 * MEKANOS S.A.S - Portal Admin
 * Galería de Fotos Generales del Servicio
 *
 * Componente CRUD para gestionar fotos GENERALES (no asociadas a actividad).
 * Permite subir, ver en lightbox y eliminar fotos generales de una orden.
 *
 * ✅ FIX 20-AGO-2026: GALERÍA POR LOTES
 * Permite crear LOTES de galería (ej. "Fotos del 08/26", "Fotos del 09/26")
 * para mantener el orden de secuencias de fotos. Cada lote:
 * - Tiene su propio NOMBRE (título del contenedor en el PDF)
 * - Tiene sus apartados ANTES/DURANTE/DESPUÉS
 * - Alimenta sus fotos de forma independiente (id_lote_galeria en BD)
 * - En el PDF se renderiza en un contenedor sólido distinto por lote
 * El grupo estándar muestra solo fotos SIN lote; el PDF separa ambos.
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
    FolderPlus,
    History,
    Image as ImageIcon,
    LayoutGrid,
    Loader2,
    Package,
    Plus,
    Save,
    Trash2,
    Upload,
    Wrench,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    id_lote_galeria?: number | null;
    idLoteGaleria?: number | null;
}

interface LoteGaleria {
    idLoteGaleria: number;
    idOrdenServicio: number;
    nombreLote: string;
    ordenLote: number;
    fechaCreacion?: string;
    cantidadFotos?: number;
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
function getEvLote(e: Evidencia): number | null {
    return e.id_lote_galeria ?? e.idLoteGaleria ?? null;
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

// ✅ FIX 20-AGO-2026: Colores de lote para el admin (coinciden con el PDF)
const LOTE_COLORS_ADMIN = [
    { border: 'border-violet-500', bg: 'bg-violet-500', soft: 'bg-violet-50', text: 'text-violet-700' },
    { border: 'border-sky-500', bg: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-700' },
    { border: 'border-green-500', bg: 'bg-green-500', soft: 'bg-green-50', text: 'text-green-700' },
    { border: 'border-amber-500', bg: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700' },
    { border: 'border-pink-500', bg: 'bg-pink-500', soft: 'bg-pink-50', text: 'text-pink-700' },
    { border: 'border-teal-500', bg: 'bg-teal-500', soft: 'bg-teal-50', text: 'text-teal-700' },
];
function getColorLoteAdmin(ordenLote: number) {
    return LOTE_COLORS_ADMIN[(ordenLote || 0) % LOTE_COLORS_ADMIN.length];
}

// ✅ FIX 06-AGO-2026: Selector visual de fase (ANTES/DURANTE/DESPUES/GENERAL)
type FaseFoto = 'GENERAL' | 'ANTES' | 'DURANTE' | 'DESPUES';
type FaseOpcion = FaseFoto | 'TODAS';

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
    titulo,
    onClose,
    onPrev,
    onNext,
    hasPrev,
    hasNext,
    currentIndex,
    total,
}: {
    evidencia: Evidencia;
    titulo?: string;
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
                        <p className="text-sm font-bold">{titulo || '📷 Foto General'}</p>
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

/** ✅ FIX 20-AGO-2026: Grid de fotos agrupado por fase (ANTES/DURANTE/DESPUÉS/GENERAL) */
function GridFotosPorFase({
    fotos,
    onEdit,
    onDelete,
    onView,
    editingEvidenciaId,
    editFase,
    editDescripcion,
    setEditFase,
    setEditDescripcion,
    onCancelEdit,
    onSaveDescripcion,
    isSavingEdit,
}: {
    fotos: Evidencia[];
    onEdit: (ev: Evidencia) => void;
    onView: (ev: Evidencia) => void;
    onDelete: (id: number) => void;
    editingEvidenciaId: number | null;
    editFase: FaseFoto;
    editDescripcion: string;
    setEditFase: (f: FaseFoto) => void;
    setEditDescripcion: (d: string) => void;
    onCancelEdit: () => void;
    onSaveDescripcion: (id: number) => void;
    isSavingEdit: boolean;
}) {
    // Agrupar por fase con orden ANTES → DURANTE → DESPUES → GENERAL
    const grupos: { fase: string; fotos: Evidencia[] }[] = [];
    ['ANTES', 'DURANTE', 'DESPUES', 'GENERAL'].forEach((fase) => {
        const delFase = fotos.filter((e) => {
            const { subTipo } = getSubTipo(e);
            return fase === 'GENERAL' ? !subTipo : subTipo === fase;
        });
        if (delFase.length > 0) grupos.push({ fase, fotos: delFase });
    });
    // Fotos restantes (por seguridad, cualquier otra fase) van al final
    const restantes = fotos.filter((e) => {
        const { subTipo } = getSubTipo(e);
        return !['ANTES', 'DURANTE', 'DESPUES'].includes(subTipo) && subTipo !== '';
    });
    if (restantes.length > 0) grupos.push({ fase: 'OTRO', fotos: restantes });

    return (
        <div className="space-y-3">
            {grupos.map(({ fase, fotos: delFase }) => (
                <div key={fase}>
                    {fase !== 'GENERAL' && fase !== 'OTRO' && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded-md text-[9px] font-bold text-white shadow-sm",
                                SUB_TIPO_COLORS[fase] || 'bg-gray-500'
                            )}>
                                {fase}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                {fase === 'ANTES' ? 'Antes del servicio' : fase === 'DURANTE' ? 'Durante el servicio' : 'Después del servicio'} · {delFase.length}
                            </span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {delFase.map((evidencia) => {
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
                                                    onClick={onCancelEdit}
                                                    className="p-1.5 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <X className="h-3.5 w-3.5 text-gray-600" />
                                                </button>
                                                <button
                                                    onClick={() => onSaveDescripcion(evId)}
                                                    disabled={isSavingEdit}
                                                    className="p-1.5 bg-blue-500 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                                                    title="Guardar"
                                                >
                                                    {isSavingEdit ? (
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
                                            onView={() => onView(evidencia)}
                                            onDelete={() => onDelete(evId)}
                                            onEdit={() => onEdit(evidencia)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * ✅ FIX 20-AGO-2026 v3: Tarjeta de LOTE con subida EN LÍNEA.
 *
 * Registra listeners NATIVOS de drag&drop en fase CAPTURE sobre su propio nodo:
 * el drop dentro de la tarjeta se detiene ahí (stopPropagation) y NO llega al
 * contenedor global (que sube al grupo estándar). Así cada lote recibe
 * exclusivamente sus imágenes, con clic, arrastre o Ctrl+V en su descripción.
 * Incluye overlay de progreso visible durante la subida múltiple.
 */
function TarjetaLoteGaleria({
    lote,
    fotosDelLote,
    colorAdmin,
    faseLoteVista,
    setFaseLote,
    descripcionLote,
    setDescripcionLote,
    isRenombrando,
    nombreRenombrar,
    setNombreRenombrar,
    onGuardarNombre,
    onCancelarRenombrar,
    onRenombrarClick,
    onEliminarLote,
    renombrarPending,
    isUploading,
    subiendoEsteLote,
    uploadCount,
    uploadTotal,
    onUploadFiles,
    onEditClick,
    onViewLightbox,
    onDeleteFoto,
    editingEvidenciaId,
    editFase,
    editDescripcion,
    setEditFase,
    setEditDescripcion,
    onCancelEdit,
    onSaveDescripcion,
    isSavingEdit,
}: {
    lote: LoteGaleria;
    fotosDelLote: Evidencia[];
    colorAdmin: { border: string; bg: string; soft: string; text: string };
    faseLoteVista: FaseOpcion;
    setFaseLote: (v: FaseOpcion) => void;
    descripcionLote: string;
    setDescripcionLote: (d: string) => void;
    isRenombrando: boolean;
    nombreRenombrar: string;
    setNombreRenombrar: (n: string) => void;
    onGuardarNombre: (n: string) => void;
    onCancelarRenombrar: () => void;
    onRenombrarClick: () => void;
    onEliminarLote: () => void;
    renombrarPending: boolean;
    isUploading: boolean;
    subiendoEsteLote: boolean;
    uploadCount: number;
    uploadTotal: number;
    onUploadFiles: (files: File[], idLote: number) => void;
    onEditClick: (ev: Evidencia) => void;
    onViewLightbox: (ev: Evidencia) => void;
    onDeleteFoto: (id: number) => void;
    editingEvidenciaId: number | null;
    editFase: FaseFoto;
    editDescripcion: string;
    setEditFase: (f: FaseFoto) => void;
    setEditDescripcion: (d: string) => void;
    onCancelEdit: () => void;
    onSaveDescripcion: (id: number) => void;
    isSavingEdit: boolean;
}) {
    const tarjetaRef = useRef<HTMLDivElement | null>(null);
    const [dragLocal, setDragLocal] = useState(false);
    const inputLoteId = `input-lote-${lote.idLoteGaleria}`;
    const onUploadFilesRef = useRef(onUploadFiles);
    onUploadFilesRef.current = onUploadFiles;

    // Listeners NATIVOS en fase CAPTURE: el drop del lote no burbujea al
    // contenedor global (evita que las fotos del lote se suban al estándar)
    useEffect(() => {
        const node = tarjetaRef.current;
        if (!node) return;

        const enter = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragLocal(true);
        };
        const leave = (e: DragEvent) => {
            e.stopPropagation();
            setDragLocal(false);
        };
        const over = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };
        const drop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragLocal(false);
            const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
            if (files.length > 0) onUploadFilesRef.current(files, lote.idLoteGaleria);
        };

        node.addEventListener('dragenter', enter, true);
        node.addEventListener('dragleave', leave, true);
        node.addEventListener('dragover', over, true);
        node.addEventListener('drop', drop, true);
        return () => {
            node.removeEventListener('dragenter', enter, true);
            node.removeEventListener('dragleave', leave, true);
            node.removeEventListener('dragover', over, true);
            node.removeEventListener('drop', drop, true);
        };
    }, [lote.idLoteGaleria]);

    // Vista del lote según la fase seleccionada (misma lógica que el estándar)
    const fotosLoteVista = faseLoteVista === 'TODAS'
        ? fotosDelLote
        : fotosDelLote.filter((e) => {
            const { subTipo } = getSubTipo(e);
            if (faseLoteVista === 'GENERAL') return !subTipo;
            return subTipo === faseLoteVista;
        });

    const inputLoteHandler = () => document.getElementById(inputLoteId)?.click();
    const subiendo = subiendoEsteLote && isUploading;
    const progresoPct = uploadTotal > 0 ? Math.round((uploadCount / uploadTotal) * 100) : 0;

    return (
        <div
            ref={tarjetaRef}
            className={cn(
                "rounded-xl border-2 overflow-hidden bg-white shadow-sm relative",
                colorAdmin.border
            )}
        >
            {/* Input file nativo del lote (subida directa) */}
            <input
                id={inputLoteId}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) onUploadFiles(files, lote.idLoteGaleria);
                    e.target.value = '';
                }}
            />

            {/* ✅ v3: Overlay de progreso visible durante la subida al lote */}
            {subiendoEsteLote && isUploading && (
                <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-xl pointer-events-none">
                    <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
                    <p className="text-sm font-bold text-violet-700">
                        Subiendo al lote... {uploadCount}/{uploadTotal}
                    </p>
                    <div className="w-48 h-2 bg-violet-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-600 transition-all duration-300"
                            style={{ width: `${progresoPct}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-violet-400">{progresoPct}%</p>
                </div>
            )}

            {/* Overlay de drag sobre el lote */}
            {dragLocal && !subiendoEsteLote && (
                <div className="absolute inset-0 z-20 bg-violet-50/90 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 rounded-xl pointer-events-none border-4 border-dashed border-violet-400">
                    <Upload className="h-7 w-7 text-violet-500 animate-bounce" />
                    <p className="text-sm font-bold text-violet-700">Suelte para subir al lote</p>
                    <p className="text-[10px] text-violet-500">{lote.nombreLote}</p>
                </div>
            )}

            {/* Header del lote */}
            <div className={cn(
                "px-3 py-2.5 flex items-center gap-2 flex-wrap",
                colorAdmin.soft
            )}>
                <div className={cn("p-1.5 rounded-lg shadow-sm", colorAdmin.bg)}>
                    <Package className="h-4 w-4 text-white" />
                </div>

                {isRenombrando ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                        <input
                            type="text"
                            value={nombreRenombrar}
                            onChange={(e) => setNombreRenombrar(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && nombreRenombrar.trim()) {
                                    onGuardarNombre(nombreRenombrar.trim());
                                }
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-violet-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-400"
                            autoFocus
                            maxLength={100}
                        />
                        <button
                            onClick={() => {
                                const n = nombreRenombrar.trim();
                                if (n) onGuardarNombre(n);
                            }}
                            disabled={renombrarPending}
                            className="p-1.5 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
                            title="Guardar nombre"
                        >
                            {renombrarPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            onClick={onCancelarRenombrar}
                            className="p-1.5 bg-gray-200 rounded hover:bg-gray-300"
                            title="Cancelar"
                        >
                            <X className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                    </div>
                ) : (
                    <span className={cn("font-bold text-sm truncate", colorAdmin.text)}>
                        {lote.nombreLote}
                    </span>
                )}

                <span className="px-2 py-0.5 rounded-full bg-white border text-[10px] font-bold text-gray-600 shadow-sm">
                    {fotosDelLote.length} foto{fotosDelLote.length !== 1 ? 's' : ''}
                </span>

                <div className="ml-auto flex items-center gap-1.5">
                    <button
                        onClick={onRenombrarClick}
                        className="p-1.5 rounded-lg bg-white border text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        title="Renombrar lote"
                    >
                        <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onEliminarLote}
                        className="p-1.5 rounded-lg bg-white border text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors"
                        title="Eliminar lote (las fotos vuelven al grupo estándar)"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={inputLoteHandler}
                        disabled={isUploading}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border-2 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Agregar fotos a este lote (clic, arrastrar o Ctrl+V)"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Foto
                    </button>
                </div>
            </div>

            {/* Contenido del lote — MENÚ CLÁSICO en línea */}
            <div className="p-3">
                <div className="mb-3 flex items-center gap-2 flex-wrap border-b border-purple-50 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-purple-500 shrink-0">
                        Ver
                    </span>
                    <SelectorFase valor={faseLoteVista} onChange={setFaseLote} incluirTodas />
                </div>

                <input
                    type="text"
                    value={descripcionLote}
                    onChange={(e) => setDescripcionLote(e.target.value)}
                    onPaste={(e) => {
                        // ✅ Ctrl+V en la descripción del lote → sube a ESTE lote.
                        // stopPropagation evita que el paste global (grupo estándar) lo procese
                        const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
                        if (files.length > 0) {
                            e.preventDefault();
                            e.stopPropagation();
                            onUploadFiles(files, lote.idLoteGaleria);
                        }
                    }}
                    placeholder="Descripción opcional para la próxima foto..."
                    className="w-full px-3 py-1.5 border border-purple-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 mb-3"
                />

                {fotosDelLote.length === 0 ? (
                    <div
                        onClick={inputLoteHandler}
                        className="text-center py-6 text-gray-400 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        <Package className="h-8 w-8 mx-auto mb-1.5 opacity-30" />
                        <p className="text-xs font-medium">Lote vacío</p>
                        <p className="text-[10px] mt-1 text-gray-300">
                            Clic, arrastrar imágenes aquí o pegar con Ctrl+V en la descripción
                        </p>
                    </div>
                    ) : fotosLoteVista.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                            <Package className="h-6 w-6 mx-auto mb-1 opacity-30" />
                            <p className="text-xs font-medium">Sin fotos en esta fase</p>
                            <p className="text-[10px] mt-1 text-gray-300">Elige otra fase o selecciona "Todas"</p>
                        </div>
                    ) : (
                        <GridFotosPorFase
                            fotos={fotosLoteVista}
                            onEdit={onEditClick}
                            onView={onViewLightbox}
                            onDelete={onDeleteFoto}
                            editingEvidenciaId={editingEvidenciaId}
                            editFase={editFase}
                            editDescripcion={editDescripcion}
                            setEditFase={setEditFase}
                            setEditDescripcion={setEditDescripcion}
                            onCancelEdit={onCancelEdit}
                            onSaveDescripcion={onSaveDescripcion}
                            isSavingEdit={isSavingEdit}
                        />
                    )}
                </div>
            </div>
        );
}

export function GaleriaFotosGenerales({ idOrdenServicio, idOrdenEquipoFiltro = null }: GaleriaFotosGeneralesProps) {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    // ✅ v3: Progreso visible — saber a dónde se está subiendo y cuántas van
    const [uploadLoteId, setUploadLoteId] = useState<number | null>(null);
    const [uploadTotal, setUploadTotal] = useState(0);
    const [uploadCount, setUploadCount] = useState(0);
    const [descripcionNueva, setDescripcionNueva] = useState('');
    const [filtroFase, setFiltroFase] = useState<FaseOpcion>('TODAS');

    // ✅ FIX 20-AGO-2026: Estado de LOTES
    const [dialogNuevoLote, setDialogNuevoLote] = useState(false);
    const [nombreNuevoLote, setNombreNuevoLote] = useState('');
    // ✅ FIX 20-AGO-2026 v2: Cada lote funciona EN LÍNEA (sin modal):
    // - faseLoteActiva[loteId]: fase de vista/subida del lote (TODAS ⇒ GENERAL)
    // - descripcionLote[loteId]: descripción opcional en línea del lote
    // - Subida directa: clic en zona vacía, arrastrar sobre la tarjeta o
    //   pegar (Ctrl+V) en el campo de descripción del lote
    const [faseLoteActiva, setFaseLoteActiva] = useState<Record<number, FaseOpcion>>({});
    const [descripcionLote, setDescripcionLote] = useState<Record<number, string>>({});
    const [renombrandoLoteId, setRenombrandoLoteId] = useState<number | null>(null);
    const [nombreRenombrar, setNombreRenombrar] = useState('');

    // ============================================================
    // QUERY: evidencias generales de la orden
    // ============================================================
    const { data: evidenciasData, isLoading } = useQuery({
        queryKey: ['evidencias-generales', idOrdenServicio],
        queryFn: async () => {
            try {
                const res = await apiClient.get(
                    `/evidencias-fotograficas/orden/${idOrdenServicio}`
                );
                const allData = res.data;
                const todasEvidencias = Array.isArray(allData) ? allData : (allData.data || []);

                const GENERAL_PREFIX_RE = /^(ANTES|DURANTE|DESPUES):\s/i;
                const generales = todasEvidencias.filter((e: any) => {
                    const tipo = (e.tipo_evidencia ?? e.tipoEvidencia ?? '').toUpperCase();
                    const desc = e.descripcion ?? '';
                    return tipo === 'GENERAL' || GENERAL_PREFIX_RE.test(desc);
                });

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

    // ✅ FIX 20-AGO-2026: QUERY de lotes de galería
    const { data: lotesData, isLoading: isLoadingLotes } = useQuery({
        queryKey: ['galeria-lotes', idOrdenServicio],
        queryFn: async () => {
            try {
                const res = await apiClient.get(`/galeria-lotes/orden/${idOrdenServicio}`);
                return (res.data || []) as LoteGaleria[];
            } catch {
                return [] as LoteGaleria[];
            }
        },
        enabled: !!idOrdenServicio,
    });

    const lotesGaleria: LoteGaleria[] = lotesData || [];

    const fotosGeneralesRaw: Evidencia[] = evidenciasData?.data || [];

    const fotosGenerales: Evidencia[] = idOrdenEquipoFiltro != null
        ? fotosGeneralesRaw.filter((e) => (e.id_orden_equipo ?? e.idOrdenEquipo ?? null) === idOrdenEquipoFiltro)
        : fotosGeneralesRaw;

    // ✅ FIX 20-AGO-2026: Separar fotos SIN lote (estándar) y fotos POR lote
    const fotosSinLote = fotosGenerales.filter((e) => !getEvLote(e));
    const fotosFiltradas: Evidencia[] = useMemo(() => {
        if (filtroFase === 'TODAS') return fotosSinLote;
        return fotosSinLote.filter((e) => {
            const { subTipo } = getSubTipo(e);
            if (filtroFase === 'GENERAL') return !subTipo;
            return subTipo === filtroFase;
        });
    }, [fotosSinLote, filtroFase]);

    // ============================================================
    // SUBIDA (estándar o a lote)
    // ============================================================
    const uploadFiles = async (files: File[], idLote?: number) => {
        setIsUploading(true);
        setUploadLoteId(idLote ?? null);
        setUploadTotal(files.length);
        setUploadCount(0);
        let uploaded = 0;
        try {
            const esLote = idLote != null;
            // ✅ MISMO PATRÓN CLÁSICO: TODAS ⇒ se sube como GENERAL
            const faseLote = esLote ? (faseLoteActiva[idLote!] ?? 'TODAS') : 'TODAS';
            const faseSubida: FaseFoto = esLote
                ? (faseLote === 'TODAS' ? 'GENERAL' : faseLote)
                : (filtroFase === 'TODAS' ? 'GENERAL' : filtroFase);
            const descripcionBase = esLote ? (descripcionLote[idLote!] ?? '').trim() : descripcionNueva.trim();
            const descripcionFinal = faseSubida === 'GENERAL'
                ? (descripcionBase || FASE_DESCRIPCION_DEFECTO.GENERAL)
                : descripcionBase
                    ? `${faseSubida}: ${descripcionBase}`
                    : `${faseSubida}: ${FASE_DESCRIPCION_DEFECTO[faseSubida]}`;
            for (const file of files) {
                setUploadCount(uploaded + 1);
                setUploadProgress(`${uploaded + 1}/${files.length}`);
                const base64 = await fileToBase64(file);
                await apiClient.post('/evidencias-fotograficas/upload-base64', {
                    idOrdenServicio,
                    tipoEvidencia: 'GENERAL',
                    descripcion: descripcionFinal,
                    nombreArchivo: file.name,
                    base64,
                    idLoteGaleria: esLote ? idLote : undefined,
                });
                uploaded++;
            }
            queryClient.invalidateQueries({ queryKey: ['evidencias-generales', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['galeria-lotes', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            if (esLote) setDescripcionLote((prev) => ({ ...prev, [idLote!]: '' }));
            else setDescripcionNueva('');
            toast.success(
                esLote
                    ? `${uploaded} foto${uploaded !== 1 ? 's' : ''} subida${uploaded !== 1 ? 's' : ''} al lote`
                    : `${uploaded} foto${uploaded !== 1 ? 's' : ''} general${uploaded !== 1 ? 'es' : ''} subida${uploaded !== 1 ? 's' : ''}`,
            );
        } catch (error) {
            console.error('Error uploading general photo:', error);
            toast.error(`Error al subir foto${files.length > 1 ? 's' : ''} (${uploaded}/${files.length} completadas)`);
        } finally {
            setIsUploading(false);
            setUploadLoteId(null);
            setUploadProgress('');
        }
    };

    const { setDropZoneRef, inputProps, openFilePicker, isDragging } = useImageDropPaste({
        onFiles: (files) => uploadFiles(files),
        multiple: true,
        disabled: isUploading,
        onInvalidType: (name) => toast.error(`"${name}" no es una imagen válida`),
        onMaxSizeExceeded: (name) => toast.error(`"${name}" supera el límite de 10MB`),
    });

    // ============================================================
    // MUTACIONES: LOTES
    // ============================================================
    const crearLoteMutation = useMutation({
        mutationFn: async (nombreLote: string) => {
            const res = await apiClient.post('/galeria-lotes', {
                idOrdenServicio,
                nombreLote,
            });
            return res.data;
        },
        onSuccess: (data: LoteGaleria) => {
            queryClient.invalidateQueries({ queryKey: ['galeria-lotes', idOrdenServicio] });
            toast.success(`Lote "${data.nombreLote}" creado`);
            setDialogNuevoLote(false);
            setNombreNuevoLote('');
        },
        onError: () => toast.error('Error al crear el lote'),
    });

    const renombrarLoteMutation = useMutation({
        mutationFn: async ({ id, nombreLote }: { id: number; nombreLote: string }) => {
            const res = await apiClient.put(`/galeria-lotes/${id}`, { nombreLote });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['galeria-lotes', idOrdenServicio] });
            toast.success('Lote renombrado');
            setRenombrandoLoteId(null);
            setNombreRenombrar('');
        },
        onError: () => toast.error('Error al renombrar el lote'),
    });

    const eliminarLoteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.delete(`/galeria-lotes/${id}`);
            return res.data;
        },
        onSuccess: (data: { message?: string }) => {
            queryClient.invalidateQueries({ queryKey: ['galeria-lotes', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-generales', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] });
            toast.success(data?.message || 'Lote eliminado');
        },
        onError: () => toast.error('Error al eliminar el lote'),
    });

    // Delete mutation (foto)
    const deleteMutation = useMutation({
        mutationFn: async (idEvidencia: number) => {
            const res = await apiClient.delete(`/evidencias-fotograficas/${idEvidencia}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidencias-generales', idOrdenServicio] });
            queryClient.invalidateQueries({ queryKey: ['galeria-lotes', idOrdenServicio] });
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
        const { subTipo, descripcionLimpia } = getSubTipo(evidencia);
        setEditingEvidenciaId(getEvId(evidencia));
        setEditFase(subTipo === 'ANTES' || subTipo === 'DURANTE' || subTipo === 'DESPUES' ? subTipo : 'GENERAL');
        setEditDescripcion(descripcionLimpia || evidencia.descripcion || '');
    };

    const handleSaveDescripcion = (idEvidencia: number) => {
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

    // ✅ FIX 20-AGO-2026: Lightbox genérico (estándar o lote)
    const [lightbox, setLightbox] = useState<{ fotos: Evidencia[]; index: number; titulo: string } | null>(null);

    const handleViewLightbox = (evidencia: Evidencia, lista: Evidencia[], titulo: string) => {
        const evId = getEvId(evidencia);
        const idx = lista.findIndex((e) => getEvId(e) === evId);
        setLightbox({ fotos: lista, index: idx >= 0 ? idx : 0, titulo });
    };

    const handleUploadClick = () => openFilePicker();

    const handleCrearLote = () => {
        const nombre = nombreNuevoLote.trim();
        if (!nombre) {
            toast.error('Ingresa el nombre del lote');
            return;
        }
        crearLoteMutation.mutate(nombre);
    };

    /** Helper: detecta archivos de imagen de un evento drop o paste */
    const extraerImagenes = (dt: DataTransfer | null): File[] =>
        Array.from(dt?.files || []).filter((f) => f.type.startsWith('image/'));

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
            <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-sm">
                        <Camera className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-purple-900">Fotos Generales del Servicio</h4>
                        <p className="text-xs text-purple-600">
                            {fotosGenerales.length > 0
                                ? `${fotosGenerales.length} foto${fotosGenerales.length !== 1 ? 's' : ''}${lotesGaleria.length > 0 ? ` · ${lotesGaleria.length} lote${lotesGaleria.length !== 1 ? 's' : ''}` : ''}`
                                : 'Fotos no asociadas a actividades específicas'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* ✅ FIX 20-AGO-2026: Botón Nuevo Lote */}
                    <button
                        onClick={() => setDialogNuevoLote(true)}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-violet-100 text-violet-700 hover:bg-violet-200 transition-all shadow-sm"
                        title="Crear un nuevo lote de galería (ej. Fotos del 08/26)"
                    >
                        <FolderPlus className="h-4 w-4" />
                        Nuevo Lote
                    </button>

                    {/* Upload button (estándar) */}
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
            </div>

            {/* Hidden file input (estándar) */}
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
                    <div className="text-center py-6 text-gray-400 rounded-xl">
                        <Camera className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="font-medium text-sm">Sin fotos en esta fase</p>
                        <p className="text-xs mt-1 text-gray-300">
                            Elige otra fase o selecciona "Todas"
                        </p>
                    </div>
                ) : (
                    <GridFotosPorFase
                        fotos={fotosFiltradas}
                        onEdit={handleEditClick}
                        onView={(ev) => handleViewLightbox(ev, fotosFiltradas, '📷 Foto General')}
                        onDelete={handleDelete}
                        editingEvidenciaId={editingEvidenciaId}
                        editFase={editFase}
                        editDescripcion={editDescripcion}
                        setEditFase={setEditFase}
                        setEditDescripcion={setEditDescripcion}
                        onCancelEdit={handleCancelEdit}
                        onSaveDescripcion={handleSaveDescripcion}
                        isSavingEdit={updateDescripcionMutation.isPending}
                    />
                )}
            </div>

            {/* ============================================================ */}
            {/* ✅ FIX 20-AGO-2026: SECCIONES POR LOTE                        */}
            {/* ============================================================ */}
            {lotesGaleria.length > 0 && (
                <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center gap-2 pt-1">
                        <Package className="h-4 w-4 text-violet-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700">
                            Lotes de Galería ({lotesGaleria.length})
                        </span>
                        <div className="flex-1 border-t border-violet-100" />
                    </div>

                    {lotesGaleria.map((lote) => {
                        const colorAdmin = getColorLoteAdmin(lote.ordenLote);
                        const fotosDelLote = fotosGenerales.filter((e) => getEvLote(e) === lote.idLoteGaleria);
                        const isRenombrando = renombrandoLoteId === lote.idLoteGaleria;
                        const faseLoteVista = faseLoteActiva[lote.idLoteGaleria] ?? 'TODAS';
                        const descripcionLoteActual = descripcionLote[lote.idLoteGaleria] ?? '';

                        return (
                            <TarjetaLoteGaleria
                            key={lote.idLoteGaleria}
                            lote={lote}
                            fotosDelLote={fotosDelLote}
                            colorAdmin={colorAdmin}
                            faseLoteVista={faseLoteVista}
                            setFaseLote={(v) => setFaseLoteActiva((prev) => ({ ...prev, [lote.idLoteGaleria]: v }))}
                            descripcionLote={descripcionLoteActual}
                            setDescripcionLote={(d) => setDescripcionLote((prev) => ({ ...prev, [lote.idLoteGaleria]: d }))}
                            isRenombrando={isRenombrando}
                            nombreRenombrar={nombreRenombrar}
                            setNombreRenombrar={setNombreRenombrar}
                            onGuardarNombre={(n) => renombrarLoteMutation.mutate({ id: lote.idLoteGaleria, nombreLote: n })}
                            onCancelarRenombrar={() => { setRenombrandoLoteId(null); setNombreRenombrar(''); }}
                            onRenombrarClick={() => { setRenombrandoLoteId(lote.idLoteGaleria); setNombreRenombrar(lote.nombreLote); }}
                            onEliminarLote={() => {
                                if (confirm(`¿Eliminar el lote "${lote.nombreLote}"? Sus ${fotosDelLote.length} foto(s) volverán al grupo estándar de fotos generales (no se pierden).`)) {
                                    eliminarLoteMutation.mutate(lote.idLoteGaleria);
                                }
                            }}
                            renombrarPending={renombrarLoteMutation.isPending}
                            isUploading={isUploading}
                            subiendoEsteLote={uploadLoteId === lote.idLoteGaleria}
                            uploadCount={uploadCount}
                            uploadTotal={uploadTotal}
                            onUploadFiles={(files, idLote) => uploadFiles(files, idLote)}
                            onEditClick={handleEditClick}
                            onViewLightbox={(ev) => handleViewLightbox(ev, fotosDelLote, `📦 ${lote.nombreLote}`)}
                            onDeleteFoto={handleDelete}
                            editingEvidenciaId={editingEvidenciaId}
                            editFase={editFase}
                            editDescripcion={editDescripcion}
                            setEditFase={setEditFase}
                            setEditDescripcion={setEditDescripcion}
                            onCancelEdit={handleCancelEdit}
                            onSaveDescripcion={handleSaveDescripcion}
                            isSavingEdit={updateDescripcionMutation.isPending}
                            />
                        );
                    })}
                </div>
            )}

            {/* ============================================================ */}
            {/* ✅ FIX 20-AGO-2026: Diálogo CREAR NUEVO LOTE                  */}
            {/* ============================================================ */}
            {dialogNuevoLote && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setDialogNuevoLote(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-2 bg-violet-100 rounded-xl">
                                <FolderPlus className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Nuevo Lote de Galería</h3>
                                <p className="text-[11px] text-gray-500">Ej: "Fotos del 08/26" — agrupa una secuencia de fotos</p>
                            </div>
                        </div>
                        <input
                            type="text"
                            value={nombreNuevoLote}
                            onChange={(e) => setNombreNuevoLote(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCrearLote(); }}
                            placeholder="Nombre de lote..."
                            className="w-full px-3 py-2.5 border-2 border-violet-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 mb-1"
                            autoFocus
                            maxLength={100}
                        />
                        <p className="text-[10px] text-gray-400 mb-4">
                            El nombre será el título del contenedor de este lote en el PDF.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setDialogNuevoLote(false); setNombreNuevoLote(''); }}
                                className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCrearLote}
                                disabled={crearLoteMutation.isPending}
                                className="flex-1 py-2.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {crearLoteMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <FolderPlus className="h-3.5 w-3.5" />
                                )}
                                Crear Lote
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightbox && lightbox.fotos[lightbox.index] && (
                <LightboxModal
                    evidencia={lightbox.fotos[lightbox.index]}
                    titulo={lightbox.titulo}
                    onClose={() => setLightbox(null)}
                    onPrev={() => setLightbox((lb) => lb ? { ...lb, index: Math.max(0, lb.index - 1) } : lb)}
                    onNext={() => setLightbox((lb) => lb ? { ...lb, index: Math.min(lb.fotos.length - 1, lb.index + 1) } : lb)}
                    hasPrev={lightbox.index > 0}
                    hasNext={lightbox.index < lightbox.fotos.length - 1}
                    currentIndex={lightbox.index}
                    total={lightbox.fotos.length}
                />
            )}
        </div>
    );
}
