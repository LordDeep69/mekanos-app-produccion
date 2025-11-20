// Controller - Items Servicios Cotización

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
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateItemServicioDto } from './application/dtos/create-item-servicio.dto';
import { UpdateItemServicioDto } from './application/dtos/update-item-servicio.dto';
import { CreateItemServicioCommand } from './application/commands/create-item-servicio.command';
import { UpdateItemServicioCommand } from './application/commands/update-item-servicio.command';
import { DeleteItemServicioCommand } from './application/commands/delete-item-servicio.command';
import { GetItemsServiciosQuery } from './application/queries/get-items-servicios.query';

@Controller('cotizaciones/:idCotizacion/servicios')
@ApiTags('Items Cotización - Servicios')
export class ItemsServiciosController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Agregar servicio a cotización',
    description:
      'Crea un nuevo item servicio en una cotización BORRADOR. Recalcula automáticamente subtotal_servicios y totales.',
  })
  async create(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Body() dto: CreateItemServicioDto,
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
      dto.registrado_por,
    );

    return await this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar servicios de cotización',
    description:
      'Obtiene todos los items servicios de una cotización ordenados por orden_item.',
  })
  @ApiQuery({
    name: 'includeServicio',
    required: false,
    type: Boolean,
    description: 'Incluir datos del servicio del catálogo',
  })
  @ApiQuery({
    name: 'includeUsuario',
    required: false,
    type: Boolean,
    description: 'Incluir datos del usuario que registró',
  })
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
      'Modifica un item servicio existente. Solo cotizaciones BORRADOR. Recalcula subtotal automáticamente.',
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
    );

    return await this.commandBus.execute(command);
  }

  @Delete(':idItem')
  @ApiOperation({
    summary: 'Eliminar servicio de cotización',
    description:
      'Elimina un item servicio. Solo cotizaciones BORRADOR. Recalcula subtotales automáticamente.',
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
