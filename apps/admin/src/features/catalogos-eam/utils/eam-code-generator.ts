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

export const SIMBOLOS_CANONICOS: Record<string, string> = {
  Ω: 'OHM',
  mΩ: 'MOHM',
  kΩ: 'KOHM',
  MΩ: 'MEOHM',
  µ: 'U',
  µm: 'UM',
  µF: 'UF',
  uF: 'UF',
  µs: 'US',
  µg: 'UG',
  'm/s': 'MS',
  'm/s²': 'MS2',
  'ft/s': 'FPS',
  'ft/s²': 'FTS2',
  'km/h': 'KMH',
  'N·m': 'NM',
  'N.m': 'NM',
  Nm: 'NM',
  'kg/m³': 'KGM3',
  'g/cm³': 'GCM3',
  'mm²/s': 'MM2S',
  'mm/s': 'MMS',
  '°C': 'CEL',
  '°F': 'FAH',
  K: 'KEL',
  '°': 'DEG',
  '%': 'PCT',
  'l/min': 'LPM',
  'L/min': 'LPM',
  'gal/min': 'GPM',
  pulg: 'IN',
  pie: 'FT',
  pies: 'FT',
  mm: 'MM',
  cm: 'CM',
  m: 'M',
  kg: 'KG',
  g: 'G',
  lb: 'LB',
  ton: 'TON',
  VAC: 'VAC',
  VDC: 'VDC',
  V: 'V',
  A: 'A',
  mA: 'MA',
  Hz: 'HZ',
  kW: 'KW',
  W: 'W',
  HP: 'HP',
  kVA: 'KVA',
  RPM: 'RPM',
  PSI: 'PSI',
  BAR: 'BAR',
  bar: 'BAR',
  s: 'S',
  min: 'MIN',
  h: 'H',
};

/**
 * Limpia y canoniza el símbolo de una unidad de medida a nomenclatura segura de código.
 */
export function limpiarSimboloUnidad(simbolo?: string): string {
  if (!simbolo || !simbolo.trim()) return '';
  const s = simbolo.trim();
  if (SIMBOLOS_CANONICOS[s]) return SIMBOLOS_CANONICOS[s];
  const limpia = s
    .replace(/[µμ]/g, 'U')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/[\/·\.\-]/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase();
  return limpia.replace(/^_+|_+$/g, '').replace(/_+/g, '_');
}

/**
 * 1. Campos Técnicos / Atributos (VarChar 60, snake_case minúsculas sin conectores innecesarios)
 * Ej: "Capacidad de Carga Nominal" (kg) -> "capacidad_carga_nominal_kg"
 * Ej: "Velocidad Nominal de Viaje" (m/s) -> "velocidad_nominal_viaje_ms"
 */
export function generarCodigoCampoTecnico(
  nombre: string,
  codigosExistentes: Set<string>,
  unidadSimbolo?: string,
  maxLen = 60,
): string {
  if (!nombre.trim()) return '';
  const stopWords = new Set([
    'de',
    'del',
    'la',
    'el',
    'los',
    'las',
    'un',
    'una',
    'en',
    'para',
    'con',
    'por',
  ]);
  const nomClean = normalizarTexto(nombre).toLowerCase();
  const palabras = nomClean
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  let base = (
    palabras.length > 0
      ? palabras.join('_')
      : generarSlugGenerico(nombre, { maxLen, uppercase: false, separator: '_' })
  ).slice(0, maxLen);

  if (unidadSimbolo && unidadSimbolo.trim()) {
    const simLimpio = limpiarSimboloUnidad(unidadSimbolo).toLowerCase();
    if (simLimpio && !base.endsWith(`_${simLimpio}`)) {
      base = `${base.slice(0, maxLen - simLimpio.length - 1)}_${simLimpio}`;
    }
  }
  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
}

