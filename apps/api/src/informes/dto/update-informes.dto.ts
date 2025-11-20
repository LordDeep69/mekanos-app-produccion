import { PartialType } from '@nestjs/swagger';
import { CreateInformesDto } from './create-informes.dto';

/**
 * DTO para actualizar informes
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateInformesDto extends PartialType(CreateInformesDto) {}
