/**
 * MEKANOS S.A.S - Portal Admin
 * Motor Universal Zero-Trust de Clasificación de Arquetipos de Equipo y
 * Compatibilidad N:M con Tipos de Servicio y Catálogo Comercial.
 *
 * Lógica pura y determinista (sin React ni I/O).
 * Soporta los arquetipos históricos (GENERADOR, BOMBA, MOTOR, COMPRESOR, HVAC)
 * y cualquier nuevo arquetipo creado dinámicamente en el Hub EAM Universal
 * (ej. ELEV, CALD, TORRE, UPS, etc.), así como servicios multi-arquetipo (`aplica_a`).
 */

import type { EquipoSelector } from '../api/catalogos.service';

export type FamiliaEquipo =
    | 'GENERADOR'
    | 'BOMBA'
    | 'MOTOR'
    | 'COMPRESOR'
    | 'HVAC'
    | 'GLOBAL'
    | 'MIXTO'
    | (string & {});

/**
 * Campos mínimos de un servicio (TipoServicio o CatalogoServicio) para evaluar
 * a qué arquetipos de equipo pertenece.
 */
export type ServicioClasificable = {
    codigo_servicio?: string;
    nombre_servicio?: string;
    codigo_tipo?: string;
    nombre_tipo?: string;
    categoria?: string;
    id_tipo_equipo?: number | null;
    aplica_a?: string[] | null;
    tipos_equipo?: {
        id_tipo_equipo?: number;
        codigo_tipo?: string;
        nombre_tipo?: string;
    } | null;
};

/**
 * Sinónimos canónicos de códigos de arquetipo para unificar registros mellizos
 * históricos de la base de datos (`GEN`/`GENERADOR`, `BOM`/`BOMBA`, `MOT`/`MOTOR`, `COMP`/`COMPRESOR`).
 * Cualquier código nuevo del Hub EAM (ej. `ELEV`, `CALD`, `MONT`) se preserva en mayúsculas tal cual.
 */
const SINONIMOS_CODIGO_ARQUETIPO = new Map<string, FamiliaEquipo>([
    ['GENERADOR', 'GENERADOR'],
    ['GEN', 'GENERADOR'],
    ['BOMBA', 'BOMBA'],
    ['BOM', 'BOMBA'],
    ['MOTOR', 'MOTOR'],
    ['MOT', 'MOTOR'],
    ['COMPRESOR', 'COMPRESOR'],
    ['COMP', 'COMPRESOR'],
    ['HVAC', 'HVAC'],
    ['CHILLER', 'HVAC'],
    ['CLIMA', 'HVAC'],
    ['AIRE_ACONDICIONADO', 'HVAC'],
    ['ELEV', 'ELEV'],
    ['ASCENSOR', 'ELEV'],
]);

/**
 * Mapa de IDs primarios históricos en `tipos_equipo` por si un registro llega solo con `id_tipo_equipo`
 * sin la relación `tipos_equipo` expandida.
 */
const FAMILIA_POR_ID_TIPO_EQUIPO = new Map<number, FamiliaEquipo>([
    [1, 'GENERADOR'],
    [3, 'GENERADOR'],
    [2, 'BOMBA'],
    [5, 'BOMBA'],
    [4, 'MOTOR'],
    [6, 'MOTOR'],
    [20, 'COMPRESOR'],
    [21, 'HVAC'],
    [22, 'ELEV'],
]);

/** Reglas de respaldo por nombre (solo cuando no existe código de arquetipo ni FK). */
const REGLAS_NOMBRE: ReadonlyArray<readonly [readonly string[], FamiliaEquipo]> = [
    [['ASCENSOR', 'ELEVADOR', 'MONTACARGA'], 'ELEV'],
    [['COMPRESOR', 'COMPRESI'], 'COMPRESOR'],
    [['MOTOBOMBA', 'BOMBA', 'BOMBEO', 'HIDRONEUMATICO'], 'BOMBA'],
    [['GENERADOR', 'PLANTA ELECTRICA', 'PLANTA DE EMERGENCIA', 'PLANTA DE LUZ'], 'GENERADOR'],
    [['CHILLER', 'AIRE ACONDICIONADO', 'CLIMATIZACION', 'HVAC', 'REFRIGERACION'], 'HVAC'],
    [['MOTOR'], 'MOTOR'],
];

