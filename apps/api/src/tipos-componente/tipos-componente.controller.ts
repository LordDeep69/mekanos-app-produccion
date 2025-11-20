import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseBoolPipe,
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
import { ActualizarTipoComponenteCommand } from './application/commands/actualizar-tipo-componente.command';
import { CrearTipoComponenteCommand } from './application/commands/crear-tipo-componente.command';
import { DesactivarTipoComponenteCommand } from './application/commands/desactivar-tipo-componente.command';
import { GetTipoComponenteByIdQuery } from './application/queries/get-tipo-componente-by-id.query';
import { GetTiposComponenteQuery } from './application/queries/get-tipos-componente.query';
import { CreateTiposComponenteDto } from './dto/create-tipos-componente.dto';
import { UpdateTiposComponenteDto } from './dto/update-tipos-componente.dto';

@Controller('tipos-componente')
// @Public() // DESHABILITADO - Se require JWT para creado_por
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposComponenteController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @Body() createDto: CreateTiposComponenteDto,
    @CurrentUser('id') userId: number,
  ) {
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
    );
    return this.commandBus.execute(command);
  }

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('categoria') categoria?: string,
    @Query('aplica_a') aplica_a?: string,
    @Query('es_consumible', new ParseBoolPipe({ optional: true }))
    es_consumible?: boolean,
    @Query('es_inventariable', new ParseBoolPipe({ optional: true }))
    es_inventariable?: boolean,
    @Query('activo', new ParseBoolPipe({ optional: true })) activo?: boolean,
  ) {
    const query = new GetTiposComponenteQuery(
      categoria,
      aplica_a,
      es_consumible,
      es_inventariable,
      activo,
      page,
      limit,
    );
    return this.queryBus.execute(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetTipoComponenteByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTiposComponenteDto,
  ) {
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
    );
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DesactivarTipoComponenteCommand(id);
    return this.commandBus.execute(command);
  }
}
