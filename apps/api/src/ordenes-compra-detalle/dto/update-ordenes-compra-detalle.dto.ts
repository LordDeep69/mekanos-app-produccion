import { PartialType } from '@nestjs/swagger';
import { CreateOrdenesCompraDetalleDto } from './create-ordenes-compra-detalle.dto';

/**
 * DTO para actualizar ordenes_compra_detalle
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateOrdenesCompraDetalleDto extends PartialType(CreateOrdenesCompraDetalleDto) {}
