import {
    Body,
    Controller,
    Delete,
    Get,
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

// DTOs
import { CreateComponenteUsadoDto } from './dto/create-componente-usado.dto';
import { ResponseComponenteUsadoDto } from './dto/response-componente-usado.dto';
import { UpdateComponenteUsadoDto } from './dto/update-componente-usado.dto';

// Commands
import { CreateComponenteUsadoCommand } from './application/commands/create-componente-usado.command';
import { DeleteComponenteUsadoCommand } from './application/commands/delete-componente-usado.command';
import { UpdateComponenteUsadoCommand } from './application/commands/update-componente-usado.command';

// Queries
import { GetAllComponentesUsadosQuery } from './application/queries/get-all-componentes-usados.query';
import { GetComponenteUsadoByIdQuery } from './application/queries/get-componente-usado-by-id.query';
import { GetComponentesUsadosByOrdenQuery } from './application/queries/get-componentes-usados-by-orden.query';

/**
 * Controller para componentes usados
 * Tabla 12/14 - FASE 3
 * 6 endpoints CRUD + búsqueda por orden
 */
@ApiTags('Componentes Usados')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('componentes-usados')
export class ComponentesUsadosController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // GET /componentes-usados - Listar todos
  // ═══════════════════════════════════════════════════════════════════
  @Get()
  @ApiOperation({ summary: 'Listar todos los componentes usados' })
  @ApiResponse({ status: 200, description: 'Lista de componentes usados', type: [ResponseComponenteUsadoDto] })
  async listarComponentesUsados(): Promise<ResponseComponenteUsadoDto[]> {
    return this.queryBus.execute(new GetAllComponentesUsadosQuery());
  }

  // ═══════════════════════════════════════════════════════════════════
  // POST /componentes-usados - Crear
  // ═══════════════════════════════════════════════════════════════════
  @Post()
  @ApiOperation({ summary: 'Crear nuevo componente usado' })
  @ApiResponse({ status: 201, description: 'Componente usado creado', type: ResponseComponenteUsadoDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async crearComponenteUsado(@Body() dto: CreateComponenteUsadoDto): Promise<ResponseComponenteUsadoDto> {
    return this.commandBus.execute(new CreateComponenteUsadoCommand(dto));
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /componentes-usados/orden/:ordenId - Por orden de servicio
  // ═══════════════════════════════════════════════════════════════════
  @Get('orden/:ordenId')
  @ApiOperation({ summary: 'Listar componentes usados por orden de servicio' })
  @ApiParam({ name: 'ordenId', description: 'ID de la orden de servicio' })
  @ApiResponse({ status: 200, description: 'Lista de componentes usados en la orden', type: [ResponseComponenteUsadoDto] })
  async listarComponentesPorOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ): Promise<ResponseComponenteUsadoDto[]> {
    return this.queryBus.execute(new GetComponentesUsadosByOrdenQuery(ordenId));
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET /componentes-usados/:id - Por ID
  // ═══════════════════════════════════════════════════════════════════
  @Get(':id')
  @ApiOperation({ summary: 'Obtener componente usado por ID' })
  @ApiParam({ name: 'id', description: 'ID del componente usado' })
  @ApiResponse({ status: 200, description: 'Componente usado encontrado', type: ResponseComponenteUsadoDto })
  @ApiResponse({ status: 404, description: 'Componente usado no encontrado' })
  async obtenerComponenteUsado(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseComponenteUsadoDto> {
    return this.queryBus.execute(new GetComponenteUsadoByIdQuery(id));
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUT /componentes-usados/:id - Actualizar
  // ═══════════════════════════════════════════════════════════════════
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar componente usado' })
  @ApiParam({ name: 'id', description: 'ID del componente usado' })
  @ApiResponse({ status: 200, description: 'Componente usado actualizado', type: ResponseComponenteUsadoDto })
  @ApiResponse({ status: 404, description: 'Componente usado no encontrado' })
  async actualizarComponenteUsado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComponenteUsadoDto,
  ): Promise<ResponseComponenteUsadoDto> {
    return this.commandBus.execute(new UpdateComponenteUsadoCommand(id, dto));
  }

  // ═══════════════════════════════════════════════════════════════════
  // DELETE /componentes-usados/:id - Eliminar
  // ═══════════════════════════════════════════════════════════════════
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar componente usado' })
  @ApiParam({ name: 'id', description: 'ID del componente usado' })
  @ApiResponse({ status: 200, description: 'Componente usado eliminado' })
  @ApiResponse({ status: 404, description: 'Componente usado no encontrado' })
  async eliminarComponenteUsado(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.commandBus.execute(new DeleteComponenteUsadoCommand(id));
  }
}
