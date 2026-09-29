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
    nombreServicio?: string;
    nombreCliente?: string;
    fechaServicio?: string;
    orden?: any;
    onProgress?: (p: ProgresoDescargaZip) => void;
    abortSignal?: AbortSignal;
}

export type FaseEvidencia = 'ANTES' | 'DURANTE' | 'DESPUES' | 'GENERAL';

/**
 * Formatea una fecha según la estructura: diames-últimos dígitos del año.
 * Ejemplo: 29 de septiembre de 2026 -> 2909-26
 */
export function formatearFechaDiaMesAnio(dateStr?: string | null): string {
    if (!dateStr) {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        return `${dd}${mm}-${yy}`;
    }
    try {
        const clean = String(dateStr).trim();
        const datePart = clean.includes('T') ? clean.split('T')[0] : clean.split(' ')[0];
        if (datePart.includes('-')) {
            const parts = datePart.split('-');
            if (parts.length === 3) {
                const [y, m, d] = parts;
                const dd = String(parseInt(d, 10)).padStart(2, '0');
                const mm = String(parseInt(m, 10)).padStart(2, '0');
                const yy = String(y).trim().slice(-2);
                return `${dd}${mm}-${yy}`;
            }
        }
        const dObj = new Date(dateStr);
        if (!isNaN(dObj.getTime())) {
            const dd = String(dObj.getDate()).padStart(2, '0');
            const mm = String(dObj.getMonth() + 1).padStart(2, '0');
            const yy = String(dObj.getFullYear()).slice(-2);
            return `${dd}${mm}-${yy}`;
        }
    } catch {
        // Fallback en caso de error
    }
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    return `${dd}${mm}-${yy}`;
}

/**
 * Normaliza y sanea segmentos individuales para nombres de carpeta y archivos.
 * Quita acentos, caracteres extraños y recorta espacios.
 */
export function sanitizarSegmento(texto: string | null | undefined, fallback: string, maxLen = 35): string {
    if (!texto || typeof texto !== 'string') return fallback;

    let s = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Quitar tildes
    s = s.replace(/^(ANTES|DURANTE|DESPUES|DESPUÉS|GENERAL):\s*/i, '');
    s = s.replace(/[^a-zA-Z0-9_\-\s]/g, '');
    s = s.trim().replace(/\s+/g, '_').replace(/_+/g, '_');

    if (s.length > maxLen) {
        s = s.substring(0, maxLen).replace(/_+$/, '');
    }

    return s || fallback;
}

/**
 * Limpia y normaliza cadenas de texto para nombres de archivo válidos en Windows, Mac y Linux.
 * Elimina: \ / : * ? " < > | y caracteres de control
 */
