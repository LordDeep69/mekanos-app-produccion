/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks TanStack Query para el módulo de Reportes
 * 
 * ✅ REPORTES MODULE 10-FEB-2026
 */

import { CacheStrategy } from '@/lib/cache';
import { useQuery } from '@tanstack/react-query';
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
