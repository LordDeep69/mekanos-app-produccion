import { PartialType } from '@nestjs/swagger';
import { CreateCotizacionesDto } from './create-cotizaciones.dto';

/**
 * DTO para actualizar cotizaciones
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateCotizacionesDto extends PartialType(CreateCotizacionesDto) {}
