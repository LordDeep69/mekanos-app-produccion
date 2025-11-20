import { Prisma } from '@prisma/client';

/**
 * DTO para crear catalogo_servicios
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateCatalogoServiciosDto implements Partial<Prisma.catalogo_serviciosCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
