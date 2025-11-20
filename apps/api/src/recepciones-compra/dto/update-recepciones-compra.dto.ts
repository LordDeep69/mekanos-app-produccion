import { PartialType } from '@nestjs/swagger';
import { CreateRecepcionesCompraDto } from './create-recepciones-compra.dto';

/**
 * DTO para actualizar recepciones_compra
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateRecepcionesCompraDto extends PartialType(CreateRecepcionesCompraDto) {}
