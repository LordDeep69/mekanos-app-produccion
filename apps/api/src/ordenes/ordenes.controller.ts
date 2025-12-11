import { PrismaService } from '@mekanos/database';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Commands
import { AprobarOrdenCommand } from './commands/aprobar-orden.command';
import { AsignarTecnicoCommand } from './commands/asignar-tecnico.command';
import { CambiarEstadoOrdenCommand } from './commands/cambiar-estado-orden.command';
import { CancelarOrdenCommand } from './commands/cancelar-orden.command';
import { CreateOrdenCommand } from './commands/create-orden.command';
import { FinalizarOrdenCommand } from './commands/finalizar-orden.command';
import { IniciarOrdenCommand } from './commands/iniciar-orden.command';
import { ProgramarOrdenCommand } from './commands/programar-orden.command';

// Queries
import { GetOrdenByIdQuery } from './queries/get-orden-by-id.query';
import { GetOrdenesQuery } from './queries/get-ordenes.query';

// DTOs
import { AsignarTecnicoDto } from './dto/asignar-tecnico.dto';
import { CambiarEstadoOrdenDto } from './dto/cambiar-estado-orden.dto';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { FinalizarOrdenCompletoDto } from './dto/finalizar-orden-completo.dto';
import { ProgramarOrdenDto } from './dto/programar-orden.dto';

// Services
import { FinalizacionOrdenService } from './services/finalizacion-orden.service';

// Decorators
import { UserId } from './decorators/user-id.decorator';

/**
 * OrdenesController - FASE 3
 * 
 * Controlador REST para órdenes de servicio
 * Endpoints: 10 operaciones CRUD + Workflow
 * 
 * POST   /api/ordenes               - Crear orden
 * GET    /api/ordenes               - Listar con filtros
 * GET    /api/ordenes/:id           - Detalle orden
 * PATCH  /api/ordenes/:id/estado    - Cambiar estado (FSM unificado)
 * PUT    /api/ordenes/:id/programar - Programar fecha/hora
 * PUT    /api/ordenes/:id/asignar   - Asignar técnico
 * PUT    /api/ordenes/:id/iniciar   - Iniciar ejecución
 * PUT    /api/ordenes/:id/aprobar   - Aprobar cierre
 * PUT    /api/ordenes/:id/cancelar   - Cancelar orden
 */
