/**
 * Utilidades atómicas para búsqueda tokenizada multi-palabra e insensible a acentos/mayúsculas.
 * Usa `translate(lower(...))` nativo de PostgreSQL (cero dependencia de extensiones como `unaccent`).
 */

export const PG_ACCENT_FROM = 'áéíóúüñàèìòùâêîôûç';
export const PG_ACCENT_TO = 'aeiouunaeiouaeiouc';

export function normalizeSearchText(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function tokenizeSearchQuery(query?: string | null, maxTokens = 10): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  return Array.from(new Set(rawTokens)).slice(0, maxTokens);
}
