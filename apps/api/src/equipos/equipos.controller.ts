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
    UseGuards
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEquipoCommand } from './commands/create-equipo.command';
import { DeleteEquipoCommand } from './commands/delete-equipo.command';
import { UpdateEquipoCommand } from './commands/update-equipo.command';
import { UserId } from './decorators/user-id.decorator';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { GetEquipoQuery } from './queries/get-equipo.query';
import { GetEquiposQuery, GetEquiposQueryDto } from './queries/get-equipos.query';

/**
 * Controller para endpoints REST de Equipos
 * Todos los endpoints requieren autenticación JWT
 */
@Controller('equipos')
@Public()
@UseGuards(JwtAuthGuard)
export class EquiposController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * POST /api/equipos
   * Crear un nuevo equipo
   */
  @Post()
  async create(
    @Body() dto: CreateEquipoDto,
    @UserId() userId: number
  ) {
    const command = new CreateEquipoCommand(dto, userId);
    const equipo = await this.commandBus.execute(command);
    
    return {
      success: true,
      message: 'Equipo creado exitosamente',
      data: equipo
    };
  }

  /**
   * GET /api/equipos
   * Listar equipos con filtros y paginación
   */
  @Get()
  async findAll(@Query() queryDto: GetEquiposQueryDto) {
    const query = new GetEquiposQuery(
      queryDto.id_cliente,
      queryDto.id_sede,
      queryDto.estado_equipo,
      queryDto.id_tipo_equipo,
      queryDto.activo,
      queryDto.page,
      queryDto.limit
    );
    
    const result = await this.queryBus.execute(query);
    
    return {
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    };
  }

  /**
   * GET /api/equipos/:id
   * Obtener un equipo por ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetEquipoQuery(id);
    const equipo = await this.queryBus.execute(query);
    
    return {
      success: true,
      data: equipo
    };
  }

  /**
   * PUT /api/equipos/:id
   * Actualizar un equipo
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoDto,
    @UserId() userId: number
  ) {
    const command = new UpdateEquipoCommand(id, dto, userId);
    const equipo = await this.commandBus.execute(command);
    
    return {
      success: true,
      message: 'Equipo actualizado exitosamente',
      data: equipo
    };
  }

  /**
   * DELETE /api/equipos/:id
   * Eliminar un equipo
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number
  ) {
    const command = new DeleteEquipoCommand(id, userId);
    await this.commandBus.execute(command);
    
    return {
      success: true,
      message: 'Equipo eliminado exitosamente'
    };
  }
}

