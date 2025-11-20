import { Prisma } from '@prisma/client';

/**
 * DTO para crear equipos_motor
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateEquiposMotorDto implements Partial<Prisma.equipos_motorCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
