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
import { UserId } from '../common/decorators/user-id.decorator';
import { CancelarRemisionCommand } from './commands/cancelar-remision.command';
import { CrearRemisionCommand } from './commands/crear-remision.command';
import { EntregarRemisionCommand } from './commands/entregar-remision.command';
import { CancelarRemisionDto } from './dto/cancelar-remision.dto';
import { CrearRemisionDto } from './dto/crear-remision.dto';
import { GetRemisionByIdQuery } from './queries/get-remision-by-id.query';
import { GetRemisionesQuery } from './queries/get-remisiones.query';

@Controller('remisiones')
@UseGuards(JwtAuthGuard)
export class RemisionesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async crearRemision(
    @Body() dto: CrearRemisionDto,
    @UserId() userId: number,
  ) {
    const command = new CrearRemisionCommand(
      dto.id_orden_servicio,
      dto.id_tecnico_receptor,
      dto.observaciones,
      userId,
      dto.items,
    );

    const remision = await this.commandBus.execute(command);
    return {
      success: true,
      message: 'Remisión creada exitosamente',
      data: remision,
    };
  }

  @Put(':id/entregar')
  async entregarRemision(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ) {
    const command = new EntregarRemisionCommand(id, userId);
    const remision = await this.commandBus.execute(command);
    return {
      success: true,
      message: 'Remisión entregada exitosamente',
      data: remision,
    };
  }

  @Put(':id/cancelar')
  async cancelarRemision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarRemisionDto,
    @UserId() userId: number,
  ) {
    const command = new CancelarRemisionCommand(
      id,
      dto.motivo_cancelacion,
      userId,
    );

    const remision = await this.commandBus.execute(command);
    return {
      success: true,
      message: 'Remisión cancelada exitosamente',
      data: remision,
    };
  }

  @Get()
  async findAll(
    @Query('id_tecnico_receptor')
    id_tecnico_receptor?: number,
    @Query('id_orden_servicio')
    id_orden_servicio?: number,
    @Query('estado') estado?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    const query = new GetRemisionesQuery({
      id_tecnico_receptor,
      id_orden_servicio,
      estado,
      fecha_desde: fecha_desde ? new Date(fecha_desde) : undefined,
      fecha_hasta: fecha_hasta ? new Date(fecha_hasta) : undefined,
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

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetRemisionByIdQuery(id);
    const remision = await this.queryBus.execute(query);
    return {
      success: true,
      data: remision,
    };
  }
}
