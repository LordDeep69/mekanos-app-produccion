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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateParametrosMedicionDto } from './dto/create-parametros-medicion.dto';
import { UpdateParametrosMedicionDto } from './dto/update-parametros-medicion.dto';

// Commands
import { ActualizarParametrosMedicionCommand } from './application/commands/actualizar-parametros-medicion.command';
import { CrearParametrosMedicionCommand } from './application/commands/crear-parametros-medicion.command';
import { EliminarParametrosMedicionCommand } from './application/commands/eliminar-parametros-medicion.command';

// Queries
import { BuscarParametroMedicionPorCodigoQuery } from './application/queries/buscar-parametro-medicion-por-codigo.query';
import { ListarParametrosMedicionQuery } from './application/queries/listar-parametros-medicion.query';
import { ObtenerParametroMedicionPorIdQuery } from './application/queries/obtener-parametro-medicion-por-id.query';
import { ObtenerParametrosActivosQuery } from './application/queries/obtener-parametros-activos.query';
import { ObtenerParametrosPorTipoEquipoQuery } from './application/queries/obtener-parametros-por-tipo-equipo.query';

/**
 * Controller CQRS para parámetros de medición
 * 8 endpoints: POST, GET (5 variantes), PUT, DELETE
 * Query params como string con conversión manual (patrón tablas 1-3)
 */
@Controller('parametros-medicion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParametrosMedicionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /api/parametros-medicion
   * Crear nuevo parámetro de medición
   * Body: CreateParametrosMedicionDto (17 campos - creadoPor viene del JWT)
   */
  @Post()
  async create(
    @Body() createDto: CreateParametrosMedicionDto,
    @CurrentUser('id') userId: number,
  ) {
    const command = new CrearParametrosMedicionCommand(
      createDto.codigoParametro,
      createDto.nombreParametro,
      createDto.unidadMedida,
      createDto.categoria,
      createDto.descripcion,
      createDto.tipoDato,
      createDto.valorMinimoNormal,
      createDto.valorMaximoNormal,
      createDto.valorMinimoCritico,
      createDto.valorMaximoCritico,
      createDto.valorIdeal,
      createDto.tipoEquipoId,
      createDto.esCriticoSeguridad,
      createDto.esObligatorio,
      createDto.decimalesPrecision,
      createDto.activo,
      createDto.observaciones,
      userId, // creadoPor viene del JWT
    );
    return this.commandBus.execute(command);
  }

  /**
   * GET /api/parametros-medicion
   * Listar parámetros con filtros opcionales y paginación
   * Query params: activo, categoria, tipoEquipoId, esCriticoSeguridad, esObligatorio, page, limit
   */
  @Get()
  async listar(
    @Query('activo') activo?: string,
    @Query('categoria') categoria?: string,
    @Query('tipoEquipoId') tipoEquipoIdStr?: string,
    @Query('esCriticoSeguridad') esCriticoSeguridadStr?: string,
    @Query('esObligatorio') esObligatorioStr?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const query = new ListarParametrosMedicionQuery(
      activo === 'true' ? true : activo === 'false' ? false : undefined,
      categoria,
      tipoEquipoIdStr ? parseInt(tipoEquipoIdStr, 10) : undefined,
      esCriticoSeguridadStr === 'true'
        ? true
        : esCriticoSeguridadStr === 'false'
        ? false
        : undefined,
      esObligatorioStr === 'true'
        ? true
        : esObligatorioStr === 'false'
        ? false
        : undefined,
      pageStr ? parseInt(pageStr, 10) : 1,
      limitStr ? parseInt(limitStr, 10) : 10,
    );
    return this.queryBus.execute(query);
  }

  /**
   * GET /api/parametros-medicion/activos
   * Obtener solo parámetros activos (sin paginación)
   * IMPORTANTE: ANTES de /:id para evitar conflicto de rutas
   */
  @Get('activos')
  async obtenerActivos() {
    const query = new ObtenerParametrosActivosQuery();
    return this.queryBus.execute(query);
  }

  /**
   * GET /api/parametros-medicion/tipo-equipo/:id
   * Obtener parámetros por tipo de equipo (solo activos)
   */
  @Get('tipo-equipo/:id')
  async obtenerPorTipoEquipo(@Param('id', ParseIntPipe) tipoEquipoId: number) {
    const query = new ObtenerParametrosPorTipoEquipoQuery(tipoEquipoId);
    return this.queryBus.execute(query);
  }

  /**
   * GET /api/parametros-medicion/codigo/:codigo
   * Buscar parámetro por código (normalizado UPPER)
   */
  @Get('codigo/:codigo')
  async buscarPorCodigo(@Param('codigo') codigo: string) {
    const query = new BuscarParametroMedicionPorCodigoQuery(codigo);
    return this.queryBus.execute(query);
  }

  /**
   * GET /api/parametros-medicion/:id
   * Obtener parámetro por ID con todas sus relaciones
   */
  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    const query = new ObtenerParametroMedicionPorIdQuery(id);
    return this.queryBus.execute(query);
  }

  /**
   * PUT /api/parametros-medicion/:id
   * Actualizar parámetro existente (parcial)
   * Body: UpdateParametrosMedicionDto (todos campos opcionales - modificadoPor viene del JWT)
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateParametrosMedicionDto,
    @CurrentUser('id') userId: number,
  ) {
    const command = new ActualizarParametrosMedicionCommand(
      id,
      updateDto.codigoParametro,
      updateDto.nombreParametro,
      updateDto.unidadMedida,
      updateDto.categoria,
      updateDto.descripcion,
      updateDto.tipoDato,
      updateDto.valorMinimoNormal,
      updateDto.valorMaximoNormal,
      updateDto.valorMinimoCritico,
      updateDto.valorMaximoCritico,
      updateDto.valorIdeal,
      updateDto.tipoEquipoId,
      updateDto.esCriticoSeguridad,
      updateDto.esObligatorio,
      updateDto.decimalesPrecision,
      updateDto.activo,
      updateDto.observaciones,
      userId, // modificadoPor viene del JWT
    );
    return this.commandBus.execute(command);
  }

  /**
   * DELETE /api/parametros-medicion/:id
   * Soft delete: marcar como inactivo (activo = false)
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new EliminarParametrosMedicionCommand(id);
    return this.commandBus.execute(command);
  }
}
