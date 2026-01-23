/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks React Query para Agenda Enterprise
 */

'use client';

import { CacheStrategy } from '@/lib/cache';
import type { AgendaFilters } from '@/types/agenda';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { agendaService } from '../api/agenda.service';

// Keys para React Query
export const AGENDA_KEYS = {
    all: ['agenda'] as const,
    hoy: () => [...AGENDA_KEYS.all, 'hoy'] as const,
    semana: () => [...AGENDA_KEYS.all, 'semana'] as const,
    mes: () => [...AGENDA_KEYS.all, 'mes'] as const,
    vencidos: () => [...AGENDA_KEYS.all, 'vencidos'] as const,
    proximos: (dias: number) => [...AGENDA_KEYS.all, 'proximos', dias] as const,
    metricas: () => [...AGENDA_KEYS.all, 'metricas'] as const,
    cargaTecnicos: () => [...AGENDA_KEYS.all, 'carga-tecnicos'] as const,
    calendario: (desde: string, hasta: string) => [...AGENDA_KEYS.all, 'calendario', desde, hasta] as const,
    servicios: (filters: AgendaFilters, page: number) => [...AGENDA_KEYS.all, 'servicios', filters, page] as const,
};

// Cache strategy para agenda (datos dinámicos que necesitan actualización frecuente)
const agendaCacheStrategy = CacheStrategy.DYNAMIC;

/**
 * Hook para servicios de HOY
 */
export function useServiciosHoy() {
    return useQuery({
        queryKey: AGENDA_KEYS.hoy(),
        queryFn: () => agendaService.getServiciosHoy(),
        ...agendaCacheStrategy,
    });
}

/**
 * Hook para servicios de esta SEMANA
 */
export function useServiciosSemana() {
    return useQuery({
        queryKey: AGENDA_KEYS.semana(),
        queryFn: () => agendaService.getServiciosSemana(),
        ...agendaCacheStrategy,
    });
}

/**
 * Hook para servicios de este MES
 */
export function useServiciosMes() {
    return useQuery({
        queryKey: AGENDA_KEYS.mes(),
        queryFn: () => agendaService.getServiciosMes(),
        ...agendaCacheStrategy,
    });
}

/**
 * Hook para servicios VENCIDOS
 */
export function useServiciosVencidos() {
    return useQuery({
        queryKey: AGENDA_KEYS.vencidos(),
        queryFn: () => agendaService.getServiciosVencidos(),
        ...agendaCacheStrategy,
        refetchInterval: 60000, // Refetch cada minuto (alerta crítica)
    });
}

/**
 * Hook para servicios próximos a vencer
 */
export function useServiciosProximos(dias: number = 7) {
    return useQuery({
        queryKey: AGENDA_KEYS.proximos(dias),
        queryFn: () => agendaService.getServiciosProximos(dias),
        ...agendaCacheStrategy,
    });
}

/**
 * Hook para métricas de agenda
 */
export function useAgendaMetricas() {
    return useQuery({
        queryKey: AGENDA_KEYS.metricas(),
        queryFn: () => agendaService.getMetricas(),
        ...agendaCacheStrategy,
        refetchInterval: 60000, // Refetch cada minuto
    });
}

/**
 * Hook para carga de técnicos
 */
export function useCargaTecnicos() {
    return useQuery({
        queryKey: AGENDA_KEYS.cargaTecnicos(),
        queryFn: () => agendaService.getCargaTecnicos(),
        ...agendaCacheStrategy,
    });
}

/**
 * Hook para vista calendario
 */
export function useCalendario(fechaDesde: string, fechaHasta: string, enabled: boolean = true) {
    return useQuery({
        queryKey: AGENDA_KEYS.calendario(fechaDesde, fechaHasta),
        queryFn: () => agendaService.getCalendario(fechaDesde, fechaHasta),
        ...agendaCacheStrategy,
        enabled,
    });
}

/**
 * Hook para servicios con filtros
 */
export function useServiciosConFiltros(
    filters: AgendaFilters,
    page: number = 1,
    limit: number = 20,
) {
    return useQuery({
        queryKey: AGENDA_KEYS.servicios(filters, page),
        queryFn: () => agendaService.getServiciosConFiltros(filters, page, limit),
        ...agendaCacheStrategy,
    });
}

/**
 * Hook para refrescar todos los datos de agenda
 */
export function useRefreshAgenda() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.all });
    };
}
