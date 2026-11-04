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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CatalogosEamService } from '../catalogos-eam.service';
import {
  CreateArquetipoDto,
  CreatePlanArquetipoDto,
  CreateTipoServicioEamDto,
  UpdateArquetipoDto,
  UpdatePlanArquetipoDto,
} from '../dto/catalogos-eam.dto';

@ApiTags('EAM - Arquetipos y Tipos de Equipo')
@ApiBearerAuth()
@Controller('catalogos/arquetipos')
@UseGuards(JwtAuthGuard)
export class ArquetiposController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get()
  @ApiOperation({ summary: 'Listar arquetipos canónicos de equipo con módulos y planes asociados' })
  async findAll() {
    return this.eamService.getArquetipos();
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva clase / arquetipo de equipo' })
  async create(@Body() dto: CreateArquetipoDto) {
    return this.eamService.createArquetipo(dto);
  }

  @Get('tipos-servicio')
  @ApiOperation({ summary: 'Listar tipos de servicio disponibles para asignación a planes' })
  async getTiposServicio(@Query('id_tipo_equipo') idTipoEquipo?: string) {
    const id = idTipoEquipo ? parseInt(idTipoEquipo, 10) : undefined;
    return this.eamService.getTiposServicioEam(id);
  }

  @Post('tipos-servicio')
  @ApiOperation({ summary: 'Crear un nuevo tipo de servicio en el catálogo para arquetipos' })
  async createTipoServicio(@Body() dto: CreateTipoServicioEamDto) {
    return this.eamService.createTipoServicioEam(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar propiedades de un arquetipo de equipo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArquetipoDto,
  ) {
    return this.eamService.updateArquetipo(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar propiedades de un arquetipo de equipo (PUT)' })
  async updatePut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArquetipoDto,
  ) {
    return this.eamService.updateArquetipo(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un tipo de equipo sin activos asociados' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.eamService.deleteArquetipo(id);
  }

  @Get(':id/esquema')
  @ApiOperation({
    summary: 'Obtener esquema dinámico completo del arquetipo para renderers UI y App Móvil',
  })
  async getEsquema(@Param('id', ParseIntPipe) id: number) {
    return this.eamService.getArquetipoEsquema(id);
  }

  @Post(':id/modulos')
  @ApiOperation({ summary: 'Vincular un módulo técnico a un arquetipo (sincroniza alias gemelos)' })
  async vincularModulo(
    @Param('id', ParseIntPipe) id: number,
    @Body('id_modulo', ParseIntPipe) idModulo: number,
    @Body('obligatorio') obligatorio?: boolean,
  ) {
    return this.eamService.vincularModuloArquetipo(id, idModulo, obligatorio);
  }

  @Delete(':id/modulos/:idModulo')
  @ApiOperation({ summary: 'Desvincular módulo de un arquetipo (sincroniza alias gemelos)' })
  async desvincularModulo(
    @Param('id', ParseIntPipe) id: number,
    @Param('idModulo', ParseIntPipe) idModulo: number,
  ) {
    return this.eamService.desvincularModuloArquetipo(id, idModulo);
  }

  @Post(':id/planes')
  @ApiOperation({ summary: 'Crear o actualizar plan de mantenimiento preventivo en un arquetipo' })
  async createPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePlanArquetipoDto,
  ) {
    return this.eamService.createPlanArquetipo(id, dto);
  }

  @Patch(':id/planes/:idPlan')
  @ApiOperation({ summary: 'Actualizar intervalos de un plan preventivo de arquetipo' })
  async updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Param('idPlan', ParseIntPipe) idPlan: number,
    @Body() dto: UpdatePlanArquetipoDto,
  ) {
    return this.eamService.updatePlanArquetipo(id, idPlan, dto);
  }

  @Delete(':id/planes/:idPlan')
  @ApiOperation({ summary: 'Eliminar plan preventivo de un arquetipo' })
  async deletePlan(
    @Param('id', ParseIntPipe) id: number,
    @Param('idPlan', ParseIntPipe) idPlan: number,
  ) {
    return this.eamService.deletePlanArquetipo(id, idPlan);
  }
}
