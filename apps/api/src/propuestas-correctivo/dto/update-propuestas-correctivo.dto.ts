import { PartialType } from '@nestjs/swagger';
import { CreatePropuestasCorrectivoDto } from './create-propuestas-correctivo.dto';

/**
 * DTO para actualizar propuestas_correctivo
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdatePropuestasCorrectivoDto extends PartialType(CreatePropuestasCorrectivoDto) {}
