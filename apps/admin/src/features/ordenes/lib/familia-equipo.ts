/**
 * MEKANOS S.A.S - Portal Admin
 * Clasificación de familias de equipo y compatibilidad con servicios.
 *
 * Lógica pura y determinista (sin React ni I/O) para poder probarla y
 * reutilizarla. El TIPO DECLARADO del equipo es la única autoridad.
 */

import type { EquipoSelector } from '../api/catalogos.service';

export type FamiliaEquipo = 'GENERADOR' | 'BOMBA' | 'MOTOR' | 'COMPRESOR' | 'GLOBAL' | 'MIXTO';

/**
 * Campos mínimos de un servicio comercial para clasificarlo por familia.
 * Todos opcionales: la relación `tipos_equipo` puede no venir en la respuesta,
 * y en ese caso las reglas de respaldo (código/nombre/id) siguen aplicando.
 */
type ServicioClasificable = {
    codigo_servicio?: string;
    nombre_servicio?: string;
    codigo_tipo?: string;
    nombre_tipo?: string;
    id_tipo_equipo?: number | null;
    tipos_equipo?: { codigo_tipo?: string; nombre_tipo?: string } | null;
};

/**
 * Familias por código del catálogo `tipos_equipo`.
 * El TIPO DECLARADO del equipo es la única autoridad para clasificarlo.
 */
const FAMILIA_POR_CODIGO_TIPO = new Map<string, FamiliaEquipo>([
    ['GENERADOR', 'GENERADOR'],
    ['GEN', 'GENERADOR'],
    ['BOMBA', 'BOMBA'],
    ['BOM', 'BOMBA'],
    ['MOTOR', 'MOTOR'],
    ['MOT', 'MOTOR'],
    ['COMPRESOR', 'COMPRESOR'],
    ['COMP', 'COMPRESOR'],
]);

/** Reglas de respaldo por nombre (solo si el tipo declarado no resuelve). */
const REGLAS_NOMBRE: ReadonlyArray<readonly [readonly string[], FamiliaEquipo]> = [
    [['COMPRESOR', 'COMPRESI'], 'COMPRESOR'],
    [['MOTOBOMBA', 'BOMBA', 'BOMBEO', 'HIDRONEUMATICO'], 'BOMBA'],
    [['GENERADOR', 'PLANTA ELECTRICA', 'PLANTA DE EMERGENCIA', 'PLANTA DE LUZ'], 'GENERADOR'],
    [['MOTOR'], 'MOTOR'],
];

