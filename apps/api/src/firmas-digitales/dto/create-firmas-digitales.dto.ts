import { Prisma } from '@prisma/client';

/**
 * DTO para crear firmas_digitales
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateFirmasDigitalesDto implements Partial<Prisma.firmas_digitalesCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
