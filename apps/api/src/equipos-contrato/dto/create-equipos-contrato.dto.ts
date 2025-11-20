import { Prisma } from '@prisma/client';

/**
 * DTO para crear equipos_contrato
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateEquiposContratoDto implements Partial<Prisma.equipos_contratoCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
