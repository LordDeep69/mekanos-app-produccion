/**
 * MEKANOS S.A.S - Portal Admin
 * Utilidad de Descarga de Evidencias Fotográficas en ZIP
 * 
 * Permite empaquetar y descargar evidencias fotográficas organizadas en un archivo .ZIP
 * con el nombre de la orden y archivos nombrados según su descripción.
 */

import JSZip from 'jszip';
import { cleanDirectImageUrl } from '@/components/ui/photo-lightbox';

export type ModoDescargaEvidencias = 'TODAS' | 'GENERALES' | 'ACTIVIDADES';

export interface EvidenciaParaDescarga {
    id_evidencia?: number;
    idEvidencia?: number;
    tipo_evidencia?: string;
    tipoEvidencia?: string;
    descripcion?: string | null;
    ruta_archivo?: string | null;
    rutaArchivo?: string | null;
    url_foto?: string | null;
    urlFoto?: string | null;
    url?: string | null;
    foto_base64?: string | null;
    fotoBase64?: string | null;
    id_lote_galeria?: number | null;
    idLoteGaleria?: number | null;
    id_orden_equipo?: number | null;
    idOrdenEquipo?: number | null;
    actividad_asociada?: {
        descripcion_actividad?: string;
    } | null;
    actividades_ejecutadas?: {
        observaciones?: string;
        catalogo_actividades?: {
            descripcion_actividad?: string;
        } | null;
    } | null;
}

export interface ProgresoDescargaZip {
    total: number;
    actual: number;
    porcentaje: number;
    mensaje: string;
    fase: 'descargando' | 'comprimiendo' | 'completado' | 'cancelado' | 'error';
    archivoActual?: string;
}

export interface OpcionesDescargaZip {
    numeroOrden: string;
    evidencias: EvidenciaParaDescarga[];
    modo: ModoDescargaEvidencias;
    lotes?: Array<{ idLoteGaleria: number; nombreLote: string }>;
    onProgress?: (p: ProgresoDescargaZip) => void;
    abortSignal?: AbortSignal;
}

/**
 * Limpia y normaliza cadenas de texto para nombres de archivo válidos en Windows, Mac y Linux.
 * Elimina: \ / : * ? " < > | y caracteres de control
 */
