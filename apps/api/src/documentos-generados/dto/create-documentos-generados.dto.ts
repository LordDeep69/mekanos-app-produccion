import { Prisma } from '@prisma/client';

/**
 * DTO para crear documentos_generados
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class CreateDocumentosGeneradosDto implements Partial<Prisma.documentos_generadosCreateInput> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
