/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para el módulo de Reportes
 * 
 * ✅ REPORTES MODULE 10-FEB-2026
 * ✅ FIX 21-JUL-2026: Invalidation helpers para tracking de descargas
 */

import { CacheStrategy } from '@/lib/cache';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getClientesConInformes,
    getReportes,
    type ReportesQueryParams,
} from '../api/reportes.service';

const REPORTES_KEY = ['reportes'];
const REPORTES_CLIENTES_KEY = ['reportes', 'clientes'];

/**
 * Hook para obtener reportes con filtros y paginación server-side
 */
export function useReportes(params?: ReportesQueryParams) {
    return useQuery({
        queryKey: [...REPORTES_KEY, params],
        queryFn: () => getReportes(params),
        ...CacheStrategy.DYNAMIC,
    });
}

/**
 * Hook para obtener clientes que tienen informes (para dropdown de filtro)
 */
export function useClientesConInformes() {
    return useQuery({
        queryKey: REPORTES_CLIENTES_KEY,
        queryFn: () => getClientesConInformes(),
        ...CacheStrategy.SEMI_STATIC,
    });
}

/**
 * ✅ FIX 21-JUL-2026: Hook que devuelve una función para invalidar el cache
 * de reportes tras una descarga exitosa.
 *
 * Tras llamar `invalidateReportes()`, TanStack Query refetcheará la query
 * activa de `useReportes` y todos los badges de "descargado" se actualizarán
 * automáticamente sin necesidad de reload manual.
 *
 * Uso típico dentro del handler de descarga:
 *
 *   await descargarInformeAutenticado(apiClient, id, filename);
 *   invalidateReportes();   // ← dispara refetch silencioso (~200ms)
 */
export function useInvalidarReportes() {
    const queryClient = useQueryClient();
    return () => {
        // Invalida TODAS las queries que cuelgan de la key base ['reportes', ...]
        // (cubre variaciones por params: filtros, paginación, etc.)
        void queryClient.invalidateQueries({ queryKey: REPORTES_KEY });
    };
}
