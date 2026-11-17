import { PartialType } from '@nestjs/swagger';
import { CrearProveedorDto } from './create-proveedor.dto';

/**
 * DTO para actualizar proveedores con validación estricta.
 */
export class UpdateProveedoresDto extends PartialType(CrearProveedorDto) {}
