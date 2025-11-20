import { PartialType } from '@nestjs/swagger';
import { CreateEstadosCotizacionDto } from './create-estados-cotizacion.dto';

/**
 * DTO para actualizar estados_cotizacion
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateEstadosCotizacionDto extends PartialType(CreateEstadosCotizacionDto) {}
