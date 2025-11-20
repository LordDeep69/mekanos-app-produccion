import { PartialType } from '@nestjs/swagger';
import { CreateMovimientosInventarioDto } from './create-movimientos-inventario.dto';

/**
 * DTO para actualizar movimientos_inventario
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateMovimientosInventarioDto extends PartialType(CreateMovimientosInventarioDto) {}