@ApiTags('FASE 3 - Órdenes de Servicio')
@ApiBearerAuth('JWT-auth')
@Controller('ordenes')
export class OrdenesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly finalizacionService: FinalizacionOrdenService,
  ) { }

  /**
   * GET /api/ordenes/estados-debug
   * DEBUG: Listar estados
   */
  @Get('estados-debug')
  async getEstadosDebug() {
    return this.prisma.estados_orden.findMany();
  }

  /**
   * POST /api/ordenes
   * Crea una nueva orden de servicio en estado PROGRAMADA
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrdenDto,
    @UserId() userId: number
  ) {
    const command = new CreateOrdenCommand(
      dto.equipoId,
      dto.clienteId,
      dto.tipoServicioId,
      dto.sedeClienteId,
      dto.descripcion,
      dto.prioridad,
      dto.fechaProgramada ? new Date(dto.fechaProgramada) : undefined,
      userId
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden de servicio creada exitosamente',
      data: result, // Ya es objeto plain desde Prisma repository
    };
  }

  /**
   * GET /api/ordenes
   * Lista órdenes con paginación y filtros
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idCliente') idCliente?: string,
    @Query('idEquipo') idEquipo?: string,
    @Query('idTecnico') idTecnico?: string,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
  ) {
    const query = new GetOrdenesQuery(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      idCliente ? parseInt(idCliente, 10) : undefined,
      idEquipo ? parseInt(idEquipo, 10) : undefined,
      idTecnico ? parseInt(idTecnico, 10) : undefined,
      estado,
      prioridad,
    );

    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Órdenes obtenidas exitosamente',
      data: result.ordenes,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * GET /api/ordenes/:id
   * Obtiene detalle de una orden por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.queryBus.execute(new GetOrdenByIdQuery(parseInt(id, 10)));

    return {
      success: true,
      message: 'Orden obtenida exitosamente',
      data: result,
    };
  }

  /**
   * PATCH /api/ordenes/:id/estado
   * Cambia el estado de una orden usando FSM (Finite State Machine)
   * Valida transiciones permitidas y registra en historial automáticamente
   */
  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cambiar estado de orden',
    description: `
      Endpoint unificado para cambiar el estado de una orden de servicio.
      Utiliza una Máquina de Estados Finitos (FSM) para validar transiciones.
      
      **Transiciones permitidas:**
      - PROGRAMADA → ASIGNADA, CANCELADA
      - ASIGNADA → EN_PROCESO, EN_ESPERA_REPUESTO, PROGRAMADA, CANCELADA
      - EN_PROCESO → COMPLETADA, EN_ESPERA_REPUESTO, CANCELADA
      - EN_ESPERA_REPUESTO → ASIGNADA, EN_PROCESO, CANCELADA
      - COMPLETADA → APROBADA, EN_PROCESO, CANCELADA
      - APROBADA → (estado final)
      - CANCELADA → (estado final)
      
      **Historial:** Cada cambio se registra automáticamente en historial_estados_orden.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  @ApiResponse({ status: 400, description: 'Transición no permitida o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoOrdenDto,
    @UserId() userId: number,
  ) {
    const command = new CambiarEstadoOrdenCommand(
      parseInt(id, 10),
      dto.nuevoEstado,
      userId || 1, // Fallback si JWT no disponible
      dto.motivo,
      dto.observaciones,
      {
        tecnicoId: dto.tecnicoId,
        aprobadorId: dto.aprobadorId,
      },
    );

    const result = await this.commandBus.execute(command);

    return {
      success: result.success,
      message: result.mensaje,
      data: {
        ordenId: result.ordenId,
        estadoAnterior: result.estadoAnterior,
        estadoNuevo: result.estadoNuevo,
        historialId: result.historialId,
        timestamp: result.timestamp,
      },
    };
  }

  /**
   * PUT /api/ordenes/:id/programar
   * Programa fecha y hora de la orden
   * Estado: PROGRAMADA → PROGRAMADA (actualiza fecha)
   */
  @Put(':id/programar')
  async programar(@Param('id') id: string, @Body() dto: ProgramarOrdenDto) {
    const command = new ProgramarOrdenCommand(
      id,
      new Date(dto.fechaProgramada),
      dto.observaciones
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden programada exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes/:id/asignar
   * Asigna técnico y supervisor a la orden
   * Estado: PROGRAMADA → ASIGNADA
   */
  @Put(':id/asignar')
  async asignarTecnico(@Param('id') id: string, @Body() dto: AsignarTecnicoDto) {
    const command = new AsignarTecnicoCommand(
      id,
      dto.tecnicoId
    );

    const result = await this.commandBus.execute(command);
    console.log('[OrdenesController] Command executed, returning simplified response');

    // SIMPLIFY RESPONSE TO AVOID CIRCULAR REFS OR HUGE PAYLOAD
    return {
      success: true,
      message: 'Técnico asignado exitosamente',
      data: {
        id_orden_servicio: result.id_orden_servicio,
        numero_orden: result.numero_orden,
        estado: result.estado,
        tecnico: result.tecnico ? {
          id_empleado: result.tecnico.id_empleado,
          persona: result.tecnico.persona
        } : null
      },
    };
  }

  /**
   * PUT /api/ordenes/:id/iniciar
   * Inicia la ejecución de la orden
   * Estado: ASIGNADA → EN_PROCESO
   */
  @Put(':id/iniciar')
  async iniciar(@Param('id') id: string) {
    const command = new IniciarOrdenCommand(id);

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden iniciada exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes/:id/finalizar
   * Finaliza la ejecución de la orden
   * Estado: EN_PROCESO → COMPLETADA
   * 
   * ACCIONES AUTOMÁTICAS:
   * - Genera PDF del informe de servicio
   * - Sube PDF a Cloudflare R2
   * - Envía email al cliente con el informe adjunto
   */
  @Put(':id/finalizar')
  @ApiOperation({
    summary: 'Finalizar orden de servicio',
    description: `
      Finaliza la ejecución de una orden de servicio.
      
      **Transición de estado:** EN_PROCESO → COMPLETADA
      
      **Acciones automáticas (background):**
      1. Genera PDF del informe técnico
      2. Sube PDF a Cloudflare R2
      3. Envía email al cliente con el informe adjunto
      
      Estas acciones se ejecutan en background y no bloquean la respuesta.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({ status: 200, description: 'Orden finalizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Orden no está en estado EN_PROCESO' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async finalizar(
    @Param('id') id: string,
    @Body() dto: { observaciones?: string },
  ) {
    const command = new FinalizarOrdenCommand(id, dto.observaciones);

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden finalizada exitosamente. El PDF y email se generarán en background.',
      data: result.toObject ? result.toObject() : result,
    };
  }

  /**
   * PUT /api/ordenes/:id/aprobar
   * Aprueba el cierre de la orden
   * Estado: COMPLETADA → APROBADA
   */
  @Put(':id/aprobar')
  async aprobar(@Param('id') id: string) {
    const command = new AprobarOrdenCommand(
      parseInt(id, 10),
      1, // TODO: obtener userId desde JWT
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden aprobada exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes/:id/cancelar
   * Cancela la orden con motivo
   * Estado: CUALQUIERA → CANCELADA
   */
  @Put(':id/cancelar')
  async cancelar(
    @Param('id') id: string,
    @Body() dto: { motivo?: string },
  ) {
    const command = new CancelarOrdenCommand(
      parseInt(id, 10),
      dto.motivo || 'Sin motivo especificado',
      1, // TODO: obtener userId desde JWT
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden cancelada exitosamente',
      data: result,
    };
  }

  /**
   * ==========================================================================
   * POST /api/ordenes/:id/finalizar-completo
   * ==========================================================================
   * 
   * ENDPOINT PRINCIPAL DE FINALIZACIÓN - FLUJO COMPLETO
   * 
   * Este endpoint ejecuta TODO el flujo de finalización de una orden:
   * 1. Sube evidencias fotográficas a Cloudinary
   * 2. Registra evidencias en BD con hash SHA256
   * 3. Registra firmas digitales (técnico + cliente)
   * 4. Genera PDF profesional con template MEKANOS
   * 5. Sube PDF a Cloudflare R2
   * 6. Registra documento en BD
   * 7. Envía email al cliente con PDF adjunto
   * 8. Actualiza estado de la orden a COMPLETADA
   * 
   * USO DESDE FRONTEND:
   * - La app móvil del técnico envía todos los datos en una sola request
   * - Incluye evidencias en Base64, firmas digitales, actividades, mediciones
   * - El backend procesa todo de forma atómica con rollback en caso de error
   */
  @Post(':id/finalizar-completo')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalizar orden de servicio - Flujo Completo',
    description: `
      Ejecuta el flujo completo de finalización de una orden de servicio.
      Incluye subida de evidencias, generación de PDF, envío de email y actualización de estado.
      
      **Datos requeridos:**
      - Evidencias fotográficas (ANTES, DURANTE, DESPUES) en Base64
      - Firma del técnico en Base64
      - Actividades ejecutadas con sus resultados
      - Hora de entrada y salida
      - Observaciones del servicio
      
      **Datos opcionales:**
      - Firma del cliente
      - Mediciones realizadas
      - Datos del módulo de control (generadores)
      - Email adicional para copia
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Orden finalizada exitosamente. PDF generado y email enviado.'
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o incompletos' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 500, description: 'Error en el procesamiento' })
  async finalizarCompleto(
    @Param('id') id: string,
    @Body() dto: FinalizarOrdenCompletoDto,
    @UserId() userId: number,
  ) {
    // ═══════════════════════════════════════════════════════════════════
    // 🔬 LOG FORENSE - DATOS RECIBIDOS DEL MOBILE
    // ═══════════════════════════════════════════════════════════════════
    console.log('');
    console.log('🔬 ═══════════════════════════════════════════════════════════════');
    console.log('🔬 LOG FORENSE BACKEND - DATOS RECIBIDOS');
    console.log('🔬 ═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 EVIDENCIAS recibidas:', dto.evidencias?.length || 0);
    dto.evidencias?.slice(0, 3).forEach((ev, i) => {
      console.log(`   [${i}] tipo="${ev.tipo}", base64=${ev.base64?.length || 0} chars`);
    });
    console.log('');
    console.log('✍️ FIRMAS:');
    console.log(`   tecnico: tipo="${dto.firmas?.tecnico?.tipo}", idPersona=${dto.firmas?.tecnico?.idPersona}`);
    console.log(`   cliente: ${dto.firmas?.cliente ? `tipo="${dto.firmas.cliente.tipo}"` : 'NO ENVIADA'}`);
    console.log('');
    console.log('📝 ACTIVIDADES recibidas:', dto.actividades?.length || 0);
    dto.actividades?.slice(0, 3).forEach((act, i) => {
      console.log(`   [${i}] sistema="${act.sistema}", resultado="${act.resultado}"`);
    });
    console.log('');
    console.log('📏 MEDICIONES:', dto.mediciones?.length || 0);
    console.log(`⏰ HORA ENTRADA: "${dto.horaEntrada}"`);
    console.log(`⏰ HORA SALIDA: "${dto.horaSalida}"`);
    console.log(`📝 OBSERVACIONES: "${dto.observaciones?.substring(0, 50)}..."`);
    console.log('');
    console.log('🔬 ═══════════════════════════════════════════════════════════════');
    console.log('');

    // Construir DTO interno con ID de orden
    const finalizarDto = {
      idOrden: parseInt(id, 10),
      evidencias: dto.evidencias.map(e => ({
        tipo: e.tipo as 'ANTES' | 'DURANTE' | 'DESPUES' | 'MEDICION',
        base64: e.base64,
        descripcion: e.descripcion,
        formato: e.formato,
      })),
      firmas: {
        tecnico: {
          tipo: 'TECNICO' as const,
          base64: dto.firmas.tecnico.base64,
          idPersona: dto.firmas.tecnico.idPersona,
          formato: dto.firmas.tecnico.formato,
        },
        cliente: dto.firmas.cliente ? {
          tipo: 'CLIENTE' as const,
          base64: dto.firmas.cliente.base64,
          idPersona: dto.firmas.cliente.idPersona,
          formato: dto.firmas.cliente.formato,
        } : undefined,
      },
      actividades: dto.actividades.map(a => ({
        sistema: a.sistema,
        descripcion: a.descripcion,
        resultado: a.resultado as 'B' | 'M' | 'C' | 'N/A',
        observaciones: a.observaciones,
      })),
      mediciones: dto.mediciones?.map(m => ({
        parametro: m.parametro,
        valor: m.valor,
        unidad: m.unidad,
        nivelAlerta: m.nivelAlerta as 'OK' | 'WARNING' | 'CRITICAL' | undefined,
      })),
      observaciones: dto.observaciones,
      datosModulo: dto.datosModulo,
      horaEntrada: dto.horaEntrada,
      horaSalida: dto.horaSalida,
      emailAdicional: dto.emailAdicional,
      usuarioId: userId || 1, // Fallback si JWT no disponible
    };

    // Ejecutar flujo completo de finalización
    const result = await this.finalizacionService.finalizarOrden(finalizarDto);

    return {
      success: result.success,
      message: result.mensaje,
      data: result.datos,
      tiempoTotal: `${result.tiempoTotal}ms`,
    };
  }

}