/**
 * 2. Partes y Subsistemas / Módulos Técnicos (VarChar 50, snake_case minúsculas)
 * Elimina 'de', 'y', 'sistema', etc. para lograr identificadores de ingeniería limpios.
 * Ej: "Cabina y Sistema de Puertas" -> "cabina_puertas"
 * Ej: "Máquina de Tracción, Freno y Cables" -> "maquina_traccion_freno_cables"
 */
export function generarCodigoParteModulo(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 50,
): string {
  if (!nombre.trim()) return '';
  const nomClean = normalizarTexto(nombre).toLowerCase();
  const stopWords = new Set([
    'de',
    'del',
    'la',
    'el',
    'los',
    'las',
    'un',
    'una',
    'y',
    'e',
    'o',
    'u',
    'en',
    'para',
    'con',
    'sin',
    'por',
    'sobre',
    'sistema',
    'sistemas',
    'modulo',
    'modulos',
    'subsistema',
    'subsistemas',
    'parte',
    'partes',
  ]);
  const palabras = nomClean
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  const base = (
    palabras.length > 0
      ? palabras.join('_')
      : generarSlugGenerico(nombre, { maxLen, uppercase: false, separator: '_' })
  ).slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
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
  const mClean = normalizarTexto(marca)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const modClean = normalizarTexto(modelo)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!mClean && !modClean) return '';

  const base = `MOD-${mClean || 'OEM'}-${modClean || 'STD'}`.slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '-',
    caseSensitive: false,
  });
}

const DICCIONARIO_TAGS_INDUSTRIALES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\b(ascensor|elevador)\b/i, tag: 'ELEV' },
  { pattern: /\bmontacargas\b/i, tag: 'MONT' },
  { pattern: /\bescalera\b/i, tag: 'ESC' },
  {
    pattern: /\b(chiller|enfriador|climatizad|aire acondicionado|fan coil|uma|hvac)\b/i,
    tag: 'HVAC',
  },
  { pattern: /\b(generador|planta electrica|grupo electrogeno)\b/i, tag: 'GEN' },
  { pattern: /\b(bomba|motobomba|electrobomba)\b/i, tag: 'BOM' },
  { pattern: /\bcompresor\b/i, tag: 'COMP' },
  { pattern: /\b(motor electrico|motor reductor|motoreductor)\b/i, tag: 'MOT' },
  { pattern: /\b(transformador|subestacion)\b/i, tag: 'TRAFO' },
  { pattern: /\b(grua|puente grua|polipasto)\b/i, tag: 'GRUA' },
  { pattern: /\b(caldera|generador de vapor)\b/i, tag: 'CALD' },
  { pattern: /\btorre de enfriamiento\b/i, tag: 'TORR' },
  { pattern: /\b(ventilador|extractor|soplador)\b/i, tag: 'VENT' },
  { pattern: /\b(ups|banco de baterias|inversor)\b/i, tag: 'UPS' },
  { pattern: /\b(tablero|transferencia|ats)\b/i, tag: 'ATS' },
  { pattern: /\b(prensa|troqueladora)\b/i, tag: 'PREN' },
  { pattern: /\b(torno|fresadora|cnc)\b/i, tag: 'CNC' },
  { pattern: /\b(extrusora|inyectora)\b/i, tag: 'EXTR' },
  { pattern: /\b(enfriador de aceite|intercooler)\b/i, tag: 'COOL' },
  { pattern: /\bpurificador\b/i, tag: 'PURIF' },
  { pattern: /\bsecador\b/i, tag: 'SEC' },
];

