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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// DTOs
import { CreateGastoOrdenDto } from './dto/create-gasto-orden.dto';
import { ResponseGastoOrdenDto } from './dto/response-gasto-orden.dto';
import { UpdateGastoOrdenDto } from './dto/update-gasto-orden.dto';

// Commands
import { CreateGastoOrdenCommand } from './application/commands/create-gasto-orden.command';
import { DeleteGastoOrdenCommand } from './application/commands/delete-gasto-orden.command';
import { UpdateGastoOrdenCommand } from './application/commands/update-gasto-orden.command';

// Queries
import { GetAllGastosOrdenQuery } from './application/queries/get-all-gastos-orden.query';
import { GetGastoOrdenByIdQuery } from './application/queries/get-gasto-orden-by-id.query';
import { GetGastosOrdenByOrdenQuery } from './application/queries/get-gastos-orden-by-orden.query';

/**
 * Controlador de Gastos de Orden
 * Tabla 13/14 - FASE 3
 * 
 * Endpoints:
 * - POST   /api/gastos-orden              - Crear gasto
 * - GET    /api/gastos-orden              - Listar todos los gastos
 * - GET    /api/gastos-orden/:id          - Obtener gasto por ID
 * - GET    /api/gastos-orden/orden/:id    - Obtener gastos por orden de servicio
 * - PUT    /api/gastos-orden/:id          - Actualizar gasto
 * - DELETE /api/gastos-orden/:id          - Eliminar gasto
 */
@Controller('gastos-orden')
@UseGuards(JwtAuthGuard)
export class GastosOrdenController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /api/gastos-orden
   * Crear un nuevo gasto de orden
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGastoOrdenDto): Promise<ResponseGastoOrdenDto> {
    const command = new CreateGastoOrdenCommand(
      dto.idOrdenServicio,
      dto.tipoGasto,
      dto.descripcion,
      dto.justificacion,
      dto.valor,
      dto.tieneComprobante,
      dto.numeroComprobante,
      dto.proveedor,
      dto.rutaComprobante,
      dto.estadoAprobacion,
      dto.observacionesAprobacion,
      dto.fechaGasto,
      dto.generadoPor,
      dto.observaciones,
      dto.registradoPor,
    );
    return this.commandBus.execute(command);
  }

  /**
   * GET /api/gastos-orden
   * Listar todos los gastos de orden
   */
  @Get()
  async findAll(): Promise<ResponseGastoOrdenDto[]> {
    return this.queryBus.execute(new GetAllGastosOrdenQuery());
  }

  /**
   * GET /api/gastos-orden/:id
   * Obtener gasto por ID
   */
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ResponseGastoOrdenDto> {
    return this.queryBus.execute(new GetGastoOrdenByIdQuery(id));
  }

  /**
   * GET /api/gastos-orden/orden/:idOrden
   * Obtener gastos por orden de servicio
   */
  @Get('orden/:idOrden')
  async findByOrden(@Param('idOrden', ParseIntPipe) idOrden: number): Promise<ResponseGastoOrdenDto[]> {
    return this.queryBus.execute(new GetGastosOrdenByOrdenQuery(idOrden));
  }

  /**
   * PUT /api/gastos-orden/:id
   * Actualizar gasto de orden
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGastoOrdenDto,
  ): Promise<ResponseGastoOrdenDto> {
    const command = new UpdateGastoOrdenCommand(
      id,
      dto.tipoGasto,
      dto.descripcion,
      dto.justificacion,
      dto.valor,
      dto.tieneComprobante,
      dto.numeroComprobante,
      dto.proveedor,
      dto.rutaComprobante,
      dto.estadoAprobacion,
      dto.observacionesAprobacion,
      dto.fechaGasto,
      dto.generadoPor,
      dto.aprobadoPor,
      dto.fechaAprobacion,
      dto.observaciones,
      dto.modificadoPor,
    );
    return this.commandBus.execute(command);
  }

  /**
   * DELETE /api/gastos-orden/:id
   * Eliminar gasto de orden (Hard Delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.commandBus.execute(new DeleteGastoOrdenCommand(id));
  }
}
