import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// DTOs
import { ActualizarCatalogoSistemasDto } from '../application/dto/actualizar-catalogo-sistemas.dto';
import { CatalogoSistemasResponseDto } from '../application/dto/catalogo-sistemas-response.dto';
import { CrearCatalogoSistemasDto } from '../application/dto/crear-catalogo-sistemas.dto';

// Commands
import { ActualizarCatalogoSistemasCommand } from '../application/commands/actualizar-catalogo-sistemas.command';
import { CrearCatalogoSistemasCommand } from '../application/commands/crear-catalogo-sistemas.command';
import { EliminarCatalogoSistemasCommand } from '../application/commands/eliminar-catalogo-sistemas.command';

// Queries
import { ListarCatalogoSistemasQuery } from '../application/handlers/listar-catalogo-sistemas.handler';
import { ListarSistemasActivosQuery } from '../application/handlers/listar-sistemas-activos.handler';
import { ObtenerCatalogoSistemasPorCodigoQuery } from '../application/handlers/obtener-catalogo-sistemas-por-codigo.handler';
import { ObtenerCatalogoSistemasPorIdQuery } from '../application/handlers/obtener-catalogo-sistemas-por-id.handler';

@ApiTags('Catálogo de Sistemas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalogo-sistemas')
export class CatalogoSistemasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * GET /catalogo-sistemas?page=1&limit=10
   * Obtener lista paginada de sistemas
   */
  @Get()
  @ApiOperation({ summary: 'Obtener lista paginada de sistemas del catálogo' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Lista de sistemas obtenida exitosamente' })
  async listarSistemas(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<{
    data: CatalogoSistemasResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const query = new ListarCatalogoSistemasQuery(parseInt(page, 10), parseInt(limit, 10));
    return this.queryBus.execute(query);
  }

  /**
   * GET /catalogo-sistemas/activos
   * Obtener solo sistemas activos (sin paginación)
   */
  @Get('activos')
  @ApiOperation({ summary: 'Obtener solo sistemas activos del catálogo' })
  @ApiResponse({ status: 200, description: 'Lista de sistemas activos obtenida exitosamente' })
  async listarSistemasActivos(): Promise<CatalogoSistemasResponseDto[]> {
    const query = new ListarSistemasActivosQuery();
    return this.queryBus.execute(query);
  }

  /**
   * GET /catalogo-sistemas/:id
   * Obtener sistema por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener sistema del catálogo por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del sistema' })
  @ApiResponse({ status: 200, description: 'Sistema encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sistema no encontrado' })
  async obtenerSistemaPorId(@Param('id', ParseIntPipe) id: number): Promise<CatalogoSistemasResponseDto> {
    const query = new ObtenerCatalogoSistemasPorIdQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * GET /catalogo-sistemas/codigo/:codigo
   * Obtener sistema por código
   */
  @Get('codigo/:codigo')
  @ApiOperation({ summary: 'Obtener sistema del catálogo por código' })
  @ApiParam({ name: 'codigo', type: String, description: 'Código único del sistema' })
  @ApiResponse({ status: 200, description: 'Sistema encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sistema no encontrado' })
  async obtenerSistemaPorCodigo(@Param('codigo') codigo: string): Promise<CatalogoSistemasResponseDto> {
    const query = new ObtenerCatalogoSistemasPorCodigoQuery(codigo);
    return this.queryBus.execute(query);
  }

  /**
   * POST /catalogo-sistemas
   * Crear nuevo sistema
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo sistema en el catálogo' })
  @ApiResponse({ status: 201, description: 'Sistema creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Código o orden de visualización ya existe' })
  async crearSistema(@Body() dto: CrearCatalogoSistemasDto): Promise<CatalogoSistemasResponseDto> {
    const command = new CrearCatalogoSistemasCommand(
      dto.codigoSistema,
      dto.nombreSistema,
      dto.descripcion,
      dto.aplicaA,
      dto.ordenVisualizacion,
      dto.icono,
      dto.colorHex,
      dto.activo,
      dto.observaciones,
    );
    return this.commandBus.execute(command);
  }

  /**
   * PUT /catalogo-sistemas/:id
   * Actualizar sistema existente
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar sistema del catálogo' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del sistema a actualizar' })
  @ApiResponse({ status: 200, description: 'Sistema actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sistema no encontrado' })
  @ApiResponse({ status: 409, description: 'Orden de visualización ya existe' })
  async actualizarSistema(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCatalogoSistemasDto,
  ): Promise<CatalogoSistemasResponseDto> {
    const command = new ActualizarCatalogoSistemasCommand(
      id,
      dto.nombreSistema,
      dto.descripcion,
      dto.aplicaA,
      dto.ordenVisualizacion,
      dto.icono,
      dto.colorHex,
      dto.activo,
      dto.observaciones,
    );
    return this.commandBus.execute(command);
  }

  /**
   * DELETE /catalogo-sistemas/:id
   * Soft delete: marcar sistema como inactivo
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar sistema del catálogo (soft delete)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del sistema a desactivar' })
  @ApiResponse({ status: 200, description: 'Sistema desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sistema no encontrado' })
  async eliminarSistema(@Param('id', ParseIntPipe) id: number): Promise<CatalogoSistemasResponseDto> {
    const command = new EliminarCatalogoSistemasCommand(id);
    return this.commandBus.execute(command);
  }
}
