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

/**
 * 7. Servicios Comerciales (VarChar 40, formato CORR-ACCION-OBJETO o PREV-...)
 * Ej: "Cambio de Filtro de Combustible" -> "CORR-CAMB-FILT-COMB" (o con -2 si colisiona)
 */
export function generarCodigoServicioComercial(
  nombre: string,
  categoria: string = 'CORRECTIVO',
  codigosExistentes: Set<string>,
  maxLen = 40,
): string {
  const cleanNombre = (nombre || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!cleanNombre.trim()) return '';

  const actionMap: [RegExp, string][] = [
    [/REEMPLAZ|CAMBI|SUSTITU/i, 'CAMB'],
    [/REPARAC|REPARAR|ARREGL/i, 'REP'],
    [/REVISI|INSPECC|EVALUA/i, 'REV'],
    [/SUMINISTR|ENTREGA|DOTAC/i, 'SUM'],
    [/INSTALAC|MONTAJE/i, 'INST'],
    [/CALIBRAC|AJUSTE|SINCRONIZ/i, 'CALIB'],
    [/LIMPIEZA|LAVAD|DESENGRAS/i, 'LIMP'],
    [/DIAGNOST|ESCANEO|ANALIS/i, 'DIAG'],
    [/MANTENIMIENTO|RUTINA/i, 'MNT'],
    [/PRUEBA|TESTEO|MEDIC/i, 'PRB'],
    [/REBOBINAD|EMBOBINAD/i, 'REBOB'],
    [/PROGRAMAC|CONFIGURAC/i, 'PROG'],
  ];

  const nounMap: [RegExp, string][] = [
    [/MODULO|CONTROLADOR|CONTROL|DEEP\s*SEA|COMAP/i, 'MOD-CTRL'],
    [/FILTRO.*AIRE/i, 'FILT-AIRE'],
    [/FILTRO.*ACEITE/i, 'FILT-ACTE'],
    [/FILTRO.*COMBUSTIBLE|FILTRO.*ACPM|FILTRO.*DIESEL/i, 'FILT-COMB'],
    [/FILTRO.*RACOR|TRAMPA.*AGUA/i, 'FILT-RACOR'],
    [/FILTRO/i, 'FILTRO'],
    [/ACEITE|LUBRICANTE/i, 'LUB-ACTE'],
    [/REFRIGERANTE|ANTICONGELANTE/i, 'REFRIG'],
    [/INYECTOR/i, 'INYECT'],
    [/BOMBA.*INYEC/i, 'BOM-INY'],
    [/BOMBA.*AGUA/i, 'BOM-AGUA'],
    [/BOMBA/i, 'BOMBA'],
    [/SENSOR.*PRES/i, 'SENS-PRES'],
    [/SENSOR.*TEMP/i, 'SENS-TEMP'],
    [/SENSOR/i, 'SENSOR'],
    [/ALTERNADOR/i, 'ALT'],
    [/MOTOR.*ARRANQUE|STARTER/i, 'ARRANQ'],
    [/BATERIA/i, 'BAT'],
    [/CARGADOR.*BATER/i, 'CARG-BAT'],
    [/CORREA/i, 'CORREA'],
    [/RADIADOR/i, 'RADIAD'],
    [/TRANSFERENCIA|ATS/i, 'ATS'],
    [/PLANTA|GENERADOR/i, 'GEN'],
    [/TANQUE|COMBUSTIBLE/i, 'COMB'],
    [/CABINA/i, 'CABINA'],
    [/PUERTA/i, 'PUERTA'],
    [/TRACCION/i, 'TRACC'],
    [/FREN(O|OS)/i, 'FRENO'],
    [/CABLE/i, 'CABLE'],
    [/POLEA/i, 'POLEA'],
    [/VARIADOR/i, 'VARIAD'],
  ];

  const catUpper = (categoria || '').toUpperCase();
  const prefix = catUpper === 'CORRECTIVO' ? 'CORR' : catUpper === 'PREVENTIVO' ? 'PREV' : 'SRV';

  let action = '';
  for (const [regex, code] of actionMap) {
    if (regex.test(cleanNombre)) {
      action = code;
      break;
    }
  }

  let noun = '';
  for (const [regex, code] of nounMap) {
    if (regex.test(cleanNombre)) {
      noun = code;
      break;
    }
  }

  if (!action && !noun) {
    const words = cleanNombre
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => !['DE', 'DEL', 'LA', 'EL', 'Y', 'EN', 'PARA', 'CON', 'A', 'LOS', 'LAS', 'UN', 'UNA', 'AL'].includes(w));
    action = words.slice(0, 3).map((w) => w.substring(0, 4)).join('-');
  }

  const baseParts = [prefix, action, noun].filter(Boolean);
  const base = baseParts.join('-').slice(0, maxLen);

  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '-', caseSensitive: false });
}

