import type {
  ConfigParametrosEquipo,
  RangoParametro,
  UnidadesConfig,
} from './types/config-parametros.types';

export interface ParametroOverrideEquipo {
  id_parametro_medicion?: number;
  codigo_parametro?: string;
  nombre_parametro?: string;
  nombre_sistema?: string;
  unidad_medida?: string;
  min_normal?: number;
  max_normal?: number;
  min_critico?: number;
  max_critico?: number;
  valor_ideal?: number;
  es_adicional_equipo?: boolean;
}

export interface ParametroCatalogoArquetipo {
  id_parametro_medicion: number;
  codigo_parametro: string;
  nombre_parametro: string;
  unidad_medida: string;
  unidad_codigo?: string | null;
  id_magnitud?: number | null;
  tipo_magnitud?: string | null;
  nombre_magnitud?: string | null;
  nombre_sistema?: string | null;
  valor_minimo_normal?: number | null;
  valor_maximo_normal?: number | null;
  valor_minimo_critico?: number | null;
  valor_maximo_critico?: number | null;
  valor_ideal?: number | null;
  es_critico_seguridad: boolean;
  es_obligatorio: boolean;
  decimales_precision: number;
  tipo_dato: string;
}

export interface ResolvedParametroEquipo {
  unidadMedida: string;
  unidadCatalogo: string;
  minNormal?: number;
  maxNormal?: number;
  minCritico?: number;
  maxCritico?: number;
  valorIdeal?: number;
  minNormalCatalogo?: number;
  maxNormalCatalogo?: number;
  minCriticoCatalogo?: number;
  maxCriticoCatalogo?: number;
  esPersonalizado: boolean;
  origen: 'EQUIPO' | 'PLANTILLA' | 'GLOBAL';
}

export interface EvaluacionRangoResult {
  fueraDeRango: boolean;
  nivelAlerta: 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'INFORMATIVO';
  mensajeAlerta: string;
}

export function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed =
    typeof value === 'object' && value !== null && 'toNumber' in value
      ? Number((value as { toNumber: () => number }).toNumber())
      : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeConfigEquipo(raw: unknown): ConfigParametrosEquipo | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as ConfigParametrosEquipo;
}

function inferirMagnitudLegacy(
  codigoParametro?: string | null,
  unidadCatalogo?: string | null,
): keyof UnidadesConfig | null {
  const code = (codigoParametro || '').toUpperCase();
  const unit = (unidadCatalogo || '').toLowerCase();

  if (code.includes('TEMP') || unit.includes('°c') || unit.includes('°f') || unit === 'k') {
    return 'temperatura';
  }
  if (
    code.includes('PRES') ||
    unit === 'psi' ||
    unit === 'bar' ||
    unit === 'kpa' ||
    unit === 'mpa'
  ) {
    return 'presion';
  }
  if (
    code.includes('VOLT') ||
    code.includes('TENSION') ||
    unit === 'v' ||
    unit === 'vac' ||
    unit === 'vdc' ||
    unit === 'kv'
  ) {
    return 'voltaje';
  }
  if (code.includes('FREC') || unit === 'hz') {
    return 'frecuencia';
  }
  if (code.includes('CORR') || code.includes('AMP') || unit === 'a') {
    return 'corriente';
  }
  if (code.includes('RPM') || code.includes('VEL') || unit === 'rpm') {
    return 'velocidad';
  }
  if (code.includes('VIB') || unit === 'mm/s') {
    return 'vibracion';
  }
  if (code.includes('POT') || unit === 'kw' || unit === 'hp') {
    return 'potencia';
  }
  return null;
}

function findRangoInConfig(
  config: ConfigParametrosEquipo | null,
  idParametro?: number | null,
  codigoParametro?: string | null,
  nombreParametro?: string | null,
): ParametroOverrideEquipo | undefined {
  if (!config) return undefined;

  const porParam = config.por_parametro;
  if (porParam && typeof porParam === 'object') {
    if (idParametro !== null && idParametro !== undefined) {
      const byId = porParam[String(idParametro)];
      if (byId) return byId;
    }
    if (codigoParametro) {
      const exact = porParam[codigoParametro];
      if (exact) return exact;
      const upper = porParam[codigoParametro.toUpperCase()];
      if (upper) return upper;
    }
  }

  const rangos = config.rangos;
  if (rangos && typeof rangos === 'object') {
    if (codigoParametro) {
      const direct = rangos[codigoParametro] ?? rangos[codigoParametro.toUpperCase()];
      if (direct) return normalizeRangoToOverride(direct);
    }
    if (idParametro !== null && idParametro !== undefined && rangos[String(idParametro)]) {
      return normalizeRangoToOverride(rangos[String(idParametro)]);
    }
  }

  if (Array.isArray(config.parametros_adicionales)) {
    const normNombre = (nombreParametro || '').trim().toLowerCase();
    const matched = config.parametros_adicionales.find(
      (item) =>
        (idParametro != null && item.id_parametro_medicion === idParametro) ||
        (codigoParametro &&
          item.codigo_parametro &&
          item.codigo_parametro.toUpperCase() === codigoParametro.toUpperCase()) ||
        (normNombre &&
          item.nombre_parametro &&
          item.nombre_parametro.trim().toLowerCase() === normNombre),
    );
    if (matched) return matched;
  }

  return undefined;
}

