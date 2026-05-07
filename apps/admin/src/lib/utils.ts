import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilidad para combinar clases de Tailwind de forma segura
 * Evita conflictos y duplicados
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ✅ FIX 29-ABR-2026: Formatea fechas del backend sin desfase de timezone.
 * Problema: El backend envia fechas como ISO UTC (ej: "2026-04-29T00:00:00.000Z").
 * new Date() las interpreta como UTC medianoche, y toLocaleDateString('es-CO')
 * resta 5h (UTC-5) mostrando el dia anterior (28 abr).
 * Solucion: Extraer Y/M/D directamente del string ISO y formatear como fecha local.
 */
export function formatDateSafe(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  if (!dateString) return 'Sin fecha';

  // Extraer YYYY-MM-DD del inicio del string ISO
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    // Fallback: intentar parse normal
    try {
      return new Date(dateString).toLocaleDateString('es-CO', options);
    } catch {
      return 'Fecha inválida';
    }
  }

  const [, year, month, day] = match;
  // Crear fecha local con los componentes extraidos (sin conversion UTC)
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));

  return localDate.toLocaleDateString('es-CO', options);
}
