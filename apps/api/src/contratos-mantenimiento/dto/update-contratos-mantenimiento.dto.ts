import { PartialType } from '@nestjs/swagger';
import { CreateContratosMantenimientoDto } from './create-contratos-mantenimiento.dto';

/**
 * DTO para actualizar contratos_mantenimiento
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateContratosMantenimientoDto extends PartialType(CreateContratosMantenimientoDto) {}
