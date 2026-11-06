/**
 * MEKANOS S.A.S - Auditoría de Observaciones de Cierre
 *
 * Centraliza la semántica de comparación y los metadatos que se guardan en
 * `historial_estados_orden.metadata` cuando cambia `ordenes_servicio.observaciones_cierre`.
 *
 * Motivo: el campo se modifica desde varios caminos (Portal Admin, finalización
 * móvil, sincronización offline y actualización genérica de la orden). Si cada
 * camino implementa su propia comparación, la trazabilidad se vuelve inconsistente
 * y aparecen registros duplicados o ediciones que en realidad no cambiaron el texto.
 */

export const ACCION_MODIFICAR_OBSERVACIONES_CIERRE =
  'MODIFICAR_OBSERVACIONES_CIERRE';

export type OrigenObservacionesCierre =
  | 'PORTAL_ADMIN'
  | 'FINALIZACION_MOVIL'
  | 'SINCRONIZACION_MOVIL'
  | 'API_GENERICA'
  | 'TRANSFERENCIA';

export interface AuditoriaObservacionesCierre {
  origen: OrigenObservacionesCierre;
  observacionAnterior?: string | null;
  observacionNueva?: string | null;
  idEstadoAnterior?: number | null;
  idEstadoNuevo: number;
  realizadoPor: number;
  motivo?: string;
}

/**
 * Conserva el valor original (incluido el HTML del editor) pero considera
 * equivalentes a `null`, `undefined`, `''` y cadenas compuestas sólo por espacios.
 */
export function normalizarObservacionCierre(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor);
  return texto.trim().length > 0 ? texto : null;
}

function decodificarEntidadesHtml(texto: string): string {
  return texto
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, codigo: string) =>
      String.fromCharCode(Number(codigo)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, codigo: string) =>
      String.fromCharCode(parseInt(codigo, 16)),
    );
}

/**
 * Texto visible de la observación. Se usa únicamente para comparar y para
 * mostrar el "antes / después" en el Portal Admin; nunca se guarda.
 */
export function textoPlanoObservacionCierre(valor: unknown): string {
  const texto = normalizarObservacionCierre(valor);
  if (!texto) return '';

  return decodificarEntidadesHtml(
    texto
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Dos observaciones son equivalentes cuando el texto visible coincide.
 *
 * Esto evita falsos positivos cuando el técnico guardó texto plano desde la app
 * móvil y el admin abre/guarda el editor rico: TipTap lo convierte a `<p>...</p>`
 * sin que el contenido haya cambiado. El valor nuevo sí se persiste (para
 * conservar el formato), pero no se crea una entrada de auditoría vacía.
 */
export function observacionesCierreEquivalentes(
  anterior: unknown,
  nueva: unknown,
): boolean {
  return (
    textoPlanoObservacionCierre(anterior) ===
    textoPlanoObservacionCierre(nueva)
  );
}

function valorObservacionParaMetadata(valor: unknown): string | null {
  const texto = normalizarObservacionCierre(valor);
  if (!texto) return null;
  return textoPlanoObservacionCierre(texto).length > 0 ? texto : null;
}

export function crearMetadataObservacionesCierre(params: {
  origen: OrigenObservacionesCierre;
  anterior?: unknown;
  nueva?: unknown;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(params.extra ?? {}),
    origen: params.origen,
    campo: 'observaciones_cierre',
    observacion_anterior: valorObservacionParaMetadata(params.anterior),
    observacion_nueva: valorObservacionParaMetadata(params.nueva),
  };
}
