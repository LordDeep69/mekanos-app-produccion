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
import { CategoriasComponenteService } from './categorias-componente.service';
import { CreateCategoriaComponenteDto } from './dto/create-categoria-componente.dto';
import { QueryCategoriaDto } from './dto/query-categoria.dto';

@ApiTags('Categorías Técnicas del Catálogo')
@ApiBearerAuth()
@Controller('categorias-componente')
@UseGuards(JwtAuthGuard)
export class CategoriasComponenteController {
  constructor(
    private readonly categoriasService: CategoriasComponenteService,
  ) {}

  /**
   * =========================================================================
   * ÁRBOL TAXONÓMICO JERÁRQUICO RECURSIVO
   * =========================================================================
   */
  @Get('arbol')
  @ApiOperation({
    summary: 'Obtener árbol taxonómico jerárquico completo (recursivo)',
    description:
      'Retorna toda la jerarquía de categorías estructurada como nodos raíz con sus arreglos anidados de subcategorías, niveles, ruta jerárquica materializada y total de artículos asociados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Árbol jerárquico retornado exitosamente.',
  })
  async getArbol() {
    return this.categoriasService.getArbol();
  }

  /**
   * =========================================================================
   * LISTADO Y BÚSQUEDA PLANA CON FILTROS
   * =========================================================================
   */
  @Get()
  @ApiOperation({
    summary: 'Listar categorías técnicas con filtros y búsqueda textual',
    description:
      'Permite buscar por término libre (?q=...), filtrar por categoría padre (?id_padre=...) o por nivel de jerarquía (?nivel=...).',
  })
  @ApiResponse({ status: 200, description: 'Listado plano de categorías retornado.' })
  async findAll(@Query() query: QueryCategoriaDto) {
    return this.categoriasService.findAll(query);
  }

  /**
   * =========================================================================
   * DETALLE COMPLETO DE UNA CATEGORÍA POR ID
   * =========================================================================
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una categoría técnica con su padre y subcategorías' })
  @ApiResponse({ status: 200, description: 'Categoría encontrada.' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.findOne(id);
  }

  /**
   * =========================================================================
   * CREACIÓN IN-CONTEXT DE CATEGORÍA / SUBCATEGORÍA
   * =========================================================================
   */
  @Post()
  @ApiOperation({
    summary: 'Crear categoría técnica o subcategoría in-context',
    description:
      'Inserta un nodo en el catálogo calculando dinámicamente el nivel de profundidad, su ruta jerárquica materializada y su slug_path basándose en el id_padre asignado.',
  })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos de validación inválidos.' })
  @ApiResponse({ status: 404, description: 'Categoría padre no encontrada.' })
  @ApiResponse({ status: 409, description: 'Nombre o código duplicado en el mismo nivel jerárquico.' })
  async create(@Body() dto: CreateCategoriaComponenteDto) {
    return this.categoriasService.create(dto);
  }

  /**
   * =========================================================================
   * ACTUALIZACIÓN DE CATEGORÍA
   * =========================================================================
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar atributos de una categoría técnica' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente.' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  @ApiResponse({ status: 409, description: 'Conflicto de nombres en el mismo nivel jerárquico.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCategoriaComponenteDto,
  ) {
    return this.categoriasService.update(id, dto);
  }
}
