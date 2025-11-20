import { Prisma } from '@prisma/client';

/**
 * DTO para crear cronogramas_servicio
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateCronogramasServicioDto implements Partial<Prisma.cronogramas_servicioCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
