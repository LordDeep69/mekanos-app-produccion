/**
 * MEKANOS S.A.S - Portal Admin
 * Generador Universal Anti-Colisión de Códigos EAM (Fase 5.6+)
 *
 * Garantiza unicidad determinista, cero colisiones de Primary Key y validación en tiempo real
 * para todas las entidades maestras de la plataforma:
 * 1. Magnitudes Físicas (catalogo_magnitudes.codigo_magnitud VarChar 50)
 * 2. Unidades de Medida (unidades_medida.codigo VarChar 20 PK global)
 * 3. Campos Técnicos / Atributos (atributos_tecnicos.codigo_atributo VarChar 60)
 * 4. Partes y Subsistemas / Módulos (modulos_tecnicos.codigo_modulo VarChar 50)
 * 5. Modelos de Fábrica OEM (modelos_equipo.codigo_modelo VarChar 60)
 * 6. Tipos de Equipo / Arquetipos (tipos_equipo.codigo_tipo VarChar 30)
 */

export function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Genera un slug base limpio con separador configurado.
 */
export function generarSlugGenerico(
  texto: string,
  opciones: {
    maxLen?: number;
    uppercase?: boolean;
    separator?: '_' | '-';
  } = {},
): string {
  const { maxLen = 50, uppercase = false, separator = '_' } = opciones;
  if (!texto) return '';
  let clean = normalizarTexto(texto);
  clean = uppercase ? clean.toUpperCase() : clean.toLowerCase();

  clean = clean.replace(/[^a-zA-Z0-9]+/g, separator);
  const regexBordes = new RegExp(`^\\${separator}+|\\${separator}+$`, 'g');
  clean = clean.replace(regexBordes, '');

  return clean.slice(0, maxLen);
}

/**
 * Resuelve colisiones de forma determinista agregando un sufijo numérico (_2, _3 o -2, -3)
 * respetando el límite máximo de caracteres del campo en base de datos.
 */
export function resolverColisionDeterminista(
  base: string,
  codigosExistentes: Set<string>,
  opciones: {
    maxLen?: number;
    separator?: '_' | '-';
    caseSensitive?: boolean;
  } = {},
): string {
  const { maxLen = 50, separator = '_', caseSensitive = false } = opciones;
  if (!base) return '';

  const check = (val: string) =>
    caseSensitive ? codigosExistentes.has(val) : codigosExistentes.has(val.toLowerCase().trim());

  if (!check(base)) {
    return base;
  }

  let contador = 2;
  while (contador < 1000) {
    const sufijo = `${separator}${contador}`;
    const baseRecortada = base.slice(0, Math.max(2, maxLen - sufijo.length));
    const candidato = `${baseRecortada}${sufijo}`;
    if (!check(candidato)) {
      return candidato;
    }
    contador++;
  }

  return `${base.slice(0, maxLen - 5)}${separator}${Date.now().toString().slice(-4)}`;
}

/**
 * Verifica si un código ya existe en el conjunto, permitiendo ignorar el código original en modo edición.
 */
export function verificarCodigoDuplicado(
  codigo: string,
  codigosExistentes: Set<string>,
  codigoActualIgnorar?: string,
  caseSensitive = false,
): boolean {
  const cod = (codigo || '').trim();
  if (!cod) return false;
  if (codigoActualIgnorar && (caseSensitive ? cod === codigoActualIgnorar : cod.toLowerCase() === codigoActualIgnorar.toLowerCase())) {
    return false;
  }
  return caseSensitive ? codigosExistentes.has(cod) : codigosExistentes.has(cod.toLowerCase());
}

/**
 * 1. Campos Técnicos / Atributos (VarChar 60, snake_case minúsculas)
 * Ej: "Presión Nominal de Descarga" -> "presion_nominal_de_descarga"
 */
export function generarCodigoCampoTecnico(
  nombre: string,
  codigosExistentes: Set<string>,
  unidadSimbolo?: string,
  maxLen = 60,
): string {
  if (!nombre.trim()) return '';
  let base = generarSlugGenerico(nombre, { maxLen, uppercase: false, separator: '_' });
  if (unidadSimbolo && unidadSimbolo.trim()) {
    const simLimpio = generarSlugGenerico(unidadSimbolo, { maxLen: 10, uppercase: false, separator: '_' });
    if (simLimpio && !base.endsWith(`_${simLimpio}`)) {
      base = `${base.slice(0, maxLen - simLimpio.length - 1)}_${simLimpio}`;
    }
  }
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}

/**
 * 2. Partes y Subsistemas / Módulos Técnicos (VarChar 50, snake_case minúsculas)
 * Ej: "Tablero de Transferencia Automática (ATS)" -> "tablero_de_transferencia_automatica_ats"
 */
export function generarCodigoParteModulo(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 50,
): string {
  if (!nombre.trim()) return '';
  const base = generarSlugGenerico(nombre, { maxLen, uppercase: false, separator: '_' });
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}

/**
 * 3. Modelos de Fábrica OEM (VarChar 60, mayúsculas con guiones)
 * Ej: Marca: "Trane", Modelo: "CGAM 20" -> "MOD-TRANE-CGAM20"
 */
