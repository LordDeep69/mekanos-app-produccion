import { PartialType } from '@nestjs/swagger';
import { CreateProveedoresDto } from './create-proveedores.dto';

/**
 * DTO para actualizar proveedores
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateProveedoresDto extends PartialType(CreateProveedoresDto) {}
