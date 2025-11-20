import { PrismaService } from '@mekanos/database';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
    ActualizarUbicacionData,
    CrearUbicacionData,
    FiltrosUbicacion,
    IUbicacionesBodegaRepository,
    UbicacionBodega,
    UbicacionesPaginadas,
} from '../interfaces/ubicaciones-bodega.repository.interface';

@Injectable()
export class PrismaUbicacionesBodegaRepository implements IUbicacionesBodegaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(data: CrearUbicacionData): Promise<UbicacionBodega> {
    // Validar código único
    const existente = await this.prisma.ubicaciones_bodega.findUnique({
      where: { codigo_ubicacion: data.codigo_ubicacion },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una ubicación con código ${data.codigo_ubicacion}`,
      );
    }

    return this.prisma.ubicaciones_bodega.create({
      data: {
        codigo_ubicacion: data.codigo_ubicacion,
        zona: data.zona,
        pasillo: data.pasillo || null,
        estante: data.estante || null,
        nivel: data.nivel || null,
        activo: true,
      },
    });
  }

  async actualizar(
    id: number,
    data: ActualizarUbicacionData,
  ): Promise<UbicacionBodega> {
    // Verificar que existe
    const ubicacion = await this.prisma.ubicaciones_bodega.findUnique({
      where: { id_ubicacion: id },
    });

    if (!ubicacion) {
      throw new NotFoundException(`Ubicación ${id} no encontrada`);
    }

    // Si cambia código, validar que no exista otro con ese código
    if (data.codigo_ubicacion && data.codigo_ubicacion !== ubicacion.codigo_ubicacion) {
      const existente = await this.prisma.ubicaciones_bodega.findUnique({
        where: { codigo_ubicacion: data.codigo_ubicacion },
      });

      if (existente) {
        throw new ConflictException(
          `Ya existe una ubicación con código ${data.codigo_ubicacion}`,
        );
      }
    }

    return this.prisma.ubicaciones_bodega.update({
      where: { id_ubicacion: id },
      data: {
        codigo_ubicacion: data.codigo_ubicacion,
        zona: data.zona,
        pasillo: data.pasillo,
        estante: data.estante,
        nivel: data.nivel,
        activo: data.activo,
      },
    });
  }

  async desactivar(id: number): Promise<UbicacionBodega> {
    const ubicacion = await this.prisma.ubicaciones_bodega.findUnique({
      where: { id_ubicacion: id },
    });

    if (!ubicacion) {
      throw new NotFoundException(`Ubicación ${id} no encontrada`);
    }

    if (!ubicacion.activo) {
      throw new ConflictException(`La ubicación ${id} ya está desactivada`);
    }

    return this.prisma.ubicaciones_bodega.update({
      where: { id_ubicacion: id },
      data: { activo: false },
    });
  }

  async findAll(filtros: FiltrosUbicacion): Promise<UbicacionesPaginadas> {
    const { zona, activo, page = 1, limit = 10 } = filtros;

    const where: any = {};

    if (zona) {
      where.zona = { contains: zona, mode: 'insensitive' };
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    const [data, total] = await Promise.all([
      this.prisma.ubicaciones_bodega.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { codigo_ubicacion: 'asc' },
      }),
      this.prisma.ubicaciones_bodega.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number): Promise<UbicacionBodega | null> {
    return this.prisma.ubicaciones_bodega.findUnique({
      where: { id_ubicacion: id },
    });
  }

  async findByCodigo(codigo: string): Promise<UbicacionBodega | null> {
    return this.prisma.ubicaciones_bodega.findUnique({
      where: { codigo_ubicacion: codigo },
    });
  }
}