function normalizarTexto(valor?: string | null): string {
    return (valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function detectarFamiliaPorNombre(nombre?: string | null): FamiliaEquipo | null {
    const texto = normalizarTexto(nombre);
    if (!texto) return null;

    // 1) La primera palabra manda: "COMPRESOR ...", "BOMBA ...", "MOTOBOMBA ...".
    for (const [tokens, familia] of REGLAS_NOMBRE) {
        if (tokens.some((token) => texto.startsWith(token))) return familia;
    }
    // 2) Si el nombre no empieza por la familia, se busca en cualquier posición.
    for (const [tokens, familia] of REGLAS_NOMBRE) {
        if (tokens.some((token) => texto.includes(token))) return familia;
    }
    return null;
}

/**
 * Determina la familia técnica de un equipo.
 *
 * Jerarquía (zero-trust):
 *   1. `tipos_equipo.codigo_tipo`  -> autoridad declarada.
 *   2. `tipos_equipo.nombre_tipo`  -> tipos no catalogados (prueba/legado).
 *   3. `nombre_equipo`             -> último respaldo.
 *
 * NUNCA se usa `codigo_equipo`: es un código autogenerado (GEN-/BOM-/MOT-/COMP-)
 * que queda obsoleto al corregir el tipo y no representa la naturaleza real.
 */
export function detectarFamiliaEquipo(equipo?: EquipoSelector | null): FamiliaEquipo {
    if (!equipo) return 'GLOBAL';

    const tipo = equipo.tipos_equipo;

    const familiaPorCodigo = FAMILIA_POR_CODIGO_TIPO.get(normalizarTexto(tipo?.codigo_tipo));
    if (familiaPorCodigo) return familiaPorCodigo;

    const familiaPorNombreTipo = detectarFamiliaPorNombre(tipo?.nombre_tipo);
    if (familiaPorNombreTipo) return familiaPorNombreTipo;

    return detectarFamiliaPorNombre(equipo.nombre_equipo) ?? 'GLOBAL';
}

export function detectarFamiliaEquipos(equipos: EquipoSelector[]): FamiliaEquipo {
    if (!equipos || equipos.length === 0) return 'GLOBAL';
    const familias = Array.from(new Set(equipos.map(detectarFamiliaEquipo)));
    if (familias.length === 1) return familias[0];
    return 'MIXTO';
}

export function esServicioCompatibleConFamilia(
    service: ServicioClasificable,
    familia: FamiliaEquipo
): boolean {
    if (familia === 'GLOBAL' || familia === 'MIXTO') return true;

    const cod = (service.codigo_tipo || '').toUpperCase();
    const nom = (service.nombre_tipo || '').toUpperCase();
    const codEq = (service.tipos_equipo?.codigo_tipo || '').toUpperCase();
    const idEq = service.id_tipo_equipo;

    const esGen = idEq === 1 || idEq === 3 || cod.startsWith('GEN') || codEq.includes('GEN') || nom.includes('GENERADOR') || nom.includes('PLANTA');
    const esBom = idEq === 2 || idEq === 5 || cod.startsWith('BOM') || codEq.includes('BOM') || nom.includes('BOMBA');
    const esMot = idEq === 4 || idEq === 6 || cod.startsWith('MOT') || codEq.includes('MOT') || nom.includes('MOTOR');
    const esComp = idEq === 20 || cod.startsWith('COMP') || codEq.includes('COMP') || nom.includes('COMPRESOR');

    if (familia === 'GENERADOR') {
        if (esBom || esMot || esComp) return false;
        return true;
    }
    if (familia === 'BOMBA') {
        if (esGen || esMot || esComp) return false;
        return true;
    }
    if (familia === 'MOTOR') {
        if (esGen || esBom || esComp) return false;
        return true;
    }
    if (familia === 'COMPRESOR') {
        if (esGen || esBom || esMot) return false;
        return true;
    }
    return true;
}

export function clasificarServicioCorrectivo(s: ServicioClasificable): 'GENERADOR' | 'BOMBA' | 'MOTOR' | 'GLOBAL' {
    const cod = (s.codigo_servicio || '').toUpperCase();
    const nom = (s.nombre_servicio || '').toUpperCase();
    const codEq = (s.tipos_equipo?.codigo_tipo || '').toUpperCase();
    const nomEq = (s.tipos_equipo?.nombre_tipo || '').toUpperCase();
    const idEq = s.id_tipo_equipo;

    if (
        idEq === 1 || idEq === 3 ||
        codEq.includes('GEN') || nomEq.includes('GENERADOR') ||
        cod.startsWith('GEN-') || cod.includes('-GEN') ||
        nom.includes('PLANTA') || nom.includes('GENERADOR') ||
        nom.includes('RADIADOR') || nom.includes('BATERÍA') || nom.includes('BATERIA') || nom.includes('ALTERNADOR')
    ) {
        return 'GENERADOR';
    }
    if (
        idEq === 2 || idEq === 5 ||
        codEq.includes('BOM') || nomEq.includes('BOMBA') ||
        cod.startsWith('BOM-') || cod.includes('-BOMB') ||
        nom.includes('BOMBA') || nom.includes('BOMBEO') ||
        nom.includes('HIDRONEUMÁTICO') || nom.includes('HIDRONEUMATICO') ||
        nom.includes('PRESOSTATO') || nom.includes('IMPULSOR') || nom.includes('SELLO MECÁNICO')
    ) {
        return 'BOMBA';
    }
    if (
        idEq === 4 || idEq === 6 ||
        codEq.includes('MOT') || nomEq.includes('MOTOR') ||
        cod.startsWith('MOT-') || nom.includes('MOTOR') ||
        nom.includes('BOBINADO') || nom.includes('ESTATOR') || nom.includes('RODAMIENTO')
    ) {
        return 'MOTOR';
    }
    return 'GLOBAL';
}
