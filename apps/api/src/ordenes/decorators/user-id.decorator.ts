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
    
    // Intentar diferentes campos comunes en JWT
    const userId = request.user?.id_usuario || request.user?.sub || request.user?.id;
    
    return userId;
  },
);
