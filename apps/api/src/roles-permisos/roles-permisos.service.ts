import { Injectable, Optional } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';
import { AsignarPermisoDto } from './dto/asignar-permiso.dto';

@Injectable()
export class RolesPermisosService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly authService?: AuthService,
  ) {}

  async asignarPermiso(asignarDto: AsignarPermisoDto, userId: number) {
    // Validar que rol existe
    const rol = await this.prisma.roles.findUnique({
      where: { id_rol: asignarDto.id_rol },
    });

    if (!rol) {
      throw new Error(`Rol con ID ${asignarDto.id_rol} no existe`);
    }

    // Validar que permiso existe
    const permiso = await this.prisma.permisos.findUnique({
      where: { id_permiso: asignarDto.id_permiso },
    });

    if (!permiso) {
      throw new Error(`Permiso con ID ${asignarDto.id_permiso} no existe`);
    }

    // Verificar si ya está asignado
    const existing = await this.prisma.roles_permisos.findUnique({
      where: {
        id_rol_id_permiso: {
          id_rol: asignarDto.id_rol,
          id_permiso: asignarDto.id_permiso,
        },
      },
    });

    if (existing) {
      throw new Error('El permiso ya está asignado a este rol');
    }

    const created = await this.prisma.roles_permisos.create({
      data: {
        id_rol: asignarDto.id_rol,
        id_permiso: asignarDto.id_permiso,
        asignado_por: userId,
        fecha_asignacion: new Date(),
      },
      include: {
        roles: true,
        permisos: true,
      },
    });
    this.authService?.clearAllValidationCache();
    return created;
  }

  async listarPermisosPorRol(idRol: number) {
    return this.prisma.roles_permisos.findMany({
      where: { id_rol: idRol },
      include: {
        permisos: true,
      },
    });
  }

  async removerPermiso(idRol: number, idPermiso: number) {
    const existing = await this.prisma.roles_permisos.findUnique({
      where: {
        id_rol_id_permiso: {
          id_rol: idRol,
          id_permiso: idPermiso,
        },
      },
    });

    if (!existing) {
      throw new Error('La asignación no existe');
    }

    const deleted = await this.prisma.roles_permisos.delete({
      where: {
        id_rol_id_permiso: {
          id_rol: idRol,
          id_permiso: idPermiso,
        },
      },
    });
    this.authService?.clearAllValidationCache();
    return deleted;
  }
}