export function sanitizarNombreArchivo(nombre: string | null | undefined, fallback: string): string {
    if (!nombre || typeof nombre !== 'string') return fallback;

    // Remover tildes y prefijos comunes si vienen en la descripción
    let limpio = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    limpio = limpio.replace(/^(ANTES|DURANTE|DESPUES|DESPUÉS|GENERAL):\s*/i, '');

    // Reemplazar caracteres no válidos de sistema de archivos
    limpio = limpio.replace(/[\\/:*?"<>|#%&{}\\$!'@+`=~]/g, '_');

    // Colapsar espacios múltiples y guiones bajos repetidos
    limpio = limpio.replace(/\s+/g, '_').replace(/_+/g, '_');

    // Quitar puntos iniciales o finales y guiones bajos sueltos
    limpio = limpio.replace(/^[_.]+|[_.]+$/g, '').trim();

    // Limitar longitud para evitar rebasar límites del sistema operativo (máx 50 caracteres)
    if (limpio.length > 50) {
        limpio = limpio.substring(0, 50).replace(/_+$/g, '');
    }

    return limpio || fallback;
}

/**
 * Construye el nombre base detallado:
 * [CodigoOrden]_[NombreServicio]_[NombreCliente]_[FechaDiaMes-AA]
 */
export function construirNombreBaseDescarga({
    numeroOrden,
    nombreServicio,
    nombreCliente,
    fechaServicio,
    orden,
}: {
    numeroOrden: string;
    nombreServicio?: string;
    nombreCliente?: string;
    fechaServicio?: string;
    orden?: any;
}): string {
    const num = sanitizarSegmento(numeroOrden || orden?.numero_orden || 'OS', 'OS', 25);

    const servicioRaw =
        nombreServicio ||
        orden?.tipos_servicio?.nombre_tipo ||
        orden?.descripcion ||
        'Servicio';
    const serv = sanitizarSegmento(servicioRaw, 'Servicio', 30);

    let clienteRaw = nombreCliente;
    if (!clienteRaw && orden) {
        clienteRaw =
            orden.clientes?.nombre_sede ||
            orden.clientes?.persona?.nombre_comercial ||
            orden.clientes?.persona?.razon_social ||
            'Cliente';
    }
    const cli = sanitizarSegmento(clienteRaw || 'Cliente', 'Cliente', 35);

    const fechaRaw =
        fechaServicio ||
        orden?.fecha_fin_real ||
        orden?.fecha_inicio_real ||
        orden?.fecha_programada ||
        orden?.fecha_creacion;
    const fec = formatearFechaDiaMesAnio(fechaRaw);

    return `${num}_${serv}_${cli}_${fec}`;
}

/**
 * Construye el nombre final del archivo .ZIP con el sufijo de modo si aplica.
 */
export function construirNombreZip({
    numeroOrden,
    nombreServicio,
    nombreCliente,
    fechaServicio,
    orden,
    modo,
}: {
    numeroOrden: string;
    nombreServicio?: string;
    nombreCliente?: string;
    fechaServicio?: string;
    orden?: any;
    modo: ModoDescargaEvidencias;
}): string {
    const base = construirNombreBaseDescarga({
        numeroOrden,
        nombreServicio,
        nombreCliente,
        fechaServicio,
        orden,
    });

    const sufijo =
        modo === 'GENERALES'
            ? '_Fotos_Generales'
            : modo === 'ACTIVIDADES'
                ? '_Evidencias_Actividades'
                : '';

    return `${base}${sufijo}.zip`;
}

/**
 * Extrae la fase (ANTES, DURANTE, DESPUES, GENERAL) de una evidencia
 */
export function obtenerFaseEvidencia(e: EvidenciaParaDescarga): FaseEvidencia {
    const rawTipo = (e.tipo_evidencia ?? e.tipoEvidencia ?? '').toUpperCase().trim();
    if (rawTipo.includes('ANTES')) return 'ANTES';
    if (rawTipo.includes('DURANTE')) return 'DURANTE';
    if (rawTipo.includes('DESPUES') || rawTipo.includes('DESPUÉS')) return 'DESPUES';

    const desc = (e.descripcion ?? '').trim();
    const matchPrefix = desc.match(/^(ANTES|DURANTE|DESPUES|DESPUÉS)[:\s_-]/i);
    if (matchPrefix) {
        const p = matchPrefix[1].toUpperCase();
        if (p.includes('ANTES')) return 'ANTES';
        if (p.includes('DURANTE')) return 'DURANTE';
        if (p.includes('DESPUES') || p.includes('DESPUÉS')) return 'DESPUES';
    }

    const matchKeywords = desc.match(/\b(ANTES|DURANTE|DESPUES|DESPUÉS)\b/i);
    if (matchKeywords) {
        const p = matchKeywords[1].toUpperCase();
        if (p.includes('ANTES')) return 'ANTES';
        if (p.includes('DURANTE')) return 'DURANTE';
        if (p.includes('DESPUES') || p.includes('DESPUÉS')) return 'DESPUES';
    }

    return 'GENERAL';
}

/**
 * Devuelve el nombre de la subcarpeta ordenable cronológicamente
 */
export function getSubcarpetaFase(fase: FaseEvidencia): string {
    switch (fase) {
        case 'ANTES':
            return '01_Antes';
        case 'DURANTE':
            return '02_Durante';
        case 'DESPUES':
            return '03_Despues';
        default:
            return '04_General';
    }
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
    const GENERAL_PREFIX_RE = /^(ANTES|DURANTE|DESPUES|DESPUÉS):\s/i;

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
    nombreServicio,
    nombreCliente,
    fechaServicio,
    orden,
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

    // Construir nombre base descriptivo y carpeta raíz del ZIP
    const nombreBase = construirNombreBaseDescarga({
        numeroOrden,
        nombreServicio,
        nombreCliente,
        fechaServicio,
        orden,
    });

    const sufijoModo =
        modo === 'GENERALES'
            ? '_Fotos_Generales'
            : modo === 'ACTIVIDADES'
                ? '_Evidencias_Actividades'
                : '';

    const nombreCarpetaRaiz = `${nombreBase}${sufijoModo}`;
    // Carpeta raíz con el nombre detallado completo
    const raizOrden = zip.folder(nombreCarpetaRaiz) || zip;

    // Registros de nombres de archivo y contadores por carpeta
    const nombresUsadosPorCarpeta = new Map<string, Set<string>>();
    const contadoresPorCarpeta = new Map<string, number>();

    function getSiguienteIndiceCarpeta(carpetaKey: string): string {
        const act = (contadoresPorCarpeta.get(carpetaKey) || 0) + 1;
        contadoresPorCarpeta.set(carpetaKey, act);
        return String(act).padStart(2, '0');
    }

    function obtenerNombreUnico(carpetaKey: string, nombreBaseArchivo: string, extension = '.jpg'): string {
        if (!nombresUsadosPorCarpeta.has(carpetaKey)) {
            nombresUsadosPorCarpeta.set(carpetaKey, new Set());
        }
        const set = nombresUsadosPorCarpeta.get(carpetaKey)!;
        let finalName = `${nombreBaseArchivo}${extension}`;
        let counter = 2;
        while (set.has(finalName.toLowerCase())) {
            finalName = `${nombreBaseArchivo}_${counter}${extension}`;
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
                const esGeneral = esEvidenciaGeneral(ev);
                const fase = obtenerFaseEvidencia(ev);
                const subFase = getSubcarpetaFase(fase); // '01_Antes', '02_Durante', '03_Despues', '04_General'

                // Determinar carpeta destino dentro del ZIP
                let carpetaDestino: JSZip = raizOrden;
                let carpetaKey = 'raiz';

                if (modo === 'TODAS') {
                    if (esGeneral) {
                        const idLote = ev.id_lote_galeria ?? ev.idLoteGaleria;
                        const nombreLote = idLote ? mapaLotes.get(idLote) : null;
                        if (nombreLote) {
                            const loteFolder = sanitizarSegmento(nombreLote, `Lote_${idLote}`, 30);
                            carpetaDestino = raizOrden.folder('Fotos_Generales')?.folder(loteFolder)?.folder(subFase) || raizOrden;
                            carpetaKey = `general_${loteFolder}_${subFase}`;
                        } else {
                            carpetaDestino = raizOrden.folder('Fotos_Generales')?.folder(subFase) || raizOrden;
                            carpetaKey = `general_${subFase}`;
                        }
                    } else {
                        carpetaDestino = raizOrden.folder('Evidencias_Actividades')?.folder(subFase) || raizOrden;
                        carpetaKey = `actividades_${subFase}`;
                    }
                } else if (modo === 'GENERALES') {
                    const idLote = ev.id_lote_galeria ?? ev.idLoteGaleria;
                    const nombreLote = idLote ? mapaLotes.get(idLote) : null;
                    if (nombreLote) {
                        const loteFolder = sanitizarSegmento(nombreLote, `Lote_${idLote}`, 30);
                        carpetaDestino = raizOrden.folder(loteFolder)?.folder(subFase) || raizOrden;
                        carpetaKey = `lote_${loteFolder}_${subFase}`;
                    } else {
                        carpetaDestino = raizOrden.folder(subFase) || raizOrden;
                        carpetaKey = `general_${subFase}`;
                    }
                } else if (modo === 'ACTIVIDADES') {
                    carpetaDestino = raizOrden.folder(subFase) || raizOrden;
                    carpetaKey = `actividades_${subFase}`;
                }

                // Determinar nombre del archivo según la descripción registrada
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

                const indiceCorrelativo = getSiguienteIndiceCarpeta(carpetaKey);
                const nombreLimpio = sanitizarNombreArchivo(textoNombre, 'Foto');
                const nombreBaseArchivo = `${indiceCorrelativo}_${nombreLimpio}`;
                const nombreArchivoFinal = obtenerNombreUnico(carpetaKey, nombreBaseArchivo, '.jpg');

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

    // 3. Disparar descarga en el navegador con el nombre completo detallado
    const nombreZipFinal = `${nombreCarpetaRaiz}.zip`;

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

