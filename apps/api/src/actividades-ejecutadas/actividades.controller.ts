import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateActividadCommand } from './application/commands/create-actividad.command';
import { DeleteActividadCommand } from './application/commands/delete-actividad.command';
import { UpdateActividadCommand } from './application/commands/update-actividad.command';
import { GetActividadByIdQuery } from './application/queries/get-actividad-by-id.query';
import { GetActividadesByOrdenQuery } from './application/queries/get-actividades-by-orden.query';
import { GetAllActividadesQuery } from './application/queries/get-all-actividades.query';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@ApiTags('Actividades Ejecutadas')
@ApiBearerAuth()
@Controller('actividades-ejecutadas')
@UseGuards(JwtAuthGuard)
export class ActividadesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear actividad ejecutada (modo catálogo o manual)' })
  async create(@Body() dto: CreateActividadDto) {
    const command = new CreateActividadCommand(
      dto.idOrdenServicio,
      dto.idActividadCatalogo,
      dto.descripcionManual,
      dto.sistema,
      dto.ordenSecuencia,
      dto.estado,
      dto.observaciones,
      dto.ejecutada,
      dto.ejecutadaPor,
      dto.tiempoEjecucionMinutos,
      dto.requiereEvidencia,
      dto.evidenciaCapturada,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las actividades ejecutadas' })
  async findAll() {
    const query = new GetAllActividadesQuery();
    return this.queryBus.execute(query);
  }

  @Get('orden/:ordenId')
  @ApiOperation({ summary: 'Obtener actividades por orden de servicio' })
  async findByOrden(@Param('ordenId', ParseIntPipe) ordenId: number) {
    const query = new GetActividadesByOrdenQuery(ordenId);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener actividad por ID (con relaciones completas)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetActividadByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar actividad ejecutada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActividadDto,
  ) {
    const command = new UpdateActividadCommand(
      id,
      dto.idOrdenServicio,
      dto.idActividadCatalogo,
      dto.descripcionManual,
      dto.sistema,
      dto.ordenSecuencia,
      dto.estado,
      dto.observaciones,
      dto.ejecutada,
      dto.ejecutadaPor,
      dto.tiempoEjecucionMinutos,
      dto.requiereEvidencia,
      dto.evidenciaCapturada,
    );
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar actividad (soft delete: ejecutada = false)' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const command = new DeleteActividadCommand(id);
    await this.commandBus.execute(command);
    return { message: 'Actividad eliminada exitosamente' };
  }
}

