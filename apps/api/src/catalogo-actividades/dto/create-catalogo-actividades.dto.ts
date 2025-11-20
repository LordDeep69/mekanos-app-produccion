import { Prisma } from '@prisma/client';

/**
 * DTO para crear catalogo_actividades
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateCatalogoActividadesDto implements Partial<Prisma.catalogo_actividadesCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
