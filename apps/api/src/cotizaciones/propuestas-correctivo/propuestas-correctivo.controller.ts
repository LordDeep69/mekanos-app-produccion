import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConvertirPropuestaOrdenCommand } from '../commands/propuestas/convertir-propuesta-orden.command';
import { CreatePropuestaCommand } from '../commands/propuestas/create-propuesta.command';
import { CreatePropuestaDto } from '../dto/propuestas/create-propuesta.dto';
import { GetPropuestasPendientesQuery } from '../queries/propuestas/get-propuestas-pendientes.query';

/**
 * PROPUESTAS CORRECTIVO CONTROLLER
 * FASE 4.9
 * 
 * Endpoints:
 * POST   /propuestas-correctivo                    - Crear propuesta desde orden servicio (técnico)
 * GET    /propuestas-correctivo/pendientes         - Listar propuestas pendientes aprobación
 * POST   /propuestas-correctivo/:id/convertir-orden - Convertir propuesta aprobada → orden servicio
 */
@ApiTags('Propuestas Correctivo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('propuestas-correctivo')
export class PropuestasCorrectivoController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear propuesta correctivo desde mantenimiento (técnico genera propuesta → cotización automática)' })
  @ApiResponse({ status: 201, description: 'Propuesta creada + cotización generada' })
  @ApiResponse({ status: 400, description: 'Orden servicio no está EN_PROCESO' })
  @ApiResponse({ status: 404, description: 'Orden servicio no encontrada' })
  async crearPropuesta(@Body() dto: CreatePropuestaDto) {
    const command = new CreatePropuestaCommand(
      dto.id_orden_servicio,
      dto.tipo_propuesta,
      dto.descripcion_hallazgo,
      dto.descripcion_solucion,
      dto.urgencia_propuesta,
      dto.prioridad,
      dto.tiempo_estimado_ejecucion,
      dto.creada_por, // TODO: Obtener de JWT token
    );

    return await this.commandBus.execute(command);
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Listar propuestas pendientes aprobación (Dashboard supervisor/gerente)' })
  @ApiResponse({ status: 200, description: 'Listado propuestas pendientes' })
  @ApiQuery({ name: 'tipoPropuesta', required: false, enum: ['CORRECTIVO', 'MEJORA', 'REEMPLAZO'] })
  @ApiQuery({ name: 'urgencia', required: false, enum: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 50 })
  async listarPropuestasPendientes(
    @Query('tipoPropuesta') tipoPropuesta?: string,
    @Query('urgencia') urgencia?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const query = new GetPropuestasPendientesQuery(
      tipoPropuesta,
      urgencia,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
    );

    return await this.queryBus.execute(query);
  }

  @Post(':id/convertir-orden')
  @ApiOperation({ summary: 'Convertir propuesta aprobada en orden servicio automática' })
  @ApiResponse({ status: 200, description: 'Propuesta convertida → Orden servicio creada' })
  @ApiResponse({ status: 400, description: 'Cotización no aprobada o propuesta ya convertida' })
  @ApiResponse({ status: 404, description: 'Propuesta no encontrada' })
  async convertirPropuestaOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { convertida_por: number },
  ) {
    const command = new ConvertirPropuestaOrdenCommand(
      id,
      body.convertida_por, // TODO: Obtener de JWT token
    );

    return await this.commandBus.execute(command);
  }
}
