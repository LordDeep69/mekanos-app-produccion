import { PartialType } from '@nestjs/swagger';
import { CreateOrdenesCompraDto } from './create-ordenes-compra.dto';

/**
 * DTO para actualizar ordenes_compra
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateOrdenesCompraDto extends PartialType(CreateOrdenesCompraDto) {}
