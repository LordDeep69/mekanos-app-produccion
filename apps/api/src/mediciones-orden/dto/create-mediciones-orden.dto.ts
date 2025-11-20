import { Prisma } from '@prisma/client';

/**
 * DTO para crear mediciones_orden
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateMedicionesOrdenDto implements Partial<Prisma.mediciones_ordenCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
