import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ArticulosService } from './articulos.service';
import { CreateArticuloMaestroDto } from './dto/create-articulo-maestro.dto';
import { UpdateCatalogoComponenteDto } from './dto/update-catalogo-componente.dto';
import {
  VincularProveedorDto,
  ActualizarPrecioProveedorDto,
} from './dto/sourcing-proveedor.dto';
import { FiltrosArticulosDto } from './dto/filtros-articulos.dto';
import { ActualizarCatalogoComponenteCommand } from './application/commands/actualizar-catalogo-componente.command';
import { DesactivarCatalogoComponenteCommand } from './application/commands/desactivar-catalogo-componente.command';

@ApiTags('Catálogo Maestro y Abastecimiento')
@ApiBearerAuth()
@Controller('catalogo-componentes')
@UseGuards(JwtAuthGuard)
export class CatalogoComponentesController {
  constructor(
    private readonly articulosService: ArticulosService,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * =========================================================================
   * CREACIÓN ATÓMICA DE ARTÍCULO / RECURSO MAESTRO
   * =========================================================================
   */
  @Post()
  @ApiOperation({
    summary: 'Crear nuevo artículo maestro con matriz de proveedores y auditoría inicial',
    description:
      'Inserta el recurso base en la tabla maestra, enlaza sus proveedores iniciales en la matriz de referencias cruzadas y genera de forma automática la primera entrada en la bitácora inmutable de costos.',
  })
  @ApiResponse({ status: 201, description: 'Artículo maestro creado exitosamente con sus relaciones.' })
  @ApiResponse({ status: 400, description: 'Datos de validación inválidos.' })
  @ApiResponse({ status: 409, description: 'Código interno o referencia en conflicto.' })
  async create(
    @Body() dto: CreateArticuloMaestroDto,
    @CurrentUser() user: any,
  ) {
    const idUsuario = user?.id_usuario || user?.sub || 1;
    return this.articulosService.create(dto, idUsuario);
  }

  /**
   * =========================================================================
   * LISTADO Y BÚSQUEDA GENERAL CON FILTROS Y ARQUETIPOS
   * =========================================================================
   */
  @Get()
  @ApiOperation({
    summary: 'Listar artículos del catálogo con filtros avanzados',
    description: 'Permite filtrar por destino operativo (arquetipo), categoría técnica, proveedor, marca y búsqueda textual (SKU, nombre, referencia).',
  })
  async findAll(@Query() filtros: FiltrosArticulosDto) {
    return this.articulosService.findAll(filtros);
  }

  /**
   * =========================================================================
   * DETALLE COMPLETO DE UN ARTÍCULO (INCLUYE PROVEEDORES Y BITÁCORA)
   * =========================================================================
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener ficha técnica y comercial completa de un artículo' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articulosService.findOne(id);
  }

  /**
   * =========================================================================
   * ACTUALIZACIÓN DE DATOS MAESTROS DE ARTÍCULO
   * =========================================================================
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar especificaciones o atributos de un artículo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogoComponenteDto,
  ) {
    const command = new ActualizarCatalogoComponenteCommand(id, dto);
    return this.commandBus.execute(command);
  }

  /**
   * =========================================================================
   * DESACTIVACIÓN (SOFT DELETE) DE UN ARTÍCULO
   * =========================================================================
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un artículo del catálogo' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const idUsuario = user?.id_usuario || 1;
    const command = new DesactivarCatalogoComponenteCommand(id, idUsuario);
    return this.commandBus.execute(command);
  }

  /**
   * =========================================================================
   * MATRIZ DE REFERENCIAS CRUZADAS: FUENTES DE SUMINISTRO (PROVEEDORES)
   * =========================================================================
   */
  @Get(':id/proveedores')
  @ApiOperation({
    summary: 'Listar proveedores y referencias cruzadas de un artículo',
    description: 'Devuelve todas las fuentes de suministro vinculadas, con sus SKUs, costos negociados, escalas y proveedor preferido.',
  })
  async getFuentesSuministro(@Param('id', ParseIntPipe) id: number) {
    return this.articulosService.getFuentesSuministro(id);
  }

  @Post(':id/proveedores')
  @ApiOperation({
    summary: 'Vincular un nuevo proveedor a un artículo (Cross-referencing)',
    description: 'Asocia una oferta de proveedor (SKU, costo, escalas) y registra la auditoría correspondiente en la bitácora.',
  })
  async vincularProveedor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VincularProveedorDto,
    @CurrentUser() user: any,
  ) {
    const idUsuario = user?.id_usuario || 1;
    return this.articulosService.vincularProveedor(id, dto, idUsuario);
  }

  @Put(':id/proveedores/:idProveedor/precio')
  @ApiOperation({
    summary: 'Actualizar costo pactado de un proveedor con registro de auditoría inmutable',
    description: 'Actualiza el costo de adquisición de un proveedor para este artículo, calcula la variación porcentual y anota el registro en la bitácora histórica.',
  })
  async actualizarPrecioProveedor(
    @Param('id', ParseIntPipe) id: number,
    @Param('idProveedor', ParseIntPipe) idProveedor: number,
    @Body() dto: ActualizarPrecioProveedorDto,
    @CurrentUser() user: any,
  ) {
    const idUsuario = user?.id_usuario || 1;
    return this.articulosService.actualizarPrecioProveedor(id, idProveedor, dto, idUsuario);
  }

  @Delete(':id/proveedores/:idProveedor')
  @ApiOperation({ summary: 'Desvincular una fuente de suministro de un artículo' })
  async desvincularProveedor(
    @Param('id', ParseIntPipe) id: number,
    @Param('idProveedor', ParseIntPipe) idProveedor: number,
  ) {
    return this.articulosService.desvincularProveedor(id, idProveedor);
  }

  /**
   * =========================================================================
   * BITÁCORA INMUTABLE DE HISTORIAL DE COSTOS Y PRECIOS DE COMPRA
   * =========================================================================
   */
  @Get(':id/historial-costos')
  @ApiOperation({
    summary: 'Obtener historial cronológico inmutable de costos de compra',
    description: 'Devuelve la bitácora completa de cambios de costos, fechas, facturas asociadas y usuarios que realizaron los registros.',
  })
  @ApiQuery({ name: 'idProveedor', required: false, type: Number })
  async getHistorialCostos(
    @Param('id', ParseIntPipe) id: number,
    @Query('idProveedor') idProveedor?: string,
  ) {
    const provId = idProveedor ? parseInt(idProveedor, 10) : undefined;
    return this.articulosService.getHistorialCostos(id, provId);
  }
}