/** Prefijos genéricos de códigos de servicio que NO representan un tipo de equipo. */
const PREFIJOS_GENERICOS_SERVICIO = new Set([
    'PREV',
    'CORR',
    'CORRECTIVO',
    'PREVENTIVO',
    'INSPECCION',
    'INSP',
    'DIAG',
    'DIAGNOSTICO',
    'MANT',
    'SERV',
    'SRV',
    'GEN_GRAL',
    'GENERAL',
    'GLOBAL',
    'UNIV',
    'UNIVERSAL',
    'OTRO',
    'TEST',
]);

function normalizarTexto(valor?: string | null): string {
    return (valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

/**
 * Convierte cualquier código de arquetipo (`codigo_tipo`) o `id_tipo_equipo` en su
 * identificador canónico de familia.
 * - Si es un arquetipo clásico (`GEN`, `BOM`, `MOT`, `COMP`, `HVAC`), retorna su nombre canónico.
 * - Si es cualquier arquetipo nuevo del Hub EAM (ej. `ELEV`, `CALD`, `UPS`), retorna su `codigo_tipo` en mayúsculas.
 */
export function canonicalizarArquetipo(
    codigo?: string | null,
    idTipoEquipo?: number | null
): FamiliaEquipo | null {
    const codNorm = normalizarTexto(codigo);
    if (codNorm && !PREFIJOS_GENERICOS_SERVICIO.has(codNorm)) {
        const sinonimo = SINONIMOS_CODIGO_ARQUETIPO.get(codNorm);
        if (sinonimo) return sinonimo;
        return codNorm;
    }

    if (idTipoEquipo != null && !isNaN(Number(idTipoEquipo))) {
        const porId = FAMILIA_POR_ID_TIPO_EQUIPO.get(Number(idTipoEquipo));
        if (porId) return porId;
        return `ID_${Number(idTipoEquipo)}`;
    }

    return null;
}

function detectarFamiliaPorNombre(nombre?: string | null): FamiliaEquipo | null {
    const texto = normalizarTexto(nombre);
    if (!texto) return null;

    // 1) La primera palabra manda
    for (const [tokens, familia] of REGLAS_NOMBRE) {
        if (tokens.some((token) => texto.startsWith(token))) return familia;
    }
    // 2) Coincidencia en cualquier posición del nombre
    for (const [tokens, familia] of REGLAS_NOMBRE) {
        if (tokens.some((token) => texto.includes(token))) return familia;
    }
    return null;
}

/**
 * Determina la familia / arquetipo técnico de un equipo (Zero-Trust).
 *
 * Jerarquía estricta:
 *   1. `tipos_equipo.codigo_tipo` o `id_tipo_equipo` -> autoridad relacional declarada.
 *   2. `tipos_equipo.nombre_tipo` (o `equipo.tipo`)  -> respaldo semántico del tipo.
 *   3. `nombre_equipo`                               -> último respaldo si no tiene tipo.
 */
export function detectarFamiliaEquipo(equipo?: EquipoSelector | null): FamiliaEquipo {
    if (!equipo) return 'GLOBAL';

    const tipoObj = equipo.tipos_equipo || (equipo as any).tipo_equipo;
    const idTipo = equipo.id_tipo_equipo ?? tipoObj?.id_tipo_equipo ?? null;

    // 1. Código declarado en `tipos_equipo.codigo_tipo`
    if (tipoObj?.codigo_tipo) {
        const canon = canonicalizarArquetipo(tipoObj.codigo_tipo, idTipo);
        if (canon) return canon;
    }

    // 2. Mapeo directo por `id_tipo_equipo` conocido
    if (idTipo != null && FAMILIA_POR_ID_TIPO_EQUIPO.has(Number(idTipo))) {
        return FAMILIA_POR_ID_TIPO_EQUIPO.get(Number(idTipo))!;
    }

    // 3. Nombre del tipo de equipo
    const familiaPorNombreTipo = detectarFamiliaPorNombre(
        tipoObj?.nombre_tipo || (equipo as any).tipo
    );
    if (familiaPorNombreTipo) return familiaPorNombreTipo;

    // 4. Si tiene `id_tipo_equipo` de un arquetipo nuevo pero sin `codigo_tipo` cargado
    if (idTipo != null && !isNaN(Number(idTipo))) {
        return `ID_${Number(idTipo)}`;
    }

    // 5. Respaldo final por nombre del equipo
    return detectarFamiliaPorNombre(equipo.nombre_equipo || equipo.nombre) ?? 'GLOBAL';
}

export function detectarFamiliaEquipos(equipos: EquipoSelector[]): FamiliaEquipo {
    if (!equipos || equipos.length === 0) return 'GLOBAL';
    const familias = Array.from(
        new Set(equipos.map(detectarFamiliaEquipo).filter((f) => f !== 'GLOBAL'))
    );
    if (familias.length === 0) return 'GLOBAL';
    if (familias.length === 1) return familias[0];
    return 'MIXTO';
}

/**
 * Extrae la lista de arquetipos canónicos a los que aplica un servicio.
 * - Si retorna `[]` (array vacío), el servicio es **UNIVERSAL (Global)** y aplica a TODOS los equipos.
 * - Si retorna `['ELEV']`, el servicio es exclusivo para `ELEV`.
 * - Si retorna `['BOMBA', 'COMPRESOR']`, el servicio es multi-arquetipo y aplica únicamente a esos dos.
 */
export function obtenerArquetiposDeServicio(service: ServicioClasificable): FamiliaEquipo[] {
    const targets = new Set<FamiliaEquipo>();

    // 1. Autoridad Primaria N:M: `aplica_a` (array de códigos de arquetipo)
    if (Array.isArray(service.aplica_a) && service.aplica_a.length > 0) {
        for (const rawCode of service.aplica_a) {
            const canon = canonicalizarArquetipo(rawCode);
            if (canon) targets.add(canon);
        }
    }

    // 2. Autoridad Relacional 1:N: `tipos_equipo.codigo_tipo` y `id_tipo_equipo`
    if (service.tipos_equipo?.codigo_tipo || service.id_tipo_equipo != null) {
        const canonFk = canonicalizarArquetipo(
            service.tipos_equipo?.codigo_tipo,
            service.id_tipo_equipo
        );
        if (canonFk) targets.add(canonFk);
    }

    // 3. Si ya tenemos arquetipos declarados por vía relacional, retornarlos de inmediato
    if (targets.size > 0) {
        return Array.from(targets);
    }

    // 4. Respaldo inteligente para servicios donde la consulta omitió la relación o servicios legacy:
    //    Extraer prefijo de `codigo_tipo` / `codigo_servicio` (ej. `ELEV_PREV_A` -> `ELEV`, `HVAC_CORR` -> `HVAC`)
    const cod = normalizarTexto(service.codigo_tipo || service.codigo_servicio);
    if (cod) {
        const matchPrefijo = cod.match(/^([A-Z0-9]+)_(?:PREV|CORR|INSP|DIAG|MANT)/);
        if (matchPrefijo && !PREFIJOS_GENERICOS_SERVICIO.has(matchPrefijo[1])) {
            const canonPrefijo = canonicalizarArquetipo(matchPrefijo[1]);
            if (canonPrefijo) targets.add(canonPrefijo);
        } else {
            const matchGuion = cod.match(/^([A-Z0-9]+)-[0-9]+$/);
            if (matchGuion && !PREFIJOS_GENERICOS_SERVICIO.has(matchGuion[1])) {
                const canonGuion = canonicalizarArquetipo(matchGuion[1]);
                if (canonGuion) targets.add(canonGuion);
            }
        }
    }

    if (targets.size > 0) {
        return Array.from(targets);
    }

    // 5. Respaldo semántico por nombre del servicio (ej. "... - Ascensor", "... - Generador")
    const porNombreTipo = detectarFamiliaPorNombre(
        service.tipos_equipo?.nombre_tipo || service.nombre_tipo || service.nombre_servicio
    );
    if (porNombreTipo) {
        targets.add(porNombreTipo);
    }

    return Array.from(targets);
}

/**
 * Motor Zero-Trust Whitelist de compatibilidad entre un servicio y la familia del equipo.
 *
 * Regla de Oro:
 * - Si un servicio es Universal (`obtenerArquetiposDeServicio(s).length === 0`), es compatible con TODOS.
 * - Si un servicio tiene arquetipos asignados (1 o varios), SOLO es compatible si la familia del equipo
 *   seleccionado está explícitamente incluida en los arquetipos del servicio.
 */
export function esServicioCompatibleConFamilia(
    service: ServicioClasificable,
    familia: FamiliaEquipo,
    equiposSeleccionados?: EquipoSelector[]
): boolean {
    // Si el servicio está explícitamente desactivado, no debe renderizarse en órdenes
    if ((service as any).activo === false) {
        return false;
    }

    const arquetiposServicio = obtenerArquetiposDeServicio(service);

    // 1. Servicio Universal (sin restricción de arquetipo): aplica a cualquier equipo
    if (arquetiposServicio.length === 0) {
        return true;
    }

    // 2. Sin equipo seleccionado aún: mostrar todos
    if (!familia || familia === 'GLOBAL') {
        return true;
    }

    // 3. Caso multi-equipo heterogéneo ('MIXTO'): mostrar solo servicios compatibles con
    //    al menos uno de los equipos seleccionados en la orden (excluyendo arquetipos ajenos)
    if (familia === 'MIXTO') {
        if (!equiposSeleccionados || equiposSeleccionados.length === 0) return true;
        return equiposSeleccionados.some((eq) =>
            esServicioCompatibleConFamilia(service, detectarFamiliaEquipo(eq), [eq])
        );
    }

    // 4. Coincidencia directa por código canónico de arquetipo
    if (arquetiposServicio.includes(familia)) {
        return true;
    }

    // 5. Coincidencia por FK numérico `id_tipo_equipo` o `codigo_tipo` crudo contra `equiposSeleccionados`
    if (equiposSeleccionados && equiposSeleccionados.length > 0) {
        for (const eq of equiposSeleccionados) {
            const idEq = eq.id_tipo_equipo ?? eq.tipos_equipo?.id_tipo_equipo;
            if (
                service.id_tipo_equipo != null &&
                idEq != null &&
                Number(service.id_tipo_equipo) === Number(idEq)
            ) {
                return true;
            }
            const codCrudoEq = normalizarTexto(eq.tipos_equipo?.codigo_tipo);
            if (
                codCrudoEq &&
                Array.isArray(service.aplica_a) &&
                service.aplica_a.some((c) => normalizarTexto(c) === codCrudoEq)
            ) {
                return true;
            }
        }
    }

    // 6. Regla de dominio industrial: Los compresores comparten correctivos genéricos con bombas
    if (familia === 'COMPRESOR' && arquetiposServicio.includes('BOMBA')) {
        const cod = normalizarTexto(service.codigo_tipo || service.codigo_servicio);
        const cat = normalizarTexto(service.categoria);
        const nom = normalizarTexto(service.nombre_tipo || service.nombre_servicio);
        if (cat === 'CORRECTIVO' || cod.includes('CORR') || nom.includes('CORRECTIVO')) {
            return true;
        }
    }

    // Zero-Trust: Cualquier servicio de otro arquetipo queda bloqueado
    return false;
}

/**
 * Clasifica un servicio comercial del catálogo (`catalogo_servicios`) en su arquetipo canónico
 * o `'GLOBAL'` si es universal.
 */
export function clasificarServicioCorrectivo(s: ServicioClasificable): FamiliaEquipo {
    const arquetipos = obtenerArquetiposDeServicio(s);
    if (arquetipos.length > 0) {
        // En el catálogo comercial histórico, compresores y bombas comparten pestaña hidroneumática si aplica
        if (arquetipos[0] === 'COMPRESOR') return 'BOMBA';
        return arquetipos[0];
    }

    const nom = normalizarTexto(s.nombre_servicio || s.nombre_tipo);
    if (
        nom.includes('RADIADOR') ||
        nom.includes('BATERIA') ||
        nom.includes('ALTERNADOR')
    ) {
        return 'GENERADOR';
    }
    if (
        nom.includes('PRESOSTATO') ||
        nom.includes('IMPULSOR') ||
        nom.includes('SELLO MECANICO')
    ) {
        return 'BOMBA';
    }
    if (
        nom.includes('BOBINADO') ||
        nom.includes('ESTATOR') ||
        nom.includes('RODAMIENTO')
    ) {
        return 'MOTOR';
    }
    if (nom.includes('REFRIGERANTE')) {
        return 'HVAC';
    }

    return 'GLOBAL';
}

/**
 * Obtiene una etiqueta legible para mostrar en botones de filtro o badges de cualquier arquetipo.
 */
export function obtenerEtiquetaFamilia(
    familia: FamiliaEquipo,
    equiposSeleccionados?: EquipoSelector[]
): string {
    switch (familia) {
        case 'GENERADOR':
            return 'Generador';
        case 'BOMBA':
            return 'Bomba';
        case 'MOTOR':
            return 'Motor';
        case 'COMPRESOR':
            return 'Compresor';
        case 'HVAC':
            return 'HVAC / Chiller';
        case 'ELEV':
            return 'Ascensor';
        case 'GLOBAL':
            return 'Generales';
        case 'MIXTO':
            return 'Mixto';
        default: {
            const nombreDesdeEquipo = equiposSeleccionados?.find(
                (eq) => detectarFamiliaEquipo(eq) === familia
            )?.tipos_equipo?.nombre_tipo;
            if (nombreDesdeEquipo) return nombreDesdeEquipo;
            return familia;
        }
    }
}
