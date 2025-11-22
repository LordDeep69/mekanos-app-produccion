import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePermisosDto } from './dto/create-permisos.dto';
import { UpdatePermisosDto } from './dto/update-permisos.dto';

@Injectable()
export class PermisosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreatePermisosDto, userId: number) {
    // Validar unique constraint: codigo_permiso
    const existing = await this.prisma.permisos.findUnique({
      where: { codigo_permiso: createDto.codigo_permiso },
    });

    if (existing) {
      throw new Error(
        `Permiso con código ${createDto.codigo_permiso} ya existe`,
      );
    }

    return this.prisma.permisos.create({
      data: {
        ...createDto,
        creado_por: userId,
        fecha_creacion: new Date(),
      },
    });
  }

  async findAll(params?: {
    modulo?: string;
    activo?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { modulo, activo, skip = 0, take = 100 } = params || {};

    return this.prisma.permisos.findMany({
      where: {
        ...(modulo && { modulo }),
        ...(activo !== undefined && { activo }),
      },
      skip,
      take,
      orderBy: { codigo_permiso: 'asc' },
    });
  }

  async findOne(id: number) {
    const permiso = await this.prisma.permisos.findUnique({
      where: { id_permiso: id },
      include: {
        roles_permisos: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!permiso) {
      throw new Error(`Permiso con ID ${id} no encontrado`);
    }

    return permiso;
  }

  async update(id: number, updateDto: UpdatePermisosDto, _userId: number) {
    // Validar que permiso existe
    await this.findOne(id);

    // Validar unique si se cambia codigo_permiso
    if (updateDto.codigo_permiso) {
      const existing = await this.prisma.permisos.findUnique({
        where: { codigo_permiso: updateDto.codigo_permiso },
      });

      if (existing && existing.id_permiso !== id) {
        throw new Error(
          `Permiso con código ${updateDto.codigo_permiso} ya existe`,
        );
      }
    }

    return this.prisma.permisos.update({
      where: { id_permiso: id },
      data: {
        ...updateDto,
        // No hay modificado_por en permisos (solo creado_por)
      },
      include: {
        roles_permisos: {
          include: {
            roles: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    // Soft delete
    return this.prisma.permisos.update({
      where: { id_permiso: id },
      data: {
        activo: false,
      },
    });
  }
}