function normalizeRangoToOverride(rango: RangoParametro): ParametroOverrideEquipo {
  return {
    min_normal: toFiniteNumber(rango.min_normal),
    max_normal: toFiniteNumber(rango.max_normal),
    min_critico: toFiniteNumber(rango.min_critico),
    max_critico: toFiniteNumber(rango.max_critico),
    valor_ideal: toFiniteNumber(rango.valor_ideal),
  };
}

function hasAnyBound(entry?: ParametroOverrideEquipo): boolean {
  if (!entry) return false;
  return (
    toFiniteNumber(entry.min_normal) !== undefined ||
    toFiniteNumber(entry.max_normal) !== undefined ||
    toFiniteNumber(entry.min_critico) !== undefined ||
    toFiniteNumber(entry.max_critico) !== undefined ||
    toFiniteNumber(entry.valor_ideal) !== undefined ||
    Boolean(entry.unidad_medida && entry.unidad_medida.trim())
  );
}

/**
 * Resuelve unidad y rangos efectivos aplicando cascada Equipo -> Plantilla -> Catálogo Global.
 * Preserva compatibilidad total con configuraciones legacy ({ unidades, rangos }).
 */
export function resolverParametroConConfig(
  parametroGlobal:
    | {
        id_parametro_medicion?: number | null;
        codigo_parametro?: string | null;
        nombre_parametro?: string | null;
        unidad_medida?: string | null;
        valor_minimo_normal?: unknown;
        valor_maximo_normal?: unknown;
        valor_minimo_critico?: unknown;
        valor_maximo_critico?: unknown;
        valor_ideal?: unknown;
      }
    | null
    | undefined,
  configEquipoRaw: unknown,
  plantillaConfigRaw?: unknown,
): ResolvedParametroEquipo {
  const idParametro = parametroGlobal?.id_parametro_medicion ?? undefined;
  const codigoParametro = parametroGlobal?.codigo_parametro ?? undefined;
  const nombreParametro = parametroGlobal?.nombre_parametro ?? undefined;
  const unidadCatalogo = (parametroGlobal?.unidad_medida || '').trim();

  const minNormalCatalogo = toFiniteNumber(parametroGlobal?.valor_minimo_normal);
  const maxNormalCatalogo = toFiniteNumber(parametroGlobal?.valor_maximo_normal);
  const minCriticoCatalogo = toFiniteNumber(parametroGlobal?.valor_minimo_critico);
  const maxCriticoCatalogo = toFiniteNumber(parametroGlobal?.valor_maximo_critico);
  const valorIdealCatalogo = toFiniteNumber(parametroGlobal?.valor_ideal);

  const configEquipo = normalizeConfigEquipo(configEquipoRaw);
  const configPlantilla = normalizeConfigEquipo(plantillaConfigRaw);

  const eqOverride = findRangoInConfig(configEquipo, idParametro, codigoParametro, nombreParametro);
  const tplOverride = findRangoInConfig(
    configPlantilla,
    idParametro,
    codigoParametro,
    nombreParametro,
  );

  const magnitudLegacy = inferirMagnitudLegacy(codigoParametro, unidadCatalogo);
  const eqLegacyUnit = magnitudLegacy
    ? configEquipo?.unidades?.[magnitudLegacy]?.trim()
    : undefined;
  const tplLegacyUnit = magnitudLegacy
    ? configPlantilla?.unidades?.[magnitudLegacy]?.trim()
    : undefined;

  const unidadEquipo = eqOverride?.unidad_medida?.trim() || eqLegacyUnit;
  const unidadPlantilla = tplOverride?.unidad_medida?.trim() || tplLegacyUnit;
  const unidadMedida = unidadEquipo || unidadPlantilla || unidadCatalogo;

  const minNormal =
    toFiniteNumber(eqOverride?.min_normal) ??
    toFiniteNumber(tplOverride?.min_normal) ??
    minNormalCatalogo;
  const maxNormal =
    toFiniteNumber(eqOverride?.max_normal) ??
    toFiniteNumber(tplOverride?.max_normal) ??
    maxNormalCatalogo;
  const minCritico =
    toFiniteNumber(eqOverride?.min_critico) ??
    toFiniteNumber(tplOverride?.min_critico) ??
    minCriticoCatalogo;
  const maxCritico =
    toFiniteNumber(eqOverride?.max_critico) ??
    toFiniteNumber(tplOverride?.max_critico) ??
    maxCriticoCatalogo;
  const valorIdeal =
    toFiniteNumber(eqOverride?.valor_ideal) ??
    toFiniteNumber(tplOverride?.valor_ideal) ??
    valorIdealCatalogo;

  const eqDiffersFromCatalog =
    (unidadEquipo !== undefined && unidadEquipo !== '' && unidadEquipo !== unidadCatalogo) ||
    (toFiniteNumber(eqOverride?.min_normal) !== undefined &&
      toFiniteNumber(eqOverride?.min_normal) !== minNormalCatalogo) ||
    (toFiniteNumber(eqOverride?.max_normal) !== undefined &&
      toFiniteNumber(eqOverride?.max_normal) !== maxNormalCatalogo) ||
    (toFiniteNumber(eqOverride?.min_critico) !== undefined &&
      toFiniteNumber(eqOverride?.min_critico) !== minCriticoCatalogo) ||
    (toFiniteNumber(eqOverride?.max_critico) !== undefined &&
      toFiniteNumber(eqOverride?.max_critico) !== maxCriticoCatalogo);

  const hasEqEntry = hasAnyBound(eqOverride) || Boolean(eqLegacyUnit);
  const hasTplEntry = hasAnyBound(tplOverride) || Boolean(tplLegacyUnit);

  return {
    unidadMedida,
    unidadCatalogo,
    minNormal,
    maxNormal,
    minCritico,
    maxCritico,
    valorIdeal,
    minNormalCatalogo,
    maxNormalCatalogo,
    minCriticoCatalogo,
    maxCriticoCatalogo,
    esPersonalizado: Boolean(
      eqDiffersFromCatalog || (hasEqEntry && eqOverride?.es_adicional_equipo),
    ),
    origen: eqDiffersFromCatalog || hasEqEntry ? 'EQUIPO' : hasTplEntry ? 'PLANTILLA' : 'GLOBAL',
  };
}

