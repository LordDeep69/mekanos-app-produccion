/**
 * DASHBOARD CONTROLLER - MEKANOS S.A.S
 *
 * Endpoint unificado que devuelve todas las métricas que el admin
 * necesita ver de un vistazo, sin múltiples llamadas API.
 *
 * Filosofía: "EL ÉXITO DEL BACKEND ES LO TONTO DEL FRONTEND"
 *
 * @author MEKANOS Development Team
 * @version 1.0.0
 * @since FASE 7 POST-CRUD (Bonus)
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Dashboard general - Métricas principales para admin
   */
  @Get()
  @ApiOperation({
    summary: 'Dashboard unificado para admin',
    description: 'Retorna todas las métricas principales en una sola llamada',
  })
  @ApiQuery({ name: 'mes', required: false, type: Number, description: 'Mes (1-12), default: mes actual' })
  @ApiQuery({ name: 'anio', required: false, type: Number, description: 'Año, default: año actual' })
  async getDashboard(
    @Query('mes') mesStr?: string,
    @Query('anio') anioStr?: string,
  ) {
    const now = new Date();
    const mes = mesStr ? parseInt(mesStr) : now.getMonth() + 1;
    const anio = anioStr ? parseInt(anioStr) : now.getFullYear();

    return this.dashboardService.getDashboardCompleto(mes, anio);
  }

  /**
   * Métricas de órdenes por estado
   */
  @Get('ordenes')
  @ApiOperation({ summary: 'Métricas de órdenes de servicio' })
  async getMetricasOrdenes() {
    return this.dashboardService.getMetricasOrdenes();
  }

  /**
   * Métricas comerciales (cotizaciones)
   */
  @Get('comercial')
  @ApiOperation({ summary: 'Métricas comerciales - cotizaciones y conversión' })
  async getMetricasComerciales() {
    return this.dashboardService.getMetricasComerciales();
  }

  /**
   * Próximos eventos y alertas
   */
  @Get('alertas')
  @ApiOperation({ summary: 'Alertas y próximos eventos críticos' })
  async getAlertas() {
    return this.dashboardService.getAlertasActivas();
  }

  /**
   * Métricas de productividad por técnico
   */
  @Get('productividad')
  @ApiOperation({ summary: 'Productividad de técnicos' })
  @ApiQuery({ name: 'mes', required: false, type: Number })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  async getProductividad(
    @Query('mes') mesStr?: string,
    @Query('anio') anioStr?: string,
  ) {
    const now = new Date();
    const mes = mesStr ? parseInt(mesStr) : now.getMonth() + 1;
    const anio = anioStr ? parseInt(anioStr) : now.getFullYear();
    
    return this.dashboardService.getProductividadTecnicos(mes, anio);
  }
}

