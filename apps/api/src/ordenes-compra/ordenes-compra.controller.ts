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

@Controller('ordenes-compra')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdenesCompraController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /api/ordenes-compra
   * Crear orden compra con items (estado: BORRADOR)
   */
  @Post()
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
   * Query params: id_proveedor, estado, fecha_desde, fecha_hasta, numero_orden, page, limit
   */
  @Get()
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

