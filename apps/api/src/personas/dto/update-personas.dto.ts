import { PartialType } from '@nestjs/swagger';
import { CreatePersonasDto } from './create-personas.dto';

/**
 * DTO para actualizar personas
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdatePersonasDto extends PartialType(CreatePersonasDto) {}
