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

    // Validar que el usuario tenga uno de los roles requeridos
    const hasRole = requiredRoles.includes(user.rol);

    if (!hasRole) {
      throw new ForbiddenException(`Acceso denegado. Se requiere uno de estos roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
