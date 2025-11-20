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
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarEquipoBombaCommand } from './application/commands/actualizar-equipo-bomba.command';
import { CrearEquipoBombaCommand } from './application/commands/crear-equipo-bomba.command';
import { EliminarEquipoBombaCommand } from './application/commands/eliminar-equipo-bomba.command';
import { GetAllEquiposBombaQuery } from './application/queries/get-all-equipos-bomba.query';
import { GetEquipoBombaByIdQuery } from './application/queries/get-equipo-bomba-by-id.query';
import { CreateEquipoBombaDto } from './dto/create-equipo-bomba.dto';
import { UpdateEquipoBombaDto } from './dto/update-equipo-bomba.dto';

@Controller('equipos-bomba')
@Public()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposBombaController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateEquipoBombaDto,
    @CurrentUser('id') userId: number,
  ) {
    const command = new CrearEquipoBombaCommand({ ...dto, creado_por: userId });
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('marca_bomba') marca_bomba?: string,
    @Query('tipo_bomba') tipo_bomba?: string,
    @Query('aplicacion_bomba') aplicacion_bomba?: string,
    @Query('tiene_variador_frecuencia') tiene_variador_frecuencia?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query = new GetAllEquiposBombaQuery({
      marca_bomba,
      tipo_bomba,
      aplicacion_bomba,
      tiene_variador_frecuencia: tiene_variador_frecuencia !== undefined ? tiene_variador_frecuencia === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    const result = await this.queryBus.execute(query);
    
    // Formato consistente con equipos.controller
    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: query.filters.page || 1,
        limit: query.filters.limit || 50,
        totalPages: Math.ceil(result.total / (query.filters.limit || 50))
      }
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetEquipoBombaByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoBombaDto,
  ) {
    const command = new ActualizarEquipoBombaCommand(id, dto);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new EliminarEquipoBombaCommand(id);
    await this.commandBus.execute(command);
    return { success: true };
  }
}
