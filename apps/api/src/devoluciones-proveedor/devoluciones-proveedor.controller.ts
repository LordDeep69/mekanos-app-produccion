import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { CrearDevolucionCommand } from './application/commands/crear-devolucion.command';
import { ProcesarDevolucionCommand } from './application/commands/procesar-devolucion.command';
import { GetDevolucionByIdQuery } from './application/queries/get-devolucion-by-id.query';
import { GetDevolucionesQuery } from './application/queries/get-devoluciones.query';
import { CrearDevolucionDto } from './dto/crear-devolucion.dto';
import { ProcesarDevolucionDto } from './dto/procesar-devolucion.dto';

/**
 * Controller: Devoluciones a Proveedor
 * Maneja endpoints REST para el módulo de devoluciones con CQRS
 */
@Controller('devoluciones-proveedor')
@UseGuards(JwtAuthGuard)
export class DevolucionesProveedorController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /devoluciones-proveedor
   * Crea una nueva solicitud de devolución al proveedor
   */
  @Post()
  async crear(@Body() dto: CrearDevolucionDto, @UserId() userId: number) {
    const command = new CrearDevolucionCommand(
      dto.id_orden_compra,
      dto.id_lote,
      dto.motivo,
      dto.cantidad_devuelta,
      userId, // solicitada_por
      dto.observaciones_solicitud,
    );
    return this.commandBus.execute(command);
  }

  /**
   * PATCH /devoluciones-proveedor/:id/procesar
   * Procesa una devolución (aprobar o rechazar)
   */
  @Patch(':id/procesar')
  async procesar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcesarDevolucionDto,
    @UserId() userId: number,
  ) {
    const command = new ProcesarDevolucionCommand(
      id,
      dto.estado_devolucion,
      userId, // procesada_por
      dto.observaciones_procesamiento,
    );
    return this.commandBus.execute(command);
  }

  /**
   * GET /devoluciones-proveedor
   * Obtiene lista de devoluciones con filtros opcionales
   * Query params: estado_devolucion, id_orden_compra, fecha_desde, fecha_hasta, page, limit
   */
  @Get()
  async findAll(
    @Query('estado_devolucion') estado?: string,
    @Query('id_orden_compra') id_orden_compra_str?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('page') page_str?: string,
    @Query('limit') limit_str?: string,
  ) {
    const page = page_str ? parseInt(page_str, 10) : 1;
    const limit = limit_str ? parseInt(limit_str, 10) : 10;
    const id_orden_compra = id_orden_compra_str ? parseInt(id_orden_compra_str, 10) : undefined;

    const query = new GetDevolucionesQuery(
      {
        estado_devolucion: estado,
        id_orden_compra,
        fecha_desde,
        fecha_hasta,
      },
      page,
      limit,
    );
    return this.queryBus.execute(query);
  }

  /**
   * GET /devoluciones-proveedor/:id
   * Obtiene una devolución específica por ID
   */
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const query = new GetDevolucionByIdQuery(id);
    return this.queryBus.execute(query);
  }
}
