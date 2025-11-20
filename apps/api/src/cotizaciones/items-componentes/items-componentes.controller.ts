// Controller - Items Componentes Cotización

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
import { CreateItemComponenteDto } from './application/dtos/create-item-componente.dto';
import { UpdateItemComponenteDto } from './application/dtos/update-item-componente.dto';
import { CreateItemComponenteCommand } from './application/commands/create-item-componente.command';
import { UpdateItemComponenteCommand } from './application/commands/update-item-componente.command';
import { DeleteItemComponenteCommand } from './application/commands/delete-item-componente.command';
import { GetItemsComponentesQuery } from './application/queries/get-items-componentes.query';

@Controller('cotizaciones/:idCotizacion/componentes')
@ApiTags('Items Cotización - Componentes')
export class ItemsComponentesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Agregar componente a cotización',
    description:
      'Crea un nuevo item componente en una cotización BORRADOR. Recalcula automáticamente subtotal_componentes y totales.',
  })
  async create(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Body() dto: CreateItemComponenteDto,
  ) {
    const command = new CreateItemComponenteCommand(
      idCotizacion,
      dto.id_componente,
      dto.id_tipo_componente,
      dto.descripcion,
      dto.referencia_manual,
      dto.marca_manual,
      dto.cantidad || 1,
      dto.unidad,
      dto.precio_unitario,
      dto.descuento_porcentaje,
      dto.garantia_meses,
      dto.observaciones_garantia,
      dto.observaciones,
      dto.orden_item,
      dto.registrado_por,
    );

    return await this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar componentes de cotización',
    description:
      'Obtiene todos los items componentes de una cotización ordenados por orden_item.',
  })
  @ApiQuery({
    name: 'includeComponente',
    required: false,
    type: Boolean,
    description: 'Incluir datos del componente del catálogo',
  })
  @ApiQuery({
    name: 'includeTipoComponente',
    required: false,
    type: Boolean,
    description: 'Incluir datos del tipo de componente',
  })
  @ApiQuery({
    name: 'includeUsuario',
    required: false,
    type: Boolean,
    description: 'Incluir datos del usuario que registró',
  })
  async getAll(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Query('includeComponente') includeComponente?: boolean,
    @Query('includeTipoComponente') includeTipoComponente?: boolean,
    @Query('includeUsuario') includeUsuario?: boolean,
  ) {
    const query = new GetItemsComponentesQuery(
      idCotizacion,
      includeComponente,
      includeTipoComponente,
      includeUsuario,
    );

    return await this.queryBus.execute(query);
  }

  @Put(':idItem')
  @ApiOperation({
    summary: 'Actualizar componente de cotización',
    description:
      'Modifica un item componente existente. Solo cotizaciones BORRADOR. Recalcula subtotal automáticamente.',
  })
  async update(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Param('idItem', ParseIntPipe) idItem: number,
    @Body() dto: UpdateItemComponenteDto,
  ) {
    const command = new UpdateItemComponenteCommand(
      idItem,
      idCotizacion,
      dto.descripcion,
      dto.referencia_manual,
      dto.marca_manual,
      dto.cantidad,
      dto.unidad,
      dto.precio_unitario,
      dto.descuento_porcentaje,
      dto.garantia_meses,
      dto.observaciones_garantia,
      dto.observaciones,
      dto.orden_item,
    );

    return await this.commandBus.execute(command);
  }

  @Delete(':idItem')
  @ApiOperation({
    summary: 'Eliminar componente de cotización',
    description:
      'Elimina un item componente. Solo cotizaciones BORRADOR. Recalcula subtotales automáticamente.',
  })
  async delete(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Param('idItem', ParseIntPipe) idItem: number,
  ) {
    const command = new DeleteItemComponenteCommand(idItem, idCotizacion);
    await this.commandBus.execute(command);
    return { message: 'Item componente eliminado exitosamente' };
  }
}
