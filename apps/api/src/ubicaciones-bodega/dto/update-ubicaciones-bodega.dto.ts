import { PartialType } from '@nestjs/swagger';
import { CreateUbicacionesBodegaDto } from './create-ubicaciones-bodega.dto';

/**
 * DTO para actualizar ubicaciones_bodega
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateUbicacionesBodegaDto extends PartialType(CreateUbicacionesBodegaDto) {}
