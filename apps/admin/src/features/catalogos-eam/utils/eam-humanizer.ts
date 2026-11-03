/**
 * MEKANOS S.A.S - Portal Admin
 * Traductor y Humanizador de Terminología EAM (Fase 3.5 — Cero Jerga de Programador)
 *
 * Transforma códigos técnicos internos (NUMERICO_MAGNITUD, TEXTO_CORTO, SELECTOR,
 * LO_QUE_OCURRA_PRIMERO, FILTRO_ACEITE_TITULAR, opciones_json polimórficas) en
 * etiquetas humanas intuitivas para Administradores y Coordinadores de Mantenimiento.
 */

export interface OpcionHumana {
  key: string;
  value: string;
  label: string;
}

/**
 * Parsea de forma 100% segura cualquier estructura de `opciones_json`
 * (arreglos de strings, arreglos de objetos `{ valor, etiqueta }`, CSV o JSON string)
 * garantizando claves únicas y cero `[object Object]`.
 */
export function parseOpcionesSeguras(raw: unknown): OpcionHumana[] {
  if (!raw) return [];
  let arr: unknown[] = [];

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {
        arr = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else {
      arr = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  return arr.map((item, idx) => {
    if (typeof item === 'string' || typeof item === 'number') {
      const str = String(item).trim();
      return {
        key: `opt-${idx}-${str}`,
        value: str,
        label: humanizeEnumToken(str),
      };
    }
    if (item !== null && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const rawVal = String(obj.valor ?? obj.value ?? obj.codigo ?? obj.id ?? '').trim();
      const rawLbl = String(
        obj.etiqueta ?? obj.label ?? obj.nombre ?? obj.descripcion ?? rawVal,
      ).trim();
      const label = rawLbl || rawVal || `Opción ${idx + 1}`;
      const value = rawVal || label;
      return {
        key: `opt-${idx}-${value}`,
        value,
        label,
      };
    }
    const fallback = String(item ?? `Opción ${idx + 1}`);
    return {
      key: `opt-${idx}-${fallback}`,
      value: fallback,
      label: fallback,
    };
  });
}

function humanizeEnumToken(token: string): string {
  if (!token) return '';
  // Si ya contiene espacios o minúsculas mixtas, conservarlo
  if (token.includes(' ') || /[a-z]/.test(token)) return token;
  const MAPA_DIRECTO: Record<string, string> = {
    TURBOCARGADO_POSTENFRIADO: 'Turbocargado Post-enfriado',
    TURBOCARGADO: 'Turbocargado',
    NATURAL: 'Aspiración Natural',
    DIESEL: 'Diésel (ACPM)',
    GASOLINA: 'Gasolina',
    GAS_NATURAL: 'Gas Natural',
    GLP: 'Gas GLP',
    ELECTRICO: 'Eléctrico',
    CENTRIFUGA: 'Centrífuga',
    PERIFERICA: 'Periférica',
    SUMERGIBLE: 'Sumergible',
    MULTIETAPA: 'Multietapa Vertical/Horizontal',
    PRESION_CONSTANTE: 'Presión Constante / Hidroneumático',
    AGUA_POTABLE: 'Abastecimiento de Agua Potable',
    CONTRA_INCENDIO: 'Red Contra Incendio (RCI)',
    ACHIQUE_RESIDUALES: 'Achique / Aguas Residuales',
    CLASE_H: 'Clase H (180 °C)',
    CLASE_F: 'Clase F (155 °C)',
  };
  if (MAPA_DIRECTO[token]) return MAPA_DIRECTO[token];
  return token;
}

/**
 * Catálogo de Tipos de Control en Lenguaje Humano Directo
 */
export interface TipoControlInfo {
  value: string;
  shortLabel: string;
  fullLabel: string;
  iconSymbol: string;
  badgeClass: string;
}

export const TIPOS_CONTROL_HUMANOS: TipoControlInfo[] = [
  {
    value: 'NUMERICO_MAGNITUD',
    shortLabel: 'Número con Unidad',
    fullLabel: '# Número con Unidad de Medida (Potencia, Presión, Capacidad...)',
    iconSymbol: '#',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value: 'NUMERICO_PURO',
    shortLabel: 'Número Simple',
    fullLabel: '# Número Simple / Conteo (Año, Cantidad de Cilindros, Fases...)',
    iconSymbol: '#',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    value: 'SELECTOR',
    shortLabel: 'Lista de Opciones',
    fullLabel: '☰ Lista Desplegable de Opciones (Combustible, Aspiración, Aplicación...)',
    iconSymbol: '☰',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    value: 'TEXTO_CORTO',
    shortLabel: 'Texto',
    fullLabel: 'Aa Texto / Referencia (Marca, Modelo, Serie, Código...)',
    iconSymbol: 'Aa',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    value: 'BOOLEANO',
    shortLabel: 'Sí / No',
    fullLabel: '✓ Interruptor Sí / No (¿Tiene Cabina?, ¿Tiene AVR?...)',
    iconSymbol: '✓',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

export function getTipoControlHumano(
  tipoControl?: string | null,
  tieneMagnitud?: boolean,
): TipoControlInfo {
  const raw = (tipoControl || '').toUpperCase().trim();
  if (raw === 'NUMERICO_MAGNITUD' || (raw === 'NUMERICO' && tieneMagnitud)) {
    return TIPOS_CONTROL_HUMANOS[0];
  }
  if (raw === 'NUMERICO_PURO' || raw === 'NUMERICO') {
    return TIPOS_CONTROL_HUMANOS[1];
  }
  if (raw === 'SELECTOR' || raw === 'SELECT' || raw === 'ENUM') {
    return TIPOS_CONTROL_HUMANOS[2];
  }
  if (raw === 'BOOLEANO' || raw === 'BOOLEAN') {
    return TIPOS_CONTROL_HUMANOS[4];
  }
  return TIPOS_CONTROL_HUMANOS[3]; // TEXTO_CORTO / TEXTO
}

/**
 * Traducción humana de Roles Semánticos
 */
const MAPA_ROLES_SEMANTICOS: Record<string, string> = {
  POTENCIA_CAPACIDAD_PRINCIPAL: 'Capacidad / Potencia Principal',
  MARCA_PRINCIPAL: 'Marca Principal',
  MARCA_MOTOR: 'Marca del Motor',
  MODELO_PRINCIPAL: 'Modelo Principal',
  MODELO_MOTOR: 'Modelo del Motor',
  SERIE_PRINCIPAL: 'Número de Serie',
  SERIE_MOTOR: 'Serie del Motor',
  CAPACIDAD_FLUIDO_LITROS: 'Capacidad de Fluido',
  TIPO_FLUIDO: 'Tipo de Fluido / Lubricante',
  BATERIA_ARRANQUE: 'Sistema de Baterías',
  IDENTIFICADOR: 'Identificación de Placa',
  CAPACIDAD_NOMINAL: 'Capacidad Nominal',
  METRICA_PRIMARIA: 'Indicador Principal (KPI)',
  CONSUMIBLE_CAPACIDAD: 'Capacidad de Insumo',
  PROTECCION_SEGURIDAD: 'Protección y Seguridad',
  CONFIGURACION: 'Configuración Operativa',
  ESTANDAR: 'Dato Técnico General',
};

export const ROLES_SEMANTICOS_OPTIONS = Object.entries(MAPA_ROLES_SEMANTICOS).map(
  ([value, label]) => ({ value, label }),
);

export function getRolSemanticoHumano(rol?: string | null): string {
  if (!rol) return 'Dato Técnico General';
  return MAPA_ROLES_SEMANTICOS[rol.toUpperCase()] || 'Dato Técnico General';
}

/**
 * Traducción humana de Criterios de Intervalo de Planes Preventivos
 */
export function getCriterioIntervaloHumano(criterio?: string | null): string {
  const c = (criterio || '').toUpperCase().trim();
  if (c === 'LO_QUE_OCURRA_PRIMERO') return 'Lo que ocurra primero (Días u Horas)';
  if (c === 'DIAS' || c === 'CALENDARIO') return 'Solo por Calendario (Días)';
  if (c === 'HORAS' || c === 'USO') return 'Solo por Uso (Horas de Horómetro)';
  return criterio || 'Lo que ocurra primero (Días u Horas)';
}

/**
 * Traducción humana de Roles en Kits de Repuestos (BOM)
 */
const MAPA_ROLES_BOM: Record<string, string> = {
  FILTRO_ACEITE_TITULAR: 'Filtro de Aceite Principal',
  FILTRO_COMBUSTIBLE_TITULAR: 'Filtro de Combustible',
  FILTRO_AIRE_TITULAR: 'Filtro de Aire de Admisión',
  SEPARADOR_AGUA_COMBUSTIBLE: 'Separador Agua / Combustible',
  LUBRICANTE_MOTOR: 'Aceite Lubricante',
  REFRIGERANTE_MOTOR: 'Líquido Refrigerante',
  CORREA_VENTILADOR: 'Correa de Transmisión / Ventilador',
  SELLO_MECANICO_BOMBA: 'Sello Mecánico',
  RODAMIENTO_TITULAR: 'Rodamiento / Balinera',
  BATERIA_ARRANQUE: 'Batería de Arranque',
  REPUESTO_GENERAL: 'Repuesto / Insumo General',
};

export const ROLES_BOM_OPTIONS = Object.entries(MAPA_ROLES_BOM).map(([value, label]) => ({
  value,
  label,
}));

export function getRolBomHumano(rolBom?: string | null): string {
  if (!rolBom) return 'Repuesto / Insumo General';
  return MAPA_ROLES_BOM[rolBom.toUpperCase()] || rolBom;
}

/**
 * Nombres cortos y colores de Partes / Subsistemas para badges en tablas
 */
export function getModuloBadgeInfo(codigoModulo?: string | null, nombreModulo?: string | null): {
  shortName: string;
  fullName: string;
  badgeClass: string;
} {
  const code = (codigoModulo || '').toLowerCase();
  if (code.includes('motor_combustion')) {
    return {
      shortName: 'Motor Combustión',
      fullName: nombreModulo || 'Motor de Combustión Interna',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }
  if (code.includes('alternador') || code.includes('generador')) {
    return {
      shortName: 'Alternador / Generador',
      fullName: nombreModulo || 'Alternador / Generador Eléctrico',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (code.includes('bomba')) {
    return {
      shortName: 'Bomba Hidráulica',
      fullName: nombreModulo || 'Bomba Hidráulica',
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    };
  }
  if (code.includes('motor_electrico')) {
    return {
      shortName: 'Motor Eléctrico',
      fullName: nombreModulo || 'Motor Eléctrico',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  if (code.includes('compresor')) {
    return {
      shortName: 'Compresor de Aire',
      fullName: nombreModulo || 'Compresor de Aire Industrial',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    };
  }
  return {
    shortName: nombreModulo || codigoModulo || 'General',
    fullName: nombreModulo || codigoModulo || 'Subsistema General',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

/**
 * Formatea un código técnico como fallback legible si no está en el diccionario
 */
export function humanizeFallbackKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\bKw\b/g, 'kW')
    .replace(/\bKva\b/g, 'kVA')
    .replace(/\bHp\b/g, 'HP')
    .replace(/\bRpm\b/g, 'RPM')
    .replace(/\bVdc\b/g, 'VDC')
    .replace(/\bVac\b/g, 'VAC')
    .replace(/\bHz\b/g, 'Hz')
    .replace(/\bIp\b/g, 'IP')
    .replace(/\bAvr\b/g, 'AVR');
}
