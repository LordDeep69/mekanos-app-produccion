import { PartialType } from '@nestjs/swagger';
import { CreateBitacorasInformesDto } from './create-bitacoras-informes.dto';

/**
 * DTO para actualizar bitacoras_informes
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateBitacorasInformesDto extends PartialType(CreateBitacorasInformesDto) {}
