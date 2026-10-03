/**
 * MEKANOS S.A.S - Portal Admin
 * Módulo de Utilidades de Búsqueda Inteligente y Tolerante
 * 
 * Soporta:
 * - Insensibilidad a mayúsculas/minúsculas y tildes/diacríticos (á, é, í, ó, ú, ü, ñ).
 * - Búsqueda permutativa / multi-palabra independiente del orden ("Control de Módulo" == "MÓDULO DE CONTROL").
 * - Tolerancia a preposiciones/artículos (stop words comunes en español).
 * - Coincidencia por prefijos, palabras parciales y acrónimos ("mod cont" -> "modulo control").
 * - Tolerancia difusa a errores tipográficos leves (Levenshtein distance <= 1).
 * - Puntuación de relevancia (ranking) para colocar las mejores coincidencias al principio.
 * - Resaltado visual de coincidencias (highlighting).
 */

import React from 'react';

/**
 * Normaliza un texto eliminando tildes, diacríticos, caracteres especiales redundantes y convirtiendo a minúsculas.
 */
export function normalizeSearchText(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Extrae tokens significativos de una consulta o texto.
 * Separa por espacios y puntuación habitual (- _ / . , ; : etc.).
 */
export function tokenizeSearch(text: string | null | undefined): string[] {
    if (!text) return [];
    const normalized = normalizeSearchText(text);
    return normalized
        .split(/[\s\-_/.,;:+()\[\]{}]+/)
        .filter((t) => t.length > 0);
}

/**
 * Palabras de enlace comunes en español que no deben invalidar una búsqueda si los términos principales coinciden.
 */
const STOP_WORDS_ES = new Set([
    'de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'o', 'un', 'una', 'unos', 'unas', 'a', 'al', 'con', 'por', 'para'
]);

/**
 * Calcula la distancia de Levenshtein entre dos cadenas cortas para tolerancia a typos leves.
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Optimización rápida si la diferencia de longitud es muy grande
    if (Math.abs(a.length - b.length) > 2) return Math.abs(a.length - b.length);

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // sustitución
                    matrix[i][j - 1] + 1,     // inserción
                    matrix[i - 1][j] + 1      // eliminación
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Comprueba si un token de búsqueda coincide de forma flexible con un token del texto objetivo.
 * - Coincidencia exacta
 * - Prefijo (si token.length >= 2)
 * - Subcadena
 * - Typo con distancia <= 1 (si token.length >= 4)
 */
export function tokenMatches(queryToken: string, targetToken: string): boolean {
    if (queryToken === targetToken) return true;
    if (targetToken.startsWith(queryToken)) return true;
    if (targetToken.includes(queryToken)) return true;
    if (queryToken.includes(targetToken) && targetToken.length >= 3) return true;
    if (queryToken.length >= 4 && targetToken.length >= 4) {
        return levenshteinDistance(queryToken, targetToken) <= 1;
    }
    return false;
}

export interface SmartMatchFields {
    primary?: string | null;     // Ej: nombre_servicio (mayor peso)
    secondary?: string | null;   // Ej: codigo_servicio
    extra?: (string | null | undefined)[]; // Ej: [descripcion, categoria, tipo_servicio]
}

/**
 * Evalúa si una consulta coincide con uno o varios campos de un elemento objetivo,
 * y devuelve un puntaje de relevancia (score > 0 indica coincidencia).
 * 
 * Si score === 0, no hay coincidencia.
 */
export function calculateSmartMatchScore(
    query: string,
    targetFields: SmartMatchFields
): number {
    const rawQuery = query.trim();
    if (!rawQuery) return 1; // Si no hay búsqueda, coincide por defecto

    const normQuery = normalizeSearchText(rawQuery);
    const queryTokens = tokenizeSearch(normQuery);
    if (queryTokens.length === 0) return 1;

    const normPrimary = normalizeSearchText(targetFields.primary);
    const normSecondary = normalizeSearchText(targetFields.secondary);
    const extraJoined = (targetFields.extra || []).map(normalizeSearchText).join(' ');

    const allTargetText = `${normSecondary} ${normPrimary} ${extraJoined}`.trim();
    const targetTokens = tokenizeSearch(allTargetText);
    const primaryTokens = tokenizeSearch(normPrimary);
    const secondaryTokens = tokenizeSearch(normSecondary);

    let score = 0;

    // 1. Coincidencia idéntica o prefijo de la frase completa
    if (normPrimary === normQuery) {
        score += 15000;
    } else if (normSecondary === normQuery) {
        score += 14000;
    } else if (normPrimary.startsWith(normQuery)) {
        score += 10000;
    } else if (normSecondary.startsWith(normQuery)) {
        score += 9000;
    } else if (normPrimary.includes(normQuery)) {
        score += 7000;
    } else if (allTargetText.includes(normQuery)) {
        score += 5000;
    }

    // 2. Coincidencia token a token (independiente del orden de palabras)
    const coreTokens = queryTokens.filter(t => !STOP_WORDS_ES.has(t) || queryTokens.length === 1);
    const tokensToVerify = coreTokens.length > 0 ? coreTokens : queryTokens;

    let matchedCoreCount = 0;
    let matchedInPrimaryCount = 0;
    let matchedInSecondaryCount = 0;

    for (const qToken of tokensToVerify) {
        // ¿Está este token en el texto primario (nombre)?
        const inPrimary = primaryTokens.some(t => tokenMatches(qToken, t)) || normPrimary.includes(qToken);
        if (inPrimary) {
            matchedInPrimaryCount++;
            matchedCoreCount++;
            continue;
        }

        // ¿Está en el secundario (código)?
        const inSecondary = secondaryTokens.some(t => tokenMatches(qToken, t)) || normSecondary.includes(qToken);
        if (inSecondary) {
            matchedInSecondaryCount++;
            matchedCoreCount++;
            continue;
        }

        // ¿Está en alguno de los otros campos (categoría, descripción, tipo)?
        const inTarget = targetTokens.some(t => tokenMatches(qToken, t)) || allTargetText.includes(qToken);
        if (inTarget) {
            matchedCoreCount++;
            continue;
        }
    }

    // Para considerar que coincide, se deben encontrar los tokens principales (coreTokens)
    const threshold = tokensToVerify.length >= 4 ? Math.ceil(tokensToVerify.length * 0.75) : tokensToVerify.length;
    const isMatch = matchedCoreCount >= threshold;

    if (!isMatch && score === 0) {
        return 0; // No coincide
    }

    // Sumar ponderación al score
    score += (matchedCoreCount / tokensToVerify.length) * 3000;
    score += matchedInPrimaryCount * 1200;
    score += matchedInSecondaryCount * 800;

    // Bonificación si las palabras de la consulta aparecen en el mismo orden en el nombre
    let lastIndex = -1;
    let inOrder = true;
    for (const qToken of queryTokens) {
        const idx = normPrimary.indexOf(qToken);
        if (idx === -1 || idx < lastIndex) {
            inOrder = false;
            break;
        }
        lastIndex = idx;
    }
    if (inOrder && queryTokens.length > 1) {
        score += 1500;
    }

    // Bonificación de concisión: textos más cortos donde el match es más denso ganan puntos
    if (normPrimary.length > 0) {
        const density = Math.min(normQuery.length / normPrimary.length, 1);
        score += Math.round(density * 500);
    }

    return score;
}

/**
 * Resalta las partes coincidentes de un texto original en base a la consulta de búsqueda.
 * Devuelve un array de fragmentos para renderizar con formato destacado.
 */
export function getHighlightedSegments(
    originalText: string | null | undefined,
    query: string
): Array<{ text: string; isMatch: boolean }> {
    if (!originalText) return [];
    const rawQuery = query.trim();
    if (!rawQuery) return [{ text: originalText, isMatch: false }];

    const tokens = tokenizeSearch(rawQuery).filter(t => t.length > 1 || !STOP_WORDS_ES.has(t));
    if (tokens.length === 0) return [{ text: originalText, isMatch: false }];

    // Crear expresión regular para capturar los tokens (insensible a acentos mediante mapeo)
    const pattern = tokens
        .map(t => {
            return t
                .replace(/[aáàä]/gi, '[aáàä]')
                .replace(/[eéèë]/gi, '[eéèë]')
                .replace(/[iíìï]/gi, '[iíìï]')
                .replace(/[oóòö]/gi, '[oóòö]')
                .replace(/[uúùü]/gi, '[uúùü]')
                .replace(/[nñ]/gi, '[nñ]');
        })
        .join('|');

    try {
        const regex = new RegExp(`(${pattern})`, 'gi');
        const parts = originalText.split(regex);
        return parts
            .filter(part => part.length > 0)
            .map(part => ({
                text: part,
                isMatch: regex.test(part),
            }));
    } catch {
        return [{ text: originalText, isMatch: false }];
    }
}

/**
 * Componente React reutilizable para resaltar coincidencias de búsqueda.
 */
export function SmartHighlight({
    text,
    query,
    highlightClassName = 'font-bold text-blue-700 bg-blue-50/90 px-0.5 rounded',
    className,
}: {
    text: string | null | undefined;
    query: string;
    highlightClassName?: string;
    className?: string;
}) {
    if (!text) return null;
    const segments = getHighlightedSegments(text, query);
    return (
        <span className={className}>
            {segments.map((seg, idx) =>
                seg.isMatch ? (
                    <span key={idx} className={highlightClassName}>
                        {seg.text}
                    </span>
                ) : (
                    <React.Fragment key={idx}>{seg.text}</React.Fragment>
                )
            )}
        </span>
    );
}
