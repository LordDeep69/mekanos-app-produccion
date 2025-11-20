import { PartialType } from '@nestjs/swagger';
import { CreateTiposServicioDto } from './create-tipos-servicio.dto';

/**
 * DTO para actualizar tipos_servicio
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateTiposServicioDto extends PartialType(CreateTiposServicioDto) {}
