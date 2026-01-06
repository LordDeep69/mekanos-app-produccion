/**
 * MEKANOS S.A.S - Portal Admin
 * DataCacheService - Servicio Centralizado de Cache Enterprise
 * 
 * RESPONSABILIDADES:
 * 1. Prefetching inteligente de datos relacionados
 * 2. Gestión de cache persistente (localStorage)
 * 3. Invalidación estratégica de cache
 * 4. Monitoreo de estado de cache
 * 
 * USO:
 * - Llamar prefetchForView() al entrar a una sección
 * - Llamar warmupCache() al iniciar la aplicación
 * - Usar invalidateRelated() después de mutaciones
 */

import { QueryClient } from '@tanstack/react-query';
import { CacheStrategy, PrefetchGroups, QueryKeyStrategies } from './data-cache.config';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheStats {
    totalQueries: number;
    cachedQueries: number;
    staleQueries: number;
    hitRate: number;
}

interface PrefetchResult {
    success: boolean;
    prefetched: string[];
    errors: string[];
    duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO DE CACHE
// ═══════════════════════════════════════════════════════════════════════════════

class DataCacheServiceClass {
    private queryClient: QueryClient | null = null;
    private prefetchFunctions: Map<string, () => Promise<unknown>> = new Map();

    /**
     * Inicializa el servicio con el QueryClient
     */
    initialize(queryClient: QueryClient): void {
        this.queryClient = queryClient;
        console.log('[DataCache] 🚀 Servicio inicializado');
    }

    /**
     * Registra una función de prefetch para una query key
     */
    registerPrefetchFn(queryKey: string, fn: () => Promise<unknown>): void {
        this.prefetchFunctions.set(queryKey, fn);
    }

    /**
     * Prefetch de datos para una vista específica
     */
    async prefetchForView(
        view: keyof typeof PrefetchGroups
    ): Promise<PrefetchResult> {
        const startTime = performance.now();
        const keys = PrefetchGroups[view];
        const prefetched: string[] = [];
        const errors: string[] = [];

        if (!this.queryClient) {
            console.warn('[DataCache] QueryClient no inicializado');
            return {
                success: false,
                prefetched: [],
                errors: ['QueryClient no inicializado'],
                duration: 0,
            };
        }

        console.log(`[DataCache] 📦 Prefetching para vista: ${view}`);

        await Promise.allSettled(
            keys.map(async (key) => {
                try {
                    const fn = this.prefetchFunctions.get(key);
                    if (fn) {
                        const strategy = QueryKeyStrategies[key] || CacheStrategy.DYNAMIC;

                        await this.queryClient!.prefetchQuery({
                            queryKey: [key],
                            queryFn: fn,
                            staleTime: strategy.staleTime,
                        });

                        prefetched.push(key);
                    }
                } catch (error) {
                    errors.push(key);
                    console.warn(`[DataCache] ⚠️ Error prefetching ${key}:`, error);
                }
            })
        );

        const duration = performance.now() - startTime;
        console.log(
            `[DataCache] ✅ Prefetch completado: ${prefetched.length}/${keys.length} en ${duration.toFixed(0)}ms`
        );

        return {
            success: errors.length === 0,
            prefetched,
            errors,
            duration,
        };
    }

    /**
     * Calentamiento de cache al iniciar la aplicación
     * Precarga catálogos estáticos que se usarán frecuentemente
     */
    async warmupCache(): Promise<void> {
        if (!this.queryClient) return;

        console.log('[DataCache] 🔥 Iniciando warmup de cache...');

        // Prefetch de catálogos estáticos en paralelo
        await this.prefetchForView('CATALOGOS');

        console.log('[DataCache] 🔥 Warmup completado');
    }

    /**
     * Invalida queries relacionadas después de una mutación
     */
    invalidateRelated(primaryKey: string): void {
        if (!this.queryClient) return;

        const relatedKeys = this.getRelatedKeys(primaryKey);

        console.log(`[DataCache] 🔄 Invalidando: ${primaryKey} + ${relatedKeys.length} relacionadas`);

        // Invalidar la query principal
        this.queryClient.invalidateQueries({ queryKey: [primaryKey] });

        // Invalidar queries relacionadas
        relatedKeys.forEach((key) => {
            this.queryClient!.invalidateQueries({ queryKey: [key] });
        });
    }

    /**
     * Obtiene queries relacionadas para invalidación en cascada
     */
    private getRelatedKeys(primaryKey: string): string[] {
        const relations: Record<string, string[]> = {
            'ordenes': ['dashboard', 'ordenes'],
            'tipos-servicio': ['catalogo-actividades', 'ordenes'],
            'estados-orden': ['ordenes', 'dashboard'],
            'clientes-selector': ['equipos-selector', 'sedes-cliente'],
        };

        return relations[primaryKey] || [];
    }

    /**
     * Obtiene estadísticas del cache actual
     */
    getCacheStats(): CacheStats {
        if (!this.queryClient) {
            return { totalQueries: 0, cachedQueries: 0, staleQueries: 0, hitRate: 0 };
        }

        const cache = this.queryClient.getQueryCache();
        const queries = cache.getAll();

        const totalQueries = queries.length;
        const cachedQueries = queries.filter(q => q.state.data !== undefined).length;
        const staleQueries = queries.filter(q => q.isStale()).length;
        const hitRate = totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0;

        return {
            totalQueries,
            cachedQueries,
            staleQueries,
            hitRate,
        };
    }

    /**
     * Limpia todo el cache (útil para logout)
     */
    clearAll(): void {
        if (!this.queryClient) return;

        console.log('[DataCache] 🗑️ Limpiando todo el cache');
        this.queryClient.clear();
    }

    /**
     * Limpia cache de una query específica
     */
    clearQuery(queryKey: string): void {
        if (!this.queryClient) return;

        this.queryClient.removeQueries({ queryKey: [queryKey] });
    }

    /**
     * Verifica si una query está en cache y es válida
     */
    isCached(queryKey: readonly unknown[]): boolean {
        if (!this.queryClient) return false;

        const state = this.queryClient.getQueryState(queryKey);
        return state?.data !== undefined && !state.isInvalidated;
    }

    /**
     * Fuerza refetch de una query específica
     */
    async refetch(queryKey: readonly unknown[]): Promise<void> {
        if (!this.queryClient) return;

        await this.queryClient.refetchQueries({ queryKey });
    }
}

// Singleton
export const DataCacheService = new DataCacheServiceClass();

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

export { CacheStrategy, PrefetchGroups } from './data-cache.config';
