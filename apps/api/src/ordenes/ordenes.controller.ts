import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
import { UpdateOrdenCommand } from './commands/update-orden.command';

// Queries
import { GetOrdenByIdQuery } from './queries/get-orden-by-id.query';
import { GetOrdenesQuery } from './queries/get-ordenes.query';

// DTOs
import { AsignarTecnicoDto } from './dto/asignar-tecnico.dto';
import { CambiarEstadoOrdenDto } from './dto/cambiar-estado-orden.dto';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { FinalizarOrdenCompletoDto } from './dto/finalizar-orden-completo.dto';
import { AddActividadPlanDto, UpdateActividadPlanDto } from './dto/plan-actividades.dto';
import { ProgramarOrdenDto } from './dto/programar-orden.dto';

// Services
import { FinalizacionOrdenService, ProgressEvent } from './services/finalizacion-orden.service';

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

  @Get(':id/plan-actividades')
  @UseGuards(JwtAuthGuard)
  async getPlanActividades(@Param('id', ParseIntPipe) id: number) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    const plan = await this.prisma.ordenes_actividades_plan.findMany({
      where: { id_orden_servicio: id },
      orderBy: { orden_secuencia: 'asc' },
    });

    return {
      success: true,
      data: plan,
    };
  }

  @Put(':id/plan-actividades')
  @UseGuards(JwtAuthGuard)
  async replacePlanActividades(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      actividades?: Array<{
        idActividadCatalogo: number;
        ordenSecuencia?: number;
        esObligatoria?: boolean;
      }>;
    },
    @UserId() userId: number,
  ) {
    const actividades = body?.actividades;

    if (!Array.isArray(actividades)) {
      throw new BadRequestException('Debe enviar actividades como array');
    }

    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ordenes_actividades_plan.deleteMany({
        where: { id_orden_servicio: id },
      });

      if (actividades.length > 0) {
        await tx.ordenes_actividades_plan.createMany({
          data: actividades.map((a, index) => {
            if (!a || typeof a.idActividadCatalogo !== 'number') {
              throw new BadRequestException(
                'Cada actividad debe tener idActividadCatalogo numérico',
              );
            }
            const ordenSecuencia =
              typeof a.ordenSecuencia === 'number'
                ? a.ordenSecuencia
                : index + 1;

            return {
              id_orden_servicio: id,
              id_actividad_catalogo: a.idActividadCatalogo,
              orden_secuencia: ordenSecuencia,
              origen: 'ADMIN',
              es_obligatoria:
                typeof a.esObligatoria === 'boolean' ? a.esObligatoria : true,
              creado_por: userId || null,
            };
          }),
          skipDuplicates: true,
        });
      }
    });

    return {
      success: true,
      message: 'Plan de actividades actualizado',
    };
  }

  @Put(':id/plan-actividades/default')
  @UseGuards(JwtAuthGuard)
  async applyDefaultPlanActividades(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true, id_tipo_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (!orden.id_tipo_servicio) {
      throw new BadRequestException('La orden no tiene tipo de servicio');
    }

    const actividadesCatalogo = await this.prisma.catalogo_actividades.findMany({
      where: {
        id_tipo_servicio: orden.id_tipo_servicio,
        activo: true,
      },
      orderBy: { orden_ejecucion: 'asc' },
    });

    if (actividadesCatalogo.length === 0) {
      throw new BadRequestException(
        'No hay actividades en catálogo para el tipo de servicio de la orden',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ordenes_actividades_plan.deleteMany({
        where: { id_orden_servicio: id },
      });

      await tx.ordenes_actividades_plan.createMany({
        data: actividadesCatalogo.map((a, index) => ({
          id_orden_servicio: id,
          id_actividad_catalogo: a.id_actividad_catalogo,
          orden_secuencia: a.orden_ejecucion ?? index + 1,
          origen: 'ADMIN',
          es_obligatoria: a.es_obligatoria ?? true,
          creado_por: userId || null,
        })),
        skipDuplicates: true,
      });
    });

    return {
      success: true,
      message: 'Plan de actividades default aplicado',
      total: actividadesCatalogo.length,
    };
  }

  @Delete(':id/plan-actividades')
  @UseGuards(JwtAuthGuard)
  async clearPlanActividades(@Param('id', ParseIntPipe) id: number) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    await this.prisma.ordenes_actividades_plan.deleteMany({
      where: { id_orden_servicio: id },
    });

    return {
      success: true,
      message: 'Plan de actividades eliminado',
    };
  }

  @Post(':id/plan-actividades/actividad')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Añadir actividad individual al plan' })
  async addActividadIndividual(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddActividadPlanDto,
    @UserId() userId: number,
  ) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Validar que la actividad existe en el catálogo
    const actividadCat = await this.prisma.catalogo_actividades.findUnique({
      where: { id_actividad_catalogo: dto.idActividadCatalogo },
    });

    if (!actividadCat) {
      throw new BadRequestException('La actividad no existe en el catálogo');
    }

    // Evitar duplicados (UK en BD)
    const existe = await this.prisma.ordenes_actividades_plan.findUnique({
      where: {
        id_orden_servicio_id_actividad_catalogo: {
          id_orden_servicio: id,
          id_actividad_catalogo: dto.idActividadCatalogo,
        },
      },
    });

    if (existe) {
      throw new BadRequestException('Esta actividad ya está en el plan de la orden');
    }

    // Calcular secuencia si no se provee
    let secuencia = dto.ordenSecuencia;
    if (secuencia === undefined) {
      const lastAct = await this.prisma.ordenes_actividades_plan.findFirst({
        where: { id_orden_servicio: id },
        orderBy: { orden_secuencia: 'desc' },
      });
      secuencia = (lastAct?.orden_secuencia ?? 0) + 1;
    }

    const nuevaAct = await this.prisma.ordenes_actividades_plan.create({
      data: {
        id_orden_servicio: id,
        id_actividad_catalogo: dto.idActividadCatalogo,
        orden_secuencia: secuencia,
        es_obligatoria: dto.esObligatoria ?? true,
        origen: (dto.origen as any) || 'ADMIN',
        creado_por: userId,
      },
      include: {
        catalogo_actividades: true,
      },
    });

    return {
      success: true,
      message: 'Actividad añadida al plan',
      data: nuevaAct,
    };
  }

  @Patch(':id/plan-actividades/actividad/:actividadPlanId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar actividad individual del plan' })
  async updateActividadIndividual(
    @Param('id', ParseIntPipe) id: number,
    @Param('actividadPlanId', ParseIntPipe) actividadPlanId: number,
    @Body() dto: UpdateActividadPlanDto,
    @UserId() userId: number,
  ) {
    const actividad = await this.prisma.ordenes_actividades_plan.findFirst({
      where: {
        id_orden_actividad_plan: actividadPlanId,
        id_orden_servicio: id,
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada en el plan de esta orden');
    }

    const actualizada = await this.prisma.ordenes_actividades_plan.update({
      where: { id_orden_actividad_plan: actividadPlanId },
      data: {
        orden_secuencia: dto.ordenSecuencia,
        es_obligatoria: dto.esObligatoria,
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
    });

    return {
      success: true,
      message: 'Actividad del plan actualizada',
      data: actualizada,
    };
  }

  @Delete(':id/plan-actividades/actividad/:actividadPlanId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar actividad individual del plan' })
  async removeActividadIndividual(
    @Param('id', ParseIntPipe) id: number,
    @Param('actividadPlanId', ParseIntPipe) actividadPlanId: number,
  ) {
    const actividad = await this.prisma.ordenes_actividades_plan.findFirst({
      where: {
        id_orden_actividad_plan: actividadPlanId,
        id_orden_servicio: id,
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada en el plan de esta orden');
    }

    await this.prisma.ordenes_actividades_plan.delete({
      where: { id_orden_actividad_plan: actividadPlanId },
    });

    return {
      success: true,
      message: 'Actividad eliminada del plan',
    };
  }

  @Get(':id/actividades')
  @UseGuards(JwtAuthGuard)
  async getActividadesEjecutadas(@Param('id', ParseIntPipe) id: number) {
    const actividades = await this.prisma.actividades_ejecutadas.findMany({
      where: { id_orden_servicio: id },
      include: {
        catalogo_actividades: true,
        empleados: { include: { persona: true } },
      },
      orderBy: { fecha_ejecucion: 'desc' },
    });

    return {
      success: true,
      data: actividades,
    };
  }

  @Get(':id/mediciones')
  @UseGuards(JwtAuthGuard)
  async getMediciones(@Param('id', ParseIntPipe) id: number) {
    const mediciones = await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio: id },
      include: {
        parametros_medicion: true,
      },
      orderBy: { fecha_medicion: 'desc' },
    });

    return {
      success: true,
      data: mediciones,
    };
  }

  /**
   * GET /api/ordenes/:id/servicios
   * Obtener detalles de servicios comerciales de una orden
   */
  @Get(':id/servicios')
  @UseGuards(JwtAuthGuard)
  async getServicios(@Param('id', ParseIntPipe) id: number) {
    const servicios = await this.prisma.detalle_servicios_orden.findMany({
      where: { id_orden_servicio: id },
      include: {
        catalogo_servicios: true,
      },
      orderBy: { fecha_registro: 'desc' },
    });

    return {
      success: true,
      data: servicios,
    };
  }

  @Get(':id/evidencias')
  @UseGuards(JwtAuthGuard)
  async getEvidencias(@Param('id', ParseIntPipe) id: number) {
    const evidencias = await this.prisma.evidencias_fotograficas.findMany({
      where: { id_orden_servicio: id },
      include: {
        actividades_ejecutadas: {
          include: {
            catalogo_actividades: true,
          },
        },
      },
      orderBy: { fecha_captura: 'desc' },
    });

    // Mapear para incluir descripción de actividad en la respuesta
    const evidenciasConActividad = evidencias.map((ev) => ({
      ...ev,
      actividad_asociada: ev.actividades_ejecutadas
        ? {
          id_actividad: ev.actividades_ejecutadas.id_actividad_ejecutada,
          descripcion_actividad:
            ev.actividades_ejecutadas.catalogo_actividades?.descripcion_actividad ||
            ev.actividades_ejecutadas.observaciones ||
            null,
        }
        : null,
    }));

    return {
      success: true,
      data: evidenciasConActividad,
    };
  }

  @Get(':id/firmas')
  @UseGuards(JwtAuthGuard)
  async getFirmas(@Param('id', ParseIntPipe) id: number) {
    // ✅ FIX 05-ENE-2026: Obtener firmas ESPECÍFICAS de esta orden
    // Antes: Buscaba "la última firma del técnico" mezclando firmas entre órdenes
    // Ahora: Usa id_firma_tecnico e id_firma_cliente vinculados a cada orden

    // Usar $queryRaw para acceder a id_firma_tecnico (campo nuevo no en Prisma Client aún)
    const ordenData = await this.prisma.$queryRaw<any[]>`
      SELECT id_firma_cliente, id_firma_tecnico, nombre_quien_recibe, cargo_quien_recibe 
      FROM ordenes_servicio WHERE id_orden_servicio = ${id}
    `;

    if (!ordenData || ordenData.length === 0) {
      throw new NotFoundException('Orden no encontrada');
    }
    const orden = ordenData[0];

    // Recolectar IDs de firmas vinculadas a ESTA orden específica
    const idsFirmas: number[] = [];
    if (orden.id_firma_tecnico) idsFirmas.push(orden.id_firma_tecnico);
    if (orden.id_firma_cliente) idsFirmas.push(orden.id_firma_cliente);

    let firmasOrden: any[] = [];

    if (idsFirmas.length > 0) {
      // ✅ Órdenes NUEVAS: Usar FKs vinculadas
      firmasOrden = await this.prisma.firmas_digitales.findMany({
        where: { id_firma_digital: { in: idsFirmas } },
        include: { persona: true },
      });
    } else {
      // ✅ FALLBACK para órdenes ANTIGUAS (sin FK vinculada)
      // Buscar firmas por id_persona del técnico asignado + última firma del cliente
      const ordenCompleta = await this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: id },
        select: {
          id_tecnico_asignado: true,
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
            select: { id_persona: true }
          }
        },
      });

      const idPersonaTecnico = ordenCompleta?.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_persona;

      if (idPersonaTecnico) {
        // Buscar última firma del técnico
        const firmaTecnico = await this.prisma.firmas_digitales.findFirst({
          where: { id_persona: idPersonaTecnico, tipo_firma: 'TECNICO' },
          orderBy: { fecha_registro: 'desc' },
          include: { persona: true },
        });
        if (firmaTecnico) firmasOrden.push(firmaTecnico);
      }

      // Buscar firma del cliente (si hay id_firma_cliente aunque sea null el técnico)
      if (orden.id_firma_cliente) {
        const firmaCliente = await this.prisma.firmas_digitales.findUnique({
          where: { id_firma_digital: orden.id_firma_cliente },
          include: { persona: true },
        });
        if (firmaCliente) firmasOrden.push(firmaCliente);
      }
    }

    // Mapear para incluir nombre_firmante desde persona
    const firmasConNombre = firmasOrden.map(f => ({
      ...f,
      nombre_firmante: f.persona
        ? `${(f.persona as any).primer_nombre || (f.persona as any).nombres || ''} ${(f.persona as any).primer_apellido || (f.persona as any).apellidos || ''}`.trim()
        : (f.tipo_firma === 'CLIENTE' ? orden.nombre_quien_recibe : 'Sin nombre'),
      cargo_firmante: f.tipo_firma === 'TECNICO'
        ? 'Técnico Responsable'
        : (orden.cargo_quien_recibe || 'Cliente / Autorizador'),
    }));

    return {
      success: true,
      data: firmasConNombre,
    };
  }

  /**
   * GET /api/ordenes/:id/pdf-url
   * Obtiene la URL del PDF del informe de servicio (sin generar)
   */
  @Get(':id/pdf-url')
  @UseGuards(JwtAuthGuard)
  async getPdfUrl(@Param('id', ParseIntPipe) id: number) {
    console.log(`[PDF-URL] Buscando URL del PDF para orden id=${id}`);

    // Buscar documento PDF directamente por id_referencia (= id_orden_servicio)
    const documento = await this.prisma.documentos_generados.findFirst({
      where: {
        id_referencia: id,
        tipo_documento: 'INFORME_SERVICIO',
      },
      orderBy: { fecha_generacion: 'desc' },
      select: {
        id_documento: true,
        ruta_archivo: true,
        fecha_generacion: true,
        numero_documento: true,
      },
    });

    console.log(`[PDF] Resultado para orden ${id}:`, documento ? documento.ruta_archivo : 'NO ENCONTRADO');

    return {
      success: true,
      data: documento ? {
        url: documento.ruta_archivo,
        fecha: documento.fecha_generacion,
        numero: documento.numero_documento,
      } : null,
    };
  }

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
    const tecnicoId = dto.id_tecnico_asignado || dto.tecnicoId;
    const equiposIds = dto.equipos_ids || [dto.id_equipo];

    const command = new CreateOrdenCommand(
      dto.id_cliente,
      equiposIds,
      dto.id_tipo_servicio,
      dto.id_sede_cliente,
      dto.descripcion_inicial,
      dto.prioridad,
      // ✅ FIX TIMEZONE: Agregar T12:00:00 para evitar offset de día
      // "2026-01-05" → "2026-01-05T12:00:00" (mediodía evita problemas de timezone)
      dto.fecha_programada ? new Date(`${dto.fecha_programada}T12:00:00`) : undefined,
      tecnicoId,
      userId
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: tecnicoId
        ? 'Orden de servicio creada y técnico asignado exitosamente'
        : 'Orden de servicio creada exitosamente',
      data: result,
    };
  }

  /**
   * GET /api/ordenes
   * Lista órdenes con paginación, filtros y ordenamiento
   * 
   * ENTERPRISE: Soporta sortBy, sortOrder, tipoServicioId, fechaDesde, fechaHasta
   * ✅ 31-ENE-2026: MULTI-ASESOR - Filtrar por clientes asignados al asesor
   */
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idCliente') idCliente?: string,
    @Query('idEquipo') idEquipo?: string,
    @Query('idTecnico') idTecnico?: string,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('tipoServicioId') tipoServicioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    // ✅ MULTI-ASESOR: Filtrar por asesor si NO es admin
    const idAsesorFiltro = user?.esAdmin ? undefined : user?.idEmpleado;

    const query = new GetOrdenesQuery(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      idCliente ? parseInt(idCliente, 10) : undefined,
      idEquipo ? parseInt(idEquipo, 10) : undefined,
      idTecnico ? parseInt(idTecnico, 10) : undefined,
      estado,
      prioridad,
      sortBy || 'fecha_creacion',
      sortOrder || 'desc',
      tipoServicioId ? parseInt(tipoServicioId, 10) : undefined,
      fechaDesde,
      fechaHasta,
      idAsesorFiltro, // ✅ MULTI-ASESOR
      busqueda, // ✅ BÚSQUEDA
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
   * PUT /api/ordenes/:id
   * Actualiza campos editables de una orden
   * Solo permite edición si el estado actual NO es final (APROBADA, CANCELADA)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar orden de servicio',
    description: `
      Actualiza campos editables de una orden.
      Solo se puede editar si el estado actual NO es final (APROBADA, CANCELADA).
      
      **Campos editables:**
      - Sede cliente
      - Tipo de servicio
      - Fecha y hora programada
      - Prioridad
      - Origen de solicitud
      - Descripción inicial
      - Trabajo realizado
      - Observaciones del técnico
      - Requiere firma cliente
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({ status: 200, description: 'Orden actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado no permite edición' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdenDto,
    @UserId() userId: number,
  ) {
    // Construir DTO con fechas parseadas
    const commandDto: any = { ...dto };

    if (dto.fecha_programada) {
      // ✅ FIX TIMEZONE: Agregar T12:00:00 para evitar offset de día
      commandDto.fecha_programada = new Date(`${dto.fecha_programada}T12:00:00`);
    }

    if (dto.hora_programada) {
      // Parsear hora HH:mm a Date
      const [hours, minutes] = dto.hora_programada.split(':').map(Number);
      const horaDate = new Date();
      horaDate.setHours(hours, minutes, 0, 0);
      commandDto.hora_programada = horaDate;
    }

    const command = new UpdateOrdenCommand(
      id,
      commandDto,
      userId || 1, // Fallback si JWT no disponible
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden actualizada exitosamente',
      data: result,
    };
  }

  /**
   * PATCH /api/ordenes/:id/observaciones-cierre
   * Endpoint ATÓMICO para actualizar SOLO el campo observaciones_cierre
   * Diseñado para Portal Admin - permite edición incluso en órdenes COMPLETADAS
   */
  @Patch(':id/observaciones-cierre')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar observaciones de cierre',
    description: 'Actualiza SOLO el campo observaciones_cierre de una orden. Permite edición en estado COMPLETADA.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Observaciones actualizadas exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede modificar orden en estado APROBADA/CANCELADA' })
  async updateObservacionesCierre(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { observaciones_cierre: string },
  ) {
    // 1. Verificar que la orden existe y obtener estado actual
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      include: { estados_orden: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    // 2. Validar que no sea estado final bloqueado (APROBADA/CANCELADA)
    const estadoCodigo = orden.estados_orden?.codigo_estado;
    if (estadoCodigo === 'APROBADA' || estadoCodigo === 'CANCELADA') {
      throw new BadRequestException(
        `No se puede modificar una orden en estado ${estadoCodigo}`,
      );
    }

    // 3. Actualizar SOLO observaciones_cierre (operación atómica)
    const updated = await this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio: id },
      data: {
        observaciones_cierre: body.observaciones_cierre,
        fecha_modificacion: new Date(),
      },
    });

    return {
      success: true,
      message: 'Observaciones de cierre actualizadas exitosamente',
      data: {
        id_orden_servicio: updated.id_orden_servicio,
        observaciones_cierre: updated.observaciones_cierre,
      },
    };
  }

  /**
   * PATCH /api/ordenes/:id/horarios-servicio
   * Endpoint ATÓMICO para actualizar hora de entrada y hora de salida del servicio
   * Diseñado para Portal Admin - permite edición incluso en órdenes COMPLETADAS
   * 
   * Los campos se almacenan como:
   * - fecha_inicio_real (DateTime) → hora de entrada del técnico al sitio
   * - fecha_fin_real (DateTime) → hora de salida del técnico del sitio
   * - duracion_minutos (Int) → se recalcula automáticamente
   */
  @Patch(':id/horarios-servicio')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar horarios de servicio (hora entrada/salida)',
    description: 'Actualiza fecha_inicio_real y fecha_fin_real de una orden. Recalcula duracion_minutos automáticamente. Permite edición en estado COMPLETADA.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Horarios actualizados exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o estado no permite edición' })
  async updateHorariosServicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fecha_inicio_real?: string; fecha_fin_real?: string },
    @UserId() userId: number,
  ) {
    // 1. Verificar que la orden existe y obtener estado actual
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      include: { estados_orden: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    // 2. Validar que no sea estado final bloqueado (APROBADA/CANCELADA)
    const estadoCodigo = orden.estados_orden?.codigo_estado;
    if (estadoCodigo === 'APROBADA' || estadoCodigo === 'CANCELADA') {
      throw new BadRequestException(
        `No se puede modificar una orden en estado ${estadoCodigo}`,
      );
    }

    // 3. Validar que al menos un campo venga
    if (!body.fecha_inicio_real && !body.fecha_fin_real) {
      throw new BadRequestException(
        'Debe enviar al menos fecha_inicio_real o fecha_fin_real',
      );
    }

    // 4. Parsear fechas
    const updateData: any = {
      fecha_modificacion: new Date(),
      modificado_por: userId || 1,
    };

    let fechaInicio: Date | null = null;
    let fechaFin: Date | null = null;

    if (body.fecha_inicio_real) {
      fechaInicio = new Date(body.fecha_inicio_real);
      if (isNaN(fechaInicio.getTime())) {
        throw new BadRequestException('fecha_inicio_real no es una fecha válida');
      }
      updateData.fecha_inicio_real = fechaInicio;
    }

    if (body.fecha_fin_real) {
      fechaFin = new Date(body.fecha_fin_real);
      if (isNaN(fechaFin.getTime())) {
        throw new BadRequestException('fecha_fin_real no es una fecha válida');
      }
      updateData.fecha_fin_real = fechaFin;
    }

    // 5. Recalcular duración en minutos
    const inicioFinal = fechaInicio || (orden.fecha_inicio_real ? new Date(orden.fecha_inicio_real) : null);
    const finFinal = fechaFin || (orden.fecha_fin_real ? new Date(orden.fecha_fin_real) : null);

    if (inicioFinal && finFinal) {
      if (finFinal <= inicioFinal) {
        throw new BadRequestException(
          'La hora de salida debe ser posterior a la hora de entrada',
        );
      }

      const diffMs = finFinal.getTime() - inicioFinal.getTime();
      const duracionMinutos = Math.round(diffMs / 60000);

      if (duracionMinutos > 1440) {
        throw new BadRequestException(
          `Duración calculada (${duracionMinutos} min) excede las 24 horas. Verifique las fechas.`,
        );
      }

      updateData.duracion_minutos = duracionMinutos;
    }

    // 6. Actualizar (operación atómica)
    const updated = await this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio: id },
      data: updateData,
    });

    return {
      success: true,
      message: 'Horarios de servicio actualizados exitosamente',
      data: {
        id_orden_servicio: updated.id_orden_servicio,
        fecha_inicio_real: updated.fecha_inicio_real,
        fecha_fin_real: updated.fecha_fin_real,
        duracion_minutos: updated.duracion_minutos,
      },
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
    // ✅ FIX 15-DIC-2025: Corregidos nombres de propiedades según schema Prisma
    const tecnico = result.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;
    return {
      success: true,
      message: 'Técnico asignado exitosamente',
      data: {
        id_orden_servicio: result.id_orden_servicio,
        numero_orden: result.numero_orden,
        estado: result.estados_orden,
        tecnico: tecnico ? {
          id_empleado: tecnico.id_empleado,
          persona: tecnico.persona
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
    // ✅ FIX 17-DIC-2025: Log forense de idOrdenEquipo para diagnóstico multi-equipo
    dto.evidencias?.slice(0, 5).forEach((ev, i) => {
      console.log(`   [${i}] tipo="${ev.tipo}", idOrdenEquipo=${ev.idOrdenEquipo ?? 'NULL'}, desc="${ev.descripcion?.substring(0, 30) ?? 'N/A'}...", base64=${ev.base64?.length || 0} chars`);
    });
    if (dto.evidencias?.length > 5) {
      console.log(`   ... y ${dto.evidencias.length - 5} evidencias más`);
    }
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
    console.log(`🎛️ MODO FINALIZACIÓN: "${dto.modo || 'COMPLETO (default)'}"`);
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
        // ✅ FIX 17-DIC-2025: Incluir idOrdenEquipo para multi-equipos
        idOrdenEquipo: e.idOrdenEquipo,
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
          // ✅ FIX 06-FEB-2026: Pasar nombre y cargo del firmante cliente al servicio
          nombreFirmante: dto.firmas.cliente.nombreFirmante,
          cargoFirmante: dto.firmas.cliente.cargoFirmante,
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
      // ✅ MODO CONFIGURABLE: Pasar modo de finalización al servicio
      modo: (dto.modo || 'COMPLETO') as 'COMPLETO' | 'SOLO_DATOS',
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

  /**
   * ==========================================================================
   * POST /api/ordenes/:id/finalizar-completo-stream
   * ==========================================================================
   * 
   * ENDPOINT CON STREAMING DE PROGRESO EN TIEMPO REAL
   * 
   * Este endpoint ejecuta el mismo flujo de finalización pero emite eventos
   * Server-Sent Events (SSE) para que el cliente pueda mostrar el progreso
   * en tiempo real.
   * 
   * Cada evento tiene el formato:
   * {
   *   step: 'validando' | 'evidencias' | 'firmas' | 'generando_pdf' | ...
   *   status: 'pending' | 'in_progress' | 'completed' | 'error'
   *   message: 'Mensaje descriptivo'
   *   progress: 0-100
   *   timestamp: 1234567890
   * }
   */
  @Post(':id/finalizar-completo-stream')
  @HttpCode(200) // ✅ SSE requiere 200, no 201 (default de @Post)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Finalizar orden con streaming de progreso',
    description: 'Ejecuta el flujo completo de finalización emitiendo eventos SSE de progreso en tiempo real.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Stream de eventos SSE con el progreso de la finalización.',
  })
  async finalizarCompletoStream(
    @Param('id') id: string,
    @Body() dto: FinalizarOrdenCompletoDto,
    @UserId() userId: number,
    @Res() res: Response,
  ) {
    // ✅ FIX 20-DIC-2025: Establecer status 200 explícitamente para SSE
    // Cuando usamos @Res(), @HttpCode() no aplica automáticamente
    res.status(200);

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Para nginx
    res.flushHeaders();

    // Helper para enviar eventos SSE
    const sendEvent = (event: ProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      // Construir DTO interno con ID de orden
      const finalizarDto = {
        idOrden: parseInt(id, 10),
        evidencias: dto.evidencias.map(e => ({
          tipo: e.tipo as 'ANTES' | 'DURANTE' | 'DESPUES' | 'MEDICION',
          base64: e.base64,
          descripcion: e.descripcion,
          formato: e.formato,
          idOrdenEquipo: e.idOrdenEquipo,
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
        usuarioId: userId || 1,
        // ✅ MODO CONFIGURABLE: Pasar modo de finalización al servicio
        modo: (dto.modo || 'COMPLETO') as 'COMPLETO' | 'SOLO_DATOS',
      };

      // Ejecutar flujo completo con callback de progreso
      const result = await this.finalizacionService.finalizarOrden(
        finalizarDto,
        (event) => sendEvent(event), // Callback para emitir eventos SSE
      );

      // Enviar resultado final
      res.write(`data: ${JSON.stringify({
        step: 'result',
        status: 'completed',
        message: result.mensaje,
        progress: 100,
        timestamp: Date.now(),
        data: {
          success: result.success,
          datos: result.datos,
          tiempoTotal: result.tiempoTotal,
        },
      })}\n\n`);

      // Cerrar stream
      res.end();

    } catch (error) {
      const err = error as Error;

      // Enviar evento de error
      res.write(`data: ${JSON.stringify({
        step: 'error',
        status: 'error',
        message: err.message,
        progress: 0,
        timestamp: Date.now(),
      })}\n\n`);

      // Cerrar stream
      res.end();
    }
  }

}
