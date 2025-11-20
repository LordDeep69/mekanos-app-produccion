import { Prisma } from '@prisma/client';

/**
 * DTO para crear propuestas_correctivo
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreatePropuestasCorrectivoDto implements Partial<Prisma.propuestas_correctivoCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
