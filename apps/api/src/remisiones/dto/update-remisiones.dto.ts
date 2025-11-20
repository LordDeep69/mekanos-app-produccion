import { PartialType } from '@nestjs/swagger';
import { CreateRemisionesDto } from './create-remisiones.dto';

/**
 * DTO para actualizar remisiones
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateRemisionesDto extends PartialType(CreateRemisionesDto) {}
