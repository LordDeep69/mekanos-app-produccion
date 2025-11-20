import { Prisma } from '@prisma/client';

/**
 * DTO para crear aprobaciones_cotizacion
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateAprobacionesCotizacionDto implements Partial<Prisma.aprobaciones_cotizacionCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
