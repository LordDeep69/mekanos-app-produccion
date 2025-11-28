import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMedicionCommand } from './application/commands/create-medicion.command';
import { DeleteMedicionCommand } from './application/commands/delete-medicion.command';
import { UpdateMedicionCommand } from './application/commands/update-medicion.command';
import { GetAllMedicionesQuery } from './application/queries/get-all-mediciones.query';
import { GetMedicionByIdQuery } from './application/queries/get-medicion-by-id.query';
import { GetMedicionesByOrdenQuery } from './application/queries/get-mediciones-by-orden.query';
import { UserId } from './decorators/user-id.decorator';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { ResponseMedicionDto } from './dto/response-medicion.dto';
import { UpdateMedicionDto } from './dto/update-medicion.dto';

/**
 * Controller mediciones de servicio - FASE 3 Refactorizado camelCase
 * 6 endpoints: GET list, POST create, GET by orden, GET by ID, PUT update, DELETE
 */

@ApiTags('Mediciones Servicio')
@ApiBearerAuth()
@Controller('mediciones-servicio')
@UseGuards(JwtAuthGuard)
export class MedicionesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * GET /api/mediciones-servicio - Listar todas
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las mediciones' })
  async listarMediciones(): Promise<ResponseMedicionDto[]> {
    const query = new GetAllMedicionesQuery();
    return await this.queryBus.execute(query);
  }

  /**
   * POST /api/mediciones-servicio - Crear con nivel_alerta automático
   */
  @Post()
  @ApiOperation({ summary: 'Crear medición con detección automática criticidad' })
  async crearMedicion(
    @Body() dto: CreateMedicionDto,
    @UserId() userId: number,
  ): Promise<ResponseMedicionDto> {
    const command = new CreateMedicionCommand(dto, userId);
    return await this.commandBus.execute(command);
  }

  /**
   * GET /api/mediciones-servicio/orden/:ordenId - Por orden (ANTES de :id)
   */
  @Get('orden/:ordenId')
  @ApiOperation({ summary: 'Listar mediciones por orden de servicio' })
  async listarMedicionesPorOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ): Promise<ResponseMedicionDto[]> {
    const query = new GetMedicionesByOrdenQuery(ordenId);
    return await this.queryBus.execute(query);
  }

  /**
   * GET /api/mediciones-servicio/:id - Por ID con includes
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener medición por ID con relaciones' })
  async obtenerMedicion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseMedicionDto> {
    const query = new GetMedicionByIdQuery(id);
    return await this.queryBus.execute(query);
  }

  /**
   * PUT /api/mediciones-servicio/:id - Actualizar con recálculo
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar medición con recálculo automático nivel_alerta' })
  async actualizarMedicion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicionDto,
    @UserId() userId: number,
  ): Promise<ResponseMedicionDto> {
    const command = new UpdateMedicionCommand(id, dto, userId);
    return await this.commandBus.execute(command);
  }

  /**
   * DELETE /api/mediciones-servicio/:id - Eliminación física
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar medición (físico - NO soft delete)' })
  async eliminarMedicion(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    const command = new DeleteMedicionCommand(id);
    return await this.commandBus.execute(command);
  }
}
