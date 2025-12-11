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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { CancelarOrdenCompraCommand } from './commands/cancelar-orden-compra.command';
import { CrearOrdenCompraCommand } from './commands/crear-orden-compra.command';
import { EnviarOrdenCompraCommand } from './commands/enviar-orden-compra.command';
import { CancelarOrdenCompraDto } from './dto/cancelar-orden-compra.dto';
import { CrearOrdenCompraDto } from './dto/crear-orden-compra.dto';
import { GetOrdenCompraByIdQuery } from './queries/get-orden-compra-by-id.query';
import { GetOrdenesActivasProveedorQuery } from './queries/get-ordenes-activas-proveedor.query';
import { GetOrdenesCompraQuery } from './queries/get-ordenes-compra.query';

@ApiTags('FASE 5 - Órdenes de Compra')
@ApiBearerAuth('JWT-auth')
@Controller('ordenes-compra')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdenesCompraController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  /**
   * POST /api/ordenes-compra
   * Crear orden compra con items (estado: BORRADOR)
   */
  @Post()
  @ApiOperation({
    summary: 'Crear orden de compra',
    description: 'Crea una nueva orden de compra a proveedor con sus items. Estado inicial: BORRADOR.',
  })
  @ApiResponse({ status: 201, description: 'Orden de compra creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async crearOrdenCompra(@Body() dto: CrearOrdenCompraDto, @UserId() userId: number) {
    const command = new CrearOrdenCompraCommand(
      dto.numero_orden_compra,
      dto.id_proveedor,
      dto.fecha_necesidad,
      dto.observaciones,
      userId,
      dto.items,
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden compra creada exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes-compra/:id/enviar
   * Enviar orden compra: BORRADOR → ENVIADA
   */
  @Put(':id/enviar')
  @ApiOperation({
    summary: 'Enviar orden de compra al proveedor',
    description: 'Cambia estado de BORRADOR a ENVIADA. Genera PDF y envía email al proveedor.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de compra', example: 1 })
  @ApiResponse({ status: 200, description: 'Orden enviada exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async enviarOrdenCompra(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    const command = new EnviarOrdenCompraCommand(id, userId);
    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden compra enviada al proveedor exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes-compra/:id/cancelar
   * Cancelar orden compra
   */
  @Put(':id/cancelar')
  @ApiOperation({
    summary: 'Cancelar orden de compra',
    description: 'Cancela una orden de compra con motivo de cancelación.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de compra', example: 1 })
  @ApiResponse({ status: 200, description: 'Orden cancelada exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async cancelarOrdenCompra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarOrdenCompraDto,
    @UserId() userId: number,
  ) {
    const command = new CancelarOrdenCompraCommand(id, dto.motivo_cancelacion, userId);
    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden compra cancelada exitosamente',
      data: result,
    };
  }

  /**
   * GET /api/ordenes-compra
   * Listar órdenes compra con filtros
   */
  @Get()
  @ApiOperation({
    summary: 'Listar órdenes de compra',
    description: 'Obtiene lista de órdenes de compra con filtros opcionales.',
  })
  @ApiQuery({ name: 'id_proveedor', required: false, description: 'Filtrar por proveedor' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado (BORRADOR, ENVIADA, PARCIAL, COMPLETADA, CANCELADA)' })
  @ApiQuery({ name: 'fecha_desde', required: false, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fecha_hasta', required: false, description: 'Fecha fin (YYYY-MM-DD)' })
  @ApiQuery({ name: 'numero_orden', required: false, description: 'Buscar por número de orden' })
  @ApiQuery({ name: 'page', required: false, description: 'Página actual', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items por página', example: 10 })
  @ApiResponse({ status: 200, description: 'Lista de órdenes de compra' })
  async getOrdenesCompra(
    @Query('id_proveedor') idProveedorStr?: string,
    @Query('estado') estado?: string,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
    @Query('numero_orden') numeroOrden?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    // Parse manual de query params opcionales
    const idProveedor = idProveedorStr ? parseInt(idProveedorStr, 10) : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    const query = new GetOrdenesCompraQuery(
      idProveedor,
      estado,
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
      numeroOrden,
      page,
      limit,
    );

    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Órdenes compra obtenidas exitosamente',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * GET /api/ordenes-compra/:id
   * Obtener orden compra completa por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener orden de compra por ID',
    description: 'Obtiene el detalle completo de una orden de compra incluyendo items y proveedor.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de compra', example: 1 })
  @ApiResponse({ status: 200, description: 'Detalle de la orden de compra' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async getOrdenCompraById(@Param('id', ParseIntPipe) id: number) {
    const query = new GetOrdenCompraByIdQuery(id);
    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Orden compra obtenida exitosamente',
      data: result,
    };
  }

  /**
   * GET /api/ordenes-compra/proveedor/:id/activas
   * Obtener órdenes activas (ENVIADA, PARCIAL) de un proveedor
   */
  @Get('proveedor/:id/activas')
  @ApiOperation({
    summary: 'Obtener órdenes activas de un proveedor',
    description: 'Lista órdenes de compra en estado ENVIADA o PARCIAL para un proveedor específico.',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor', example: 1 })
  @ApiResponse({ status: 200, description: 'Lista de órdenes activas del proveedor' })
  async getOrdenesActivasProveedor(@Param('id', ParseIntPipe) idProveedor: number) {
    const query = new GetOrdenesActivasProveedorQuery(idProveedor);
    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Órdenes activas obtenidas exitosamente',
      data: result,
    };
  }
}

