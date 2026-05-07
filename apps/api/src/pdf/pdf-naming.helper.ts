/**
 * MEKANOS S.A.S - Helper centralizado de nombres de archivo para informes PDF
 *
 * Formato canónico (Legacy-friendly):
 *   INFORME - DDMM-YY - <SERVICIO> <EQUIPO> - <CLIENTE> - <MES> <YYYY>.pdf
 *
 * Ejemplos:
 *   INFORME - 2504-26 - MANTENIMIENTO PREVENTIVO TIPO A PLANTA - BALMORAL - ABRIL 2026.pdf
 *   INFORME - 1203-26 - CORRECTIVO BOMBA - TAKURIKA CUARTO SUR - MARZO 2026.pdf
 *
 * Diseño robusto frente a datos faltantes: nunca lanza, usa fallbacks
 * razonables. La salida está sanitizada para ser segura como nombre de
 * archivo en cualquier sistema operativo y como header HTTP Content-Disposition.
 */

/* eslint-disable no-control-regex */

const TIPO_EQUIPO_LABEL: Record<string, string> = {
    GENERADOR: 'PLANTA',
    PLANTA: 'PLANTA',
    MOTOR: 'PLANTA',
    BOMBA: 'BOMBA',
};

const TIPO_SERVICIO_TEXTO: Record<string, string> = {
    PREVENTIVO_A: 'MANTENIMIENTO PREVENTIVO TIPO A',
    PREVENTIVO_B: 'MANTENIMIENTO PREVENTIVO TIPO B',
    PREVENTIVO_TIPO_A: 'MANTENIMIENTO PREVENTIVO TIPO A',
    PREVENTIVO_TIPO_B: 'MANTENIMIENTO PREVENTIVO TIPO B',
    CORRECTIVO: 'CORRECTIVO',
};

/** Meses en español, mayúsculas, índice 0 = enero. */
const MESES_ES = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
] as const;

export interface InformeFilenameInput {
    /** Fecha del servicio. Acepta Date, ISO string o YYYY-MM-DD. */
    fechaServicio?: Date | string | null;
    /** Código del tipo de servicio (PREVENTIVO_A, PREVENTIVO_B, CORRECTIVO). */
    codigoTipoServicio?: string | null;
    /** Nombre legible del tipo de servicio (fallback). */
    nombreTipoServicio?: string | null;
    /** Código del tipo de equipo (GENERADOR, BOMBA, MOTOR). */
    codigoTipoEquipo?: string | null;
    /** Nombre legible del tipo de equipo (fallback). */
    nombreTipoEquipo?: string | null;
    /** Nombre del cliente (razón social, comercial o completo). */
    nombreCliente?: string | null;
    /** Número de orden (fallback si no hay nombre de cliente). */
    numeroOrden?: string | null;
}

/**
 * Construye el nombre canónico del informe PDF.
 *
 * @returns Nombre con extensión `.pdf` listo para usar en Content-Disposition
 *          o en `<a download="...">`.
 */
export function buildInformeFilename(input: InformeFilenameInput): string {
    const fecha = parseFechaSegura(input.fechaServicio) || new Date();
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const yy = String(fecha.getFullYear() % 100).padStart(2, '0');
    const yyyy = String(fecha.getFullYear());
    const mesNombre = MESES_ES[fecha.getMonth()];

    const servicio = resolverTextoServicio(
        input.codigoTipoServicio,
        input.nombreTipoServicio,
    );
    const equipo = resolverTextoEquipo(
        input.codigoTipoEquipo,
        input.nombreTipoEquipo,
    );
    const cliente = sanitizar(
        (input.nombreCliente || input.numeroOrden || 'CLIENTE').toUpperCase(),
    );

    const servicioEquipo = equipo
        ? `${servicio} ${equipo}`.replace(/\s+/g, ' ').trim()
        : servicio;

    const base = `INFORME - ${dd}${mm}-${yy} - ${servicioEquipo} - ${cliente} - ${mesNombre} ${yyyy}`;
    return `${truncar(base, 180)}.pdf`;
}

/**
 * Construye el header HTTP Content-Disposition compatible con RFC 5987.
 * Permite caracteres especiales / espacios sin problemas en cualquier
 * navegador moderno (incluye fallback ASCII para clientes legacy).
 */
export function buildContentDisposition(filename: string): string {
    const safe = filename.replace(/"/g, '');
    return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Heurística para detectar si un filename ya cumple el formato canónico.
 * Útil para migraciones idempotentes.
 */
export function esFilenameCanonico(filename: string | null | undefined): boolean {
    if (!filename) return false;
    // INFORME - DDMM-YY - ... - MES YYYY.pdf
    return /^INFORME - \d{4}-\d{2} - .+ - [A-ZÁÉÍÓÚÑ]+ \d{4}\.pdf$/i.test(filename);
}

/**
 * Extrae la R2 object key (`ordenes/pdfs/...`) desde una URL de R2,
 * sin importar si es pública o firmada. Retorna `null` si no calza.
 */
export function extractR2KeyFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const match = url.match(/ordenes\/pdfs\/([^?#]+)/);
    if (!match) return null;
    return `ordenes/pdfs/${match[1]}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ────────────────────────────────────────────────────────────────────────────

function parseFechaSegura(v: Date | string | null | undefined): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    // ISO con o sin TZ: extraer YYYY-MM-DD evita el desfase de un día por UTC.
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

function resolverTextoServicio(
    codigo: string | null | undefined,
    nombre: string | null | undefined,
): string {
    if (codigo) {
        const key = codigo.toUpperCase().trim().replace(/\s+/g, '_');
        if (TIPO_SERVICIO_TEXTO[key]) return TIPO_SERVICIO_TEXTO[key];
    }
    if (nombre) {
        const upper = sanitizar(nombre).toUpperCase().trim();
        // Patrones del formato actual: "Mantenimiento Preventivo Tipo A", "Correctivo", "Mantenimiento Correctivo", etc.
        if (/PREVENTIVO[^A-Z]*A\b/.test(upper)) return 'MANTENIMIENTO PREVENTIVO TIPO A';
        if (/PREVENTIVO[^A-Z]*B\b/.test(upper)) return 'MANTENIMIENTO PREVENTIVO TIPO B';
        if (/CORRECTIVO/.test(upper)) return 'CORRECTIVO';
        return upper;
    }
    return 'SERVICIO';
}

function resolverTextoEquipo(
    codigo: string | null | undefined,
    nombre: string | null | undefined,
): string {
    const candidato = sanitizar((codigo || nombre || '')).toUpperCase().trim();
    if (!candidato) return '';
    for (const key of Object.keys(TIPO_EQUIPO_LABEL)) {
        if (candidato.includes(key)) return TIPO_EQUIPO_LABEL[key];
    }
    return candidato;
}

function sanitizar(s: string): string {
    return s
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')        // strip diacritics
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')                   // illegal filename chars
        .replace(/\s+/g, ' ')
        .trim();
}

function truncar(s: string, max: number): string {
    return s.length <= max ? s : s.slice(0, max).trim();
}
