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
import { ActualizarCatalogoComponenteCommand } from './application/commands/actualizar-catalogo-componente.command';
import { CrearCatalogoComponenteCommand } from './application/commands/crear-catalogo-componente.command';
import { DesactivarCatalogoComponenteCommand } from './application/commands/desactivar-catalogo-componente.command';
import { GetCatalogoComponenteByIdQuery } from './application/queries/get-catalogo-componente-by-id.query';
import { GetCatalogoComponentesQuery } from './application/queries/get-catalogo-componentes.query';
import { CreateCatalogoComponenteDto } from './dto/create-catalogo-componente.dto';
import { UpdateCatalogoComponenteDto } from './dto/update-catalogo-componente.dto';

@Controller('catalogo-componentes')
@Public()
export class CatalogoComponentesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateCatalogoComponenteDto) {
    const command = new CrearCatalogoComponenteCommand(dto);
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('id_tipo_componente') idTipo?: string,
    @Query('marca') marca?: string,
    @Query('tipo_comercial') tipoComercial?: string,
    @Query('activo') activo?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    const filtros: any = {};
    if (idTipo) filtros.id_tipo_componente = parseInt(idTipo, 10);
    if (marca) filtros.marca = marca;
    if (tipoComercial) filtros.tipo_comercial = tipoComercial;
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (skip) filtros.skip = parseInt(skip, 10);
    if (limit) filtros.limit = parseInt(limit, 10);

    const query = new GetCatalogoComponentesQuery(filtros);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetCatalogoComponenteByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogoComponenteDto,
  ) {
    const command = new ActualizarCatalogoComponenteCommand(id, dto);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DesactivarCatalogoComponenteCommand(id, 1); // TODO: Extraer usuario del JWT
    return this.commandBus.execute(command);
  }
}
