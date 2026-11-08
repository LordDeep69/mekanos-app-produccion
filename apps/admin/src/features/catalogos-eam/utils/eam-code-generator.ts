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

  // Conjunto canónico normalizado para comparación insensible a mayúsculas/minúsculas
  const lookupSet: Set<string> = caseSensitive
    ? codigosExistentes
    : new Set(Array.from(codigosExistentes || []).map((c) => (c || '').toLowerCase().trim()));

  const check = (val: string) => {
    const v = (val || '').trim();
    return caseSensitive ? lookupSet.has(v) : lookupSet.has(v.toLowerCase());
  };

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
 * Es insensible a mayúsculas/minúsculas por defecto.
 */
export function verificarCodigoDuplicado(
  codigo: string,
  codigosExistentes: Set<string>,
  codigoActualIgnorar?: string,
  caseSensitive = false,
): boolean {
  const cod = (codigo || '').trim();
  if (!cod) return false;
  if (codigoActualIgnorar) {
    const ign = codigoActualIgnorar.trim();
    if (caseSensitive ? cod === ign : cod.toLowerCase() === ign.toLowerCase()) {
      return false;
    }
  }
  if (!codigosExistentes) return false;
  if (caseSensitive) {
    return codigosExistentes.has(cod);
  }
  const codLower = cod.toLowerCase();
  for (const item of codigosExistentes) {
    if ((item || '').trim().toLowerCase() === codLower) {
      return true;
    }
  }
  return false;
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

const DICCIONARIO_TAGS_INDUSTRIALES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\b(ascensor|elevador)\b/, tag: 'ELEV' },
  { pattern: /\bmontacargas\b/, tag: 'MONT' },
  { pattern: /\bescalera\b/, tag: 'ESC' },
  { pattern: /\b(chiller|enfriador|climatizad|aire acondicionado|fan coil|uma|hvac)\b/, tag: 'HVAC' },
  { pattern: /\b(generador|planta electrica|grupo electrogeno)\b/, tag: 'GEN' },
  { pattern: /\b(bomba|motobomba|electrobomba)\b/, tag: 'BOM' },
  { pattern: /\bcompresor\b/, tag: 'COMP' },
  { pattern: /\b(motor electrico|motor reductor|motoreductor)\b/, tag: 'MOT' },
  { pattern: /\b(transformador|subestacion)\b/, tag: 'TRAFO' },
  { pattern: /\b(grua|puente grua|polipasto)\b/, tag: 'GRUA' },
  { pattern: /\b(caldera|generador de vapor)\b/, tag: 'CALD' },
  { pattern: /\btorre de enfriamiento\b/, tag: 'TORR' },
  { pattern: /\b(ventilador|extractor|soplador)\b/, tag: 'VENT' },
  { pattern: /\b(ups|banco de baterias|inversor)\b/, tag: 'UPS' },
  { pattern: /\b(tablero|transferencia|ats)\b/, tag: 'ATS' },
  { pattern: /\b(prensa|troqueladora)\b/, tag: 'PREN' },
  { pattern: /\b(torno|fresadora|cnc)\b/, tag: 'CNC' },
  { pattern: /\b(extrusora|inyectora)\b/, tag: 'EXTR' },
  { pattern: /\b(enfriador de aceite|intercooler)\b/, tag: 'COOL' },
  { pattern: /\bpurificador\b/, tag: 'PURIF' },
  { pattern: /\bsecador\b/, tag: 'SEC' },
];

const STOPWORDS_ES = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'para', 'en', 'y', 'e', 'o', 'u', 'a', 'al', 'con', 'sin', 'por', 'sobre',
  'tipo', 'equipo', 'sistema', 'unidad', 'planta', 'maquina', 'maquinaria'
]);

/**
 * 4. Tipos de Equipo / Arquetipos (Prefijo TAG conciso de 3 a 5 letras mayúsculas)
 * Ej: "Ascensor de Pasajeros" -> "ELEV"
 * Ej: "Aire Acondicionado (Chiller)" -> "HVAC"
 * Ej: "Planta Eléctrica Diésel" -> "GEN"
 */
export function generarCodigoTipoEquipo(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 10,
): string {
  if (!nombre.trim()) return '';

  // 1. Si contiene paréntesis conciso (ej: "Ascensor de Pasajeros (ELEV)" o "Tablero (ATS)")
  const matchParentesis = nombre.match(/\(([^)]+)\)/);
  if (matchParentesis && matchParentesis[1].trim().length >= 2 && matchParentesis[1].trim().length <= 6) {
    const pClean = normalizarTexto(matchParentesis[1]).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (pClean.length >= 2) {
      return resolverColisionDeterminista(pClean, codigosExistentes, { maxLen, separator: '-', caseSensitive: false });
    }
  }

  // 2. Mapeo por diccionario industrial especializado (3-5 letras)
  const norm = normalizarTexto(nombre);
  const dictMatch = DICCIONARIO_TAGS_INDUSTRIALES.find((d) => d.pattern.test(norm));
  if (dictMatch) {
    return resolverColisionDeterminista(dictMatch.tag, codigosExistentes, { maxLen, separator: '-', caseSensitive: false });
  }

  // 3. Extracción de acrónimo inteligente (3 a 5 letras mayúsculas)
  const palabras = norm
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((p) => p.length > 0 && !STOPWORDS_ES.has(p.toLowerCase()));

  let tagCandidato = '';

  if (palabras.length >= 2) {
    // Acrónimo de iniciales (ej: Banda Transportadora -> BTR)
    const iniciales = palabras.map((p) => p[0]).join('');
    if (iniciales.length >= 3 && iniciales.length <= 5) {
      tagCandidato = iniciales;
    } else if (iniciales.length < 3) {
      const consonantes = palabras[0].slice(1).replace(/[AEIOU]/g, '');
      tagCandidato = (iniciales[0] + consonantes.slice(0, 2) + (iniciales[1] || '')).slice(0, 4);
    } else {
      tagCandidato = iniciales.slice(0, 4);
    }
  } else if (palabras.length === 1) {
    const p = palabras[0];
    if (p.length <= 5) {
      tagCandidato = p;
    } else {
      tagCandidato = p.slice(0, 4);
    }
  } else {
    tagCandidato = 'EQP';
  }

  return resolverColisionDeterminista(tagCandidato || 'EQP', codigosExistentes, { maxLen, separator: '-', caseSensitive: false });
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
