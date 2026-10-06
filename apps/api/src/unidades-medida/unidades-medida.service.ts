import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QueryUnidadMedidaDto } from './dto/query-unidad-medida.dto';

@Injectable()
export class UnidadesMedidaService {
  private readonly logger = new Logger(UnidadesMedidaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Endpoint de solo lectura para listar las unidades de medida activas
   * ordenadas por su tipo de magnitud física y nombre.
   */
  async findAll(query: QueryUnidadMedidaDto) {
    const where: Prisma.unidades_medidaWhereInput = {};

    if (query.activo !== undefined) {
      where.activo = query.activo;
    }

    if (query.tipo_magnitud && query.tipo_magnitud.trim() !== '') {
      where.tipo_magnitud = query.tipo_magnitud.trim().toUpperCase();
    }

    return this.prisma.unidades_medida.findMany({
      where,
      orderBy: [
        { tipo_magnitud: 'asc' },
        { nombre: 'asc' },
      ],
      select: {
        codigo: true,
        nombre: true,
        simbolo: true,
        tipo_magnitud: true,
        permite_decimales: true,
        activo: true,
      },
    });
  }

  /**
   * Obtener detalle de una unidad de medida por su código mnemotécnico (PK).
   */
  async findOne(codigo: string) {
    const unidad = await this.prisma.unidades_medida.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
      include: {
        _count: {
          select: {
            catalogo_componentes: true,
          },
        },
      },
    });

    if (!unidad) {
      throw new NotFoundException(`La unidad de medida con código '${codigo}' no existe.`);
    }

    return unidad;
  }
}
