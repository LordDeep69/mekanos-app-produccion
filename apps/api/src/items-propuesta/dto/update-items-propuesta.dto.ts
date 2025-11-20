import { PartialType } from '@nestjs/swagger';
import { CreateItemsPropuestaDto } from './create-items-propuesta.dto';

/**
 * DTO para actualizar items_propuesta
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateItemsPropuestaDto extends PartialType(CreateItemsPropuestaDto) {}
