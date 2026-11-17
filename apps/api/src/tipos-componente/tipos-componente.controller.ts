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
import { Permisos } from '../auth/decorators/permisos.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarTipoComponenteCommand } from './application/commands/actualizar-tipo-componente.command';
import { CrearTipoComponenteCommand } from './application/commands/crear-tipo-componente.command';
import { DesactivarTipoComponenteCommand } from './application/commands/desactivar-tipo-componente.command';
import { GetTipoComponenteByIdQuery } from './application/queries/get-tipo-componente-by-id.query';
import { GetTiposComponenteQuery } from './application/queries/get-tipos-componente.query';
import { CreateTiposComponenteDto } from './dto/create-tipos-componente.dto';
import { FiltrosTiposComponenteDto } from './dto/filtros-tipos-componente.dto';
import { UpdateTiposComponenteDto } from './dto/update-tipos-componente.dto';

@Controller('tipos-componente')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
export class TiposComponenteController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  create(@Body() createDto: CreateTiposComponenteDto, @CurrentUser('id') userId: number) {
    const command = new CrearTipoComponenteCommand(
      createDto.codigo_tipo,
      createDto.nombre_componente,
      createDto.categoria,
      createDto.aplica_a,
      createDto.subcategoria,
      createDto.es_consumible,
      createDto.es_inventariable,
      createDto.descripcion,
      userId,
      createDto.aplica_todos_tipos,
      createDto.tipos_equipo_ids,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  findAll(@Query() filtros: FiltrosTiposComponenteDto) {
    const query = new GetTiposComponenteQuery(
      filtros.categoria,
      filtros.aplica_a,
      filtros.id_tipo_equipo,
      filtros.es_consumible,
      filtros.es_inventariable,
      filtros.activo,
      filtros.page,
      filtros.limit,
    );
    return this.queryBus.execute(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetTipoComponenteByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTiposComponenteDto) {
    const command = new ActualizarTipoComponenteCommand(
      id,
      updateDto.codigo_tipo,
      updateDto.nombre_componente,
      updateDto.categoria,
      updateDto.subcategoria,
      updateDto.es_consumible,
      updateDto.es_inventariable,
      updateDto.aplica_a,
      updateDto.descripcion,
      updateDto.activo,
      updateDto.modificado_por,
      updateDto.aplica_todos_tipos,
      updateDto.tipos_equipo_ids,
    );
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DesactivarTipoComponenteCommand(id);
    return this.commandBus.execute(command);
  }
}
