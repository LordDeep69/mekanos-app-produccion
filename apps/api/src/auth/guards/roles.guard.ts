import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * RolesGuard valida que el usuario tenga uno de los roles permitidos
 * Debe usarse con el decorator @Roles()
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN', 'TECNICO')
 * @Get('admin-only')
 * getAdminResource() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener roles requeridos del decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles especificados, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener usuario del request (adjuntado por JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Acceso denegado. Usuario no autenticado.');
    }

    // Si el usuario es superadmin o admin y se solicita ADMIN, permitir acceso
    if (user.esAdmin && requiredRoles.includes('ADMIN')) {
      return true;
    }

    // Extraer códigos de roles disponibles en el usuario
    const userRoleCodes: string[] = [];
    if (user.rol) {
      userRoleCodes.push(String(user.rol).toUpperCase());
    }
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (typeof r === 'string') {
          userRoleCodes.push(r.toUpperCase());
        } else if (r?.codigo) {
          userRoleCodes.push(String(r.codigo).toUpperCase());
        }
      });
    }

    // Validar si algún rol requerido coincide con los roles del usuario
    const hasRole = requiredRoles.some(reqRole => userRoleCodes.includes(reqRole.toUpperCase()));

    if (!hasRole) {
      throw new ForbiddenException(`Acceso denegado. Se requiere uno de estos roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
