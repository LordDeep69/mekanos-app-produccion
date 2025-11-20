import { PartialType } from '@nestjs/swagger';
import { CreateRemisionesDetalleDto } from './create-remisiones-detalle.dto';

/**
 * DTO para actualizar remisiones_detalle
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateRemisionesDetalleDto extends PartialType(CreateRemisionesDetalleDto) {}
