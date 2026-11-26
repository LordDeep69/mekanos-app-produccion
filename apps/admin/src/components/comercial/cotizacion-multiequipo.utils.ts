/**
 * Motor puro de recálculo reactivo de cantidades para ítems multi-equipo en Cotización Studio.
 * Soporta selección de "Todos los equipos" (`equipos_ids = []`), 1 equipo específico (`[id]`),
 * o un subconjunto arbitrario M de N equipos (`[id1, id2, ...]`), recalculando cantidades
 * proporcionalmente a `M` sin pérdida de precisión ni corrupción de rubros fijos.
 */

export type CpqRowKind = 'SERVICIO' | 'COMPONENTE' | 'OTRO';

export interface MultiEquipoRowLike {
  id_equipo?: number | null;
  equipos_ids?: number[];
  cantidad: number;
  tpl_es_por_equipo?: boolean;
  tpl_cantidad_base?: number;
  tpl_cantidad_manual?: boolean;
}

const roundQty = (n: number): number => Math.max(0.01, Math.round(n * 100) / 100);

/**
 * Normaliza la lista de equipos asignados a una línea:
 * - Deduplica enteros positivos.
 * - Compatibilidad legacy: si `equipos_ids` viene vacío pero existe `id_equipo`, hidrata `[id_equipo]`.
 * - Si se provee `allCotEquiposIds` y el usuario seleccionó TODOS los equipos disponibles,
 *   normaliza a `[]` (semántica canónica de "Todos los equipos").
 */
export function normalizeItemEquiposIds(
  equiposIds?: number[] | null,
  idEquipo?: number | null,
  allCotEquiposIds?: number[],
): number[] {
  const clean = Array.isArray(equiposIds)
    ? Array.from(
        new Set(equiposIds.filter((id): id is number => Number.isInteger(id) && Number(id) > 0)),
      )
    : [];

  let resolved = clean;
  if (resolved.length === 0 && idEquipo != null && Number.isInteger(idEquipo) && idEquipo > 0) {
    resolved = [idEquipo];
  }

  if (allCotEquiposIds && allCotEquiposIds.length > 0 && resolved.length > 0) {
    const allowedSet = new Set(allCotEquiposIds);
    resolved = resolved.filter((id) => allowedSet.has(id));
    if (resolved.length >= allCotEquiposIds.length) {
      const selSet = new Set(resolved);
      if (allCotEquiposIds.every((id) => selSet.has(id))) {
        return [];
      }
    }
  }

  return resolved;
}

/**
 * Determina si una línea escala por equipo según cuántos equipos tiene asignados.
 * - Si trae bandera explícita `tpl_es_por_equipo`, se respeta estrictamente.
 * - Sin bandera explícita (líneas recargadas de BD o creadas manualmente):
 *   Servicios y Repuestos escalan por equipo; Otros Rubros (logística/viáticos/pólizas) son fijos.
 */
export function isRowScalablePerEquipo(row: MultiEquipoRowLike, kind: CpqRowKind): boolean {
  if (row.tpl_es_por_equipo === true) return true;
  if (row.tpl_es_por_equipo === false) return false;
  return kind !== 'OTRO';
}

/**
 * Devuelve cuántos equipos efectivos cubre la línea (N si "Todos", o M si subconjunto específico).
 */
export function getEffectiveEquipoCount(row: MultiEquipoRowLike, totalEquipos: number): number {
  const mult = Math.max(1, totalEquipos);
  const ids = normalizeItemEquiposIds(row.equipos_ids, row.id_equipo);
  if (ids.length === 0) return mult;
  return Math.max(1, ids.length);
}

/**
 * Indica si debe mostrarse la píldora visual "× M eq." junto a la cantidad de la línea y su valor M.
 */
export function getMultiEquipoBadgeInfo(
  row: MultiEquipoRowLike,
  totalEquipos: number,
  kind: CpqRowKind,
): { show: boolean; count: number; isTodos: boolean } {
  if (totalEquipos <= 1 || !isRowScalablePerEquipo(row, kind)) {
    return { show: false, count: 1, isTodos: true };
  }
  const ids = normalizeItemEquiposIds(row.equipos_ids, row.id_equipo);
  const isTodos = ids.length === 0;
  const count = isTodos ? totalEquipos : ids.length;
  return {
    show: count > 1,
    count,
    isTodos,
  };
}

/**
 * Compatibilidad simple booleana.
 */
export function shouldShowMultiEquipoBadge(
  row: MultiEquipoRowLike,
  totalEquipos: number,
  kind: CpqRowKind,
): boolean {
  return getMultiEquipoBadgeInfo(row, totalEquipos, kind).show;
}

/**
 * Recalcula la fila cuando cambia el conjunto de equipos asignados a la línea (`[]` = Todos, `[id1, id2]` = subconjunto):
 * - Ajusta la cantidad proporcionalmente de `prevCount` -> `nextCount` preservando la base unitaria exacta.
 * - Mantiene `id_equipo = nextIds.length === 1 ? nextIds[0] : null` para retrocompatibilidad BD/legacy.
 * - Filas explícitamente fijas (`es_por_equipo = false`) conservan su cantidad fija intacta.
 */
