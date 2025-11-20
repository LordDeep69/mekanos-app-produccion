import { Prisma } from '@prisma/client';

/**
 * DTO para crear items_cotizacion_componentes
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateItemsCotizacionComponentesDto implements Partial<Prisma.items_cotizacion_componentesCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
