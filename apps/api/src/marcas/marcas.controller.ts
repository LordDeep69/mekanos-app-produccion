import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { FusionarMarcasDto } from './dto/fusionar-marcas.dto';
import { QueryMarcaDto } from './dto/query-marca.dto';
import { MarcasService } from './marcas.service';

@ApiTags('Marcas')
@ApiBearerAuth()
@Controller('marcas')
@UseGuards(JwtAuthGuard)
export class MarcasController {
  constructor(private readonly marcasService: MarcasService) {}

  /**
   * Búsqueda rápida optimizada para Comboboxes y selectores.
   */
  @Get()
  @ApiOperation({
    summary: 'Buscar y listar marcas comerciales / fabricantes (Combobox)',
    description:
      'Devuelve proyecciones ligeras (id_marca, nombre, es_fabricante_oem, etc.) limitadas por defecto a 20 resultados con soporte para búsqueda rápida (?q=...).',
  })
  @ApiResponse({ status: 200, description: 'Listado ligero de marcas retornado exitosamente.' })
  async findAll(@Query() query: QueryMarcaDto) {
    return this.marcasService.findAll(query);
  }

  /**
   * Obtener detalle de una marca por ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una marca con sus métricas asociadas' })
  @ApiResponse({ status: 200, description: 'Detalle de la marca encontrado.' })
  @ApiResponse({ status: 404, description: 'Marca no encontrada.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.marcasService.findOne(id);
  }

  /**
   * Creación al vuelo con validación estricta de unicidad case-insensitive.
   */
  @Post()
  @ApiOperation({
    summary: 'Crear nueva marca o fabricante al vuelo',
    description:
      'Inserta una nueva marca en el sistema garantizando unicidad case-insensitive del nombre y calculando automáticamente el slug correspondiente.',
  })
  @ApiResponse({ status: 201, description: 'Marca creada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 409, description: 'Ya existe una marca con el mismo nombre.' })
  async create(@Body() dto: CreateMarcaDto) {
    return this.marcasService.create(dto);
  }

  /**
   * Actualizar marca existente.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar atributos de una marca' })
  @ApiResponse({ status: 200, description: 'Marca actualizada exitosamente.' })
  @ApiResponse({ status: 404, description: 'Marca no encontrada.' })
  @ApiResponse({ status: 409, description: 'Nombre en conflicto con otra marca.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMarcaDto,
  ) {
    return this.marcasService.update(id, dto);
  }

  /**
   * Fusionar marcas redundantes (Merge Brands).
   */
  @Post('fusionar')
  @ApiOperation({
    summary: 'Fusionar marcas redundantes en una marca principal (Merge)',
    description:
      'Transfiere de forma atómica todos los repuestos del catálogo y vinculaciones de proveedores de la marca origen a la marca destino, eliminando o desactivando la marca origen.',
  })
  @ApiResponse({ status: 200, description: 'Fusión completada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos o IDs idénticos.' })
  @ApiResponse({ status: 404, description: 'Marca origen o destino no encontrada.' })
  async fusionar(@Body() dto: FusionarMarcasDto) {
    return this.marcasService.fusionar(dto);
  }
}