const STOPWORDS_ES = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'para',
  'en',
  'y',
  'e',
  'o',
  'u',
  'a',
  'al',
  'con',
  'sin',
  'por',
  'sobre',
  'tipo',
  'equipo',
  'sistema',
  'unidad',
  'planta',
  'maquina',
  'maquinaria',
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
  if (
    matchParentesis &&
    matchParentesis[1].trim().length >= 2 &&
    matchParentesis[1].trim().length <= 6
  ) {
    const pClean = normalizarTexto(matchParentesis[1])
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (pClean.length >= 2) {
      return resolverColisionDeterminista(pClean, codigosExistentes, {
        maxLen,
        separator: '-',
        caseSensitive: false,
      });
    }
  }

  // 2. Mapeo por diccionario industrial especializado (3-5 letras)
  const norm = normalizarTexto(nombre).toLowerCase();
  const dictMatch = DICCIONARIO_TAGS_INDUSTRIALES.find((d) => d.pattern.test(norm));
  if (dictMatch) {
    return resolverColisionDeterminista(dictMatch.tag, codigosExistentes, {
      maxLen,
      separator: '-',
      caseSensitive: false,
    });
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

  return resolverColisionDeterminista(tagCandidato || 'EQP', codigosExistentes, {
    maxLen,
    separator: '-',
    caseSensitive: false,
  });
}

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
  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
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
    raiz = generarSlugGenerico(nom, {
      maxLen: Math.min(10, maxLen),
      uppercase: true,
      separator: '_',
    });
  }

  if (!raiz) return '';

  if (!codigosExistentes.has(raiz.toLowerCase()) && !codigosExistentes.has(raiz)) {
    return raiz;
  }

  if (codigoMagnitudPadre) {
    const magParts = codigoMagnitudPadre.split('_').filter(Boolean);
    const ultimaParte = magParts[magParts.length - 1] || '';
    const sufijoContexto = (
      ultimaParte.length > 4 ? ultimaParte.slice(0, 3) : ultimaParte
    ).toUpperCase();

    if (sufijoContexto) {
      const candidatoContextual = `${raiz.slice(0, maxLen - sufijoContexto.length - 1)}_${sufijoContexto}`;
      if (
        !codigosExistentes.has(candidatoContextual.toLowerCase()) &&
        !codigosExistentes.has(candidatoContextual)
      ) {
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
      .filter(
        (w) =>
          ![
            'DE',
            'DEL',
            'LA',
            'EL',
            'Y',
            'EN',
            'PARA',
            'CON',
            'A',
            'LOS',
            'LAS',
            'UN',
            'UNA',
            'AL',
          ].includes(w),
      );
    action = words
      .slice(0, 3)
      .map((w) => w.substring(0, 4))
      .join('-');
  }

  const baseParts = [prefix, action, noun].filter(Boolean);
  const base = baseParts.join('-').slice(0, maxLen);

  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '-',
    caseSensitive: false,
  });
}

/**
 * 8. Tipos de Servicio / Protocolos EAM (VarChar 30, mayúsculas con guiones bajos)
 * Inteligente, sin contaminación de stopwords (MANTENIMIENTO, SERVICIO, etc.).
 * Si se asocia o detecta un tipo de equipo (ej: Elevador -> ELEV, Generador -> GEN),
 * antepone el código del arquetipo.
 *
 * Ej: "Mantenimiento Preventivo Tipo A - Ascensor" (ELEV) -> "ELEV_PREV_A"
 * Ej: "Mantenimiento Preventivo Tipo B" (ELEV) -> "ELEV_PREV_B"
 * Ej: "Inspección Rutinaria Mensual" (ELEV) -> "ELEV_INSP_MENS"
 * Ej: "Preventivo 500 Horas" (GEN) -> "GEN_PREV_500H"
 * Ej: "Mantenimiento Correctivo de Emergencia" (ELEV) -> "ELEV_CORR_EMERG"
 * Ej: "Preventivo Tipo A" (Global/Universal) -> "PREV_A"
 */
