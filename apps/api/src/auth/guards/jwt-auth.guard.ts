import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard protege rutas que requieren autenticación
 * Usa JwtStrategy para validar el token
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedResource(@CurrentUser() user) { ... }
 * 
 * Para rutas públicas:
 * @Public()
 * @Get('public')
 * getPublicResource() { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any) {
    // Si no hay usuario o hay error, lanzar excepción
    if (err || !user) {
      throw err || new UnauthorizedException('Acceso no autorizado. Token inválido o expirado');
    }
    return user;
  }
}
