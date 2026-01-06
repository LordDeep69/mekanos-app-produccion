/**
 * MEKANOS S.A.S - API Backend
 * Controlador Enterprise de Agenda
 * 
 * Endpoints inteligentes para gestión de cronogramas
 */

import {
    Controller,
    DefaultValuePipe,
    Get,
    ParseIntPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AgendaFilters, AgendaService } from './agenda.service';

@Controller('agenda')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgendaController {
    constructor(private readonly agendaService: AgendaService) { }

    /**
     * GET /api/agenda/hoy
     * Servicios programados para hoy
     */
    @Get('hoy')
    async getServiciosHoy() {
        return this.agendaService.getServiciosHoy();
    }

    /**
     * GET /api/agenda/semana
     * Servicios programados para esta semana
     */
    @Get('semana')
    async getServiciosSemana() {
        return this.agendaService.getServiciosSemana();
    }

    /**
     * GET /api/agenda/mes
     * Servicios programados para este mes
     */
    @Get('mes')
    async getServiciosMes() {
        return this.agendaService.getServiciosMes();
    }

    /**
     * GET /api/agenda/vencidos
     * Servicios vencidos (alerta crítica)
     */
    @Get('vencidos')
    async getServiciosVencidos() {
        return this.agendaService.getServiciosVencidos();
    }

    /**
     * GET /api/agenda/proximos?dias=7
     * Servicios próximos a vencer
     */
    @Get('proximos')
    async getServiciosProximos(
        @Query('dias', new DefaultValuePipe(7), ParseIntPipe) dias: number,
    ) {
        return this.agendaService.getServiciosProximos(dias);
    }

    /**
     * GET /api/agenda/metricas
     * KPIs y métricas de la agenda
     */
    @Get('metricas')
    async getMetricas() {
        return this.agendaService.getMetricas();
    }

    /**
     * GET /api/agenda/carga-tecnicos
     * Carga de trabajo por técnico
     */
    @Get('carga-tecnicos')
    async getCargaTecnicos() {
        return this.agendaService.getCargaTecnicos();
    }

    /**
     * GET /api/agenda/calendario?fechaDesde=...&fechaHasta=...
     * Servicios agrupados por fecha para vista calendario
     */
    @Get('calendario')
    async getCalendario(
        @Query('fechaDesde') fechaDesde: string,
        @Query('fechaHasta') fechaHasta: string,
    ) {
        const desde = fechaDesde ? new Date(fechaDesde) : new Date();
        const hasta = fechaHasta ? new Date(fechaHasta) : new Date(desde);
        hasta.setMonth(hasta.getMonth() + 1);

        const resultado = await this.agendaService.getServiciosCalendario(desde, hasta);

        // Convertir Map a objeto para serialización JSON
        const calendario: Record<string, any[]> = {};
        resultado.forEach((servicios, fecha) => {
            calendario[fecha] = servicios;
        });

        return {
            fechaDesde: desde.toISOString().split('T')[0],
            fechaHasta: hasta.toISOString().split('T')[0],
            calendario,
            totalDias: Object.keys(calendario).length,
            totalServicios: Object.values(calendario).flat().length,
        };
    }

    /**
     * GET /api/agenda/servicios
     * Listado con filtros avanzados enterprise
     * 
     * Query params:
     * - page: número de página (default: 1)
     * - limit: registros por página (default: 20)
     * - fechaDesde: fecha inicio (ISO)
     * - fechaHasta: fecha fin (ISO)
     * - clienteId: ID del cliente
     * - tecnicoId: ID del técnico
     * - tipoServicioId: ID del tipo de servicio
     * - estado: PENDIENTE | PROGRAMADA | COMPLETADA | VENCIDA | CANCELADA
     * - prioridad: NORMAL | ALTA | URGENTE
     * - zonaGeografica: zona de la sede
     */
    @Get('servicios')
    async getServiciosConFiltros(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('fechaDesde') fechaDesde?: string,
        @Query('fechaHasta') fechaHasta?: string,
        @Query('clienteId') clienteIdStr?: string,
        @Query('tecnicoId') tecnicoIdStr?: string,
        @Query('tipoServicioId') tipoServicioIdStr?: string,
        @Query('estado') estado?: string,
        @Query('prioridad') prioridad?: string,
        @Query('zonaGeografica') zonaGeografica?: string,
    ) {
        const filters: AgendaFilters = {
            fechaDesde,
            fechaHasta,
            clienteId: clienteIdStr ? parseInt(clienteIdStr, 10) : undefined,
            tecnicoId: tecnicoIdStr ? parseInt(tecnicoIdStr, 10) : undefined,
            tipoServicioId: tipoServicioIdStr ? parseInt(tipoServicioIdStr, 10) : undefined,
            estado,
            prioridad,
            zonaGeografica,
        };

        return this.agendaService.getServiciosConFiltros(filters, page, limit);
    }
}
