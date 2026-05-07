/**
 * MEKANOS S.A.S - Helper centralizado de nombres de archivo para informes PDF
 * (Mirror del helper de backend `apps/api/src/pdf/pdf-naming.helper.ts`).
 *
 * Formato canónico:
 *   INFORME - DDMM-YY - <SERVICIO> <EQUIPO> - <CLIENTE> - <MES> <YYYY>.pdf
 *
 * Ejemplos:
 *   INFORME - 2504-26 - MANTENIMIENTO PREVENTIVO TIPO A PLANTA - BALMORAL - ABRIL 2026.pdf
 *   INFORME - 1203-26 - CORRECTIVO BOMBA - TAKURIKA CUARTO SUR - MARZO 2026.pdf
 *
 * Se mantiene en paralelo al backend para garantizar consistencia entre:
 *  - el filename que se establece como Content-Disposition al subir el PDF a R2
 *  - el filename que el portal usa al descargar (atributo `download` o blob)
 */

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
    fechaServicio?: Date | string | null;
    codigoTipoServicio?: string | null;
    nombreTipoServicio?: string | null;
    codigoTipoEquipo?: string | null;
    nombreTipoEquipo?: string | null;
    nombreCliente?: string | null;
    numeroOrden?: string | null;
}

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

function parseFechaSegura(v: Date | string | null | undefined): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
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
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function truncar(s: string, max: number): string {
    return s.length <= max ? s : s.slice(0, max).trim();
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER: Descarga autenticada con nombre canónico
// ────────────────────────────────────────────────────────────────────────────

/**
 * Descarga un informe PDF a través del endpoint proxy del backend
 * (`GET /api/informes/documento/:id/descargar`), respetando el JWT en el
 * header Authorization, y dispara la descarga al navegador con el nombre
 * canónico calculado.
 *
 * Por qué no `<a download>`: el bucket R2 es cross-origin, por lo que el
 * atributo `download` es ignorado por seguridad. El proxy backend evita
 * eso al ser mismo origen y agregar Content-Disposition.
 */
export async function descargarInformeAutenticado(
    apiClient: { get: (url: string, config?: any) => Promise<{ data: any }> },
    idDocumento: number,
    filenameCanonico: string,
): Promise<void> {
    const response = await apiClient.get(
        `/informes/documento/${idDocumento}/descargar`,
        { responseType: 'blob' },
    );

    const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' });

    const objectUrl = URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filenameCanonico;
        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        // Liberar memoria después de un tick
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
}

/**
 * Previsualiza un informe PDF en el navegador sin descargar.
 * Usa el endpoint /preview que streammea el PDF con Content-Disposition: inline,
 * permitiendo que el navegador lo muestre inmediatamente sin cargar todo el blob.
 * ✅ FIX 06-MAY-2026: Streaming inline en lugar de blob para respuesta instantánea.
 */
export async function previsualizarInformeAutenticado(
    apiClient: { get: (url: string, config?: any) => Promise<{ data: any; request?: any }> },
    idDocumento: number,
): Promise<void> {
    const response = await apiClient.get(
        `/informes/documento/${idDocumento}/preview`,
        { responseType: 'blob' },
    );

    const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' });

    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank');
    // Liberar memoria después de un tiempo (la nueva pestaña mantiene la referencia)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
