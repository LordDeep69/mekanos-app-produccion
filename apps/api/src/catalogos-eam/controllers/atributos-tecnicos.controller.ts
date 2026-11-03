import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CatalogosEamService } from '../catalogos-eam.service';
import { CreateAtributoTecnicoDto, UpdateAtributoTecnicoDto } from '../dto/catalogos-eam.dto';

@ApiTags('EAM - Diccionario de Atributos Técnicos')
@ApiBearerAuth()
@Controller('catalogos/atributos-tecnicos')
@UseGuards(JwtAuthGuard)
export class AtributosTecnicosController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atributos técnicos disponibles en el diccionario' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre o código' })
  @ApiQuery({ name: 'magnitud', required: false, description: 'Filtrar por código de magnitud' })
  @ApiQuery({ name: 'tipoDato', required: false, description: 'Filtrar por tipo de dato' })
  async findAll(
    @Query('search') search?: string,
    @Query('magnitud') magnitud?: string,
    @Query('tipoDato') tipoDato?: string,
  ) {
    return this.eamService.getAtributos({
      search,
      codigoMagnitud: magnitud,
      tipoControl: tipoDato,
    });
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener detalle de un atributo técnico por su código' })
  async findOne(@Param('codigo') codigo: string) {
    return this.eamService.getAtributo(codigo);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo atributo técnico (soporta alta rápida In-Place)' })
  async create(@Body() dto: CreateAtributoTecnicoDto) {
    return this.eamService.createAtributo(dto);
  }

  @Put(':codigo')
  @ApiOperation({ summary: 'Actualizar propiedades de un atributo técnico (PUT)' })
  async update(
    @Param('codigo') codigo: string,
    @Body() dto: UpdateAtributoTecnicoDto,
  ) {
    return this.eamService.updateAtributo(codigo, dto);
  }

  @Patch(':codigo')
  @ApiOperation({ summary: 'Actualizar propiedades de un atributo técnico (PATCH)' })
  async updatePatch(
    @Param('codigo') codigo: string,
    @Body() dto: UpdateAtributoTecnicoDto,
  ) {
    return this.eamService.updateAtributo(codigo, dto);
  }
}
