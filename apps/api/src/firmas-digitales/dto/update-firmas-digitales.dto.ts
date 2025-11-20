import { PartialType } from '@nestjs/swagger';
import { CreateFirmasDigitalesDto } from './create-firmas-digitales.dto';

/**
 * DTO para actualizar firmas_digitales
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateFirmasDigitalesDto extends PartialType(CreateFirmasDigitalesDto) {}
