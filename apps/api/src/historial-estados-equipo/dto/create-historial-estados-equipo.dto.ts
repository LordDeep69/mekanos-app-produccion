import { Prisma } from '@prisma/client';

/**
 * DTO para crear historial_estados_equipo
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateHistorialEstadosEquipoDto implements Partial<Prisma.historial_estados_equipoCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
