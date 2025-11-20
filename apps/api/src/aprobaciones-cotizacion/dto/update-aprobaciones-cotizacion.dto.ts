import { PartialType } from '@nestjs/swagger';
import { CreateAprobacionesCotizacionDto } from './create-aprobaciones-cotizacion.dto';

/**
 * DTO para actualizar aprobaciones_cotizacion
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateAprobacionesCotizacionDto extends PartialType(CreateAprobacionesCotizacionDto) {}
