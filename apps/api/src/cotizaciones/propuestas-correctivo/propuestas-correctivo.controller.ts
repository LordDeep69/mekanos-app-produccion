import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConvertirPropuestaOrdenCommand } from '../commands/propuestas/convertir-propuesta-orden.command';
import { CreatePropuestaCommand } from '../commands/propuestas/create-propuesta.command';
import { CreatePropuestaDto } from '../dto/propuestas/create-propuesta.dto';
import { GetPropuestasPendientesQuery } from '../queries/propuestas/get-propuestas-pendientes.query';
import { CotizacionesCpqService } from '../services/cotizaciones-cpq.service';

/**
 * PROPUESTAS CORRECTIVO CONTROLLER
 */
@ApiTags('Propuestas Correctivo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('propuestas-correctivo')
export class PropuestasCorrectivoController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly cpqService: CotizacionesCpqService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear propuesta correctivo desde mantenimiento',
  })
  async crearPropuesta(
    @Body() dto: CreatePropuestaDto,
    @CurrentUser() user: { id: number; idEmpleado?: number | null },
  ) {
    const command = new CreatePropuestaCommand(
      dto.id_orden_servicio,
      dto.tipo_propuesta,
      dto.descripcion_hallazgo,
      dto.descripcion_solucion,
      dto.urgencia_propuesta,
      dto.prioridad,
      dto.tiempo_estimado_ejecucion,
      dto.creada_por ?? user.idEmpleado ?? 1,
    );

    return await this.commandBus.execute(command);
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Listar propuestas correctivas (Dashboard supervisor/gerente)' })
  @ApiQuery({ name: 'tipoPropuesta', required: false, enum: ['CORRECTIVO', 'MEJORA', 'REEMPLAZO'] })
  @ApiQuery({ name: 'urgencia', required: false, enum: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] })
  @ApiQuery({
    name: 'estadoVista',
    required: false,
    enum: ['PENDIENTES', 'ESCALADAS', 'CONVERTIDAS', 'TODAS'],
  })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 50 })
  async listarPropuestasPendientes(
    @Query('tipoPropuesta') tipoPropuesta?: string,
    @Query('urgencia') urgencia?: string,
    @Query('estadoVista') estadoVista?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const query = new GetPropuestasPendientesQuery(
      tipoPropuesta,
      urgencia,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
      estadoVista,
    );

    return await this.queryBus.execute(query);
  }

  @Post(':id/convertir-a-cotizacion')
  @ApiOperation({
    summary:
      'Escalar propuesta técnica de correctivo a una Cotización Comercial formal en BORRADOR',
  })
  @ApiResponse({ status: 201, description: 'Cotización comercial creada desde propuesta' })
  async convertirACotizacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; idEmpleado?: number | null },
  ) {
    return this.cpqService.escalarPropuestaACotizacion(id, user.id, user.idEmpleado);
  }

  @Post(':id/convertir-orden')
  @ApiOperation({ summary: 'Convertir propuesta aprobada en orden servicio automática' })
  async convertirPropuestaOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { convertida_por?: number },
    @CurrentUser('id') userId?: number,
  ) {
    const command = new ConvertirPropuestaOrdenCommand(id, userId ?? body?.convertida_por ?? 1);

    return await this.commandBus.execute(command);
  }
}
