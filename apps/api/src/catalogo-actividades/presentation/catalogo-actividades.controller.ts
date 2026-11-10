import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActualizarCatalogoActividadesCommand } from '../application/commands/actualizar-catalogo-actividades.command';
import { CrearCatalogoActividadesCommand } from '../application/commands/crear-catalogo-actividades.command';
import { EliminarCatalogoActividadesCommand } from '../application/commands/eliminar-catalogo-actividades.command';
import { ActualizarCatalogoActividadesDto } from '../application/dto/actualizar-catalogo-actividades.dto';
import { CatalogoActividadesResponseDto } from '../application/dto/catalogo-actividades-response.dto';
import { CrearCatalogoActividadesDto } from '../application/dto/crear-catalogo-actividades.dto';
import {
  PropagarActividadBancoDto,
  ReordenarActividadesLoteDto,
  VincularActividadesLoteDto,
} from '../application/dto/fase59-actividades.dto';
import { ListarActividadesActivasQuery } from '../application/handlers/listar-actividades-activas.handler';
import { ListarCatalogoActividadesQuery } from '../application/handlers/listar-catalogo-actividades.handler';
import { ObtenerCatalogoActividadesPorCodigoQuery } from '../application/handlers/obtener-catalogo-actividades-por-codigo.handler';
import { ObtenerCatalogoActividadesPorIdQuery } from '../application/handlers/obtener-catalogo-actividades-por-id.handler';
import { CatalogoActividadesRepository } from '../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../infrastructure/catalogo-actividades.mapper';

@ApiTags('Catálogo de Actividades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalogo-actividades')
export class CatalogoActividadesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva actividad de catálogo o plantilla de Banco Universal' })
  @ApiResponse({ status: 201, description: 'Actividad creada exitosamente', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async crear(
    @Body() dto: CrearCatalogoActividadesDto,
    @CurrentUser('id') userId?: number,
  ): Promise<CatalogoActividadesResponseDto> {
    const command = CrearCatalogoActividadesCommand.fromDto(dto, userId ?? 1);
    return this.commandBus.execute(command);
  }

  @Post('vincular-lote')
  @ApiOperation({ summary: 'Importar o vincular en lote actividades del Banco Universal hacia uno o varios Tipos de Servicio' })
  async vincularLote(
    @Body() dto: VincularActividadesLoteDto,
    @CurrentUser('id') userId?: number,
  ) {
    const res = await this.repository.vincularLote(dto, userId ?? 1);
    return {
      createdCount: res.createdCount,
      skippedCount: res.skippedCount,
      created: res.created.map((entity) => CatalogoActividadesMapper.toCamelCase(entity)),
    };
  }

  @Put('reordenar-lote')
  @ApiOperation({ summary: 'Reordenar en lote actividades de un checklist (↑/↓ o drag)' })
  async reordenarLote(
    @Body() dto: ReordenarActividadesLoteDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.repository.reordenarLote(dto, userId ?? 1);
  }

  @Put('banco/propagar')
  @ApiOperation({ summary: 'Editar actividad en el Banco Universal y propagar cambios en cascada a servicios vinculados' })
  async propagarDesdeBanco(
    @Body() dto: PropagarActividadBancoDto,
    @CurrentUser('id') userId?: number,
  ) {
    const res = await this.repository.propagarCambios(dto, userId ?? 1);
    return {
      origin: CatalogoActividadesMapper.toCamelCase(res.origin),
      propagatedCount: res.propagatedCount,
      affectedServiceIds: res.affectedServiceIds,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar actividades con paginación y filtros avanzados EAM' })
  @ApiResponse({ status: 200, description: 'Lista de actividades' })
  async listar(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('activo') activoStr?: string,
    @Query('tipoServicioId') tipoServicioIdStr?: string,
    @Query('tipoEquipoId') tipoEquipoIdStr?: string,
    @Query('sistemaId') sistemaIdStr?: string,
    @Query('soloPlantillas') soloPlantillasStr?: string,
    @Query('tipoActividad') tipoActividad?: string,
    @Query('search') search?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 500;

    let activo: boolean | 'all' = 'all';
    if (activoStr === 'true') activo = true;
    else if (activoStr === 'false') activo = false;

    return this.queryBus.execute(
      new ListarCatalogoActividadesQuery(page, limit, {
        activo,
        tipoServicioId: tipoServicioIdStr ? parseInt(tipoServicioIdStr, 10) : undefined,
        tipoEquipoId: tipoEquipoIdStr ? parseInt(tipoEquipoIdStr, 10) : undefined,
        sistemaId: sistemaIdStr ? parseInt(sistemaIdStr, 10) : undefined,
        soloPlantillas: soloPlantillasStr === 'true',
        tipoActividad: tipoActividad?.trim() || undefined,
        search: search?.trim() || undefined,
      }),
    );
  }

  @Get('activas')
  @ApiOperation({ summary: 'Listar actividades activas con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de actividades activas' })
  async listarActivas(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 500;
    return this.queryBus.execute(new ListarActividadesActivasQuery(page, limit));
  }

  @Get('codigo/:codigo')
  @ApiOperation({ summary: 'Obtener actividad por código' })
  @ApiResponse({ status: 200, description: 'Actividad encontrada', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async obtenerPorCodigo(@Param('codigo') codigo: string): Promise<CatalogoActividadesResponseDto> {
    return this.queryBus.execute(new ObtenerCatalogoActividadesPorCodigoQuery(codigo));
  }

  @Get('verificar/:id')
  @ApiOperation({ summary: 'Verificar existencia de actividad después de soft delete' })
  @ApiResponse({ status: 200, description: 'Actividad verificada', type: CatalogoActividadesResponseDto })
  async verificar(@Param('id') id: string): Promise<CatalogoActividadesResponseDto> {
    return this.queryBus.execute(new ObtenerCatalogoActividadesPorIdQuery(+id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener actividad por ID' })
  @ApiResponse({ status: 200, description: 'Actividad encontrada', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async obtenerPorId(@Param('id') id: string): Promise<CatalogoActividadesResponseDto> {
    return this.queryBus.execute(new ObtenerCatalogoActividadesPorIdQuery(+id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar actividad existente' })
  @ApiResponse({ status: 200, description: 'Actividad actualizada', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarCatalogoActividadesDto,
    @CurrentUser('id') userId?: number,
  ): Promise<CatalogoActividadesResponseDto> {
    const command = ActualizarCatalogoActividadesCommand.fromDto(+id, dto, userId ?? 1);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar actividad (soft delete)' })
  @ApiResponse({ status: 200, description: 'Actividad eliminada (soft delete)', type: CatalogoActividadesResponseDto })
  @ApiResponse({ status: 404, description: 'Actividad no encontrada' })
  async eliminar(
    @Param('id') id: string,
    @Body('modificadoPor') modificadoPor?: number,
    @CurrentUser('id') userId?: number,
  ): Promise<CatalogoActividadesResponseDto> {
    const command = new EliminarCatalogoActividadesCommand(+id, modificadoPor ?? userId ?? 1);
    return this.commandBus.execute(command);
  }
}