export function generarCodigoTipoServicio(
  nombre: string,
  categoria: string = 'PREVENTIVO',
  codigosExistentes: Set<string>,
  tipoEquipoCodigo?: string,
  maxLen = 30,
): string {
  if (!nombre || !nombre.trim()) return '';
  const nomClean = normalizarTexto(nombre).toUpperCase();

  // 1. Determinar tag de equipo (por parámetro explícito o coincidencia de catálogo industrial)
  let eqTag = (tipoEquipoCodigo || '').toUpperCase().trim();
  if (!eqTag) {
    const match = DICCIONARIO_TAGS_INDUSTRIALES.find((d) => d.pattern.test(nomClean));
    if (match) eqTag = match.tag;
  }

  // 2. Determinar protocolo base conciso
  let protocolo = '';
  if (
    /\b(TIPO\s*A|NIVEL\s*A|\bA\b)\b/i.test(nomClean) &&
    (nomClean.includes('TIPO') ||
      nomClean.includes('NIVEL') ||
      nomClean.includes('PREVENTIVO') ||
      categoria === 'PREVENTIVO')
  ) {
    protocolo = 'PREV_A';
  } else if (
    /\b(TIPO\s*B|NIVEL\s*B|\bB\b)\b/i.test(nomClean) &&
    (nomClean.includes('TIPO') ||
      nomClean.includes('NIVEL') ||
      nomClean.includes('PREVENTIVO') ||
      categoria === 'PREVENTIVO')
  ) {
    protocolo = 'PREV_B';
  } else if (
    /\b(TIPO\s*C|NIVEL\s*C|\bC\b)\b/i.test(nomClean) &&
    (nomClean.includes('TIPO') ||
      nomClean.includes('NIVEL') ||
      nomClean.includes('PREVENTIVO') ||
      categoria === 'PREVENTIVO')
  ) {
    protocolo = 'PREV_C';
  } else if (
    /\b(TIPO\s*D|NIVEL\s*D|\bD\b)\b/i.test(nomClean) &&
    (nomClean.includes('TIPO') ||
      nomClean.includes('NIVEL') ||
      nomClean.includes('PREVENTIVO') ||
      categoria === 'PREVENTIVO')
  ) {
    protocolo = 'PREV_D';
  } else if (/OVERHAUL|MAYOR/i.test(nomClean)) {
    protocolo = 'OVERHAUL';
  } else if (/RUTINA|RUTINARI|INSPECC/i.test(nomClean)) {
    protocolo = 'INSP';
  } else if (/LUBRICAC/i.test(nomClean)) {
    protocolo = 'LUBR';
  } else if (/CALIBRAC/i.test(nomClean)) {
    protocolo = 'CALIB';
  } else if (/DIAGNOST/i.test(nomClean)) {
    protocolo = 'DIAG';
  } else if (/CORRECTIV/i.test(nomClean) || categoria === 'CORRECTIVO') {
    protocolo = 'CORR';
  } else if (/EMERGENC/i.test(nomClean) || categoria === 'EMERGENCIA') {
    protocolo = 'EMERG';
  } else {
    const catMap: Record<string, string> = {
      PREVENTIVO: 'PREV',
      CORRECTIVO: 'CORR',
      EMERGENCIA: 'EMERG',
      INSPECCION: 'INSP',
      ESPECIALIZADO: 'ESP',
      DIAGNOSTICO: 'DIAG',
    };
    protocolo = catMap[categoria.toUpperCase()] || 'SRV';
  }

  // 3. Stopwords técnicas y redundancias
  const stopWords = new Set([
    'MANTENIMIENTO',
    'MANTENIMIENTOS',
    'SERVICIO',
    'SERVICIOS',
    'PREVENTIVO',
    'PREVENTIVA',
    'PREVENTIVOS',
    'PREVENTIVAS',
    'CORRECTIVO',
    'CORRECTIVA',
    'CORRECTIVOS',
    'CORRECTIVAS',
    'TIPO',
    'TIPOS',
    'NIVEL',
    'NIVELES',
    'DE',
    'DEL',
    'LA',
    'EL',
    'LOS',
    'LAS',
    'UN',
    'UNA',
    'UNOS',
    'UNAS',
    'Y',
    'E',
    'O',
    'U',
    'A',
    'AL',
    'EN',
    'PARA',
    'CON',
    'SIN',
    'POR',
    'SOBRE',
    'INSPECCION',
    'INSPECCIONES',
    'RUTINA',
    'RUTINARIA',
    'RUTINARIO',
  ]);

  if (protocolo.startsWith('PREV_')) {
    stopWords.add(protocolo.slice(-1));
  }
  if (protocolo === 'EMERG') {
    stopWords.add('EMERGENCIA');
  }

  const equipoKeywords = [
    'ASCENSOR',
    'ASCENSORES',
    'ELEVADOR',
    'ELEVADORES',
    'GENERADOR',
    'GENERADORES',
    'PLANTA',
    'PLANTAS',
    'CHILLER',
    'CHILLERS',
    'BOMBA',
    'BOMBAS',
    'COMPRESOR',
    'COMPRESORES',
    'MOTOR',
    'MOTORES',
    'EQUIPO',
    'ACTIVO',
  ];
  if (eqTag) {
    equipoKeywords.forEach((k) => stopWords.add(k));
  }

  const palabras = nomClean
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  const abreviaturas: Record<string, string> = {
    SEMESTRAL: 'SEM',
    TRIMESTRAL: 'TRIM',
    MENSUAL: 'MENS',
    SEMANAL: 'SEM',
    ANUAL: 'ANUAL',
    DIARIO: 'DIARIO',
    HORAS: 'H',
    HORA: 'H',
    EMERGENCIA: 'EMERG',
  };

  const palabrasCompactas: string[] = [];
  for (let i = 0; i < palabras.length; i++) {
    const p = palabras[i];
    const prox = palabras[i + 1];
    if (/^\d+$/.test(p) && prox && /^(HORAS|HORA|H)$/i.test(prox)) {
      palabrasCompactas.push(`${p}H`);
      i++;
    } else {
      palabrasCompactas.push(
        abreviaturas[p] || (p.length > 8 && palabras.length > 2 ? p.slice(0, 5) : p),
      );
    }
  }

  const diferencial = palabrasCompactas.slice(0, 2).join('_');

  let base = '';
  if (eqTag) {
    base = diferencial ? `${eqTag}_${protocolo}_${diferencial}` : `${eqTag}_${protocolo}`;
  } else {
    base = diferencial ? `${protocolo}_${diferencial}` : protocolo;
  }

  const limpio = base.replace(/^_+|_+$/g, '').slice(0, maxLen);
  return resolverColisionDeterminista(limpio, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
}

/**
 * 9. Sistemas de Inspección / Subsistemas del Checklist (VarChar 30, mayúsculas con guiones bajos)
 * Generador inteligente y compacto: elimina conectores ('de', 'y'), abrevia términos largos y
 * mantiene una longitud estratégica ergonómica (14-22 caracteres) evitando desbordamientos en UI.
 * Ej: "Cabina, Puertas y Operador" -> "SIS_CABINA_PUERTAS_OP"
 * Ej: "Máquina de Tracción, Freno y Cables" -> "SIS_MAQ_TRACCION"
 * Ej: "Sistema Eléctrico y Control" -> "SIS_ELEC_CTRL"
 */
export function generarCodigoSistema(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 22,
): string {
  if (!nombre || !nombre.trim()) return '';
  const nomClean = normalizarTexto(nombre).toUpperCase();

  const stopWords = new Set([
    'SISTEMA',
    'SISTEMAS',
    'DE',
    'DEL',
    'LA',
    'LAS',
    'EL',
    'LOS',
    'Y',
    'E',
    'O',
    'EN',
    'PARA',
    'CON',
    'SIN',
    'A',
    'AL',
    'POR',
    'SOBRE',
  ]);

  const palabras = nomClean
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  if (palabras.length === 0) {
    const slug = generarSlugGenerico(nombre, {
      maxLen: maxLen - 4,
      uppercase: true,
      separator: '_',
    });
    const base = `SIS_${slug}`.slice(0, maxLen);
    return resolverColisionDeterminista(base, codigosExistentes, {
      maxLen,
      separator: '_',
      caseSensitive: false,
    });
  }

  // Diccionario de contracciones técnicas para compacidad
  const abreviaturas: Record<string, string> = {
    MAQUINA: 'MAQ',
    MAQUINAS: 'MAQ',
    ELECTRICO: 'ELEC',
    ELECTRICA: 'ELEC',
    ELECTRONICO: 'ELEC',
    MECANICO: 'MEC',
    MECANICA: 'MEC',
    HIDRAULICO: 'HIDR',
    HIDRAULICA: 'HIDR',
    NEUMATICO: 'NEUM',
    NEUMATICA: 'NEUM',
    OPERADOR: 'OP',
    OPERADORES: 'OP',
    SEGURIDAD: 'SEG',
    CONTROL: 'CTRL',
    CONTROLES: 'CTRL',
    COMBUSTION: 'COMB',
    REFRIGERACION: 'REFR',
    REFRIGERANTE: 'REFR',
    ALIMENTACION: 'ALIM',
    TRANSMISION: 'TRANS',
  };

  const palabrasCompactas = palabras.map(
    (p) => abreviaturas[p] || (p.length > 8 && palabras.length > 2 ? p.slice(0, 5) : p),
  );

  // Acumular hasta 2 o 3 términos significativos que no superen maxLen
  const elegidas: string[] = [];
  let largoAcumulado = 4; // Longitud de 'SIS_'

  for (const p of palabrasCompactas) {
    if (elegidas.length >= 2 && largoAcumulado + p.length + 1 > maxLen) break;
    if (largoAcumulado + p.length + 1 <= maxLen) {
      elegidas.push(p);
      largoAcumulado += p.length + 1;
    } else {
      break;
    }
  }

  if (elegidas.length === 0 && palabrasCompactas.length > 0) {
    elegidas.push(palabrasCompactas[0].slice(0, maxLen - 4));
  }

  const base = `SIS_${elegidas.join('_')}`.slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
}

/**
 * 10. Actividades de Inspección / Tareas Checklist (VarChar 35, mayúsculas con guiones bajos)
 * Aplica contracciones técnicas a verbos de acción y sustantivos mecánicos/eléctricos.
 * Ej: "Verificar tensión de cables de tracción" -> "ACT_VERIF_TENS_CABLES_TRACC"
 * Ej: "Inspeccionar cortina fotoeléctrica y sensor" -> "ACT_INSP_CORTINA_FOTOCEL_SENSOR"
 * Ej: "Limpiar y lubricar zapatas de freno de polea" -> "ACT_LIMP_LUBR_ZAPATAS_FRENO"
 */
export function generarCodigoActividad(
  descripcion: string,
  codigosExistentes: Set<string>,
  maxLen = 35,
): string {
  if (!descripcion || !descripcion.trim()) return '';
  const descLimpia = normalizarTexto(descripcion).toUpperCase();

  const ACCIONES_ACT: Record<string, string> = {
    VERIFICAR: 'VERIF',
    VERIFICACION: 'VERIF',
    INSPECCIONAR: 'INSP',
    INSPECCION: 'INSP',
    COMPROBAR: 'COMPR',
    COMPROBACION: 'COMPR',
    REVISAR: 'REV',
    REVISION: 'REV',
    MEDIR: 'MED',
    MEDICION: 'MED',
    LIMPIAR: 'LIMP',
    LIMPIEZA: 'LIMP',
    AJUSTAR: 'AJUST',
    AJUSTE: 'AJUST',
    LUBRICAR: 'LUBR',
    LUBRICACION: 'LUBR',
    CALIBRAR: 'CALIB',
    CALIBRACION: 'CALIB',
    SUSTITUIR: 'SUST',
    REEMPLAZAR: 'REEMP',
    CAMBIAR: 'CAMB',
    CAMBIO: 'CAMB',
    MONITOREAR: 'MONIT',
    PURGAR: 'PURGA',
    DRENAR: 'DREN',
    PROBAR: 'PRB',
    PRUEBA: 'PRB',
  };

  const SUSTANTIVOS_ACT: Record<string, string> = {
    TENSION: 'TENS',
    CORRIENTE: 'CORR',
    VOLTAJE: 'VOLT',
    PRESION: 'PRES',
    TEMPERATURA: 'TEMP',
    VELOCIDAD: 'VEL',
    FOTOCELDA: 'FOTOCEL',
    FOTOELECTRICA: 'FOTOCEL',
    FOTOELECTRICO: 'FOTOCEL',
    OPERADOR: 'OP',
    OPERADORES: 'OP',
    SEGURIDAD: 'SEG',
    CONTROL: 'CTRL',
    CONTROLES: 'CTRL',
    ALIMENTACION: 'ALIM',
    CONEXION: 'CONEX',
    CONEXIONES: 'CONEX',
    CONTACTORES: 'CONTACT',
    INTERRUPTOR: 'INTERR',
    INTERRUPTORES: 'INTERR',
    DISYUNTOR: 'DISY',
    TRANSFORMADOR: 'TRAFO',
    COMBUSTIBLE: 'COMB',
    LUBRICANTE: 'LUBR',
    REFRIGERANTE: 'REFR',
    CABINA: 'CABINA',
    PUERTAS: 'PUERTAS',
    PUERTA: 'PUERTA',
    TRACCION: 'TRACC',
    FRENOS: 'FRENOS',
    FRENO: 'FRENO',
    CABLES: 'CABLES',
    CABLE: 'CABLE',
    POLEAS: 'POLEAS',
    POLEA: 'POLEA',
    CONTRAPESO: 'CONTRAP',
    PARACAIDAS: 'PARACAID',
    AMORTIGUADOR: 'AMORT',
    AMORTIGUADORES: 'AMORT',
    GUIAS: 'GUIAS',
    GUIA: 'GUIA',
    ZAPATAS: 'ZAPATAS',
    ZAPATA: 'ZAPATA',
    RODAMIENTOS: 'RODAM',
    RODAMIENTO: 'RODAM',
    NIVELACION: 'NIVEL',
    PRECISION: 'PREC',
  };

  const stopWords = new Set([
    'DE',
    'DEL',
    'LA',
    'EL',
    'LOS',
    'LAS',
    'UN',
    'UNA',
    'UNOS',
    'UNAS',
    'Y',
    'E',
    'O',
    'U',
    'A',
    'AL',
    'EN',
    'PARA',
    'CON',
    'SIN',
    'POR',
    'SOBRE',
    'QUE',
    'SE',
    'SU',
    'SUS',
    'ESTADO',
    'CONDICION',
    'CORRECTO',
    'ADECUADO',
  ]);

  const palabras = descLimpia
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  const tokens = palabras.map(
    (p) =>
      ACCIONES_ACT[p] ||
      SUSTANTIVOS_ACT[p] ||
      (p.length > 8 && palabras.length > 2 ? p.slice(0, 5) : p),
  );
  const elegidos = tokens.slice(0, 4);

  const base = `ACT_${elegidos.join('_')}`.slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
}

/**
 * 11. Parámetros de Medición Frecuente (VarChar 30, mayúsculas con guiones bajos)
 * Incorpora contracciones técnicas estándar y sufijo de unidad canónica normalizada.
 * Ej: "Precisión de Nivelación en Parada" (mm) -> "PREC_NIVEL_PARADA_MM"
 * Ej: "Velocidad Nominal de Viaje" (m/s) -> "VEL_NOMINAL_MS"
 * Ej: "Voltaje de Operación" (VAC) -> "VOLT_OPERACION_VAC"
 */
export function generarCodigoParametro(
  nombre: string,
  codigosExistentes: Set<string>,
  unidad?: string,
  maxLen = 30,
): string {
  if (!nombre || !nombre.trim()) return '';
  const nomClean = normalizarTexto(nombre).toUpperCase();

  const ABREV_PARAM: Record<string, string> = {
    PRECISION: 'PREC',
    NIVELACION: 'NIVEL',
    VELOCIDAD: 'VEL',
    TEMPERATURA: 'TEMP',
    PRESION: 'PRES',
    CORRIENTE: 'CORR',
    VOLTAJE: 'VOLT',
    TENSION: 'TENS',
    FRECUENCIA: 'FREQ',
    DISTANCIA: 'DIST',
    HOLGURA: 'HOLG',
    TIEMPO: 'TIEMPO',
    APERTURA: 'APERT',
    CIERRE: 'CIERRE',
    AISLAMIENTO: 'AISL',
    RESISTENCIA: 'RESIST',
    POTENCIA: 'POT',
    VIBRACION: 'VIBR',
    CAUDAL: 'CAUDAL',
    HUMEDAD: 'HUM',
    FACTOR: 'FACT',
    NOMINAL: 'NOMINAL',
    VIAJE: 'VIAJE',
    PARADA: 'PARADA',
  };

  const stopWords = new Set([
    'DE',
    'DEL',
    'LA',
    'EL',
    'LOS',
    'LAS',
    'UN',
    'UNA',
    'Y',
    'E',
    'O',
    'EN',
    'PARA',
    'POR',
    'CON',
    'SIN',
    'A',
    'AL',
  ]);

  const palabras = nomClean
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  const tokens = palabras.map((p) => ABREV_PARAM[p] || (p.length > 8 ? p.slice(0, 5) : p));
  let base = tokens.slice(0, 3).join('_');

  if (unidad && unidad.trim()) {
    const uClean = limpiarSimboloUnidad(unidad);
    if (uClean && !base.endsWith(`_${uClean}`)) {
      base = `${base.slice(0, maxLen - uClean.length - 1)}_${uClean}`;
    }
  }

  const limpio = base.slice(0, maxLen);
  return resolverColisionDeterminista(limpio, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
}

/**
 * 12. Pendientes y Anomalías de Mantenimiento (VarChar 30, mayúsculas con guiones bajos)
 * Ej: "Fuga de aceite en retenedor" (BOM) -> "BOM_FUGA_ACEITE"
 */
export function generarCodigoPendiente(
  descripcion: string,
  codigosExistentes: Set<string>,
  categoria?: string,
  arquetipoCodigo?: string,
  maxLen = 30,
): string {
  if (!descripcion || !descripcion.trim()) return '';
  const descClean = normalizarTexto(descripcion).toUpperCase();

  let prefix = 'GRAL';
  if (arquetipoCodigo && arquetipoCodigo.trim()) {
    prefix = arquetipoCodigo.trim().toUpperCase().slice(0, 5);
  } else if (categoria) {
    const catMap: Record<string, string> = {
      ELECTRICO: 'ELEC',
      MECANICO: 'MEC',
      COMBUSTIBLE: 'COMB',
      HIDRAULICO: 'HIDR',
      ELECTRONICO: 'ELTN',
      INSTRUMENTACION: 'INST',
      LIMPIEZA: 'LIMP',
      GENERAL: 'GRAL',
    };
    prefix = catMap[categoria.toUpperCase()] || categoria.toUpperCase().slice(0, 4);
  }

  const stopWords = new Set([
    'DE',
    'DEL',
    'LA',
    'EL',
    'LOS',
    'LAS',
    'UN',
    'UNA',
    'UNOS',
    'UNAS',
    'Y',
    'E',
    'O',
    'U',
    'A',
    'AL',
    'EN',
    'PARA',
    'CON',
    'SIN',
    'POR',
    'SOBRE',
    'QUE',
    'SE',
    'SU',
    'SUS',
    'PRESENTA',
    'TIENE',
    'HAY',
    'SE_REQUIERE',
  ]);

  const palabras = descClean
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  const clave = palabras.slice(0, 3).join('_');
  const base = `${prefix}_${clave}`.slice(0, maxLen);
  return resolverColisionDeterminista(base, codigosExistentes, {
    maxLen,
    separator: '_',
    caseSensitive: false,
  });
}