export function generarCodigoModeloOem(
  marca: string,
  modelo: string,
  codigosExistentes: Set<string>,
  maxLen = 60,
): string {
  const mClean = normalizarTexto(marca).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const modClean = normalizarTexto(modelo).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!mClean && !modClean) return '';

  const base = `MOD-${mClean || 'OEM'}-${modClean || 'STD'}`.slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '-', caseSensitive: false });
}

/**
 * 4. Tipos de Equipo / Arquetipos (VarChar 30, mayúsculas con guiones bajos)
 * Ej: "Unidad Enfriadora de Agua (Chiller)" -> "CHILLER"
 */
export function generarCodigoTipoEquipo(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 30,
): string {
  if (!nombre.trim()) return '';
  const matchParentesis = nombre.match(/\(([^)]+)\)/);
  if (matchParentesis && matchParentesis[1].trim().length >= 2) {
    const pClean = normalizarTexto(matchParentesis[1]).toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (pClean.length >= 2 && !codigosExistentes.has(pClean.toLowerCase())) {
      return pClean.slice(0, maxLen);
    }
  }
  const base = generarSlugGenerico(nombre, { maxLen, uppercase: true, separator: '_' });
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}

export const SIMBOLOS_CANONICOS: Record<string, string> = {
  'Ω': 'OHM',
  'mΩ': 'MOHM',
  'kΩ': 'KOHM',
  'MΩ': 'MEOHM',
  'µ': 'U',
  'µm': 'UM',
  'µF': 'UF',
  'uF': 'UF',
  'µs': 'US',
  'µg': 'UG',
  'm/s': 'MS',
  'm/s²': 'MS2',
  'ft/s': 'FPS',
  'ft/s²': 'FTS2',
  'km/h': 'KMH',
  'N·m': 'NM',
  'N.m': 'NM',
  'Nm': 'NM',
  'kg/m³': 'KGM3',
  'g/cm³': 'GCM3',
  'mm²/s': 'MM2S',
  'mm/s': 'MMS',
  '°C': 'CEL',
  '°F': 'FAH',
  'K': 'KEL',
  '°': 'DEG',
  '%': 'PCT',
  'l/min': 'LPM',
  'L/min': 'LPM',
  'gal/min': 'GPM',
  'pulg': 'IN',
  'pie': 'FT',
  'pies': 'FT',
};

/**
 * 5. Magnitudes Físicas (VarChar 50, mayúsculas con guiones bajos)
 */
export function generarCodigoMagnitudInteligente(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 30,
): string {
  if (!nombre || !nombre.trim()) return '';
  const base = generarSlugGenerico(nombre, { maxLen, uppercase: true, separator: '_' });
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}

/**
 * 6. Unidades de Medida (VarChar 20, PK global)
 */
export function generarCodigoUnidadInteligente(
  simbolo: string,
  nombre: string,
  codigosExistentes: Set<string>,
  codigoMagnitudPadre?: string,
  maxLen = 20,
): string {
  const sim = (simbolo || '').trim();
  const nom = (nombre || '').trim();
  if (!sim && !nom) return '';

  let raiz = '';
  if (sim) {
    if (SIMBOLOS_CANONICOS[sim]) {
      raiz = SIMBOLOS_CANONICOS[sim];
    } else {
      let limpia = sim
        .replace(/[µμ]/g, 'U')
        .replace(/²/g, '2')
        .replace(/³/g, '3')
        .replace(/[\/·\.\-]/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toUpperCase();
      limpia = limpia.replace(/^_+|_+$/g, '').replace(/_+/g, '_');
      if (limpia.length >= 1) {
        raiz = limpia.slice(0, maxLen);
      }
    }
  }

  if (!raiz && nom) {
    raiz = generarSlugGenerico(nom, { maxLen: Math.min(10, maxLen), uppercase: true, separator: '_' });
  }

  if (!raiz) return '';

  if (!codigosExistentes.has(raiz.toLowerCase()) && !codigosExistentes.has(raiz)) {
    return raiz;
  }

  if (codigoMagnitudPadre) {
    const magParts = codigoMagnitudPadre.split('_').filter(Boolean);
    const ultimaParte = magParts[magParts.length - 1] || '';
    const sufijoContexto = (ultimaParte.length > 4 ? ultimaParte.slice(0, 3) : ultimaParte).toUpperCase();

    if (sufijoContexto) {
      const candidatoContextual = `${raiz.slice(0, maxLen - sufijoContexto.length - 1)}_${sufijoContexto}`;
      if (!codigosExistentes.has(candidatoContextual.toLowerCase()) && !codigosExistentes.has(candidatoContextual)) {
        return candidatoContextual;
      }
    }
  }

  let contador = 2;
  while (contador < 1000) {
    const sufijo = `_${contador}`;
    const raizRecortada = raiz.slice(0, Math.max(2, maxLen - sufijo.length));
    const candidato = `${raizRecortada}${sufijo}`;
    if (!codigosExistentes.has(candidato.toLowerCase()) && !codigosExistentes.has(candidato)) {
      return candidato;
    }
    contador++;
  }

  return `${raiz.slice(0, maxLen - 5)}_${Date.now().toString().slice(-4)}`;
}
