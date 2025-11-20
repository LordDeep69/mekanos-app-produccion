import { PartialType } from '@nestjs/swagger';
import { CreateMedicionesOrdenDto } from './create-mediciones-orden.dto';

/**
 * DTO para actualizar mediciones_orden
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateMedicionesOrdenDto extends PartialType(CreateMedicionesOrdenDto) {}
