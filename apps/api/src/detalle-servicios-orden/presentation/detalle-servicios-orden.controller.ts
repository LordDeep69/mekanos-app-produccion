import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActualizarDetalleServiciosOrdenCommand } from '../application/commands/actualizar-detalle-servicios-orden.command';
import { CrearDetalleServiciosOrdenCommand } from '../application/commands/crear-detalle-servicios-orden.command';
import { EliminarDetalleServiciosOrdenCommand } from '../application/commands/eliminar-detalle-servicios-orden.command';
import { ActualizarDetalleServiciosOrdenDto } from '../application/dto/actualizar-detalle-servicios-orden.dto';
import { CrearDetalleServiciosOrdenDto } from '../application/dto/crear-detalle-servicios-orden.dto';
import { ListarDetallePorOrdenQuery } from '../application/handlers/listar-detalle-por-orden.handler';
import { ListarDetalleServiciosOrdenQuery } from '../application/handlers/listar-detalle-servicios-orden.handler';
import { ObtenerDetalleServiciosOrdenPorIdQuery } from '../application/handlers/obtener-detalle-servicios-orden-por-id.handler';
import { VerificarDetalleServiciosOrdenQuery } from '../application/handlers/verificar-detalle-servicios-orden.handler';

@Controller('detalle-servicios-orden')
@UseGuards(JwtAuthGuard)
export class DetalleServiciosOrdenController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * GET /detalle-servicios-orden
   * Listar todos los detalles paginados
   */
  @Get()
  async listar(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    const query = new ListarDetalleServiciosOrdenQuery(page, limit);
    return this.queryBus.execute(query);
  }

  /**
   * GET /detalle-servicios-orden/orden/:idOrden
   * Listar detalles de una orden específica
   */
  @Get('orden/:idOrden')
  async listarPorOrden(
    @Param('idOrden', ParseIntPipe) idOrden: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    const query = new ListarDetallePorOrdenQuery(idOrden, page, limit);
    return this.queryBus.execute(query);
  }

  /**
   * GET /detalle-servicios-orden/:id
   * Obtener detalle por ID
   */
  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    const query = new ObtenerDetalleServiciosOrdenPorIdQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * GET /detalle-servicios-orden/verificar/:id
   * Verificar detalle por ID (incluye cancelados)
   */
  @Get('verificar/:id')
  async verificar(@Param('id', ParseIntPipe) id: number) {
    const query = new VerificarDetalleServiciosOrdenQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * POST /detalle-servicios-orden
   * Crear nuevo detalle
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(@Body() dto: CrearDetalleServiciosOrdenDto) {
    const command = new CrearDetalleServiciosOrdenCommand(dto, dto.registradoPor);
    return this.commandBus.execute(command);
  }

  /**
   * PUT /detalle-servicios-orden/:id
   * Actualizar detalle existente
   */
  @Put(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarDetalleServiciosOrdenDto,
  ) {
    const command = new ActualizarDetalleServiciosOrdenCommand(id, dto, dto.modificadoPor);
    return this.commandBus.execute(command);
  }

  /**
   * DELETE /detalle-servicios-orden/:id
   * Eliminar (soft delete - cambiar estado a CANCELADO)
   */
  @Delete(':id')
  async eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Body('modificadoPor', ParseIntPipe) modificadoPor: number,
  ) {
    const command = new EliminarDetalleServiciosOrdenCommand(id, modificadoPor);
    return this.commandBus.execute(command);
  }
}
