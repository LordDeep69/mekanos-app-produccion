import { PrismaService } from '@mekanos/database';
import { ConflictException, Injectable } from '@nestjs/common';
import { categoria_motivo_ajuste_enum, motivos_ajuste } from '@prisma/client';
import { IMotivosAjusteRepository } from '../domain/motivos-ajuste.repository.interface';

@Injectable()
export class PrismaMotivosAjusteRepository
  implements IMotivosAjusteRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async crear(data: {
    codigo_motivo: string;
    nombre_motivo: string;
    categoria: categoria_motivo_ajuste_enum;
    requiere_justificacion_detallada: boolean;
    requiere_aprobacion_gerencia: boolean;
  }): Promise<motivos_ajuste> {
    // Validar código único
    const existe = await this.findByCodigo(data.codigo_motivo);
    if (existe) {
      throw new ConflictException(
        `Ya existe un motivo con código: ${data.codigo_motivo}`,
      );
    }

    return this.prisma.motivos_ajuste.create({
      data,
    });
  }

  async actualizar(
    id_motivo_ajuste: number,
    data: Partial<{
      codigo_motivo: string;
      nombre_motivo: string;
      categoria: categoria_motivo_ajuste_enum;
      requiere_justificacion_detallada: boolean;
      requiere_aprobacion_gerencia: boolean;
      activo: boolean;
    }>,
  ): Promise<motivos_ajuste> {
    // Si se intenta cambiar código, validar que no exista
    if (data.codigo_motivo) {
      const existe = await this.prisma.motivos_ajuste.findFirst({
        where: {
          codigo_motivo: data.codigo_motivo,
          NOT: { id_motivo_ajuste },
        },
      });

      if (existe) {
        throw new ConflictException(
          `Ya existe un motivo con código: ${data.codigo_motivo}`,
        );
      }
    }

    return this.prisma.motivos_ajuste.update({
      where: { id_motivo_ajuste },
      data,
    });
  }

  async desactivar(id_motivo_ajuste: number): Promise<motivos_ajuste> {
    return this.prisma.motivos_ajuste.update({
      where: { id_motivo_ajuste },
      data: { activo: false },
    });
  }

  async findAll(filters: {
    activo?: boolean;
    categoria?: categoria_motivo_ajuste_enum;
    page: number;
    limit: number;
  }): Promise<{
    data: motivos_ajuste[];
    total: number;
  }> {
    const { activo, categoria, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (activo !== undefined) {
      where.activo = activo;
    }
    if (categoria) {
      where.categoria = categoria;
    }

    const [data, total] = await Promise.all([
      this.prisma.motivos_ajuste.findMany({
        where,
        skip,
        take: Math.min(limit, 100), // Max 100 por request
        orderBy: { codigo_motivo: 'asc' },
      }),
      this.prisma.motivos_ajuste.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id_motivo_ajuste: number): Promise<motivos_ajuste | null> {
    return this.prisma.motivos_ajuste.findUnique({
      where: { id_motivo_ajuste },
    });
  }

  async findByCodigo(codigo_motivo: string): Promise<motivos_ajuste | null> {
    return this.prisma.motivos_ajuste.findUnique({
      where: { codigo_motivo },
    });
  }
}
