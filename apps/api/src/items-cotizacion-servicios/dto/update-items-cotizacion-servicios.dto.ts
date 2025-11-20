import { PartialType } from '@nestjs/swagger';
import { CreateItemsCotizacionServiciosDto } from './create-items-cotizacion-servicios.dto';

/**
 * DTO para actualizar items_cotizacion_servicios
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateItemsCotizacionServiciosDto extends PartialType(CreateItemsCotizacionServiciosDto) {}
