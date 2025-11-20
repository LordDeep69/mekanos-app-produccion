import { PartialType } from '@nestjs/swagger';
import { CreateDevolucionesProveedorDto } from './create-devoluciones-proveedor.dto';

/**
 * DTO para actualizar devoluciones_proveedor
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateDevolucionesProveedorDto extends PartialType(CreateDevolucionesProveedorDto) {}
