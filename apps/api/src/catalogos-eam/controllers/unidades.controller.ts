import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CatalogosEamService } from '../catalogos-eam.service';
import {
  ConvertirUomDto,
  CreateUnidadMedidaDto,
  UpdateUnidadMedidaDto,
} from '../dto/catalogos-eam.dto';

@ApiTags('EAM - Unidades de Medida')
@ApiBearerAuth()
@Controller('catalogos/unidades')
@UseGuards(JwtAuthGuard)
export class UnidadesController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get()
  @ApiOperation({ summary: 'Listar unidades de medida con factores afines' })
  @ApiQuery({ name: 'magnitud', required: false, description: 'Código de magnitud física' })
  async findAll(@Query('magnitud') magnitud?: string) {
    return this.eamService.getUnidades(magnitud);
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener información de una unidad de medida por su código' })
  async findOne(@Param('codigo') codigo: string) {
    return this.eamService.getUnidad(codigo);
  }

  @Post('convertir')
  @ApiOperation({ summary: 'Conversión dimensional interactiva entre unidades (y = ax + b)' })
  async convertir(@Body() dto: ConvertirUomDto) {
    return this.eamService.convertirUom(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva unidad de medida vinculada a una magnitud física' })
  async create(@Body() dto: CreateUnidadMedidaDto) {
    return this.eamService.createUnidad(dto);
  }

  @Patch(':codigo')
  @ApiOperation({ summary: 'Actualizar propiedades y factores de una unidad de medida' })
  async update(@Param('codigo') codigo: string, @Body() dto: UpdateUnidadMedidaDto) {
    return this.eamService.updateUnidad(codigo, dto);
  }

  @Put(':codigo')
  @ApiOperation({ summary: 'Actualizar propiedades y factores de una unidad de medida (PUT)' })
  async updatePut(@Param('codigo') codigo: string, @Body() dto: UpdateUnidadMedidaDto) {
    return this.eamService.updateUnidad(codigo, dto);
  }
}
