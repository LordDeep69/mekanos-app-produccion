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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarTipoEquipoCommand } from './application/commands/actualizar-tipo-equipo.command';
import { CrearTipoEquipoCommand } from './application/commands/crear-tipo-equipo.command';
import { DesactivarTipoEquipoCommand } from './application/commands/desactivar-tipo-equipo.command';
import { GetTipoEquipoByIdQuery } from './application/queries/get-tipo-equipo-by-id.query';
import { GetTiposEquipoQuery } from './application/queries/get-tipos-equipo.query';
import { CreateTiposEquipoDto } from './dto/create-tipos-equipo.dto';
import { UpdateTiposEquipoDto } from './dto/update-tipos-equipo.dto';

@Controller('tipos-equipo')
// @Public() // DESHABILITADO - Se requiere JWT para creado_por
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposEquipoController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateTiposEquipoDto,
    @CurrentUser('id') userId: number,
  ) {
    const command = new CrearTipoEquipoCommand(
      dto.codigo_tipo,
      dto.nombre_tipo,
      dto.categoria,
      dto.formato_ficha_tecnica,
      dto.descripcion,
      dto.tiene_motor,
      dto.tiene_generador,
      dto.tiene_bomba,
      dto.requiere_horometro,
      dto.permite_mantenimiento_tipo_a,
      dto.permite_mantenimiento_tipo_b,
      dto.intervalo_tipo_a_dias,
      dto.intervalo_tipo_a_horas,
      dto.intervalo_tipo_b_dias,
      dto.intervalo_tipo_b_horas,
      dto.criterio_intervalo,
      dto.formato_mantenimiento_tipo_a,
      dto.formato_mantenimiento_tipo_b,
      dto.orden,
      dto.metadata,
      userId,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('categoria') categoria?: string,
    @Query('activo') activoStr?: string,
    @Query('disponible') disponibleStr?: string,
    @Query('tiene_motor') tieneMotorStr?: string,
    @Query('tiene_generador') tieneGeneradorStr?: string,
    @Query('tiene_bomba') tieneBombaStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const activo = activoStr ? activoStr === 'true' : undefined;
    const disponible = disponibleStr ? disponibleStr === 'true' : undefined;
    const tiene_motor = tieneMotorStr ? tieneMotorStr === 'true' : undefined;
    const tiene_generador = tieneGeneradorStr ? tieneGeneradorStr === 'true' : undefined;
    const tiene_bomba = tieneBombaStr ? tieneBombaStr === 'true' : undefined;

    const query = new GetTiposEquipoQuery(
      page,
      limit,
      categoria,
      activo,
      disponible,
      tiene_motor,
      tiene_generador,
      tiene_bomba,
    );
    return this.queryBus.execute(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetTipoEquipoByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTiposEquipoDto,
  ) {
    const command = new ActualizarTipoEquipoCommand(
      id,
      dto.nombre_tipo,
      dto.descripcion,
      dto.tiene_motor,
      dto.tiene_generador,
      dto.tiene_bomba,
      dto.requiere_horometro,
      dto.permite_mantenimiento_tipo_a,
      dto.permite_mantenimiento_tipo_b,
      dto.intervalo_tipo_a_dias,
      dto.intervalo_tipo_a_horas,
      dto.intervalo_tipo_b_dias,
      dto.intervalo_tipo_b_horas,
      dto.criterio_intervalo,
      dto.formato_ficha_tecnica,
      dto.formato_mantenimiento_tipo_a,
      dto.formato_mantenimiento_tipo_b,
      dto.orden,
      dto.metadata,
      dto.disponible,
    );
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DesactivarTipoEquipoCommand(id);
    return this.commandBus.execute(command);
  }
}

