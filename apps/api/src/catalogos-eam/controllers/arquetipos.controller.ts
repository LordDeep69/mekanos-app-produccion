import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CatalogosEamService } from '../catalogos-eam.service';

@ApiTags('EAM - Arquetipos y Tipos de Equipo')
@ApiBearerAuth()
@Controller('catalogos/arquetipos')
@UseGuards(JwtAuthGuard)
export class ArquetiposController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get()
  @ApiOperation({ summary: 'Listar arquetipos de equipo con módulos asociados' })
  async findAll() {
    return this.eamService.getArquetipos();
  }

  @Get(':id/esquema')
  @ApiOperation({
    summary: 'Obtener esquema dinámico completo del arquetipo para renderers UI y App Móvil',
  })
  async getEsquema(@Param('id', ParseIntPipe) id: number) {
    return this.eamService.getArquetipoEsquema(id);
  }

  @Post(':id/modulos')
  @ApiOperation({ summary: 'Vincular un módulo técnico a un arquetipo' })
  async vincularModulo(
    @Param('id', ParseIntPipe) id: number,
    @Body('id_modulo', ParseIntPipe) idModulo: number,
    @Body('obligatorio') obligatorio?: boolean,
  ) {
    return this.eamService.vincularModuloArquetipo(id, idModulo, obligatorio);
  }

  @Delete(':id/modulos/:idModulo')
  @ApiOperation({ summary: 'Desvincular módulo de un arquetipo' })
  async desvincularModulo(
    @Param('id', ParseIntPipe) id: number,
    @Param('idModulo', ParseIntPipe) idModulo: number,
  ) {
    return this.eamService.desvincularModuloArquetipo(id, idModulo);
  }
}
