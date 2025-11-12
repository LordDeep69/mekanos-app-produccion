import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { GetEquiposQueryDto } from './queries/get-equipos.query';
import { CreateEquipoCommand } from './commands/create-equipo.command';
import { UpdateEquipoCommand } from './commands/update-equipo.command';
import { DeleteEquipoCommand } from './commands/delete-equipo.command';
import { GetEquipoQuery } from './queries/get-equipo.query';
import { GetEquiposQuery } from './queries/get-equipos.query';
import { GetEquiposResult } from './queries/get-equipos.handler';
import { EquipoEntity } from '@mekanos/core';

/**
 * Controller para endpoints REST de Equipos
 * Todos los endpoints requieren autenticación JWT
 */
@Controller('api/equipos')
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
  async create(@Body() dto: CreateEquipoDto) {
    const command = new CreateEquipoCommand(dto);
    const equipo: EquipoEntity = await this.commandBus.execute(command);
    
    return {
      success: true,
      message: 'Equipo creado exitosamente',
      data: equipo.toObject()
    };
  }

  /**
   * GET /api/equipos
   * Listar equipos con filtros y paginación
   */
  @Get()
  async findAll(@Query() queryDto: GetEquiposQueryDto) {
    const query = new GetEquiposQuery(
      queryDto.clienteId,
      queryDto.sedeId,
      queryDto.estado,
      queryDto.tipoEquipoId,
      queryDto.page,
      queryDto.limit
    );
    
    const result: GetEquiposResult = await this.queryBus.execute(query);
    
    return {
      success: true,
      data: result.equipos.map((e) => e.toObject()),
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
    const equipo: EquipoEntity = await this.queryBus.execute(query);
    
    return {
      success: true,
      data: equipo.toObject()
    };
  }

  /**
   * PUT /api/equipos/:id
   * Actualizar un equipo
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoDto
  ) {
    const command = new UpdateEquipoCommand(id, dto);
    const equipo: EquipoEntity = await this.commandBus.execute(command);
    
    return {
      success: true,
      message: 'Equipo actualizado exitosamente',
      data: equipo.toObject()
    };
  }

  /**
   * DELETE /api/equipos/:id
   * Eliminar un equipo
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DeleteEquipoCommand(id);
    await this.commandBus.execute(command);
    
    return {
      success: true,
      message: 'Equipo eliminado exitosamente'
    };
  }
}
