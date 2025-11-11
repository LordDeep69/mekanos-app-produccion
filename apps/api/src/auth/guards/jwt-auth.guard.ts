import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JwtAuthGuard protege rutas que requieren autenticación
 * Usa JwtStrategy para validar el token
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedResource(@CurrentUser() user) { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
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
