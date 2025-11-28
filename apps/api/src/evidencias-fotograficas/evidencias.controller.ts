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
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../mediciones-servicio/decorators/user-id.decorator';
import { CreateEvidenciaCommand } from './application/commands/create-evidencia.command';
import { DeleteEvidenciaCommand } from './application/commands/delete-evidencia.command';
import { UpdateEvidenciaCommand } from './application/commands/update-evidencia.command';
import { GetAllEvidenciasQuery } from './application/queries/get-all-evidencias.query';
import { GetEvidenciaByIdQuery } from './application/queries/get-evidencia-by-id.query';
import { GetEvidenciasByActividadQuery } from './application/queries/get-evidencias-by-actividad.query';
import { GetEvidenciasByOrdenQuery } from './application/queries/get-evidencias-by-orden.query';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { ResponseEvidenciaDto } from './dto/response-evidencia.dto';
import { UpdateEvidenciaDto } from './dto/update-evidencia.dto';

/**
 * Controller evidencias fotográficas CRUD
 * FASE 3 - Tabla 11 - 7 endpoints camelCase
 */

@ApiTags('Evidencias Fotográficas')
@ApiBearerAuth()
@Controller('evidencias-fotograficas')
@UseGuards(JwtAuthGuard)
export class EvidenciasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Listar todas evidencias
   * GET /api/evidencias-fotograficas
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas evidencias fotográficas' })
  @ApiResponse({ status: 200, type: [ResponseEvidenciaDto] })
  async listarEvidencias(): Promise<ResponseEvidenciaDto[]> {
    const query = new GetAllEvidenciasQuery();
    return await this.queryBus.execute(query);
  }

  /**
   * Crear evidencia
   * POST /api/evidencias-fotograficas
   */
  @Post()
  @ApiOperation({ summary: 'Crear evidencia fotográfica' })
  @ApiResponse({ status: 201, type: ResponseEvidenciaDto })
  async crearEvidencia(
    @Body() dto: CreateEvidenciaDto,
    @UserId() userId: number,
  ): Promise<ResponseEvidenciaDto> {
    const command = new CreateEvidenciaCommand(dto, userId);
    return await this.commandBus.execute(command);
  }

  /**
   * Listar evidencias por orden (ANTES de /:id)
   * GET /api/evidencias-fotograficas/orden/:ordenId
   */
  @Get('orden/:ordenId')
  @ApiOperation({ summary: 'Listar evidencias por orden servicio' })
  @ApiParam({ name: 'ordenId', type: Number })
  @ApiResponse({ status: 200, type: [ResponseEvidenciaDto] })
  async listarEvidenciasPorOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ): Promise<ResponseEvidenciaDto[]> {
    const query = new GetEvidenciasByOrdenQuery(ordenId);
    return await this.queryBus.execute(query);
  }

  /**
   * Listar evidencias por actividad ejecutada
   * GET /api/evidencias-fotograficas/actividad/:actividadId
   */
  @Get('actividad/:actividadId')
  @ApiOperation({ summary: 'Listar evidencias por actividad ejecutada' })
  @ApiParam({ name: 'actividadId', type: Number })
  @ApiResponse({ status: 200, type: [ResponseEvidenciaDto] })
  async listarEvidenciasPorActividad(
    @Param('actividadId', ParseIntPipe) actividadId: number,
  ): Promise<ResponseEvidenciaDto[]> {
    const query = new GetEvidenciasByActividadQuery(actividadId);
    return await this.queryBus.execute(query);
  }

  /**
   * Obtener evidencia por ID
   * GET /api/evidencias-fotograficas/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener evidencia por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ResponseEvidenciaDto })
  async obtenerEvidencia(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseEvidenciaDto> {
    const query = new GetEvidenciaByIdQuery(id);
    return await this.queryBus.execute(query);
  }

  /**
   * Actualizar evidencia
   * PUT /api/evidencias-fotograficas/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar evidencia fotográfica' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ResponseEvidenciaDto })
  async actualizarEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvidenciaDto,
    @UserId() userId: number,
  ): Promise<ResponseEvidenciaDto> {
    const command = new UpdateEvidenciaCommand(id, dto, userId);
    return await this.commandBus.execute(command);
  }

  /**
   * Eliminar evidencia
   * DELETE /api/evidencias-fotograficas/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar evidencia fotográfica' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Evidencia eliminada exitosamente' })
  async eliminarEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ): Promise<{ message: string }> {
    const command = new DeleteEvidenciaCommand(id, userId);
    return await this.commandBus.execute(command);
  }
}
