import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CatalogosEamService } from '../catalogos-eam.service';

@ApiTags('EAM - Magnitudes Físicas')
@ApiBearerAuth()
@Controller('catalogos/magnitudes')
@UseGuards(JwtAuthGuard)
export class MagnitudesController {
  constructor(private readonly eamService: CatalogosEamService) {}

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
}
