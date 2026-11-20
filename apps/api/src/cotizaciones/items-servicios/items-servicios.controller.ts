// Controller - Items Servicios Cotización (JWT Protected + EAM-CPQ)

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateItemServicioDto } from './application/dtos/create-item-servicio.dto';
import { UpdateItemServicioDto } from './application/dtos/update-item-servicio.dto';
import { CreateItemServicioCommand } from './application/commands/create-item-servicio.command';
import { UpdateItemServicioCommand } from './application/commands/update-item-servicio.command';
import { DeleteItemServicioCommand } from './application/commands/delete-item-servicio.command';
import { GetItemsServiciosQuery } from './application/queries/get-items-servicios.query';

@ApiTags('Items Cotización - Servicios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones/:idCotizacion/servicios')
export class ItemsServiciosController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Agregar servicio a cotización',
    description:
      'Crea un nuevo item servicio (catálogo o personalizado) en una cotización BORRADOR. Recalcula totales, AIU, IVA y margen.',
  })
  async create(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Body() dto: CreateItemServicioDto,
    @CurrentUser('id') userId?: number,
  ) {
    const command = new CreateItemServicioCommand(
      idCotizacion,
      dto.id_servicio,
      dto.cantidad || 1,
      dto.unidad,
      dto.precio_unitario,
      dto.descuento_porcentaje,
      dto.descripcion_personalizada,
      dto.observaciones,
      dto.justificacion_precio,
      dto.orden_item,
      userId ?? dto.registrado_por,
      dto.id_equipo,
      dto.costo_unitario,
      dto.es_opcional,
      dto.iva_aplicable,
      dto.seccion_titulo,
    );

    return await this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar servicios de cotización',
    description:
      'Obtiene todos los items servicios de una cotización ordenados por orden_item.',
  })
  @ApiQuery({ name: 'includeServicio', required: false, type: Boolean })
  @ApiQuery({ name: 'includeUsuario', required: false, type: Boolean })
  async getAll(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Query('includeServicio') includeServicio?: boolean,
    @Query('includeUsuario') includeUsuario?: boolean,
  ) {
    const query = new GetItemsServiciosQuery(
      idCotizacion,
      includeServicio,
      includeUsuario,
    );

    return await this.queryBus.execute(query);
  }

  @Put(':idItem')
  @ApiOperation({
    summary: 'Actualizar servicio de cotización',
    description:
      'Modifica un item servicio existente. Solo cotizaciones BORRADOR. Recalcula totales automáticamente.',
  })
  async update(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Param('idItem', ParseIntPipe) idItem: number,
    @Body() dto: UpdateItemServicioDto,
  ) {
    const command = new UpdateItemServicioCommand(
      idItem,
      idCotizacion,
      dto.cantidad,
      dto.unidad,
      dto.precio_unitario,
      dto.descuento_porcentaje,
      dto.descripcion_personalizada,
      dto.observaciones,
      dto.justificacion_precio,
      dto.orden_item,
      dto.id_equipo,
      dto.costo_unitario,
      dto.es_opcional,
      dto.iva_aplicable,
      dto.seccion_titulo,
    );

    return await this.commandBus.execute(command);
  }

  @Delete(':idItem')
  @ApiOperation({
    summary: 'Eliminar servicio de cotización',
    description:
      'Elimina un item servicio. Solo cotizaciones BORRADOR. Recalcula totales automáticamente.',
  })
  async delete(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Param('idItem', ParseIntPipe) idItem: number,
  ) {
    const command = new DeleteItemServicioCommand(idItem, idCotizacion);
    await this.commandBus.execute(command);
    return { message: 'Item servicio eliminado exitosamente' };
  }
}
