// Controller - Items Componentes Cotización (JWT Protected + EAM-CPQ)

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
import { CreateItemComponenteDto } from './application/dtos/create-item-componente.dto';
import { UpdateItemComponenteDto } from './application/dtos/update-item-componente.dto';
import { CreateItemComponenteCommand } from './application/commands/create-item-componente.command';
import { UpdateItemComponenteCommand } from './application/commands/update-item-componente.command';
import { DeleteItemComponenteCommand } from './application/commands/delete-item-componente.command';
import { GetItemsComponentesQuery } from './application/queries/get-items-componentes.query';

@ApiTags('Items Cotización - Componentes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones/:idCotizacion/componentes')
export class ItemsComponentesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Agregar componente/repuesto a cotización',
    description:
      'Crea un nuevo item componente (catálogo WMS o manual) en una cotización BORRADOR. Recalcula automáticamente totales, AIU, IVA y rentabilidad.',
  })
  async create(
    @Param('idCotizacion', ParseIntPipe) idCotizacion: number,
    @Body() dto: CreateItemComponenteDto,
    @CurrentUser('id') userId?: number,
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
    summary: 'Listar componentes de cotización',
    description:
      'Obtiene todos los items componentes de una cotización ordenados por orden_item.',
  })
  @ApiQuery({ name: 'includeComponente', required: false, type: Boolean })
  @ApiQuery({ name: 'includeTipoComponente', required: false, type: Boolean })
  @ApiQuery({ name: 'includeUsuario', required: false, type: Boolean })
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
      'Modifica un item componente existente. Solo cotizaciones BORRADOR. Recalcula totales automáticamente.',
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
      dto.id_equipo,
      dto.id_tipo_componente,
      dto.costo_unitario,
      dto.es_opcional,
      dto.iva_aplicable,
      dto.seccion_titulo,
    );

    return await this.commandBus.execute(command);
  }

  @Delete(':idItem')
  @ApiOperation({
    summary: 'Eliminar componente de cotización',
    description:
      'Elimina un item componente. Solo cotizaciones BORRADOR. Recalcula totales automáticamente.',
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
