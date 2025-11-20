import { Prisma } from '@prisma/client';

/**
 * DTO para crear ordenes_compra_detalle
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateOrdenesCompraDetalleDto implements Partial<Prisma.ordenes_compra_detalleCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
