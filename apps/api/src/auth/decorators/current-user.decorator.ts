import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser decorator extrae el usuario autenticado del request
 * Debe usarse junto con JwtAuthGuard
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * getProfile(@CurrentUser() user) {
 *   return { id: user.id, email: user.email };
 * }
 * 
 * También permite extraer propiedades específicas:
 * @Get('email')
 * getEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Si se especificó una propiedad, retornar solo esa propiedad
    if (data) {
      return user?.[data];
    }

    // Si no, retornar el usuario completo
    return user;
  },
);
