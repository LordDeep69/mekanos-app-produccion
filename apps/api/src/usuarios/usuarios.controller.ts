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
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  BuscarPersonaDto,
  CreateUsuarioCompletoDto,
} from './dto/create-usuario-completo.dto';
import { CreateUsuariosDto } from './dto/create-usuarios.dto';
import { UpdateUsuariosDto } from './dto/update-usuarios.dto';
import { UsuariosGestionService } from './usuarios-gestion.service';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@Public()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly usuariosGestionService: UsuariosGestionService,
  ) { }

  @Post()
  create(@Body() createDto: CreateUsuariosDto) {
    return this.usuariosService.create(createDto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN COMPLETA UNIFICADA (ENDPOINT FACADE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /usuarios/gestion-completa
   * 
   * Crea un usuario completo en UNA sola transacción:
   *   - Persona (si no existe)
   *   - Usuario (credenciales)
   *   - Empleado (opcional)
   *   - Asignación de Roles
   * 
   * @param dto CreateUsuarioCompletoDto con datosPersona, datosUsuario, datosEmpleado?, rolesIds[]
   * @returns UsuarioCompletoResponse
   */
  @Post('gestion-completa')
  async crearUsuarioCompleto(@Body() dto: CreateUsuarioCompletoDto) {
    return this.usuariosGestionService.crearUsuarioCompleto(dto);
  }

  /**
   * POST /usuarios/buscar-persona
   * 
   * Busca si existe una persona antes de crear usuario
   * Útil para Identity Resolution en el frontend
   */
  @Post('buscar-persona')
  async buscarPersonaExistente(@Body() dto: BuscarPersonaDto) {
    return this.usuariosGestionService.buscarPersonaExistente(dto);
  }

  /**
   * GET /usuarios/listado-completo
   * 
   * Lista usuarios con toda su información relacionada
   * Incluye: persona, roles, estado
   */
  @Get('listado-completo')
  async listarUsuariosCompletos(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('estado') estado?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    return this.usuariosGestionService.listarUsuariosCompletos({
      page,
      limit,
      estado,
      busqueda,
    });
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.usuariosService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Get(':id/password-preview')
  getPasswordPreview(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.getPasswordPreview(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUsuariosDto,
  ) {
    return this.usuariosService.update(id, updateDto);
  }

  @Put(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword: string },
  ) {
    return this.usuariosService.resetPassword(id, body.newPassword);
  }

  /**
   * PATCH /usuarios/:id/estado
   * Actualiza el estado de un usuario
   */
  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { estado: string },
  ) {
    return this.usuariosService.updateEstado(id, body.estado);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.remove(id);
  }
}
