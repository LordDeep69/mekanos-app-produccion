/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API para Agenda Enterprise
 */

import { apiClient } from '@/lib/api/client';
import type {
    AgendaFilters,
    AgendaMetricas,
    CalendarioResponse,
    CargaTecnico,
    ServiciosResponse,
} from '@/types/agenda';

const BASE_URL = '/agenda';

export const agendaService = {
    /**
     * Obtiene servicios programados para HOY
     */
    async getServiciosHoy(): Promise<ServiciosResponse> {
        const response = await apiClient.get(`${BASE_URL}/hoy`);
        return response.data;
    },

    /**
     * Obtiene servicios programados para esta SEMANA
     */
    async getServiciosSemana(): Promise<ServiciosResponse> {
        const response = await apiClient.get(`${BASE_URL}/semana`);
        return response.data;
    },

    /**
     * Obtiene servicios programados para este MES
     */
    async getServiciosMes(): Promise<ServiciosResponse> {
        const response = await apiClient.get(`${BASE_URL}/mes`);
        return response.data;
    },

    /**
     * Obtiene servicios VENCIDOS (alerta crítica)
     */
    async getServiciosVencidos(): Promise<ServiciosResponse> {
        const response = await apiClient.get(`${BASE_URL}/vencidos`);
        return response.data;
    },

    /**
     * Obtiene servicios próximos a vencer
     */
    async getServiciosProximos(dias: number = 7): Promise<ServiciosResponse> {
        const response = await apiClient.get(`${BASE_URL}/proximos`, { params: { dias } });
        return response.data;
    },

    /**
     * Obtiene métricas y KPIs de la agenda
     */
    async getMetricas(): Promise<AgendaMetricas> {
        const response = await apiClient.get(`${BASE_URL}/metricas`);
        return response.data;
    },

    /**
     * Obtiene carga de trabajo por técnico
     */
    async getCargaTecnicos(): Promise<CargaTecnico[]> {
        const response = await apiClient.get(`${BASE_URL}/carga-tecnicos`);
        return response.data;
    },

    /**
     * Obtiene servicios agrupados por fecha para vista calendario
     */
    async getCalendario(fechaDesde: string, fechaHasta: string): Promise<CalendarioResponse> {
        const response = await apiClient.get(`${BASE_URL}/calendario`, {
            params: { fechaDesde, fechaHasta },
        });
        return response.data;
    },

    /**
     * Obtiene servicios con filtros avanzados
     */
    async getServiciosConFiltros(
        filters: AgendaFilters,
        page: number = 1,
        limit: number = 20,
    ): Promise<ServiciosResponse> {
        const params: Record<string, any> = { page, limit };

        if (filters.fechaDesde) params.fechaDesde = filters.fechaDesde;
        if (filters.fechaHasta) params.fechaHasta = filters.fechaHasta;
        if (filters.clienteId) params.clienteId = filters.clienteId;
        if (filters.tecnicoId) params.tecnicoId = filters.tecnicoId;
        if (filters.tipoServicioId) params.tipoServicioId = filters.tipoServicioId;
        if (filters.estado) params.estado = filters.estado;
        if (filters.prioridad) params.prioridad = filters.prioridad;
        if (filters.zonaGeografica) params.zonaGeografica = filters.zonaGeografica;

        const response = await apiClient.get(`${BASE_URL}/servicios`, { params });
        return response.data;
    },
};
