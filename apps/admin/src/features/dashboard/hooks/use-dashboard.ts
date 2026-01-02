/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks para Dashboard con TanStack Query
 *
 * RESILIENCIA: Cada hook es independiente.
 * Si un endpoint falla, los demás siguen funcionando.
 *
 * CACHÉ: staleTime de 5 minutos con refresh manual disponible.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getDashboardAlertas,
    getDashboardComercial,
    getDashboardOrdenes,
    getDashboardProductividad,
    getOrdenesRecientes,
} from '../api/dashboard.service';

// Keys para el caché
export const dashboardKeys = {
  all: ['dashboard'] as const,
  alertas: () => [...dashboardKeys.all, 'alertas'] as const,
  ordenes: () => [...dashboardKeys.all, 'ordenes'] as const,
  comercial: () => [...dashboardKeys.all, 'comercial'] as const,
  productividad: (mes?: number, anio?: number) =>
    [...dashboardKeys.all, 'productividad', { mes, anio }] as const,
  ordenesRecientes: () => [...dashboardKeys.all, 'recientes'] as const,
};

// Configuración común: 5 minutos de staleTime
const STALE_TIME = 1000 * 60 * 5; // 5 minutos

/**
 * Hook para alertas del dashboard
 */
export function useDashboardAlertas() {
  return useQuery({
    queryKey: dashboardKeys.alertas(),
    queryFn: getDashboardAlertas,
    staleTime: STALE_TIME,
    retry: 2, // Reintentar 2 veces en caso de error
  });
}

/**
 * Hook para métricas de órdenes
 */
export function useDashboardOrdenes() {
  return useQuery({
    queryKey: dashboardKeys.ordenes(),
    queryFn: getDashboardOrdenes,
    staleTime: STALE_TIME,
    retry: 2,
  });
}

/**
 * Hook para métricas comerciales
 */
export function useDashboardComercial() {
  return useQuery({
    queryKey: dashboardKeys.comercial(),
    queryFn: getDashboardComercial,
    staleTime: STALE_TIME,
    retry: 2,
  });
}

/**
 * Hook para productividad de técnicos
 */
export function useDashboardProductividad(mes?: number, anio?: number) {
  return useQuery({
    queryKey: dashboardKeys.productividad(mes, anio),
    queryFn: () => getDashboardProductividad(mes, anio),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

/**
 * Hook para órdenes recientes (tabla)
 */
export function useOrdenesRecientes(limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.ordenesRecientes(),
    queryFn: () => getOrdenesRecientes(limit),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

/**
 * Hook para refrescar todo el dashboard manualmente
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();

  const refresh = () => {
    // Invalidar todas las queries del dashboard
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  return { refresh };
}
