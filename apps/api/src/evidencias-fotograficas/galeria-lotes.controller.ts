import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { UserId } from '../mediciones-servicio/decorators/user-id.decorator';

/**
 * DTO para crear un lote de galería
 */
export class CreateLoteGaleriaDto {
  @ApiProperty({ description: 'ID orden servicio (FK)', example: 933 })
  @IsInt()
  idOrdenServicio!: number;

  @ApiProperty({
    description: 'Nombre del lote (título del contenedor en el PDF)',
    example: 'Fotos del 08/26',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombreLote!: string;
}

/**
 * DTO para renombrar un lote
 */
export class UpdateLoteGaleriaDto {
  @ApiPropertyOptional({
    description: 'Nuevo nombre del lote',
    example: 'Fotos del 09/26',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombreLote?: string;
}

/**
 * Galería por lotes (Fotos Generales)
 *
 * Permite agrupar las fotos generales de una orden en LOTES independientes
 * (ej. "Fotos del 08/26", "Fotos del 09/26"). Cada lote se renderiza en el
 * PDF como un contenedor aparte con su nombre como título.
 *
 * Al eliminar un lote, sus fotos vuelven al grupo estándar (FK ON DELETE SET NULL).
 */
@ApiTags('Galeria Lotes')
@ApiBearerAuth()
@Controller('galeria-lotes')
@UseGuards(JwtAuthGuard)
export class GaleriaLotesController {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Crear lote de galería
   * POST /api/galeria-lotes
   */
  @Post()
  @ApiOperation({ summary: 'Crear lote de galería de fotos generales' })
  async crearLote(
    @Body() dto: CreateLoteGaleriaDto,
    @UserId() userId: number,
  ) {
    // Validar orden
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: dto.idOrdenServicio },
      select: { id_orden_servicio: true },
    });
    if (!orden) {
      throw new NotFoundException(`Orden ${dto.idOrdenServicio} no encontrada`);
    }

    // Validar nombre no vacío
    const nombre = dto.nombreLote.trim();
    if (!nombre) {
      throw new BadRequestException('El nombre del lote no puede estar vacío');
    }

    // orden_lote = siguiente disponible
    const ultimo = await this.prisma.lotes_galeria.findFirst({
      where: { id_orden_servicio: dto.idOrdenServicio },
      orderBy: { orden_lote: 'desc' },
      select: { orden_lote: true },
    });

    const lote = await this.prisma.lotes_galeria.create({
      data: {
        id_orden_servicio: dto.idOrdenServicio,
        nombre_lote: nombre,
        orden_lote: (ultimo?.orden_lote ?? 0) + 1,
        creado_por: userId,
      },
    });

    return {
      idLoteGaleria: lote.id_lote_galeria,
      idOrdenServicio: lote.id_orden_servicio,
      nombreLote: lote.nombre_lote,
      ordenLote: lote.orden_lote,
      fechaCreacion: lote.fecha_creacion,
    };
  }

  /**
   * Listar lotes de una orden (con conteo de fotos)
   * GET /api/galeria-lotes/orden/:ordenId
   */
  @Get('orden/:ordenId')
  @ApiOperation({ summary: 'Listar lotes de galería por orden' })
  @ApiParam({ name: 'ordenId', type: Number })
  async listarPorOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ) {
    // ✅ FIX: Sin include _count — la relación evidencias⇄lotes no está declarada
    // en el schema de Prisma (solo existe la FK física en la BD). El conteo se
    // hace aparte con groupBy sobre el campo escalar id_lote_galeria.
    const lotes = await this.prisma.lotes_galeria.findMany({
      where: { id_orden_servicio: ordenId },
      orderBy: [{ orden_lote: 'asc' }, { id_lote_galeria: 'asc' }],
    });

    const ids = lotes.map((l) => l.id_lote_galeria);
    let conteos = new Map<number, number>();
    if (ids.length > 0) {
      const agrupado = await this.prisma.evidencias_fotograficas.groupBy({
        by: ['id_lote_galeria'],
        where: { id_lote_galeria: { in: ids } },
        _count: { _all: true },
      });
      conteos = new Map(
        agrupado
          .filter((g) => g.id_lote_galeria != null)
          .map((g) => [g.id_lote_galeria as number, g._count._all]),
      );
    }

    return lotes.map((l) => ({
      idLoteGaleria: l.id_lote_galeria,
      idOrdenServicio: l.id_orden_servicio,
      nombreLote: l.nombre_lote,
      ordenLote: l.orden_lote,
      fechaCreacion: l.fecha_creacion,
      cantidadFotos: conteos.get(l.id_lote_galeria) ?? 0,
    }));
  }

  /**
   * Renombrar lote
   * PUT /api/galeria-lotes/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Renombrar lote de galería' })
  @ApiParam({ name: 'id', type: Number })
  async renombrarLote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLoteGaleriaDto,
  ) {
    const lote = await this.prisma.lotes_galeria.findUnique({
      where: { id_lote_galeria: id },
    });
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    const nombre = dto.nombreLote?.trim();
    if (!nombre) {
      throw new BadRequestException('El nombre del lote no puede estar vacío');
    }

    const actualizado = await this.prisma.lotes_galeria.update({
      where: { id_lote_galeria: id },
      data: { nombre_lote: nombre },
    });

    return {
      idLoteGaleria: actualizado.id_lote_galeria,
      idOrdenServicio: actualizado.id_orden_servicio,
      nombreLote: actualizado.nombre_lote,
      ordenLote: actualizado.orden_lote,
    };
  }

  /**
   * Eliminar lote. Las fotos asociadas vuelven al grupo estándar
   * (FK ON DELETE SET NULL), NO se pierden.
   * DELETE /api/galeria-lotes/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar lote (sus fotos vuelven al grupo estándar)' })
  @ApiParam({ name: 'id', type: Number })
  async eliminarLote(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ) {
    const lote = await this.prisma.lotes_galeria.findUnique({
      where: { id_lote_galeria: id },
    });
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    await this.prisma.lotes_galeria.delete({
      where: { id_lote_galeria: id },
    });

    return {
      message: `Lote "${lote.nombre_lote}" eliminado. Sus fotos volvieron al grupo estándar de fotos generales.`,
    };
  }

  /**
   * Cambiar orden de un lote (reordenar en el PDF)
   * PATCH /api/galeria-lotes/:id/orden
   */
  @Patch(':id/orden')
  @ApiOperation({ summary: 'Cambiar posición del lote' })
  @ApiParam({ name: 'id', type: Number })
  async reordenarLote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { ordenLote: number },
  ) {
    const lote = await this.prisma.lotes_galeria.findUnique({
      where: { id_lote_galeria: id },
    });
    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    await this.prisma.lotes_galeria.update({
      where: { id_lote_galeria: id },
      data: { orden_lote: dto.ordenLote ?? lote.orden_lote },
    });

    return { idLoteGaleria: id, ordenLote: dto.ordenLote };
  }
}
