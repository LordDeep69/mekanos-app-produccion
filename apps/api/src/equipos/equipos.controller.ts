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
  UseGuards
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEquipoCommand } from './commands/create-equipo.command';
import { DeleteEquipoCommand } from './commands/delete-equipo.command';
import { HardDeleteEquipoCommand } from './commands/hard-delete-equipo.command';
import { UpdateEquipoCommand } from './commands/update-equipo.command';
import { UserId } from './decorators/user-id.decorator';
import { CreateEquipoCompletoDto } from './dto/create-equipo-completo.dto';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { EquiposGestionService } from './equipos-gestion.service';
import { GetEquipoQuery } from './queries/get-equipo.query';
import { GetEquiposQuery, GetEquiposQueryDto } from './queries/get-equipos.query';

/**
 * Controller para endpoints REST de Equipos
 * Todos los endpoints requieren autenticación JWT
 */
@ApiTags('FASE 1 - Equipos')
@ApiBearerAuth('JWT-auth')
@Controller('equipos')
@Public()
@UseGuards(JwtAuthGuard)
export class EquiposController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly equiposGestionService: EquiposGestionService
  ) { }

  /**
   * POST /api/equipos
   * Crear un nuevo equipo
   */
  @Post()
  async create(
    @Body() dto: CreateEquipoDto,
    @UserId() userId: number
  ) {
    const command = new CreateEquipoCommand(dto, userId);
    const equipo = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Equipo creado exitosamente',
      data: equipo
    };
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026: Endpoint LIGERO para selectores
   * Retorna solo id, código, nombre - ideal para dropdowns/autocomplete
   * ✅ 31-ENE-2026: MULTI-ASESOR - Filtra por asesor si NO es admin
   * 
   * @param q Término de búsqueda (código, nombre, serie)
   * @param clienteId Filtrar por cliente
   * @param sedeId Filtrar por sede
   * @param limit Máximo de resultados (default 20)
   */
  @Get('selector')
  @ApiOperation({ summary: 'Obtener equipos en formato ligero para selectores' })
  async getSelector(
    @CurrentUser() user: any,
    @Query('q') q?: string,
    @Query('clienteId') clienteId?: string,
    @Query('sedeId') sedeId?: string,
    @Query('limit') limit?: string,
  ) {
    // ✅ MULTI-ASESOR: Filtrar por asesor si NO es admin
    const idAsesorFiltro = user?.esAdmin ? undefined : user?.idEmpleado;

    const items = await this.equiposGestionService.findForSelector({
      search: q,
      clienteId: clienteId ? parseInt(clienteId) : undefined,
      sedeId: sedeId ? parseInt(sedeId) : undefined,
      limit: Math.min(parseInt(limit || '20'), 50),
      idAsesorAsignado: idAsesorFiltro,
    });

    return {
      success: true,
      data: items,
    };
  }

  /**
   * GET /api/equipos
   * Listar equipos con filtrado jerárquico enterprise (Cliente -> Sede)
   * ✅ 31-ENE-2026: MULTI-ASESOR - Filtrar por clientes asignados al asesor
   */
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() queryDto: GetEquiposQueryDto,
  ) {
    // ✅ MULTI-ASESOR: Filtrar por asesor si NO es admin
    const idAsesorFiltro = user?.esAdmin ? undefined : user?.idEmpleado;

    const query = new GetEquiposQuery(
      queryDto.id_cliente,
      queryDto.id_sede,
      queryDto.estado_equipo,
      queryDto.id_tipo_equipo,
      queryDto.activo,
      queryDto.page,
      queryDto.limit,
      idAsesorFiltro, // ✅ MULTI-ASESOR
    );

    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: queryDto.id_sede
        ? `Equipos filtrados por sede ${queryDto.id_sede}`
        : (queryDto.id_cliente ? `Equipos filtrados por cliente ${queryDto.id_cliente}` : 'Listado de equipos obtenido'),
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ENDPOINTS DE GESTIÓN POLIMÓRFICA (Deben ir antes de los endpoints con :id)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/equipos/gestion-completa
   * Crear equipo con datos polimórficos (padre + hijo en transacción)
   */
  @Post('gestion-completa')
  @ApiOperation({ summary: 'Crear equipo completo con datos específicos según tipo' })
  async crearEquipoCompleto(
    @Body() dto: CreateEquipoCompletoDto,
    @UserId() userId: number
  ) {
    return this.equiposGestionService.crearEquipoCompleto(dto, userId);
  }

  /**
   * GET /api/equipos/listado-completo
   * Listar equipos con datos polimórficos incluidos
   * ✅ 08-ENE-2026: Agregado búsqueda, filtro por tipo y ordenación
   * ✅ 31-ENE-2026: MULTI-ASESOR - Filtrar por clientes asignados al asesor
   */
  @Get('listado-completo')
  @ApiOperation({ summary: 'Listar equipos con datos específicos según tipo' })
  async listarEquiposCompletos(
    @CurrentUser() user: any,
    @Query() queryDto: GetEquiposQueryDto,
  ) {
    // ✅ MULTI-ASESOR: Filtrar por asesor si NO es admin
    const idAsesorFiltro = user?.esAdmin ? undefined : user?.idEmpleado;

    return this.equiposGestionService.listarEquiposCompletos({
      id_cliente: queryDto.id_cliente,
      id_sede: queryDto.id_sede,
      tipo: queryDto.tipo,
      estado_equipo: queryDto.estado_equipo,
      search: queryDto.search,
      sortBy: queryDto.sortBy,
      sortOrder: queryDto.sortOrder,
      page: queryDto.page,
      limit: queryDto.limit,
      idAsesorAsignado: idAsesorFiltro,
    });
  }

  /**
   * GET /api/equipos/completo/:id
   * Obtener equipo con todos sus datos polimórficos
   */
  @Get('completo/:id')
  @ApiOperation({ summary: 'Obtener equipo con datos específicos según tipo' })
  async obtenerEquipoCompleto(@Param('id', ParseIntPipe) id: number) {
    const equipo = await this.equiposGestionService.obtenerEquipoCompleto(id);
    return {
      success: true,
      data: equipo,
    };
  }

  /**
   * GET /api/equipos/:id
   * Obtener un equipo por ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetEquipoQuery(id);
    const equipo = await this.queryBus.execute(query);

    return {
      success: true,
      data: equipo
    };
  }

  /**
   * PUT /api/equipos/:id
   * Actualizar un equipo
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoDto,
    @UserId() userId: number
  ) {
    const command = new UpdateEquipoCommand(id, dto, userId);
    const equipo = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Equipo actualizado exitosamente',
      data: equipo
    };
  }

  /**
   * DELETE /api/equipos/:id
   * Eliminar un equipo (soft delete - marca como inactivo)
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number
  ) {
    const command = new DeleteEquipoCommand(id, userId);
    await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Equipo eliminado exitosamente'
    };
  }

  /**
   * DELETE /api/equipos/:id/hard-delete
   * ⚠️ ELIMINACIÓN COMPLETA - Elimina permanentemente el equipo y TODOS sus datos relacionados
   * Requiere confirmación explícita
   */
  @Delete(':id/hard-delete')
  @ApiOperation({
    summary: 'Eliminar completamente un equipo del sistema',
    description: '⚠️ HARD DELETE: Elimina permanentemente el equipo y todos sus datos relacionados. ' +
      'Solo funciona con equipos marcados como inactivos. Requiere confirmación explícita.'
  })
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Body('confirmacion') confirmacion: string,
    @UserId() userId: number
  ) {
    const command = new HardDeleteEquipoCommand(id, userId, confirmacion);
    await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Equipo eliminado completamente del sistema'
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ENDPOINTS DE ACCIONES ESPECÍFICAS
  // ✅ 08-ENE-2026: Cambio de estado y lectura de horómetro
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * PATCH /api/equipos/:id/cambiar-estado
   * Cambiar estado del equipo con registro en historial
   */
  @Patch(':id/cambiar-estado')
  @ApiOperation({ summary: 'Cambiar estado del equipo con registro en historial' })
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoEquipoDto,
    @UserId() userId: number
  ) {
    const resultado = await this.equiposGestionService.cambiarEstadoEquipo(id, dto, userId);
    return {
      success: true,
      message: `Estado del equipo cambiado a ${dto.nuevo_estado}`,
      data: resultado,
    };
  }

  /**
   * PATCH /api/equipos/:id/datos-especificos
   * Actualizar datos específicos del equipo (Motor, Generador, Bomba)
   * ✅ 23-FEB-2026: CRUD completo para datos polimórficos
   */
  @Patch(':id/datos-especificos')
  @ApiOperation({ summary: 'Actualizar datos específicos del equipo (Motor, Generador, Bomba)' })
  async actualizarDatosEspecificos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDatosEspecificosDto,
    @UserId() userId: number
  ) {
    return this.equiposGestionService.actualizarDatosEspecificos(id, dto, userId);
  }

  /**
   * POST /api/equipos/:id/lectura-horometro
   * Registrar nueva lectura de horómetro
   */
  @Post(':id/lectura-horometro')
  @ApiOperation({ summary: 'Registrar nueva lectura de horómetro' })
  async registrarLecturaHorometro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarLecturaHorometroDto,
    @UserId() userId: number
  ) {
    const resultado = await this.equiposGestionService.registrarLecturaHorometro(id, dto, userId);
    return {
      success: true,
      message: 'Lectura de horómetro registrada exitosamente',
      data: resultado,
    };
  }
}

