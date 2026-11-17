import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';

/**
 * PermisosGuard valida que el usuario autenticado posea los permisos
 * declarados mediante @Permisos('MODULO_ACCION').
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermisos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermisos || requiredPermisos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Acceso denegado. Usuario no autenticado.');
    }

    const roleCodes: string[] = Array.isArray(user.roles)
      ? user.roles.map((r: any) =>
          typeof r === 'string' ? r.toUpperCase() : String(r?.codigo || '').toUpperCase(),
        )
      : [];

    if (user.rol) {
      roleCodes.push(String(user.rol).toUpperCase());
    }

    if (roleCodes.includes('ADMIN') || roleCodes.includes('SUPERADMIN')) {
      return true;
    }

    const userPermisos = new Set<string>(
      Array.isArray(user.permisos)
        ? user.permisos.map((p: any) => String(p).toUpperCase())
        : [],
    );

    const hasAll = requiredPermisos.every((perm) => userPermisos.has(perm.toUpperCase()));
    if (!hasAll) {
      throw new ForbiddenException(
        `Acceso denegado. Permiso(s) requerido(s): ${requiredPermisos.join(', ')}`,
      );
    }

    return true;
  }
}
