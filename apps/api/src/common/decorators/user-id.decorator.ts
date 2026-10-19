import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para extraer el id_usuario del JWT payload
 * Uso: @UserId() userId: number
 * 
 * El JWT payload contiene { id_usuario, email, rol } desde auth.service.ts
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    
    // Intentar diferentes campos comunes en JWT y request.user
    const rawId = request.user?.id_usuario || request.user?.id || request.user?.sub;
    const num = rawId ? Number(rawId) : NaN;
    
    return !isNaN(num) && num > 0 ? num : 1;
  },
);
