import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRolesDto } from './dto/create-roles.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateRolesDto, userId: number) {
    // Validar unique constraint: codigo_rol
    const existing = await this.prisma.roles.findUnique({
      where: { codigo_rol: createDto.codigo_rol },
    });

    if (existing) {
      throw new Error(
        `Rol con código ${createDto.codigo_rol} ya existe`,
      );
    }

    return this.prisma.roles.create({
      data: {
        ...createDto,
        creado_por: userId,
        fecha_creacion: new Date(),
      },
    });
  }

  async findAll(params?: {
    activo?: boolean;
    es_rol_sistema?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { activo, es_rol_sistema, skip = 0, take = 50 } = params || {};

    return this.prisma.roles.findMany({
      where: {
        ...(activo !== undefined && { activo }),
        ...(es_rol_sistema !== undefined && { es_rol_sistema }),
      },
      include: {
        roles_permisos: {
          include: {
            permisos: true,
          },
        },
      },
      skip,
      take,
      orderBy: { nivel_jerarquia: 'desc' },
    });
  }

  async findOne(id: number) {
    const rol = await this.prisma.roles.findUnique({
      where: { id_rol: id },
      include: {
        roles_permisos: {
          include: {
            permisos: true,
          },
        },
        usuarios_roles: {
          include: {
            usuarios_usuarios_roles_id_usuarioTousuarios: {
              select: {
                id_usuario: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!rol) {
      throw new Error(`Rol con ID ${id} no encontrado`);
    }

    return rol;
  }

  async update(id: number, updateDto: UpdateRolesDto, userId: number) {
    // Validar que rol existe
    await this.findOne(id);

    // Validar unique si se cambia codigo_rol
    if (updateDto.codigo_rol) {
      const existing = await this.prisma.roles.findUnique({
        where: { codigo_rol: updateDto.codigo_rol },
      });

      if (existing && existing.id_rol !== id) {
        throw new Error(
          `Rol con código ${updateDto.codigo_rol} ya existe`,
        );
      }
    }

    return this.prisma.roles.update({
      where: { id_rol: id },
      data: {
        ...updateDto,
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
      include: {
        roles_permisos: {
          include: {
            permisos: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    // Soft delete
    return this.prisma.roles.update({
      where: { id_rol: id },
      data: {
        activo: false,
      },
    });
  }
}
