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
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTiposServicioCommand } from './commands/create-tipos-servicio.command';
import { DeleteTiposServicioCommand } from './commands/delete-tipos-servicio.command';
import { UpdateTiposServicioCommand } from './commands/update-tipos-servicio.command';
import { CategoriaServicioEnum, CreateTiposServicioDto } from './dto/create-tipos-servicio.dto';
import { UpdateTiposServicioDto } from './dto/update-tipos-servicio.dto';
import { GetTiposServicioByCategoriaQuery } from './queries/get-tipos-servicio-by-categoria.query';
import { GetTiposServicioByIdQuery } from './queries/get-tipos-servicio-by-id.query';
import { GetTiposServicioQuery } from './queries/get-tipos-servicio.query';

/**
 * Controller: Tipos de Servicio
 * 
 * Gestiona tipos/formatos estandarizados de servicio
 * Arquitectura: CQRS (Commands/Queries separados)
 * 
 * ENDPOINTS:
 * - POST /tipos-servicio - Crear tipo servicio
 * - GET /tipos-servicio - Listar con filtros
 * - GET /tipos-servicio/:id - Detalle con relaciones
 * - PUT /tipos-servicio/:id - Actualizar
 * - DELETE /tipos-servicio/:id - Soft delete
 * - GET /tipos-servicio/categoria/:categoria - Filtrar por categoría
 */
@ApiTags('Tipos de Servicio')
@Controller('tipos-servicio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposServicioController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // ============================================================================
  // CREATE
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Crear nuevo tipo de servicio' })
  @ApiResponse({ status: 201, description: 'Tipo servicio creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Validación fallida' })
  @ApiResponse({ status: 404, description: 'FK no encontrada (tipo_equipo)' })
  async create(@Body() dto: CreateTiposServicioDto) {
    // TODO: Obtener userId desde JWT (CurrentUser decorator)
    const userId = 1; // Temporal

    const command = new CreateTiposServicioCommand(
      dto.codigoTipo,
      dto.nombreTipo,
      dto.descripcion || null,
      dto.categoria,
      dto.tipoEquipoId || null,
      dto.tieneChecklist !== undefined ? dto.tieneChecklist : true,
      dto.tienePlantillaInforme !== undefined ? dto.tienePlantillaInforme : true,
      dto.requiereMediciones !== undefined ? dto.requiereMediciones : true,
      dto.duracionEstimadaHoras || null,
      dto.ordenVisualizacion || null,
      dto.icono || null,
      dto.colorHex || null,
      dto.activo !== undefined ? dto.activo : true,
      dto.observaciones || null,
      userId,
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Tipo de servicio creado exitosamente',
      data: result,
    };
  }

  // ============================================================================
  // READ ALL
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Listar tipos de servicio con filtros' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda en nombre, código, descripción' })
  @ApiQuery({ name: 'categoria', required: false, enum: CategoriaServicioEnum })
  @ApiQuery({ name: 'tipoEquipoId', required: false, type: 'number' })
  @ApiQuery({ name: 'activo', required: false, type: 'boolean', example: true })
  @ApiResponse({ status: 200, description: 'Listado obtenido exitosamente' })
  async findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
    @Query('categoria') categoria?: CategoriaServicioEnum,
    @Query('tipoEquipoId') tipoEquipoIdStr?: string,
    @Query('activo') activoStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const tipoEquipoId = tipoEquipoIdStr ? parseInt(tipoEquipoIdStr, 10) : undefined;
    const activo = activoStr !== undefined ? activoStr === 'true' : true;

    const query = new GetTiposServicioQuery(
      page,
      limit,
      search,
      categoria,
      tipoEquipoId,
      activo,
    );

    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Tipos de servicio obtenidos exitosamente',
      data: result.data,
      meta: result.meta,
    };
  }

  // ============================================================================
  // READ BY ID
  // ============================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de servicio por ID' })
  @ApiResponse({ status: 200, description: 'Tipo servicio encontrado' })
  @ApiResponse({ status: 404, description: 'Tipo servicio no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.queryBus.execute(
      new GetTiposServicioByIdQuery(id),
    );

    return {
      success: true,
      message: 'Tipo de servicio obtenido exitosamente',
      data: result,
    };
  }

  // ============================================================================
  // UPDATE
  // ============================================================================

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar tipo de servicio' })
  @ApiResponse({ status: 200, description: 'Tipo servicio actualizado' })
  @ApiResponse({ status: 404, description: 'Tipo servicio no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTiposServicioDto,
  ) {
    // TODO: Obtener userId desde JWT
    const userId = 1; // Temporal

    const command = new UpdateTiposServicioCommand(
      id,
      {
        codigoTipo: dto.codigoTipo,
        nombreTipo: dto.nombreTipo,
        descripcion: dto.descripcion,
        categoria: dto.categoria,
        tipoEquipoId: dto.tipoEquipoId,
        tieneChecklist: dto.tieneChecklist,
        tienePlantillaInforme: dto.tienePlantillaInforme,
        requiereMediciones: dto.requiereMediciones,
        duracionEstimadaHoras: dto.duracionEstimadaHoras,
        ordenVisualizacion: dto.ordenVisualizacion,
        icono: dto.icono,
        colorHex: dto.colorHex,
        activo: dto.activo,
        observaciones: dto.observaciones,
      },
      userId,
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Tipo de servicio actualizado exitosamente',
      data: result,
    };
  }

  // ============================================================================
  // DELETE (SOFT)
  // ============================================================================

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar tipo de servicio (soft delete)' })
  @ApiResponse({ status: 200, description: 'Tipo servicio desactivado' })
  @ApiResponse({ status: 404, description: 'Tipo servicio no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DeleteTiposServicioCommand(id);
    await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Tipo de servicio desactivado exitosamente',
    };
  }

  // ============================================================================
  // CUSTOM ENDPOINTS
  // ============================================================================

  @Get('categoria/:categoria')
  @ApiOperation({ summary: 'Obtener tipos de servicio por categoría' })
  @ApiQuery({ name: 'soloActivos', required: false, type: 'boolean', example: true })
  @ApiResponse({ status: 200, description: 'Tipos servicio filtrados por categoría' })
  async findByCategoria(
    @Param('categoria') categoria: CategoriaServicioEnum,
    @Query('soloActivos') soloActivosStr?: string,
  ) {
    const soloActivos = soloActivosStr !== undefined ? soloActivosStr === 'true' : true;

    const result = await this.queryBus.execute(
      new GetTiposServicioByCategoriaQuery(categoria, soloActivos),
    );

    return {
      success: true,
      message: `Tipos de servicio categoría ${categoria} obtenidos exitosamente`,
      data: result,
    };
  }
}
