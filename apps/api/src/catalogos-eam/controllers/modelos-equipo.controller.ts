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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../../auth/guards/permisos.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CatalogosEamService } from '../catalogos-eam.service';
import {
  CreateBomItemDto,
  CreateModeloEquipoDto,
  UpdateModeloEquipoDto,
} from '../dto/catalogos-eam.dto';

@ApiTags('EAM - Modelos OEM y Listas de Partes BOM')
@ApiBearerAuth()
@Controller('catalogos/modelos-equipo')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
export class ModelosEquipoController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get('componentes-wms')
  @ApiOperation({ summary: 'Buscar componentes del catálogo WMS para vincular a kits BOM OEM' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por código, referencia o descripción' })
  async buscarComponentesWms(@Query('search') search?: string) {
    return this.eamService.buscarComponentesWms(search);
  }

  @Get()
  @ApiOperation({ summary: 'Listar modelos OEM preconfigurados' })
  @ApiQuery({ name: 'tipoEquipo', required: false, description: 'ID de tipo de equipo' })
  async findAll(@Query('tipoEquipo') tipoEquipo?: string) {
    const idTipo = tipoEquipo ? parseInt(tipoEquipo, 10) : undefined;
    return this.eamService.getModelos(idTipo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un modelo OEM con su kit de partes BOM' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eamService.getModelo(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Crear un nuevo modelo OEM' })
  async create(@Body() dto: CreateModeloEquipoDto) {
    return this.eamService.createModelo(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Actualizar un modelo OEM y sus especificaciones base' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateModeloEquipoDto,
  ) {
    return this.eamService.updateModelo(id, dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Actualizar un modelo OEM y sus especificaciones base (PUT)' })
  async updatePut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateModeloEquipoDto,
  ) {
    return this.eamService.updateModelo(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Desactivar un modelo OEM' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.eamService.deleteModelo(id);
  }

  @Post(':id/bom')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Agregar un componente al kit de partes BOM del modelo OEM' })
  async agregarItemBom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBomItemDto,
  ) {
    return this.eamService.agregarItemBom(id, dto);
  }

  @Delete(':id/bom/:idBom')
  @Roles('ADMIN', 'SUPERVISOR')
  @Permisos('EQUIPOS_UPDATE')
  @ApiOperation({ summary: 'Eliminar un componente del kit de partes BOM' })
  async eliminarItemBom(
    @Param('id', ParseIntPipe) _id: number,
    @Param('idBom', ParseIntPipe) idBom: number,
  ) {
    return this.eamService.eliminarItemBom(idBom);
  }
}
