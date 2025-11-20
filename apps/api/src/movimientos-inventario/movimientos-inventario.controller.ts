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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { RegistrarMovimientoCommand } from './commands/registrar-movimiento.command';
import { RegistrarTrasladoCommand } from './commands/registrar-traslado.command';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { RegistrarTrasladoDto } from './dto/registrar-traslado.dto';
import { GetKardexQuery } from './queries/get-kardex.query';
import { GetMovimientosQuery } from './queries/get-movimientos.query';
import { GetStockActualQuery } from './queries/get-stock-actual.query';

@Controller('movimientos-inventario')
@UseGuards(JwtAuthGuard)
export class MovimientosInventarioController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async registrarMovimiento(
    @Body() dto: RegistrarMovimientoDto,
    @UserId() userId: number,
  ) {
    const command = new RegistrarMovimientoCommand(
      dto.tipo_movimiento,
      dto.origen_movimiento,
      dto.id_componente,
      dto.cantidad,
      userId,
      dto.id_ubicacion,
      dto.id_lote,
      dto.id_orden_servicio,
      dto.id_orden_compra,
      dto.id_remision,
      dto.observaciones,
    );

    const movimiento = await this.commandBus.execute(command);
    return {
      success: true,
      message: 'Movimiento registrado exitosamente',
      data: movimiento,
    };
  }

  @Post('traslado')
  async registrarTraslado(
    @Body() dto: RegistrarTrasladoDto,
    @UserId() userId: number,
  ) {
    const command = new RegistrarTrasladoCommand(
      dto.id_componente,
      dto.cantidad,
      dto.id_ubicacion_origen,
      dto.id_ubicacion_destino,
      userId,
      dto.observaciones,
    );

    const traslado = await this.commandBus.execute(command);
    return {
      success: true,
      message: 'Traslado registrado exitosamente',
      data: traslado,
    };
  }

  @Get()
  async findAll(
    @Query('id_componente')
    id_componente?: number,
    @Query('tipo_movimiento') tipo_movimiento?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('id_orden_servicio')
    id_orden_servicio?: number,
    @Query('id_orden_compra')
    id_orden_compra?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    const query = new GetMovimientosQuery({
      id_componente,
      tipo_movimiento,
      fecha_desde: fecha_desde ? new Date(fecha_desde) : undefined,
      fecha_hasta: fecha_hasta ? new Date(fecha_hasta) : undefined,
      id_orden_servicio,
      id_orden_compra,
      skip,
      take,
    });

    const result = await this.queryBus.execute(query);
    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: page || 1,
        limit: limit || 50,
        totalPages: Math.ceil(result.total / (limit || 50)),
      },
    };
  }

  @Get('kardex/:idComponente')
  async getKardex(
    @Param('idComponente', ParseIntPipe) idComponente: number,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('tipo_movimiento') tipo_movimiento?: string,
  ) {
    const query = new GetKardexQuery(idComponente, {
      fecha_desde: fecha_desde ? new Date(fecha_desde) : undefined,
      fecha_hasta: fecha_hasta ? new Date(fecha_hasta) : undefined,
      tipo_movimiento,
    });

    const kardex = await this.queryBus.execute(query);
    return {
      success: true,
      data: kardex,
    };
  }

  @Get('stock/:idComponente')
  async getStockActual(@Param('idComponente', ParseIntPipe) idComponente: number) {
    const query = new GetStockActualQuery(idComponente);
    const result = await this.queryBus.execute(query);
    return {
      success: true,
      data: result,
    };
  }
}
