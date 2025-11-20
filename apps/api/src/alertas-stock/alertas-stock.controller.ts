import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { GenerarAlertasAutomaticasCommand } from './commands/generar-alertas-automaticas.command';
import { ResolverAlertaCommand } from './commands/resolver-alerta.command';
import { GetAlertasStockQuery } from './queries/get-alertas-stock.query';
import { GetDashboardAlertasQuery } from './queries/get-dashboard-alertas.query';

@Controller('alertas-stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertasStockController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /api/alertas-stock/generar-automaticas
   * Genera alertas automáticas verificando stock y vencimientos
   */
  @Post('generar-automaticas')
  async generarAlertasAutomaticas() {
    const command = new GenerarAlertasAutomaticasCommand();
    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: `Generación completada: ${result.alertas_generadas} nuevas alertas`,
      data: result,
    };
  }

  /**
   * PUT /api/alertas-stock/:id/resolver
   * Resuelve una alerta (marca como RESUELTA)
   */
  @Put(':id/resolver')
  async resolverAlerta(
    @Param('id', ParseIntPipe) id: number,
    @Body('observaciones') observaciones: string,
    @UserId() userId: number,
  ) {
    const command = new ResolverAlertaCommand(id, userId, observaciones);
    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Alerta resuelta exitosamente',
      data: result,
    };
  }

  /**
   * GET /api/alertas-stock
   * Listar alertas con filtros
   * Query params: tipo_alerta, nivel, estado, id_componente, fecha_desde, fecha_hasta, page, limit
   */
  @Get()
  async getAlertasStock(
    @Query('tipo_alerta') tipoAlerta?: string,
    @Query('nivel') nivel?: string,
    @Query('estado') estado?: string,
    @Query('id_componente') idComponenteStr?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    // Parse manual de query params opcionales
    const idComponente = idComponenteStr ? parseInt(idComponenteStr, 10) : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const query = new GetAlertasStockQuery(
      tipoAlerta,
      nivel,
      estado,
      idComponente,
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
      page,
      limit,
    );

    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Alertas obtenidas exitosamente',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * GET /api/alertas-stock/dashboard
   * Dashboard: métricas y alertas recientes
   */
  @Get('dashboard')
  async getDashboard() {
    const query = new GetDashboardAlertasQuery();
    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Dashboard obtenido exitosamente',
      data: result,
    };
  }
}

