import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AprobarCotizacionCommand } from './application/commands/aprobar-cotizacion.command';
import { CreateCotizacionCommand } from './application/commands/create-cotizacion.command';
import { EnviarCotizacionCommand } from './application/commands/enviar-cotizacion.command';
import { ProcesarAprobacionCommand } from './application/commands/procesar-aprobacion.command';
import { RechazarCotizacionCommand } from './application/commands/rechazar-cotizacion.command';
import { SolicitarAprobacionCommand } from './application/commands/solicitar-aprobacion.command';
import { UpdateCotizacionCommand } from './application/commands/update-cotizacion.command';
import { AprobarCotizacionDto } from './application/dtos/aprobar-cotizacion.dto';
import { EnviarCotizacionDto } from './application/dtos/enviar-cotizacion.dto';
import { ProcesarAprobacionDto } from './application/dtos/procesar-aprobacion.dto';
import { RechazarCotizacionDto } from './application/dtos/rechazar-cotizacion.dto';
import { SolicitarAprobacionDto } from './application/dtos/solicitar-aprobacion.dto';
import { GetAprobacionesPendientesQuery } from './application/queries/get-aprobaciones-pendientes.query';
import { GetCotizacionByIdQuery } from './application/queries/get-cotizacion-by-id.query';
import { GetCotizacionesQuery } from './application/queries/get-cotizaciones.query';
import { CreateVersionCommand } from './commands/versiones/create-version.command';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { CreateVersionDto } from './dto/versiones/create-version.dto';
import { GetVersionDetalleQuery } from './queries/versiones/get-version-detalle.query';
import { GetVersionesQuery } from './queries/versiones/get-versiones.query';
import { CotizacionCalculoService } from './services/cotizacion-calculo.service';

/**
 * COTIZACIONES CONTROLLER
 * 
 * Endpoints:
 * POST   /cotizaciones                  - Crear cotización
 * GET    /cotizaciones/:id              - Obtener cotización por ID
 * PUT    /cotizaciones/:id              - Actualizar cotización (solo BORRADOR)
 * GET    /cotizaciones                  - Listar cotizaciones con filtros
 * PUT    /cotizaciones/:id/enviar       - Enviar cotización a cliente (APROBADA_INTERNA → ENVIADA)
 * PUT    /cotizaciones/:id/aprobar      - Aprobar cotización cliente (ENVIADA → APROBADA_CLIENTE)
 * PUT    /cotizaciones/:id/rechazar     - Rechazar cotización (ENVIADA → RECHAZADA)
 * POST   /cotizaciones/:id/solicitar-aprobacion - Solicitar aprobación interna (BORRADOR → EN_REVISION)
 * GET    /cotizaciones/aprobaciones/pendientes - Listar aprobaciones pendientes
 * PUT    /cotizaciones/aprobaciones/:id        - Procesar aprobación (APROBAR/RECHAZAR)
 * POST   /cotizaciones/:id/versiones           - Crear versión snapshot cotización (auditoría)
 * GET    /cotizaciones/:id/versiones           - Listar versiones históricas cotización
 * GET    /cotizaciones/versiones/:idVersion    - Obtener detalle versión específica (JSONB completo)
 */
