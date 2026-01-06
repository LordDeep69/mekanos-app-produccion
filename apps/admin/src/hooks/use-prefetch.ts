/**
 * MEKANOS S.A.S - Portal Admin
 * Hook de Prefetching Inteligente
 * 
 * Permite precargar datos cuando el usuario navega o hace hover sobre enlaces.
 * Esto elimina tiempos de espera al cambiar de vista.
 */

'use client';

import { DataCacheService, PrefetchGroups } from '@/lib/cache';
import { useCallback, useEffect, useRef } from 'react';

type PrefetchView = keyof typeof PrefetchGroups;

/**
 * Hook para prefetch de datos al entrar a una vista
 * 
 * @example
 * // En el componente de la página
 * usePrefetchOnMount('CREAR_ORDEN');
 */
export function usePrefetchOnMount(view: PrefetchView): void {
    const hasPrefetched = useRef(false);

    useEffect(() => {
        if (!hasPrefetched.current) {
            hasPrefetched.current = true;
            DataCacheService.prefetchForView(view);
        }
    }, [view]);
}

/**
 * Hook para prefetch de datos al hacer hover sobre un elemento
 * 
 * @example
 * const prefetch = usePrefetchOnHover('CREAR_ORDEN');
 * <button onMouseEnter={prefetch}>Crear Orden</button>
 */
export function usePrefetchOnHover(view: PrefetchView): () => void {
    const hasPrefetched = useRef(false);

    return useCallback(() => {
        if (!hasPrefetched.current) {
            hasPrefetched.current = true;
            DataCacheService.prefetchForView(view);
        }
    }, [view]);
}

/**
 * Hook para warmup inicial de cache
 * Debe usarse en el layout principal
 * 
 * @example
 * // En el layout del dashboard
 * useCacheWarmup();
 */
export function useCacheWarmup(): void {
    const hasWarmedUp = useRef(false);

    useEffect(() => {
        if (!hasWarmedUp.current) {
            hasWarmedUp.current = true;

            // Esperar un momento para no bloquear el render inicial
            const timeout = setTimeout(() => {
                DataCacheService.warmupCache();
            }, 500);

            return () => clearTimeout(timeout);
        }
    }, []);
}

/**
 * Hook para obtener estadísticas de cache
 * Útil para debugging y monitoreo
 */
export function useCacheStats() {
    return DataCacheService.getCacheStats();
}

/**
 * Hook para invalidar cache relacionado después de mutaciones
 * 
 * @example
 * const invalidate = useInvalidateCache();
 * // Después de crear una orden:
 * invalidate('ordenes');
 */
export function useInvalidateCache() {
    return useCallback((primaryKey: string) => {
        DataCacheService.invalidateRelated(primaryKey);
    }, []);
}
