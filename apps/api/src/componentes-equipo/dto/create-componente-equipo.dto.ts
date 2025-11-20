import { Prisma } from '@prisma/client';

/**
 * DTO para crear componente en equipo (relación N:N)
 */
export class CreateComponenteEquipoDto implements Partial<Prisma.componentes_equipoCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
