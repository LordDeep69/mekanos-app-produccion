import { Injectable, Optional } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';
import { AsignarRolDto } from './dto/asignar-rol.dto';

@Injectable()
export class UsuariosRolesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly authService?: AuthService,
  ) {}

  async asignarRol(asignarDto: AsignarRolDto, asignadoPor: number) {
    // Validar que usuario existe
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario: asignarDto.id_usuario },
    });

    if (!usuario) {
      throw new Error(`Usuario con ID ${asignarDto.id_usuario} no existe`);
    }

    // Validar que rol existe
    const rol = await this.prisma.roles.findUnique({
      where: { id_rol: asignarDto.id_rol },
    });

    if (!rol) {
      throw new Error(`Rol con ID ${asignarDto.id_rol} no existe`);
    }

    // Verificar si ya está asignado
    const existing = await this.prisma.usuarios_roles.findUnique({
      where: {
        id_usuario_id_rol: {
          id_usuario: asignarDto.id_usuario,
          id_rol: asignarDto.id_rol,
        },
      },
    });

    if (existing) {
      throw new Error('El rol ya está asignado a este usuario');
    }

    const created = await this.prisma.usuarios_roles.create({
      data: {
        id_usuario: asignarDto.id_usuario,
        id_rol: asignarDto.id_rol,
        asignado_por: asignadoPor,
        fecha_asignacion: new Date(),
      },
      include: {
        usuarios: {
          select: {
            id_usuario: true,
            email: true,
            username: true,
          },
        },
        roles: true,
      },
    });
    this.authService?.invalidateUserCache(asignarDto.id_usuario);
    return created;
  }

  async listarRolesPorUsuario(idUsuario: number) {
    return this.prisma.usuarios_roles.findMany({
      where: { id_usuario: idUsuario },
      include: {
        roles: true,
      },
    });
  }

  async removerRol(idUsuario: number, idRol: number) {
    const existing = await this.prisma.usuarios_roles.findUnique({
      where: {
        id_usuario_id_rol: {
          id_usuario: idUsuario,
          id_rol: idRol,
        },
      },
    });

    if (!existing) {
      throw new Error('La asignación no existe');
    }

    const deleted = await this.prisma.usuarios_roles.delete({
      where: {
        id_usuario_id_rol: {
          id_usuario: idUsuario,
          id_rol: idRol,
        },
      },
    });
    this.authService?.invalidateUserCache(idUsuario);
    return deleted;
  }
}
