import { Injectable } from '@nestjs/common';
import { catalogo_sistemas } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ICatalogoSistemasRepository } from '../domain/catalogo-sistemas.repository.interface';

@Injectable()
export class PrismaCatalogoSistemasRepository implements ICatalogoSistemasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener lista paginada de sistemas
   */
  async findAll(page: number, limit: number): Promise<{ data: catalogo_sistemas[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.catalogo_sistemas.findMany({
        skip,
        take: limit,
        orderBy: { orden_visualizacion: 'asc' },
      }),
      this.prisma.catalogo_sistemas.count(),
    ]);

    return { data, total };
  }

  /**
   * Obtener solo sistemas activos (sin paginación)
   */
  async findActivos(): Promise<catalogo_sistemas[]> {
    return this.prisma.catalogo_sistemas.findMany({
      where: { activo: true },
      orderBy: { orden_visualizacion: 'asc' },
    });
  }

  /**
   * Buscar sistema por ID
   */
  async findById(id: number): Promise<catalogo_sistemas | null> {
    return this.prisma.catalogo_sistemas.findUnique({
      where: { id_sistema: id },
    });
  }

  /**
   * Buscar sistema por código (normalizado a UPPER)
   */
  async findByCodigo(codigo: string): Promise<catalogo_sistemas | null> {
    return this.prisma.catalogo_sistemas.findUnique({
      where: { codigo_sistema: codigo.toUpperCase().trim() },
    });
  }

  /**
   * Buscar sistema por orden de visualización
   */
  async findByOrden(orden: number): Promise<catalogo_sistemas | null> {
    return this.prisma.catalogo_sistemas.findFirst({
      where: { orden_visualizacion: orden },
    });
  }

  /**
   * Crear nuevo sistema
   */
  async create(data: any): Promise<catalogo_sistemas> {
    return this.prisma.catalogo_sistemas.create({
      data: data as any,
    });
  }

  /**
   * Actualizar sistema existente
   */
  async update(id: number, data: any): Promise<catalogo_sistemas> {
    return this.prisma.catalogo_sistemas.update({
      where: { id_sistema: id },
      data: data as any,
    });
  }

  /**
   * Soft delete: marcar como inactivo
   */
  async softDelete(id: number): Promise<catalogo_sistemas> {
    return this.prisma.catalogo_sistemas.update({
      where: { id_sistema: id },
      data: { activo: false },
    });
  }
}
