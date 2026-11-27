/**
 * MEKANOS S.A.S - Portal Admin
 * Utilidad centralizada de persistencia de filtros y navegación (URL + sessionStorage).
 *
 * Garantiza que al buscar/filtrar en un listado, entrar a un detalle (/[id]) y regresar
 * — ya sea con el botón Atrás del navegador o con el botón interno "Volver" —
 * los filtros, búsqueda, ordenamiento, pestaña y página se conserven intactos.
 */

const STORAGE_PREFIX = 'mekanos:nav-filters:';

/**
 * Lee los parámetros activos para una ruta:
 * 1) Prioriza los query params de la URL actual (enlaces compartidos, F5, botón Atrás).
 * 2) Si la URL actual no tiene query params (ej. botón interno router.push('/clientes')),
 *    recupera el último estado guardado en sessionStorage para esa ruta.
 */
export function readPersistedFilterParams(routeKey: string): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  const currentSearch = window.location.search;
  if (currentSearch && currentSearch.length > 1) {
    return new URLSearchParams(currentSearch);
  }

  try {
    const saved = window.sessionStorage.getItem(`${STORAGE_PREFIX}${routeKey}`);
    if (saved) {
      return new URLSearchParams(saved);
    }
  } catch {
    // sessionStorage puede estar deshabilitado en navegación privada estricta
  }

  return new URLSearchParams();
}

/**
 * Sincroniza los filtros hacia la URL (sin provocar round-trip RSC usando replaceState)
 * y hacia sessionStorage.
 */
export function writePersistedFilterParams(
  basePath: string,
  routeKey: string,
  params: URLSearchParams,
): void {
  if (typeof window === 'undefined') return;

  const queryString = params.toString();
  const newUrl = queryString ? `${basePath}?${queryString}` : basePath;

  try {
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== newUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  } catch {
    // Ignorar si history API no permite replaceState
  }

  try {
    const storageKey = `${STORAGE_PREFIX}${routeKey}`;
    if (queryString) {
      window.sessionStorage.setItem(storageKey, queryString);
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Ignorar si sessionStorage no está disponible
  }
}
