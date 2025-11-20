import { PartialType } from '@nestjs/swagger';
import { CreateCronogramasServicioDto } from './create-cronogramas-servicio.dto';

/**
 * DTO para actualizar cronogramas_servicio
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateCronogramasServicioDto extends PartialType(CreateCronogramasServicioDto) {}