export function sanitizarNombreArchivo(nombre: string | null | undefined, fallback: string): string {
    if (!nombre || typeof nombre !== 'string') return fallback;

    // Remover prefijos comunes como 'ANTES: ', 'DURANTE: ', etc. si se van a agregar por separado
    let limpio = nombre.replace(/^(ANTES|DURANTE|DESPUES|GENERAL):\s*/i, '');

    // Reemplazar caracteres no válidos de sistema de archivos
    limpio = limpio.replace(/[\\/:*?"<>|#%&{}\\$!'@+`=~]/g, '_');

    // Colapsar espacios múltiples y guiones bajos repetidos
    limpio = limpio.replace(/\s+/g, '_').replace(/_+/g, '_');

    // Quitar puntos iniciales o finales y guiones bajos sueltos
    limpio = limpio.replace(/^[_.]+|[_.]+$/g, '').trim();

    // Limitar longitud para evitar rebasar límites del sistema operativo (máx 60 caracteres de descripción)
    if (limpio.length > 60) {
        limpio = limpio.substring(0, 60).replace(/_+$/g, '');
    }

    return limpio || fallback;
}

/**
 * Extrae la URL válida de una evidencia
 */
function getUrlEvidencia(e: EvidenciaParaDescarga): string | null {
    const raw = e.ruta_archivo ?? e.rutaArchivo ?? e.url_foto ?? e.urlFoto ?? e.url;
    if (raw && typeof raw === 'string') {
        return cleanDirectImageUrl(raw);
    }
    const b64 = e.foto_base64 ?? e.fotoBase64;
    if (b64 && typeof b64 === 'string') {
        return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
    }
    return null;
}

/**
 * Clasifica si una evidencia es de Fotos Generales o de Actividades
 */
export function esEvidenciaGeneral(e: EvidenciaParaDescarga): boolean {
    const tipo = (e.tipo_evidencia ?? e.tipoEvidencia ?? '').toUpperCase();
    const desc = e.descripcion ?? '';
    const loteId = e.id_lote_galeria ?? e.idLoteGaleria;
    const GENERAL_PREFIX_RE = /^(ANTES|DURANTE|DESPUES):\s/i;

    return tipo === 'GENERAL' || loteId != null || GENERAL_PREFIX_RE.test(desc);
}

/**
 * Convierte un Data URL Base64 a ArrayBuffer
 */
function base64ToArrayBuffer(base64Data: string): Uint8Array {
    const pure = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const binaryString = atob(pure);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Descarga una lista de evidencias y las empaqueta en un archivo .ZIP
 */
export async function descargarEvidenciasZip({
    numeroOrden,
    evidencias,
    modo,
    lotes = [],
    onProgress,
    abortSignal,
}: OpcionesDescargaZip): Promise<{ success: boolean; descargadas: number; fallidas: number }> {
    // 1. Filtrar evidencias según el modo solicitado
    let listaFiltrada: EvidenciaParaDescarga[] = [];
    if (modo === 'GENERALES') {
        listaFiltrada = evidencias.filter(esEvidenciaGeneral);
    } else if (modo === 'ACTIVIDADES') {
        listaFiltrada = evidencias.filter((e) => !esEvidenciaGeneral(e));
    } else {
        listaFiltrada = [...evidencias];
    }

    if (listaFiltrada.length === 0) {
        throw new Error('No hay fotos disponibles para descargar en la opción seleccionada.');
    }

    // Mapa de nombres de lote para organizar subcarpetas
    const mapaLotes = new Map<number, string>();
    lotes.forEach((l) => mapaLotes.set(l.idLoteGaleria, l.nombreLote));

    const zip = new JSZip();
    // Carpeta raíz con el nombre exacto de la orden
    const raizOrden = zip.folder(numeroOrden) || zip;

    // Registros de nombres de archivo por carpeta para evitar colisiones
    const nombresUsadosPorCarpeta = new Map<string, Set<string>>();
    function obtenerNombreUnico(carpetaKey: string, nombreBase: string, extension = '.jpg'): string {
        if (!nombresUsadosPorCarpeta.has(carpetaKey)) {
            nombresUsadosPorCarpeta.set(carpetaKey, new Set());
        }
        const set = nombresUsadosPorCarpeta.get(carpetaKey)!;
        let finalName = `${nombreBase}${extension}`;
        let counter = 2;
        while (set.has(finalName.toLowerCase())) {
            finalName = `${nombreBase}_${counter}${extension}`;
            counter++;
        }
        set.add(finalName.toLowerCase());
        return finalName;
    }

    let descargadas = 0;
    let fallidas = 0;
    const total = listaFiltrada.length;

    onProgress?.({
        total,
        actual: 0,
        porcentaje: 0,
        mensaje: `Iniciando descarga de ${total} imágenes...`,
        fase: 'descargando',
    });

    // Descarga en bloques de concurrencia controlada (3 simultáneas para máxima estabilidad)
    const BATCH_SIZE = 3;
    for (let i = 0; i < total; i += BATCH_SIZE) {
        if (abortSignal?.aborted) {
            onProgress?.({
                total,
                actual: descargadas,
                porcentaje: Math.round((descargadas / total) * 100),
                mensaje: 'Descarga cancelada por el usuario',
                fase: 'cancelado',
            });
            return { success: false, descargadas, fallidas };
        }

        const batch = listaFiltrada.slice(i, i + BATCH_SIZE);

        await Promise.all(
            batch.map(async (ev, batchIndex) => {
                const globalIndex = i + batchIndex;
                const url = getUrlEvidencia(ev);
                const tipo = (ev.tipo_evidencia ?? ev.tipoEvidencia ?? 'FOTO').toUpperCase();
                const esGeneral = esEvidenciaGeneral(ev);

                // Determinar carpeta destino dentro del ZIP
                let carpetaDestino: JSZip = raizOrden;
                let carpetaKey = 'raiz';

                if (modo === 'TODAS') {
                    if (esGeneral) {
                        const idLote = ev.id_lote_galeria ?? ev.idLoteGaleria;
                        const nombreLote = idLote ? mapaLotes.get(idLote) : null;
                        if (nombreLote) {
                            const loteFolder = sanitizarNombreArchivo(nombreLote, `Lote_${idLote}`);
                            carpetaDestino = raizOrden.folder('Fotos_Generales')?.folder(loteFolder) || raizOrden;
                            carpetaKey = `general_${loteFolder}`;
                        } else {
                            carpetaDestino = raizOrden.folder('Fotos_Generales') || raizOrden;
                            carpetaKey = 'general';
                        }
                    } else {
                        carpetaDestino = raizOrden.folder('Evidencias_Actividades') || raizOrden;
                        carpetaKey = 'actividades';
                    }
                } else if (modo === 'GENERALES') {
                    const idLote = ev.id_lote_galeria ?? ev.idLoteGaleria;
                    const nombreLote = idLote ? mapaLotes.get(idLote) : null;
                    if (nombreLote) {
                        const loteFolder = sanitizarNombreArchivo(nombreLote, `Lote_${idLote}`);
                        carpetaDestino = raizOrden.folder(loteFolder) || raizOrden;
                        carpetaKey = `lote_${loteFolder}`;
                    }
                }

                // Determinar nombre del archivo según la descripción
                const descActividad =
                    ev.actividad_asociada?.descripcion_actividad ||
                    ev.actividades_ejecutadas?.catalogo_actividades?.descripcion_actividad ||
                    ev.actividades_ejecutadas?.observaciones ||
                    '';
                const descFoto = ev.descripcion || '';

                let textoNombre = '';
                if (descFoto.trim()) {
                    textoNombre = descFoto.trim();
                } else if (descActividad.trim()) {
                    textoNombre = descActividad.trim();
                }

                const nombreLimpio = sanitizarNombreArchivo(textoNombre, `foto_${globalIndex + 1}`);
                const nombreBase = `${tipo}_${nombreLimpio}`;
                const nombreArchivoFinal = obtenerNombreUnico(carpetaKey, nombreBase, '.jpg');

                onProgress?.({
                    total,
                    actual: descargadas + 1,
                    porcentaje: Math.round(((descargadas + 1) / total) * 85), // 85% para descarga, 15% compresión
                    mensaje: `Descargando imagen ${globalIndex + 1} de ${total}: ${nombreArchivoFinal}`,
                    fase: 'descargando',
                    archivoActual: nombreArchivoFinal,
                });

                if (!url) {
                    fallidas++;
                    return;
                }

                try {
                    let arrayBuffer: ArrayBuffer | Uint8Array;

                    if (url.startsWith('data:')) {
                        arrayBuffer = base64ToArrayBuffer(url);
                    } else {
                        const resp = await fetch(url, {
                            signal: abortSignal,
                            cache: 'force-cache',
                        });
                        if (!resp.ok) {
                            throw new Error(`HTTP ${resp.status}`);
                        }
                        arrayBuffer = await resp.arrayBuffer();
                    }

                    carpetaDestino.file(nombreArchivoFinal, arrayBuffer, { binary: true });
                    descargadas++;
                } catch (err: any) {
                    if (err?.name === 'AbortError') throw err;
                    console.warn(`[descargarEvidenciasZip] No se pudo descargar la foto ${globalIndex + 1}:`, err);
                    fallidas++;
                }
            })
        );
    }

    if (descargadas === 0) {
        throw new Error('No se pudo descargar ninguna imagen. Comprueba la conexión a internet.');
    }

    // 2. Comprimir el archivo ZIP
    onProgress?.({
        total,
        actual: descargadas,
        porcentaje: 90,
        mensaje: `Empaquetando ${descargadas} fotos en archivo ZIP...`,
        fase: 'comprimiendo',
    });

    const zipBlob = await zip.generateAsync(
        {
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        },
        (metadata) => {
            const pct = 90 + Math.round((metadata.percent / 100) * 9);
            onProgress?.({
                total,
                actual: descargadas,
                porcentaje: pct,
                mensaje: `Comprimiendo archivo ZIP (${Math.round(metadata.percent)}%)...`,
                fase: 'comprimiendo',
            });
        }
    );

    // 3. Disparar descarga en el navegador
    const sufijo =
        modo === 'GENERALES'
            ? 'Fotos_Generales'
            : modo === 'ACTIVIDADES'
                ? 'Evidencias_Actividades'
                : 'Todas_Las_Evidencias';

    const nombreZipFinal = `${numeroOrden}_${sufijo}.zip`;

    const blobUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = nombreZipFinal;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberar memoria del blob después de breve delay
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 15000);

    onProgress?.({
        total,
        actual: descargadas,
        porcentaje: 100,
        mensaje: `¡Descarga completa! Se descargó "${nombreZipFinal}".`,
        fase: 'completado',
    });

    return { success: true, descargadas, fallidas };
}
