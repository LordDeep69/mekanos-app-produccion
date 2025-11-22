import { PrismaService } from '@mekanos/database';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Commands
import { AprobarOrdenCommand } from './commands/aprobar-orden.command';
import { AsignarTecnicoCommand } from './commands/asignar-tecnico.command';
import { CancelarOrdenCommand } from './commands/cancelar-orden.command';
import { CreateOrdenCommand } from './commands/create-orden.command';
import { IniciarOrdenCommand } from './commands/iniciar-orden.command';
import { ProgramarOrdenCommand } from './commands/programar-orden.command';

// Queries
import { GetOrdenByIdQuery } from './queries/get-orden-by-id.query';
import { GetOrdenesQuery } from './queries/get-ordenes.query';

// DTOs
import { AsignarTecnicoDto } from './dto/asignar-tecnico.dto';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { ProgramarOrdenDto } from './dto/programar-orden.dto';

// Decorators
import { UserId } from './decorators/user-id.decorator';

/**
 * OrdenesController - FASE 3
 * 
 * Controlador REST para órdenes de servicio
 * Endpoints: 9 operaciones CRUD + Workflow
 * 
 * POST   /api/ordenes          - Crear orden
 * GET    /api/ordenes          - Listar con filtros
 * GET    /api/ordenes/:id      - Detalle orden
 * PUT    /api/ordenes/:id/programar  - Programar fecha/hora
 * PUT    /api/ordenes/:id/asignar    - Asignar técnico
 * PUT    /api/ordenes/:id/iniciar    - Iniciar ejecución
 * PUT    /api/ordenes/:id/aprobar    - Aprobar cierre
 * PUT    /api/ordenes/:id/cancelar   - Cancelar orden
 */
@Controller('ordenes')
export class OrdenesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

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

}
