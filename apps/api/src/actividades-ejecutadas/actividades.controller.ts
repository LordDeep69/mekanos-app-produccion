import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from './decorators/user-id.decorator';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';
import { CreateActividadCommand } from './application/commands/create-actividad.command';
import { UpdateActividadCommand } from './application/commands/update-actividad.command';
import { GetActividadesByOrdenQuery } from './application/queries/get-actividades-by-orden.query';
import { GetActividadByIdQuery } from './application/queries/get-actividad-by-id.query';

/**
 * Controller de actividades ejecutadas
 * FASE 4.1 - Módulos Relacionados a Órdenes
 */

@Controller('actividades-ejecutadas')
@UseGuards(JwtAuthGuard)
export class ActividadesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /actividades-ejecutadas
   * Crear actividad ejecutada (catálogo o manual)
   */
  @Post()
  async create(
    @Body() dto: CreateActividadDto,
    @UserId() userId: number,
  ) {
    const command = new CreateActividadCommand(dto, userId);
    const actividad = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Actividad registrada exitosamente',
      data: actividad,
    };
  }

  /**
   * PUT /actividades-ejecutadas/:id
   * Actualizar actividad ejecutada
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<UpdateActividadDto, 'id_actividad_ejecutada'>,
    @UserId() userId: number,
  ) {
    const command = new UpdateActividadCommand(
      { ...dto, id_actividad_ejecutada: id },
      userId,
    );
    const actividad = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Actividad actualizada exitosamente',
      data: actividad,
    };
  }

  /**
   * GET /actividades-ejecutadas/orden/:ordenId
   * Listar actividades de una orden
   */
  @Get('orden/:ordenId')
  async findByOrden(@Param('ordenId', ParseIntPipe) ordenId: number) {
    const query = new GetActividadesByOrdenQuery(ordenId);
    const actividades = await this.queryBus.execute(query);

    return {
      success: true,
      data: actividades,
      total: actividades.length,
    };
  }

  /**
   * GET /actividades-ejecutadas/:id
   * Obtener actividad por ID
   */
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const query = new GetActividadByIdQuery(id);
    const actividad = await this.queryBus.execute(query);

    return {
      success: true,
      data: actividad,
    };
  }
}
