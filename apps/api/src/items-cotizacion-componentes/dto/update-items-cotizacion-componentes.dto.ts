import { PartialType } from '@nestjs/swagger';
import { CreateItemsCotizacionComponentesDto } from './create-items-cotizacion-componentes.dto';

/**
 * DTO para actualizar items_cotizacion_componentes
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateItemsCotizacionComponentesDto extends PartialType(CreateItemsCotizacionComponentesDto) {}