export function recalcRowOnEquiposAssignment<T extends MultiEquipoRowLike>(
  row: T,
  nextEquiposIdsRaw: number[],
  allCotEquiposIds: number[],
  kind: CpqRowKind,
): {
  row: T;
  changedCantidad: boolean;
  prevCantidad: number;
  nextCantidad: number;
  effectiveCount: number;
  isTodos: boolean;
} {
  const prevCantidad = Number(row.cantidad || 1);
  const totalEq = Math.max(1, allCotEquiposIds.length);
  const prevIds = normalizeItemEquiposIds(row.equipos_ids, row.id_equipo, allCotEquiposIds);
  const nextIds = normalizeItemEquiposIds(nextEquiposIdsRaw, null, allCotEquiposIds);
  const nextIdEquipo = nextIds.length === 1 ? nextIds[0] : null;
  const isTodos = nextIds.length === 0;

  const prevCount = prevIds.length === 0 ? totalEq : prevIds.length;
  const nextCount = isTodos ? totalEq : nextIds.length;

  if (prevCount === nextCount || totalEq <= 1 || !isRowScalablePerEquipo(row, kind)) {
    return {
      row: {
        ...row,
        id_equipo: nextIdEquipo,
        equipos_ids: nextIds,
      },
      changedCantidad: false,
      prevCantidad,
      nextCantidad: prevCantidad,
      effectiveCount: nextCount,
      isTodos,
    };
  }

  const baseUnit =
    row.tpl_cantidad_base != null && !row.tpl_cantidad_manual
      ? roundQty(row.tpl_cantidad_base)
      : roundQty(prevCantidad / prevCount);
  const nextCantidad = roundQty(baseUnit * nextCount);

  return {
    row: {
      ...row,
      id_equipo: nextIdEquipo,
      equipos_ids: nextIds,
      cantidad: nextCantidad,
      tpl_es_por_equipo: true,
      tpl_cantidad_base: baseUnit,
      tpl_cantidad_manual: false,
    },
    changedCantidad: nextCantidad !== prevCantidad,
    prevCantidad,
    nextCantidad,
    effectiveCount: nextCount,
    isTodos,
  };
}

/**
 * Recalcula filas cuando cambia el conjunto global de equipos cubiertos por la cotización:
 * - Si una fila tiene subconjunto específico y todos sus equipos siguen seleccionados: NO se re-escala.
 * - Si alguno de los equipos específicos de la fila fue desmarcado: se recorta el subconjunto y se recalcula.
 * - Si TODOS sus equipos específicos fueron desmarcados: revierte a "Todos los equipos" y escala a `nextMult`.
 * - Si una fila está en "Todos" y es auto-escalable sin edición manual: escala a `base * nextMult`.
 */
export function recalcRowsOnEquiposListChange<T extends MultiEquipoRowLike>(
  rows: T[],
  prevIds: number[],
  nextIds: number[],
  kind: CpqRowKind,
): { rows: T[]; adjustedCount: number } {
  const prevMult = Math.max(1, prevIds.length);
  const nextMult = Math.max(1, nextIds.length);
  const nextSet = new Set(nextIds);
  let adjustedCount = 0;

  const nextRows = rows.map((r) => {
    const rowIds = normalizeItemEquiposIds(r.equipos_ids, r.id_equipo);

    if (rowIds.length > 0) {
      const surviving = rowIds.filter((id) => nextSet.has(id));

      // Todos los equipos asignados siguen seleccionados en la COT
      if (surviving.length === rowIds.length) {
        // Si ahora coinciden con el 100% de la COT (ej. la COT bajó de 3 a 2 y la fila tenía esos 2), normalizar a Todos sin cambiar cantidad
        if (nextIds.length > 0 && surviving.length === nextIds.length) {
          return { ...r, id_equipo: null, equipos_ids: [] };
        }
        return r;
      }

      // Al menos uno de los equipos asignados fue quitado de la COT
      const prevCount = rowIds.length;
      const nextNormalized =
        surviving.length === 0 ? [] : normalizeItemEquiposIds(surviving, null, nextIds);
      const nextIdEquipo = nextNormalized.length === 1 ? nextNormalized[0] : null;
      const nextCount = nextNormalized.length === 0 ? nextMult : nextNormalized.length;

      if (!isRowScalablePerEquipo(r, kind) || prevCount === nextCount) {
        return { ...r, id_equipo: nextIdEquipo, equipos_ids: nextNormalized };
      }

      const baseUnit =
        r.tpl_cantidad_base != null && !r.tpl_cantidad_manual
          ? roundQty(r.tpl_cantidad_base)
          : roundQty(Number(r.cantidad || 1) / prevCount);
      const nextCantidad = roundQty(baseUnit * nextCount);
      if (nextCantidad !== r.cantidad) adjustedCount += 1;

      return {
        ...r,
        id_equipo: nextIdEquipo,
        equipos_ids: nextNormalized,
        cantidad: nextCantidad,
        tpl_es_por_equipo: true,
        tpl_cantidad_base: baseUnit,
        tpl_cantidad_manual: false,
      };
    }

    // Fila en "Todos los equipos"
    if (
      prevMult !== nextMult &&
      r.tpl_es_por_equipo &&
      !r.tpl_cantidad_manual &&
      r.tpl_cantidad_base != null
    ) {
      const nextCantidad = roundQty(r.tpl_cantidad_base * nextMult);
      if (nextCantidad !== r.cantidad) adjustedCount += 1;
      return { ...r, cantidad: nextCantidad };
    }

    return r;
  });

  return { rows: nextRows, adjustedCount };
}
