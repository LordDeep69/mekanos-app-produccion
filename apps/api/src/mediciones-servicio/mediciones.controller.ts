import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from './decorators/user-id.decorator';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { UpdateMedicionDto } from './dto/update-medicion.dto';
import { CreateMedicionCommand } from './application/commands/create-medicion.command';
import { UpdateMedicionCommand } from './application/commands/update-medicion.command';
import { GetMedicionByIdQuery } from './application/queries/get-medicion-by-id.query';
import { GetMedicionesByOrdenQuery } from './application/queries/get-mediciones-by-orden.query';

/**
 * Controller mediciones de servicio con validación automática de rangos
 * FASE 4.2 - Endpoints: CREATE, UPDATE, GET by ID, GET by Orden
 */

@Controller('mediciones-servicio')
@UseGuards(JwtAuthGuard)
export class MedicionesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Crear medición con detección automática de criticidad
   * POST /api/mediciones-servicio
   */
  @Post()
  async crearMedicion(
    @Body() dto: CreateMedicionDto,
    @UserId() userId: number,
  ) {
    const command = new CreateMedicionCommand(dto, userId);
    const medicion = await this.commandBus.execute(command);

    return {
      success: true,
      message: `Medición registrada con nivel de alerta: ${medicion.nivel_alerta}`,
      data: medicion,
    };
  }

  /**
   * Actualizar medición con recálculo automático de rangos
   * PUT /api/mediciones-servicio/:id
   */
  @Put(':id')
  async actualizarMedicion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicionDto,
    @UserId() userId: number,
  ) {
    dto.id_medicion = id;
    const command = new UpdateMedicionCommand(dto, userId);
    const medicion = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Medición actualizada correctamente',
      data: medicion,
    };
  }

  /**
   * Obtener medición por ID con relaciones completas
   * GET /api/mediciones-servicio/:id
   */
  @Get(':id')
  async obtenerMedicion(@Param('id', ParseIntPipe) id: number) {
    const query = new GetMedicionByIdQuery(id);
    const medicion = await this.queryBus.execute(query);

    return {
      success: true,
      data: medicion,
    };
  }

  /**
   * Listar mediciones por orden de servicio
   * GET /api/mediciones-servicio/orden/:ordenId
   */
  @Get('orden/:ordenId')
  async listarMedicionesPorOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ) {
    const query = new GetMedicionesByOrdenQuery(ordenId);
    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: `Se encontraron ${result.total} mediciones para la orden ${ordenId}`,
      data: result.mediciones,
      total: result.total,
    };
  }
}
