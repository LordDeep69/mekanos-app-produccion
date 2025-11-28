import {
    Body,
    Controller,
    DefaultValuePipe,
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
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CrearHistorialEstadosOrdenCommand } from '../application/commands/crear-historial-estados-orden.command';
import { CrearHistorialEstadosOrdenDto } from '../application/dto/crear-historial-estados-orden.dto';
import { HistorialEstadosOrdenResponseDto } from '../application/dto/historial-estados-orden-response.dto';
import { ListarHistorialEstadosOrdenQuery } from '../application/handlers/listar-historial-estados-orden.handler';
import { ListarHistorialPorOrdenQuery } from '../application/handlers/listar-historial-por-orden.handler';
import { ObtenerHistorialEstadosOrdenPorIdQuery } from '../application/handlers/obtener-historial-estados-orden-por-id.handler';

@ApiTags('Historial Estados Orden')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('historial-estados-orden')
export class HistorialEstadosOrdenController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar historial de cambios de estado (paginado)',
    description:
      'Obtiene una lista paginada de todos los cambios de estado registrados',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cambios de estado obtenida exitosamente',
    type: [HistorialEstadosOrdenResponseDto],
  })
  async listar(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.queryBus.execute(
      new ListarHistorialEstadosOrdenQuery(page, limit),
    );
  }

  @Get('orden/:idOrden')
  @ApiOperation({
    summary: 'Listar historial de una orden específica',
    description: 'Obtiene todos los cambios de estado de una orden de servicio',
  })
  @ApiParam({
    name: 'idOrden',
    type: Number,
    description: 'ID de la orden de servicio',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Registros por página (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de la orden obtenido exitosamente',
    type: [HistorialEstadosOrdenResponseDto],
  })
  async listarPorOrden(
    @Param('idOrden', ParseIntPipe) idOrden: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.queryBus.execute(
      new ListarHistorialPorOrdenQuery(idOrden, page, limit),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un registro de historial por ID',
    description:
      'Obtiene un registro específico del historial con todas sus relaciones',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del registro de historial',
  })
  @ApiResponse({
    status: 200,
    description: 'Registro de historial obtenido exitosamente',
    type: HistorialEstadosOrdenResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Registro de historial no encontrado',
  })
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return await this.queryBus.execute(
      new ObtenerHistorialEstadosOrdenPorIdQuery(id),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo registro de cambio de estado',
    description:
      'Registra un cambio de estado en el historial (inmutable - no se puede modificar ni eliminar)',
  })
  @ApiResponse({
    status: 201,
    description: 'Cambio de estado registrado exitosamente',
    type: HistorialEstadosOrdenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden, estado o usuario no encontrado',
  })
  async crear(@Body() dto: CrearHistorialEstadosOrdenDto) {
    const command = new CrearHistorialEstadosOrdenCommand(
      dto.idOrdenServicio,
      dto.idEstadoAnterior,
      dto.idEstadoNuevo,
      dto.motivoCambio,
      dto.observaciones,
      dto.accion,
      dto.realizadoPor,
      dto.ipOrigen,
      dto.userAgent,
      dto.duracionEstadoAnteriorMinutos,
      dto.metadata,
    );

    return await this.commandBus.execute(command);
  }
}