/**
 * Evalúa un valor numérico contra rangos efectivos (críticos primero, luego normales).
 */
export function evaluarValorContraRangos(
  valor: number,
  rangos: {
    minNormal?: number;
    maxNormal?: number;
    minCritico?: number;
    maxCritico?: number;
  },
  unidad = '',
  fallbackSinRango: 'OK' | 'INFORMATIVO' = 'INFORMATIVO',
): EvaluacionRangoResult {
  const { minNormal, maxNormal, minCritico, maxCritico } = rangos;
  const sufijoUnidad = unidad ? ` ${unidad}` : '';

  const tieneAlgunRango =
    minNormal !== undefined ||
    maxNormal !== undefined ||
    minCritico !== undefined ||
    maxCritico !== undefined;

  if (!tieneAlgunRango) {
    return {
      fueraDeRango: false,
      nivelAlerta: fallbackSinRango,
      mensajeAlerta: `Valor registrado: ${valor}${sufijoUnidad} (sin rango configurado)`,
    };
  }

  if (minCritico !== undefined && valor < minCritico) {
    return {
      fueraDeRango: true,
      nivelAlerta: 'CRITICO',
      mensajeAlerta: `Valor crítico: ${valor}${sufijoUnidad} está por debajo del mínimo crítico (${minCritico}${sufijoUnidad})`,
    };
  }
  if (maxCritico !== undefined && valor > maxCritico) {
    return {
      fueraDeRango: true,
      nivelAlerta: 'CRITICO',
      mensajeAlerta: `Valor crítico: ${valor}${sufijoUnidad} supera el máximo crítico (${maxCritico}${sufijoUnidad})`,
    };
  }
  if (minNormal !== undefined && valor < minNormal) {
    return {
      fueraDeRango: true,
      nivelAlerta: 'ADVERTENCIA',
      mensajeAlerta: `Advertencia: ${valor}${sufijoUnidad} está por debajo del mínimo normal (${minNormal}${sufijoUnidad})`,
    };
  }
  if (maxNormal !== undefined && valor > maxNormal) {
    return {
      fueraDeRango: true,
      nivelAlerta: 'ADVERTENCIA',
      mensajeAlerta: `Advertencia: ${valor}${sufijoUnidad} supera el máximo normal (${maxNormal}${sufijoUnidad})`,
    };
  }

  const descNormal =
    minNormal !== undefined && maxNormal !== undefined
      ? ` [${minNormal} — ${maxNormal}${sufijoUnidad}]`
      : '';
  return {
    fueraDeRango: false,
    nivelAlerta: 'OK',
    mensajeAlerta: `Valor ${valor}${sufijoUnidad} dentro de rango normal${descNormal}`,
  };
}

/**
 * Extrae `config_parametros` y posible plantilla desde una orden o su equipo en `ordenes_equipos`.
 */
export function extraerConfigEquipoDeOrden(
  orden: any,
  idOrdenEquipo?: number | null,
): { configEquipo: unknown; configPlantilla: unknown } {
  const equiposOrden: any[] = Array.isArray(orden?.ordenes_equipos) ? orden.ordenes_equipos : [];

  let equipoObjetivo: any = null;
  if (idOrdenEquipo !== null && idOrdenEquipo !== undefined) {
    equipoObjetivo = equiposOrden.find((oe) => oe?.id_orden_equipo === idOrdenEquipo)?.equipos;
  } else if (equiposOrden.length === 1) {
    equipoObjetivo = equiposOrden[0]?.equipos;
  }

  if (!equipoObjetivo) {
    equipoObjetivo = orden?.equipos;
  }

  return {
    configEquipo: equipoObjetivo?.config_parametros ?? null,
    configPlantilla: equipoObjetivo?.plantillas_parametros?.configuracion ?? null,
  };
}
