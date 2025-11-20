import { PartialType } from '@nestjs/swagger';
import { CreateLotesComponentesDto } from './create-lotes-componentes.dto';

/**
 * DTO para actualizar lotes_componentes
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateLotesComponentesDto extends PartialType(CreateLotesComponentesDto) {}
