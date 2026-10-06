/**
 * MEKANOS S.A.S - Utilidad de Generación de Slugs
 * Normaliza y convierte cadenas de texto a formato slug URL-friendly y seguro.
 */

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD') // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Reemplaza todo lo que no sea alfanumérico por '-'
    .replace(/^-+|-+$/g, ''); // Elimina guiones sobrantes al inicio o al final
}
