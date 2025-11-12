import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  // UseGuards,
  HttpCode,
  HttpStatus,
  StreamableFile,
  Header,
  NotFoundException,
  Inject
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // TODO: Activar cuando exista
import { OrdenServicioId, IOrdenServicioRepository } from '@mekanos/core';

// Commands
import { CreateOrdenCommand } from './commands/create-orden.command';
import { ProgramarOrdenCommand } from './commands/programar-orden.command';
import { AsignarTecnicoCommand } from './commands/asignar-tecnico.command';
import { IniciarOrdenCommand } from './commands/iniciar-orden.command';
import { FinalizarOrdenCommand } from './commands/finalizar-orden.command';

// Queries
import { GetOrdenQuery } from './queries/get-orden.query';
import { GetOrdenesQuery } from './queries/get-ordenes.query';
import { GetOrdenesTecnicoQuery } from './queries/get-ordenes-tecnico.query';

// DTOs
import { CreateOrdenDto } from './dto/create-orden.dto';
import { ProgramarOrdenDto } from './dto/programar-orden.dto';
import { AsignarTecnicoDto } from './dto/asignar-tecnico.dto';
import { FinalizarOrdenDto } from './dto/finalizar-orden.dto';
import { FilterOrdenesDto } from './dto/filter-ordenes.dto';

// Services
import { PdfService } from '../pdf/pdf.service';

/**
 * OrdenesController
 * Endpoints REST para gestión de Órdenes de Servicio
 * 
 * Workflow: BORRADOR → PROGRAMADA → ASIGNADA → EN_PROCESO → EJECUTADA → EN_REVISION → APROBADA
 */
@Controller('ordenes')
// @UseGuards(JwtAuthGuard) // TODO: Activar cuando JwtAuthGuard exista
export class OrdenesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly pdfService: PdfService,
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  /**
   * POST /ordenes
   * Crea nueva orden en estado BORRADOR
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOrdenDto) {
    const command = new CreateOrdenCommand(
      dto.equipoId,
      dto.clienteId,
      dto.tipoServicioId,
      dto.sedeClienteId,
      dto.descripcion,
      dto.prioridad,
      dto.fechaProgramada ? new Date(dto.fechaProgramada) : undefined
    );

    const orden = await this.commandBus.execute(command);
    return orden.toObject();
  }

  /**
   * GET /ordenes
   * Lista órdenes con paginación y filtros
   */
  @Get()
  async findAll(@Query() filters: FilterOrdenesDto) {
    const query = new GetOrdenesQuery(
      filters.page,
      filters.limit,
      filters.clienteId,
      filters.equipoId,
      filters.tecnicoId,
      filters.estado,
      filters.prioridad
    );

    return await this.queryBus.execute(query);
  }

  /**
   * GET /ordenes/:id
   * Obtiene una orden por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const query = new GetOrdenQuery(id);
    return await this.queryBus.execute(query);
  }

  /**
   * GET /ordenes/tecnico/:tecnicoId
   * Obtiene órdenes asignadas a un técnico
   */
  @Get('tecnico/:tecnicoId')
  async findByTecnico(
    @Param('tecnicoId') tecnicoId: string,
    @Query('estado') estado?: string
  ) {
    const query = new GetOrdenesTecnicoQuery(parseInt(tecnicoId, 10), estado);
    return await this.queryBus.execute(query);
  }

  /**
   * PUT /ordenes/:id/programar
   * Transición: BORRADOR → PROGRAMADA
   */
  @Put(':id/programar')
  async programar(@Param('id') id: string, @Body() dto: ProgramarOrdenDto) {
    const command = new ProgramarOrdenCommand(
      id,
      new Date(dto.fechaProgramada),
      dto.observaciones
    );

    const orden = await this.commandBus.execute(command);
    return orden.toObject();
  }

  /**
   * PUT /ordenes/:id/asignar
   * Transición: PROGRAMADA → ASIGNADA
   */
  @Put(':id/asignar')
  async asignarTecnico(@Param('id') id: string, @Body() dto: AsignarTecnicoDto) {
    const command = new AsignarTecnicoCommand(id, dto.tecnicoId);
    const orden = await this.commandBus.execute(command);
    return orden.toObject();
  }

  /**
   * PUT /ordenes/:id/iniciar
   * Transición: ASIGNADA → EN_PROCESO
   */
  @Put(':id/iniciar')
  async iniciar(@Param('id') id: string) {
    const command = new IniciarOrdenCommand(id);
    const orden = await this.commandBus.execute(command);
    return orden.toObject();
  }

  /**
   * PUT /ordenes/:id/finalizar
   * Transición: EN_PROCESO → EJECUTADA
   * TRIGGER: Genera PDF automáticamente y envía email
   */
  @Put(':id/finalizar')
  async finalizar(@Param('id') id: string, @Body() dto: FinalizarOrdenDto) {
    const command = new FinalizarOrdenCommand(id, dto.observaciones);
    const orden = await this.commandBus.execute(command);
    return orden.toObject();
  }

  /**
   * GET /ordenes/:id/pdf
   * Genera y descarga PDF de la orden manualmente
   */
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
    // Obtener orden del repositorio
    const orden = await this.ordenRepository.findById(OrdenServicioId.from(id));
    
    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    const ordenObj = orden.toObject();

    // Preparar datos para el PDF
    const pdfData = {
      numeroOrden: ordenObj.numeroOrden,
      estado: ordenObj.estado,
      prioridad: ordenObj.prioridad,
      clienteNombre: String(ordenObj.clienteId),
      equipoNombre: String(ordenObj.equipoId),
      fechaCreacion: ordenObj.createdAt,
      fechaProgramada: ordenObj.fechaProgramada,
      fechaInicio: ordenObj.fechaInicio,
      fechaFinalizacion: ordenObj.fechaFin,
      tecnicoAsignado: ordenObj.tecnicoAsignadoId ? String(ordenObj.tecnicoAsignadoId) : null,
      descripcion: ordenObj.descripcion,
      observaciones: ordenObj.observaciones,
      firmaDigital: ordenObj.firmaClienteUrl
    };

    const pdfBuffer = await this.pdfService.generateOrdenServicioPdf(pdfData);
    
    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="orden-${ordenObj.numeroOrden}.pdf"`
    });
  }

  /**
   * DELETE /ordenes/:id
   * Elimina una orden (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') _id: string) {
    // TODO: Implementar DeleteOrdenCommand si se requiere
    return { message: 'Delete endpoint - to be implemented' };
  }
}
