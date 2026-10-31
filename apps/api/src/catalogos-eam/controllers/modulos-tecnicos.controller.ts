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
import { AsignarAtributoModuloDto, CreateModuloTecnicoDto } from '../dto/catalogos-eam.dto';

@ApiTags('EAM - Módulos Técnicos Funcionales')
@ApiBearerAuth()
@Controller('catalogos/modulos-tecnicos')
@UseGuards(JwtAuthGuard)
export class ModulosTecnicosController {
  constructor(private readonly eamService: CatalogosEamService) {}

  @Get()
  @ApiOperation({ summary: 'Listar módulos técnicos funcionales' })
  async findAll() {
    return this.eamService.getModulos();
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener módulo técnico con todos sus atributos asignados' })
  async findOne(@Param('codigo') codigo: string) {
    return this.eamService.getModulo(codigo);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo módulo técnico' })
  async create(@Body() dto: CreateModuloTecnicoDto) {
    return this.eamService.createModulo(dto);
  }

  @Post(':codigo/atributos')
  @ApiOperation({ summary: 'Asignar o actualizar atributo dentro de un módulo (grupo visual, banderas)' })
  async asignarAtributo(
    @Param('codigo') codigo: string,
    @Body() dto: AsignarAtributoModuloDto,
  ) {
    return this.eamService.asignarAtributo(codigo, dto);
  }

  @Delete(':codigo/atributos/:idAtributo')
  @ApiOperation({ summary: 'Desasignar atributo de un módulo técnico' })
  async desasignarAtributo(
    @Param('codigo') codigo: string,
    @Param('idAtributo', ParseIntPipe) idAtributo: number,
  ) {
    return this.eamService.desasignarAtributo(codigo, idAtributo);
  }
}
