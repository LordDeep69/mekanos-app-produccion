import { Prisma } from '@prisma/client';

/**
 * DTO para crear movimientos_inventario
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateMovimientosInventarioDto implements Partial<Prisma.movimientos_inventarioCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
