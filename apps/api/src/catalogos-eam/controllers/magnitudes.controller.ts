import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../../auth/guards/permisos.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CatalogosEamService } from '../catalogos-eam.service';
import { ActivarMagnitudBancoDto, CreateMagnitudDto, UpdateMagnitudDto } from '../dto/catalogos-eam.dto';

@ApiTags('EAM - Magnitudes Físicas')
@ApiBearerAuth()
@Controller('catalogos/magnitudes')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
export class MagnitudesController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get('resumen-ejecutivo')
  @ApiOperation({ summary: 'Obtener resumen ejecutivo de las 5 capas del ecosistema EAM' })
  async getResumenEjecutivo() {
    return this.eamService.getResumenEjecutivo();
  }

  @Get('banco')
  @ApiOperation({ summary: 'Obtener el catálogo canónico de magnitudes y unidades del banco QUDT/UCUM' })
  async getBanco() {
    return this.eamService.getBancoMagnitudes();
  }

  @Post('activar-banco')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Activar una magnitud preconfigurada del banco QUDT/UCUM con todas sus unidades canónicas' })
  async activarBanco(@Body() dto: ActivarMagnitudBancoDto) {
    return this.eamService.activarMagnitudBanco(dto.codigo_magnitud);
  }

  @Patch('disciplina/:categoria/activo')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Activar u ocultar todas las magnitudes de una disciplina completa' })
  async setActivoDisciplina(
    @Param('categoria') categoria: string,
    @Body() dto: { activo: boolean },
  ) {
    return this.eamService.setActivoDisciplina(categoria, dto.activo);
  }

  @Post('reactivar-todas')
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Reactivar todas las magnitudes y unidades del sistema' })
  async reactivarTodas() {
    return this.eamService.reactivarTodasMagnitudes();
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las magnitudes físicas canónicas del sistema' })
  async findAll() {
    return this.eamService.getMagnitudes();
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener detalle de una magnitud física por su código' })
  async findOne(@Param('codigo') codigo: string) {
    return this.eamService.getMagnitud(codigo);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Crear una nueva magnitud física' })
  async create(@Body() dto: CreateMagnitudDto) {
    return this.eamService.createMagnitud(dto);
  }

  @Patch(':codigo')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Actualizar propiedades de una magnitud física' })
  async update(@Param('codigo') codigo: string, @Body() dto: UpdateMagnitudDto) {
    return this.eamService.updateMagnitud(codigo, dto);
  }

  @Put(':codigo')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Actualizar propiedades de una magnitud física (PUT)' })
  async updatePut(@Param('codigo') codigo: string, @Body() dto: UpdateMagnitudDto) {
    return this.eamService.updateMagnitud(codigo, dto);
  }

  @Delete(':codigo')
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Eliminar una magnitud física' })
  async delete(@Param('codigo') codigo: string) {
    return this.eamService.deleteMagnitud(codigo);
  }
}
