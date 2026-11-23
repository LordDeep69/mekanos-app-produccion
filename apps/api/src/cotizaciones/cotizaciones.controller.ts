import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
import {
  ActualizarPresentacionPdfDto,
  ConvertirCotizacionOrdenDto,
  CreateItemOtroDto,
  GuardarFirmaCotizacionDto,
  GuardarStudioCompletoDto,
  ReabrirBorradorDto,
  SyncEquiposCotizacionDto,
  UpdateItemOtroDto,
} from './dto/cpq-studio.dto';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { CreateVersionDto } from './dto/versiones/create-version.dto';
import {
  AplicarPlantillaDto,
  GuardarComoPlantillaDto,
  ImportarBomModeloDto,
} from './plantillas/plantillas-cotizacion.dto';
import { PlantillasCotizacionService } from './plantillas/plantillas-cotizacion.service';
import { GetVersionDetalleQuery } from './queries/versiones/get-version-detalle.query';
import { GetVersionesQuery } from './queries/versiones/get-versiones.query';
import { CotizacionCalculoService } from './services/cotizacion-calculo.service';
import { CotizacionesCpqService } from './services/cotizaciones-cpq.service';

interface AuthUser {
  id: number;
  idEmpleado?: number | null;
}

/**
 * COTIZACIONES CONTROLLER (Hub Comercial EAM-CPQ)
 *
 * IMPORTANTE: Todas las rutas estáticas (`sugerencias`, `aprobaciones/*`, `versiones/*`)
 * están declaradas ANTES de las rutas paramétricas `:id` para evitar colisiones de enrutamiento.
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
    private readonly cpqService: CotizacionesCpqService,
    private readonly plantillasService: PlantillasCotizacionService,
  ) {}

  // ==================== RUTAS ESTÁTICAS (SIEMPRE ANTES DE :id) ====================

  @Get('firmas-historial-empleado/:idEmpleado')
  @ApiOperation({
    summary:
      'Firmas digitales estándares e históricas de un empleado/asesor (reutiliza firmas_digitales)',
  })
  @ApiQuery({ name: 'excludeFirmaId', required: false, type: Number })
  async obtenerFirmasHistorialEmpleado(
    @Param('idEmpleado', ParseIntPipe) idEmpleado: number,
    @Query('excludeFirmaId') excludeFirmaIdRaw?: string,
  ) {
    const excludeFirmaId = excludeFirmaIdRaw ? parseInt(excludeFirmaIdRaw, 10) : undefined;
    return this.cpqService.obtenerFirmasHistorialEmpleado(
      idEmpleado,
      Number.isInteger(excludeFirmaId) ? excludeFirmaId : undefined,
    );
  }

  @Get('sugerencias')
  @ApiOperation({
    summary:
      'Smart Match CPQ: detecta equipos gemelos OEM, plantillas sugeridas, BOM y recursos compatibles',
  })
  @ApiQuery({
    name: 'equiposIds',
    required: false,
    description: 'IDs separados por coma (ej. 12,13,14)',
  })
  @ApiQuery({ name: 'tipoCotizacion', required: false })
  async obtenerSugerencias(
    @Query('equiposIds') equiposIdsRaw?: string,
    @Query('tipoCotizacion') tipoCotizacion?: string,
  ) {
    const ids = (equiposIdsRaw || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
    return this.cpqService.obtenerSugerenciasContextuales(ids, tipoCotizacion);
  }

  @Get('aprobaciones/pendientes')
  @ApiOperation({ summary: 'Listar aprobaciones pendientes (Dashboard supervisor/gerente)' })
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
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );
    return await this.queryBus.execute(query);
  }

  @Put('aprobaciones/:id')
  @ApiOperation({ summary: 'Procesar aprobación interna (APROBAR/RECHAZAR)' })
  async procesarAprobacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcesarAprobacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const command = new ProcesarAprobacionCommand(
      id,
      dto.decision,
      user.id,
      dto.observaciones_aprobador,
    );
    return await this.commandBus.execute(command);
  }

  @Get('versiones/:idVersion')
  @ApiOperation({ summary: 'Obtener detalle completo de una versión histórica (JSONB completo)' })
  async obtenerVersionDetalle(@Param('idVersion', ParseIntPipe) idVersion: number) {
    return await this.queryBus.execute(new GetVersionDetalleQuery(idVersion));
  }

  // ==================== CRUD CORE ====================

  @Post()
  @ApiOperation({ summary: 'Crear nueva cotización en estado BORRADOR' })
  @ApiResponse({ status: 201, description: 'Cotización creada exitosamente' })
  async create(@Body() dto: CreateCotizacionDto, @CurrentUser() user: AuthUser) {
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
      {
        atencion_a_nombre: dto.atencion_a_nombre,
        atencion_a_cargo: dto.atencion_a_cargo,
        equipos_ids: dto.equipos_ids,
        tipo_cotizacion: dto.tipo_cotizacion,
        id_plantilla_origen: dto.id_plantilla_origen,
        id_propuesta_origen: dto.id_propuesta_origen,
        moneda: dto.moneda,
        usa_aiu: dto.usa_aiu,
        aiu_admin_porcentaje: dto.aiu_admin_porcentaje,
        aiu_imprevistos_porcentaje: dto.aiu_imprevistos_porcentaje,
        aiu_utilidad_porcentaje: dto.aiu_utilidad_porcentaje,
        iva_sobre_utilidad_aiu: dto.iva_sobre_utilidad_aiu,
        modo_agrupacion_pdf: dto.modo_agrupacion_pdf,
        mostrar_desglose_precios: dto.mostrar_desglose_precios,
        user_id: user.id,
        user_empleado_id: user.idEmpleado,
      },
    );

    return await this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones con filtros' })
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
      clienteId ? parseInt(clienteId, 10) : undefined,
      undefined,
      estadoId ? parseInt(estadoId, 10) : undefined,
      undefined,
      undefined,
      undefined,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );

    return await this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cotización por ID con relaciones completas CPQ' })
  @ApiQuery({ name: 'includeCliente', required: false, type: Boolean })
  @ApiQuery({ name: 'includeItems', required: false, type: Boolean })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeCliente') includeCliente?: string,
    @Query('includeItems') includeItems?: string,
  ) {
    const query = new GetCotizacionByIdQuery(id, {
      cliente: includeCliente !== 'false',
      sede: includeCliente !== 'false',
      equipo: true,
      estado: true,
      items_servicios: includeItems !== 'false',
      items_componentes: includeItems !== 'false',
      aprobaciones: true,
      historial_envios: includeItems === 'true',
    });

    return await this.queryBus.execute(query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar cabecera de cotización (solo BORRADOR)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCotizacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const command = new UpdateCotizacionCommand(
      id,
      user.id,
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
      {
        atencion_a_nombre: dto.atencion_a_nombre,
        atencion_a_cargo: dto.atencion_a_cargo,
        equipos_ids: dto.equipos_ids,
        tipo_cotizacion: dto.tipo_cotizacion,
        moneda: dto.moneda,
        fecha_cotizacion: dto.fecha_cotizacion ? new Date(dto.fecha_cotizacion) : undefined,
        usa_aiu: dto.usa_aiu,
        aiu_admin_porcentaje: dto.aiu_admin_porcentaje,
        aiu_imprevistos_porcentaje: dto.aiu_imprevistos_porcentaje,
        aiu_utilidad_porcentaje: dto.aiu_utilidad_porcentaje,
        iva_sobre_utilidad_aiu: dto.iva_sobre_utilidad_aiu,
        modo_agrupacion_pdf: dto.modo_agrupacion_pdf,
        mostrar_desglose_precios: dto.mostrar_desglose_precios,
      },
    );

    return await this.commandBus.execute(command);
  }

  // ==================== STUDIO CPQ ATÓMICO, EQUIPOS N:M Y OTROS RUBROS ====================

  @Patch(':id/presentacion-pdf')
  @ApiOperation({
    summary:
      'Actualizar preferencia de presentación PDF (Suma Alzada compacta vs Detallado con precios unitarios)',
  })
  async actualizarPresentacionPdf(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPresentacionPdfDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cpqService.actualizarPresentacionPdf(id, dto.mostrar_desglose_precios, user.id);
  }

  @Put(':id/studio')
  @ApiOperation({
    summary:
      'Guardado atómico completo del Studio CPQ (cabecera + equipos + servicios + repuestos + otros rubros + recálculo)',
  })
  async guardarStudio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarStudioCompletoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cpqService.guardarStudioCompleto(id, dto, user.id);
  }

  @Put(':id/equipos')
  @ApiOperation({ summary: 'Sincronizar equipos N:M asociados a la cotización' })
  async syncEquipos(@Param('id', ParseIntPipe) id: number, @Body() dto: SyncEquiposCotizacionDto) {
    return this.cpqService.syncEquipos(id, dto);
  }

  @Get(':id/otros')
  @ApiOperation({
    summary: 'Listar otros rubros (Transporte, Viáticos, Pólizas, Disposición, etc.)',
  })
  async listarOtros(@Param('id', ParseIntPipe) id: number) {
    return this.cpqService.listarItemsOtros(id);
  }

  @Post(':id/otros')
  @ApiOperation({ summary: 'Agregar rubro de logística, viáticos, póliza u otro costo' })
  async crearOtro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateItemOtroDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cpqService.crearItemOtro(id, dto, user.id);
  }

  @Put(':id/otros/:idItem')
  @ApiOperation({ summary: 'Actualizar rubro de logística/viáticos/póliza' })
  async actualizarOtro(
    @Param('id', ParseIntPipe) id: number,
    @Param('idItem', ParseIntPipe) idItem: number,
    @Body() dto: UpdateItemOtroDto,
  ) {
    return this.cpqService.actualizarItemOtro(id, idItem, dto);
  }

  @Delete(':id/otros/:idItem')
  @ApiOperation({ summary: 'Eliminar rubro de logística/viáticos/póliza' })
  async eliminarOtro(
    @Param('id', ParseIntPipe) id: number,
    @Param('idItem', ParseIntPipe) idItem: number,
  ) {
    return this.cpqService.eliminarItemOtro(id, idItem);
  }

  // ==================== PLANTILLAS & BOM OEM EN COTIZACIÓN ====================

  @Post(':id/aplicar-plantilla/:idPlantilla')
  @ApiOperation({
    summary: 'Aplicar plantilla estándar CPQ con auto-escalado N equipos y precios vivos',
  })
  async aplicarPlantilla(
    @Param('id', ParseIntPipe) id: number,
    @Param('idPlantilla', ParseIntPipe) idPlantilla: number,
    @Body() dto: AplicarPlantillaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.plantillasService.aplicarPlantilla(id, idPlantilla, dto || {}, user.id);
  }

  @Post(':id/importar-bom/:idModelo')
  @ApiOperation({
    summary: 'Importar Kit BOM OEM de un modelo de equipo multiplicado por equipos gemelos',
  })
  async importarBom(
    @Param('id', ParseIntPipe) id: number,
    @Param('idModelo', ParseIntPipe) idModelo: number,
    @Body() dto: ImportarBomModeloDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.plantillasService.importarBomModelo(id, idModelo, dto || {}, user.id);
  }

  @Post(':id/guardar-como-plantilla')
  @ApiOperation({
    summary: 'Guardar esta cotización como una nueva plantilla estándar reutilizable',
  })
  async guardarComoPlantilla(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarComoPlantillaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.plantillasService.guardarCotizacionComoPlantilla(id, dto, user.id);
  }

  // ==================== WORKFLOW COMERCIAL & VERSIONADO & Q2O ====================

  @Post(':id/duplicar')
  @ApiOperation({ summary: 'Clonar cotización completa a un nuevo borrador consecutivo' })
  async duplicar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.cpqService.duplicarCotizacion(id, user.id, user.idEmpleado);
  }

  @Post(':id/reabrir-borrador')
  @ApiOperation({
    summary: 'Archivar snapshot de versión y reabrir cotización a BORRADOR para renegociar',
  })
  async reabrirBorrador(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReabrirBorradorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cpqService.reabrirBorrador(id, dto?.motivo_cambio, user.id);
  }

  @Post(':id/solicitar-aprobacion')
  @ApiOperation({
    summary:
      'Solicitar aprobación interna según políticas dinámicas (BORRADOR → EN_REVISION / APROBADA_INTERNA)',
  })
  async solicitarAprobacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SolicitarAprobacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const command = new SolicitarAprobacionCommand(id, dto.observaciones_solicitante, user.id);
    return await this.commandBus.execute(command);
  }

  @Put(':id/enviar')
  @ApiOperation({
    summary: 'Enviar cotización a cliente con PDF corporativo (APROBADA_INTERNA → ENVIADA)',
  })
  async enviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarCotizacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const command = new EnviarCotizacionCommand(
      id,
      dto.destinatario_email,
      dto.destinatario_nombre,
      dto.emails_copia || [],
      user.id,
    );
    return await this.commandBus.execute(command);
  }

  @Put(':id/aprobar')
  @ApiOperation({
    summary: 'Registrar aprobación del cliente y orden de compra PO (ENVIADA → APROBADA_CLIENTE)',
  })
  async aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarCotizacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const command = new AprobarCotizacionCommand(
      id,
      user.id,
      dto.observaciones,
      dto.orden_compra_cliente,
    );
    return await this.commandBus.execute(command);
  }

  @Put(':id/rechazar')
  @ApiOperation({ summary: 'Registrar rechazo del cliente con motivo (ENVIADA → RECHAZADA)' })
  async rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarCotizacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const command = new RechazarCotizacionCommand(
      id,
      dto.id_motivo_rechazo,
      dto.observaciones_rechazo,
      user.id,
    );
    return await this.commandBus.execute(command);
  }

  @Post(':id/convertir-a-orden')
  @ApiOperation({
    summary:
      'Quote-to-Order: convertir cotización APROBADA_CLIENTE en Orden de Servicio multi-equipo con diagnóstico WMS',
  })
  async convertirAOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertirCotizacionOrdenDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cpqService.convertirAOrdenServicio(id, dto || {}, user.id);
  }

  @Post(':id/versiones')
  @ApiOperation({ summary: 'Crear snapshot manual de versión de cotización (auditoría cambios)' })
  async crearVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVersionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const command = new CreateVersionCommand(id, dto.motivo_cambio, user.id ?? dto.creada_por);
    return await this.commandBus.execute(command);
  }

  @Get(':id/versiones')
  @ApiOperation({ summary: 'Listar versiones históricas de la cotización' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 50 })
  async listarVersiones(
    @Param('id', ParseIntPipe) id: number,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return await this.queryBus.execute(
      new GetVersionesQuery(id, skip ? parseInt(skip, 10) : 0, take ? parseInt(take, 10) : 50),
    );
  }

  // ==================== FIRMAS DIGITALES OPCIONALES ====================

  @Put(':id/firmas/:tipo')
  @ApiOperation({
    summary: 'Adjuntar o actualizar firma digital opcional (ASESOR o CLIENTE) en la cotización',
  })
  async guardarFirmaCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('tipo') tipo: string,
    @Body() dto: GuardarFirmaCotizacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cpqService.guardarFirmaCotizacion(id, tipo, dto, user.id);
  }

  @Delete(':id/firmas/:tipo')
  @ApiOperation({
    summary: 'Desvincular firma digital opcional (ASESOR o CLIENTE) de la cotización',
  })
  async eliminarFirmaCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('tipo') tipo: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cpqService.eliminarFirmaCotizacion(id, tipo, user.id);
  }

  // ==================== MOTOR FINANCIERO ====================

  @Post(':id/recalcular')
  @ApiOperation({
    summary: 'Recalcular todos los totales, AIU, IVA y rentabilidad privada de la cotización',
  })
  async recalcularTotales(@Param('id', ParseIntPipe) id: number) {
    const result = await this.calculoService.recalcularTotales(id);
    return {
      message: 'Totales recalculados exitosamente',
      subtotal_servicios: result.subtotal_servicios.toString(),
      subtotal_componentes: result.subtotal_componentes.toString(),
      subtotal_otros: result.subtotal_otros.toString(),
      subtotal_general: result.subtotal_general.toString(),
      subtotal_opcionales: result.subtotal_opcionales.toString(),
      descuento_valor: result.descuento_valor.toString(),
      subtotal_con_descuento: result.subtotal_con_descuento.toString(),
      usa_aiu: result.usa_aiu,
      aiu_admin_valor: result.aiu_admin_valor.toString(),
      aiu_imprevistos_valor: result.aiu_imprevistos_valor.toString(),
      aiu_utilidad_valor: result.aiu_utilidad_valor.toString(),
      aiu_valor_total: result.aiu_valor_total.toString(),
      iva_sobre_utilidad_aiu: result.iva_sobre_utilidad_aiu,
      iva_porcentaje: result.iva_porcentaje.toString(),
      iva_valor: result.iva_valor.toString(),
      total_cotizacion: result.total_cotizacion.toString(),
      costo_total_estimado: result.costo_total_estimado.toString(),
      utilidad_bruta_estimada: result.utilidad_bruta_estimada.toString(),
      margen_bruto_porcentaje: result.margen_bruto_porcentaje.toString(),
      cantidad_items_servicios: result.cantidad_items_servicios,
      cantidad_items_componentes: result.cantidad_items_componentes,
      cantidad_items_otros: result.cantidad_items_otros,
    };
  }

  @Get(':id/totales')
  @ApiOperation({ summary: 'Obtener totales actuales de la cotización (sin recalcular)' })
  async obtenerTotales(@Param('id', ParseIntPipe) id: number) {
    const result = await this.calculoService.obtenerTotalesActuales(id);
    if (!result) {
      return { error: 'Cotización no encontrada' };
    }
    return {
      subtotal_servicios: result.subtotal_servicios.toString(),
      subtotal_componentes: result.subtotal_componentes.toString(),
      subtotal_otros: result.subtotal_otros.toString(),
      subtotal_general: result.subtotal_general.toString(),
      subtotal_opcionales: result.subtotal_opcionales.toString(),
      descuento_valor: result.descuento_valor.toString(),
      subtotal_con_descuento: result.subtotal_con_descuento.toString(),
      usa_aiu: result.usa_aiu,
      aiu_valor_total: result.aiu_valor_total.toString(),
      iva_valor: result.iva_valor.toString(),
      total_cotizacion: result.total_cotizacion.toString(),
      costo_total_estimado: result.costo_total_estimado.toString(),
      utilidad_bruta_estimada: result.utilidad_bruta_estimada.toString(),
      margen_bruto_porcentaje: result.margen_bruto_porcentaje.toString(),
      cantidad_items_servicios: result.cantidad_items_servicios,
      cantidad_items_componentes: result.cantidad_items_componentes,
      cantidad_items_otros: result.cantidad_items_otros,
    };
  }
}
