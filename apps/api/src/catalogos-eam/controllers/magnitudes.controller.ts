import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CatalogosEamService } from '../catalogos-eam.service';
import { CreateMagnitudDto, UpdateMagnitudDto } from '../dto/catalogos-eam.dto';

@ApiTags('EAM - Magnitudes Físicas')
@ApiBearerAuth()
@Controller('catalogos/magnitudes')
@UseGuards(JwtAuthGuard)
export class MagnitudesController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get('resumen-ejecutivo')
  @ApiOperation({ summary: 'Obtener resumen ejecutivo de las 5 capas del ecosistema EAM' })
  async getResumenEjecutivo() {
    return this.eamService.getResumenEjecutivo();
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
  @ApiOperation({ summary: 'Crear una nueva magnitud física' })
  async create(@Body() dto: CreateMagnitudDto) {
    return this.eamService.createMagnitud(dto);
  }

  @Patch(':codigo')
  @ApiOperation({ summary: 'Actualizar propiedades de una magnitud física' })
  async update(@Param('codigo') codigo: string, @Body() dto: UpdateMagnitudDto) {
    return this.eamService.updateMagnitud(codigo, dto);
  }

  @Put(':codigo')
  @ApiOperation({ summary: 'Actualizar propiedades de una magnitud física (PUT)' })
  async updatePut(@Param('codigo') codigo: string, @Body() dto: UpdateMagnitudDto) {
    return this.eamService.updateMagnitud(codigo, dto);
  }
}
