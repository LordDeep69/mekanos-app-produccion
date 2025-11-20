import { PartialType } from '@nestjs/swagger';
import { CreateBitacorasDto } from './create-bitacoras.dto';

/**
 * DTO para actualizar bitacoras
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateBitacorasDto extends PartialType(CreateBitacorasDto) {}
