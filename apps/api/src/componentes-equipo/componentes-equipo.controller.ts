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
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Public } from '../auth/decorators/public.decorator';
import { ActualizarComponenteEquipoCommand } from './application/commands/actualizar-componente-equipo.command';
import { CrearComponenteEquipoCommand } from './application/commands/crear-componente-equipo.command';
import { DesactivarComponenteEquipoCommand } from './application/commands/desactivar-componente-equipo.command';
import { GetComponenteEquipoByIdQuery } from './application/queries/get-componente-equipo-by-id.query';
import { GetComponentesEquipoQuery } from './application/queries/get-componentes-equipo.query';
import { GetComponentesPorEquipoQuery } from './application/queries/get-componentes-por-equipo.query';
import { CreateComponenteEquipoDto } from './dto/create-componente-equipo.dto';
import { UpdateComponenteEquipoDto } from './dto/update-componente-equipo.dto';

@Controller('componentes-equipo')
@Public()
export class ComponentesEquipoController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateComponenteEquipoDto) {
    const command = new CrearComponenteEquipoCommand(dto);
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('id_equipo') idEquipo?: string,
    @Query('id_tipo_componente') idTipo?: string,
    @Query('activo') activo?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    const filtros: any = {};
    if (idEquipo) filtros.id_equipo = parseInt(idEquipo, 10);
    if (idTipo) filtros.id_tipo_componente = parseInt(idTipo, 10);
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (skip) filtros.skip = parseInt(skip, 10);
    if (limit) filtros.limit = parseInt(limit, 10);

    const query = new GetComponentesEquipoQuery(filtros);
    return this.queryBus.execute(query);
  }

  @Get('equipo/:idEquipo')
  async findByEquipo(@Param('idEquipo', ParseIntPipe) idEquipo: number) {
    const query = new GetComponentesPorEquipoQuery(idEquipo);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetComponenteEquipoByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComponenteEquipoDto,
  ) {
    const command = new ActualizarComponenteEquipoCommand(id, dto);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DesactivarComponenteEquipoCommand(id, 1); // TODO: Extraer usuario del JWT
    return this.commandBus.execute(command);
  }
}