@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class CotizacionesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly calculoService: CotizacionCalculoService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva cotización en estado BORRADOR' })
  @ApiResponse({ status: 201, description: 'Cotización creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() dto: CreateCotizacionDto) {
    const command = new CreateCotizacionCommand(
      dto.id_cliente,
      new Date(dto.fecha_cotizacion),
      new Date(dto.fecha_vencimiento),
      dto.asunto,
      dto.elaborada_por,
      dto.id_sede,
      dto.id_equipo,
      dto.descripcion_general,
      dto.alcance_trabajo,
      dto.exclusiones,
      dto.descuento_porcentaje,
      dto.iva_porcentaje,
      dto.tiempo_estimado_dias,
      dto.forma_pago,
      dto.terminos_condiciones,
      dto.meses_garantia,
      dto.observaciones_garantia,
    );

    return await this.commandBus.execute(command);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cotización por ID con relaciones' })
  @ApiResponse({ status: 200, description: 'Cotización encontrada' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  @ApiQuery({
    name: 'includeCliente',
    required: false,
    type: Boolean,
    description: 'Incluir datos del cliente',
  })
  @ApiQuery({
    name: 'includeItems',
    required: false,
    type: Boolean,
    description: 'Incluir items de servicios y componentes',
  })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeCliente') includeCliente?: string,
    @Query('includeItems') includeItems?: string,
  ) {
    const query = new GetCotizacionByIdQuery(id, {
      cliente: includeCliente === 'true',
      sede: includeCliente === 'true',
      equipo: includeCliente === 'true',
      estado: true,
      items_servicios: includeItems === 'true',
      items_componentes: includeItems === 'true',
      aprobaciones: true,
    });

    return await this.queryBus.execute(query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar cotización (solo BORRADOR)' })
  @ApiResponse({ status: 200, description: 'Cotización actualizada' })
  @ApiResponse({ status: 400, description: 'Cotización no puede ser modificada' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCotizacionDto,
  ) {
    const command = new UpdateCotizacionCommand(
      id,
      dto.modificado_por || 1, // TODO: Obtener de JWT token
      dto.id_sede,
      dto.id_equipo,
      dto.fecha_vencimiento ? new Date(dto.fecha_vencimiento) : undefined,
      dto.asunto,
      dto.descripcion_general,
      dto.alcance_trabajo,
      dto.exclusiones,
      dto.descuento_porcentaje,
      dto.iva_porcentaje,
      dto.tiempo_estimado_dias,
      dto.forma_pago,
      dto.terminos_condiciones,
      dto.meses_garantia,
      dto.observaciones_garantia,
    );

    return await this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones con filtros' })
  @ApiResponse({ status: 200, description: 'Listado de cotizaciones' })
  @ApiQuery({ name: 'clienteId', required: false, type: Number })
  @ApiQuery({ name: 'estadoId', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 50 })
  async findAll(
    @Query('clienteId') clienteId?: string,
    @Query('estadoId') estadoId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const query = new GetCotizacionesQuery(
      clienteId ? parseInt(clienteId) : undefined,
      undefined,
      estadoId ? parseInt(estadoId) : undefined,
      undefined,
      undefined,
      undefined,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
    );

    return await this.queryBus.execute(query);
  }

  // ==================== FASE 4.6 - CAMBIO ESTADOS COTIZACION ====================

  @Put(':id/enviar')
  @ApiOperation({ summary: 'Enviar cotización a cliente (APROBADA_INTERNA → ENVIADA)' })
  @ApiResponse({ status: 200, description: 'Cotización enviada exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado actual no permite envío' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async enviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarCotizacionDto,
  ) {
    const command = new EnviarCotizacionCommand(
      id,
      dto.destinatario_email,
      dto.destinatario_nombre,
      dto.emails_copia || [],
      1, // TODO: Obtener enviadoPor de JWT token
    );

    return await this.commandBus.execute(command);
  }

  @Put(':id/aprobar')
  @ApiOperation({ summary: 'Aprobar cotización cliente (ENVIADA → APROBADA_CLIENTE)' })
  @ApiResponse({ status: 200, description: 'Cotización aprobada exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado actual no permite aprobación' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarCotizacionDto,
  ) {
    const command = new AprobarCotizacionCommand(
      id,
      1, // TODO: Obtener aprobadoPor de JWT token
      dto.observaciones,
    );

    return await this.commandBus.execute(command);
  }

  @Put(':id/rechazar')
  @ApiOperation({ summary: 'Rechazar cotización (ENVIADA → RECHAZADA)' })
  @ApiResponse({ status: 200, description: 'Cotización rechazada exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado actual no permite rechazo' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarCotizacionDto,
  ) {
    const command = new RechazarCotizacionCommand(
      id,
      dto.id_motivo_rechazo,
      dto.observaciones_rechazo,
      1, // TODO: Obtener rechazadoPor de JWT token
    );

    return await this.commandBus.execute(command);
  }

  // ==================== FASE 4.7 - APROBACIONES INTERNAS ====================

  @Post(':id/solicitar-aprobacion')
  @ApiOperation({ summary: 'Solicitar aprobación interna (BORRADOR → EN_REVISION)' })
  @ApiResponse({ status: 200, description: 'Aprobación solicitada exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado actual no permite solicitar aprobación' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async solicitarAprobacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SolicitarAprobacionDto,
  ) {
    const command = new SolicitarAprobacionCommand(
      id,
      dto.observaciones_solicitante,
      1, // TODO: Obtener solicitadaPor de JWT token
    );

    return await this.commandBus.execute(command);
  }

  @Get('aprobaciones/pendientes')
  @ApiOperation({ summary: 'Listar aprobaciones pendientes (Dashboard supervisor/gerente)' })
  @ApiResponse({ status: 200, description: 'Listado de aprobaciones pendientes' })
  @ApiQuery({ name: 'nivelAprobacion', required: false, enum: ['SUPERVISOR', 'GERENTE'] })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 50 })
  async listarAprobacionesPendientes(
    @Query('nivelAprobacion') nivelAprobacion?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const query = new GetAprobacionesPendientesQuery(
      nivelAprobacion,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
    );

    return await this.queryBus.execute(query);
  }

  @Put('aprobaciones/:id')
  @ApiOperation({ summary: 'Procesar aprobación interna (APROBAR/RECHAZAR)' })
  @ApiResponse({ status: 200, description: 'Aprobación procesada exitosamente' })
  @ApiResponse({ status: 400, description: 'Aprobación ya procesada' })
  @ApiResponse({ status: 404, description: 'Aprobación no encontrada' })
  async procesarAprobacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcesarAprobacionDto,
  ) {
    const command = new ProcesarAprobacionCommand(
      id,
      dto.decision,
      1, // TODO: Obtener aprobadaPor de JWT token
      dto.observaciones_aprobador,
    );

    return await this.commandBus.execute(command);
  }

  /**
   * FASE 4.8: VERSIONES COTIZACIÓN
   */

  @Post(':id/versiones')
  @ApiOperation({ summary: 'Crear snapshot versión cotización (auditoría cambios)' })
  @ApiResponse({ status: 201, description: 'Versión creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async crearVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVersionDto,
  ) {
    const command = new CreateVersionCommand(
      id,
      dto.motivo_cambio,
      dto.creada_por, // TODO: Obtener de JWT token
    );

    return await this.commandBus.execute(command);
  }

  @Get(':id/versiones')
  @ApiOperation({ summary: 'Listar versiones históricas cotización (más reciente primero)' })
  @ApiResponse({ status: 200, description: 'Listado versiones' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 50 })
  async listarVersiones(
    @Param('id', ParseIntPipe) id: number,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const query = new GetVersionesQuery(
      id,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
    );

    return await this.queryBus.execute(query);
  }

  @Get('versiones/:idVersion')
  @ApiOperation({ summary: 'Obtener detalle completo versión específica (incluye JSONB datos + items)' })
  @ApiResponse({ status: 200, description: 'Detalle versión con snapshot completo' })
  @ApiResponse({ status: 404, description: 'Versión no encontrada' })
  async obtenerVersionDetalle(
    @Param('idVersion', ParseIntPipe) idVersion: number,
  ) {
    const query = new GetVersionDetalleQuery(idVersion);

    return await this.queryBus.execute(query);
  }

  // ==================== FASE 4 - CALCULO AUTOMATICO TOTALES ====================

  @Post(':id/recalcular')
  @ApiOperation({ 
    summary: 'Recalcular todos los totales de la cotización',
    description: 'Recalcula subtotales de items, descuentos, IVA y total. Actualiza la BD automáticamente.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Totales recalculados exitosamente',
    schema: {
      properties: {
        subtotal_servicios: { type: 'string', example: '1500000.00' },
        subtotal_componentes: { type: 'string', example: '500000.00' },
        subtotal_general: { type: 'string', example: '2000000.00' },
        descuento_valor: { type: 'string', example: '200000.00' },
        subtotal_con_descuento: { type: 'string', example: '1800000.00' },
        iva_valor: { type: 'string', example: '342000.00' },
        total_cotizacion: { type: 'string', example: '2142000.00' },
        cantidad_items_servicios: { type: 'number', example: 3 },
        cantidad_items_componentes: { type: 'number', example: 5 },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async recalcularTotales(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.calculoService.recalcularTotales(id);
    return {
      message: 'Totales recalculados exitosamente',
      ...result,
      // Convertir Decimal a string para serialización JSON
      subtotal_servicios: result.subtotal_servicios.toString(),
      subtotal_componentes: result.subtotal_componentes.toString(),
      subtotal_general: result.subtotal_general.toString(),
      descuento_valor: result.descuento_valor.toString(),
      subtotal_con_descuento: result.subtotal_con_descuento.toString(),
      iva_valor: result.iva_valor.toString(),
      total_cotizacion: result.total_cotizacion.toString(),
    };
  }

  @Get(':id/totales')
  @ApiOperation({ 
    summary: 'Obtener totales actuales de la cotización (sin recalcular)',
    description: 'Retorna los valores guardados en BD. Use POST /recalcular para actualizar.'
  })
  @ApiResponse({ status: 200, description: 'Totales actuales' })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async obtenerTotales(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.calculoService.obtenerTotalesActuales(id);
    if (!result) {
      return { error: 'Cotización no encontrada' };
    }
    return {
      subtotal_servicios: result.subtotal_servicios.toString(),
      subtotal_componentes: result.subtotal_componentes.toString(),
      subtotal_general: result.subtotal_general.toString(),
      descuento_valor: result.descuento_valor.toString(),
      subtotal_con_descuento: result.subtotal_con_descuento.toString(),
      iva_valor: result.iva_valor.toString(),
      total_cotizacion: result.total_cotizacion.toString(),
      cantidad_items_servicios: result.cantidad_items_servicios,
      cantidad_items_componentes: result.cantidad_items_componentes,
    };
  }
}
