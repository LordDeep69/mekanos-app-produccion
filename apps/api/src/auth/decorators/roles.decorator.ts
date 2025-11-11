import { SetMetadata } from '@nestjs/common';

/**
 * @Roles decorator especifica qué roles pueden acceder a una ruta
 * Debe usarse junto con JwtAuthGuard y RolesGuard
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN', 'GERENTE')
 * @Delete('users/:id')
 * deleteUser(@Param('id') id: string) { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
