import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActualizarCatalogoActividadesCommand } from '../application/commands/actualizar-catalogo-actividades.command';
import { CrearCatalogoActividadesCommand } from '../application/commands/crear-catalogo-actividades.command';
import { EliminarCatalogoActividadesCommand } from '../application/commands/eliminar-catalogo-actividades.command';
import { ActualizarCatalogoActividadesDto } from '../application/dto/actualizar-catalogo-actividades.dto';
import { CatalogoActividadesResponseDto } from '../application/dto/catalogo-actividades-response.dto';
import { CrearCatalogoActividadesDto } from '../application/dto/crear-catalogo-actividades.dto';
import { ListarActividadesActivasQuery } from '../application/handlers/listar-actividades-activas.handler';
import { ListarCatalogoActividadesQuery } from '../application/handlers/listar-catalogo-actividades.handler';
import { ObtenerCatalogoActividadesPorCodigoQuery } from '../application/handlers/obtener-catalogo-actividades-por-codigo.handler';
import { ObtenerCatalogoActividadesPorIdQuery } from '../application/handlers/obtener-catalogo-actividades-por-id.handler';

@ApiTags('Catálogo de Actividades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalogo-actividades')
export class CatalogoActividadesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva actividad de catálogo' })
  @ApiResponse({ status: 201, description: 'Actividad creada exitosamente', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async crear(@Body() dto: CrearCatalogoActividadesDto): Promise<CatalogoActividadesResponseDto> {
    const command = CrearCatalogoActividadesCommand.fromDto(dto);
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las actividades con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de actividades' })
  async listar(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.queryBus.execute(new ListarCatalogoActividadesQuery(+page, +limit));
  }

  @Get('activas')
  @ApiOperation({ summary: 'Listar actividades activas con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de actividades activas' })
  async listarActivas(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.queryBus.execute(new ListarActividadesActivasQuery(+page, +limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener actividad por ID' })
  @ApiResponse({ status: 200, description: 'Actividad encontrada', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async obtenerPorId(@Param('id') id: string): Promise<CatalogoActividadesResponseDto> {
    return this.queryBus.execute(new ObtenerCatalogoActividadesPorIdQuery(+id));
  }

  @Get('codigo/:codigo')
  @ApiOperation({ summary: 'Obtener actividad por código único' })
  @ApiResponse({ status: 200, description: 'Actividad encontrada', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async obtenerPorCodigo(@Param('codigo') codigo: string): Promise<CatalogoActividadesResponseDto> {
    return this.queryBus.execute(new ObtenerCatalogoActividadesPorCodigoQuery(codigo));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar actividad existente' })
  @ApiResponse({ status: 200, description: 'Actividad actualizada', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarCatalogoActividadesDto,
  ): Promise<CatalogoActividadesResponseDto> {
    const command = ActualizarCatalogoActividadesCommand.fromDto(+id, dto);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar actividad (soft delete)' })
  @ApiResponse({ status: 200, description: 'Actividad eliminada (soft delete)', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async eliminar(
    @Param('id') id: string,
    @Body('modificadoPor') modificadoPor: number,
  ): Promise<CatalogoActividadesResponseDto> {
    const command = new EliminarCatalogoActividadesCommand(+id, modificadoPor);
    return this.commandBus.execute(command);
  }

  @Get('verificar/:id')
  @ApiOperation({ summary: 'Verificar existencia de actividad después de soft delete' })
  @ApiResponse({ status: 200, description: 'Actividad verificada', type: CatalogoActividadesResponseDto })
  async verificar(@Param('id') id: string): Promise<CatalogoActividadesResponseDto> {
    return this.queryBus.execute(new ObtenerCatalogoActividadesPorIdQuery(+id));
  }
}