/**
 * 8. Tipos de Servicio / Protocolos (VarChar 30, mayúsculas con guiones bajos)
 * Ej: "Mantenimiento Preventivo A - Ascensor" -> "PREV_A_ASCENSOR"
 */
export function generarCodigoTipoServicio(
  nombre: string,
  categoria: string = 'PREVENTIVO',
  codigosExistentes: Set<string>,
  maxLen = 30,
): string {
  if (!nombre || !nombre.trim()) return '';
  const nomClean = normalizarTexto(nombre).toUpperCase();

  let base = '';
  if (nomClean.includes('TIPO A') || nomClean.includes('TIPO_A') || nomClean.includes(' NIVEL A')) {
    base = 'PREV_A';
  } else if (nomClean.includes('TIPO B') || nomClean.includes('TIPO_B') || nomClean.includes(' NIVEL B')) {
    base = 'PREV_B';
  } else if (nomClean.includes('TIPO C') || nomClean.includes('TIPO_C') || nomClean.includes(' NIVEL C')) {
    base = 'PREV_C';
  } else if (nomClean.includes('INSPECC') || nomClean.includes('RUTINA')) {
    base = 'INSP';
  } else if (nomClean.includes('OVERHAUL') || nomClean.includes('MAYOR')) {
    base = 'OVERHAUL';
  } else if (categoria === 'CORRECTIVO') {
    base = 'CORR';
  }

  const slug = generarSlugGenerico(nombre, { maxLen: 20, uppercase: true, separator: '_' });
  const candidato = base ? `${base}_${slug.replace(new RegExp(`^${base}_?`, 'i'), '')}` : slug;
  const candidatoLimpio = candidato.replace(/^_+|_+$/g, '').slice(0, maxLen);

  return resolverColisionDeterminista(candidatoLimpio, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}

/**
 * 9. Sistemas de Inspección (VarChar 30, mayúsculas con guiones bajos)
 * Ej: "Sistema de Tracción y Cables" -> "SIS_TRACCION_CABLES"
 */
export function generarCodigoSistema(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 30,
): string {
  if (!nombre || !nombre.trim()) return '';
  let slug = generarSlugGenerico(nombre, { maxLen: maxLen - 4, uppercase: true, separator: '_' });
  let base = slug.startsWith('SIS_') || slug.startsWith('SISTEMA_') ? slug : `SIS_${slug}`;
  base = base.slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}

/**
 * 10. Actividades de Inspección / Tareas Checklist (VarChar 40, mayúsculas con guiones bajos)
 * Ej: "Verificar tensión de cables de tracción" -> "ACT_VERIF_TENSION_CABLES"
 */
export function generarCodigoActividad(
  descripcion: string,
  codigosExistentes: Set<string>,
  maxLen = 40,
): string {
  if (!descripcion || !descripcion.trim()) return '';
  const descLimpia = normalizarTexto(descripcion).toUpperCase();
  const palabras = descLimpia
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => !['DE', 'DEL', 'LA', 'EL', 'Y', 'EN', 'PARA', 'CON', 'A', 'LOS', 'LAS', 'UN', 'UNA', 'AL', 'QUE', 'SE'].includes(w));

  const clave = palabras.slice(0, 4).join('_');
  const base = `ACT_${clave}`.slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}

/**
 * 11. Parámetros de Medición Frecuente (VarChar 30, mayúsculas con guiones bajos)
 * Ej: "Tensión de Alimentación L1-L2" -> "VOLT_L1_L2" o "TENSION_L1_L2"
 */
export function generarCodigoParametro(
  nombre: string,
  codigosExistentes: Set<string>,
  unidad?: string,
  maxLen = 30,
): string {
  if (!nombre || !nombre.trim()) return '';
  let base = generarSlugGenerico(nombre, { maxLen, uppercase: true, separator: '_' });
  if (unidad && unidad.trim()) {
    const uClean = generarSlugGenerico(unidad, { maxLen: 6, uppercase: true, separator: '_' });
    if (uClean && !base.endsWith(`_${uClean}`)) {
      base = `${base.slice(0, maxLen - uClean.length - 1)}_${uClean}`;
    }
  }
  return resolverColisionDeterminista(base, codigosExistentes, { maxLen, separator: '_', caseSensitive: false });
}
