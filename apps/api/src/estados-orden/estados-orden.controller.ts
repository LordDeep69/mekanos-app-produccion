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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CrearEstadosOrdenDto } from './dto/create-estados-orden.dto';
import { ActualizarEstadosOrdenDto } from './dto/update-estados-orden.dto';

// Commands
import { ActualizarEstadosOrdenCommand } from './application/commands/actualizar-estados-orden.command';
import { CrearEstadosOrdenCommand } from './application/commands/crear-estados-orden.command';
import { EliminarEstadosOrdenCommand } from './application/commands/eliminar-estados-orden.command';

// Queries
import { BuscarEstadosOrdenPorCodigoQuery } from './application/queries/buscar-estados-orden-por-codigo.query';
import { ListarEstadosOrdenQuery } from './application/queries/listar-estados-orden.query';
import { ObtenerEstadosActivosQuery } from './application/queries/obtener-estados-activos.query';
import { ObtenerEstadosOrdenPorIdQuery } from './application/queries/obtener-estados-orden-por-id.query';

/**
 * Controller para estados de orden (catálogo)
 * 
 * ENDPOINTS (8):
 * 1. POST / - Crear estado
 * 2. GET / - Listar con filtros
 * 3. GET /:id - Obtener por ID
 * 4. GET /codigo/:codigo - Buscar por código
 * 5. GET /activos - Solo estados activos
 * 6. PUT /:id - Actualizar estado
 * 7. DELETE /:id - Soft delete
 * 
 * IMPORTANTE: Query params como string (manual conversion)
 */
@Controller('estados-orden')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosOrdenController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /api/estados-orden
   * Crear nuevo estado de orden
   */
  @Post()
  async crear(@Body() createDto: CrearEstadosOrdenDto) {
    const command = new CrearEstadosOrdenCommand(
      createDto.codigoEstado,
      createDto.nombreEstado,
      createDto.descripcion,
      createDto.permiteEdicion,
      createDto.permiteEliminacion,
      createDto.esEstadoFinal,
      createDto.colorHex,
      createDto.icono,
      createDto.ordenVisualizacion,
      createDto.activo,
    );

    return this.commandBus.execute(command);
  }

  /**
   * GET /api/estados-orden
   * Listar estados con filtros opcionales
   * 
   * Query params (todos opcionales):
   * - page: número de página (default 1)
   * - limit: resultados por página (default 50)
   * - activo: 'true' | 'false'
   * - esEstadoFinal: 'true' | 'false'
   * - permiteEdicion: 'true' | 'false'
   */
  @Get()
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('activo') activo?: string,
    @Query('esEstadoFinal') esEstadoFinal?: string,
    @Query('permiteEdicion') permiteEdicion?: string,
  ) {
    const query = new ListarEstadosOrdenQuery(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      activo === 'true' ? true : activo === 'false' ? false : undefined,
      esEstadoFinal === 'true' ? true : esEstadoFinal === 'false' ? false : undefined,
      permiteEdicion === 'true' ? true : permiteEdicion === 'false' ? false : undefined,
    );

    return this.queryBus.execute(query);
  }

  /**
   * GET /api/estados-orden/activos
   * Obtener solo estados activos (ordenados por orden_visualizacion)
   * 
   * IMPORTANTE: Debe estar ANTES de /:id para evitar conflicto de rutas
   */
  @Get('activos')
  async obtenerActivos() {
    const query = new ObtenerEstadosActivosQuery();
    return this.queryBus.execute(query);
  }

  /**
   * GET /api/estados-orden/codigo/:codigo
   * Buscar estado por código (normalizado UPPER en handler)
   */
  @Get('codigo/:codigo')
  async buscarPorCodigo(@Param('codigo') codigo: string) {
    const query = new BuscarEstadosOrdenPorCodigoQuery(codigo);
    return this.queryBus.execute(query);
  }

  /**
   * GET /api/estados-orden/:id
   * Obtener estado específico por ID
   */
  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    const query = new ObtenerEstadosOrdenPorIdQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * PUT /api/estados-orden/:id
   * Actualizar estado existente
   */
  @Put(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: ActualizarEstadosOrdenDto,
  ) {
    const command = new ActualizarEstadosOrdenCommand(
      id,
      updateDto.codigoEstado,
      updateDto.nombreEstado,
      updateDto.descripcion,
      updateDto.permiteEdicion,
      updateDto.permiteEliminacion,
      updateDto.esEstadoFinal,
      updateDto.colorHex,
      updateDto.icono,
      updateDto.ordenVisualizacion,
      updateDto.activo,
    );

    return this.commandBus.execute(command);
  }

  /**
   * DELETE /api/estados-orden/:id
   * Soft delete (marca activo = false)
   */
  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    const command = new EliminarEstadosOrdenCommand(id);
    return this.commandBus.execute(command);
  }
}

