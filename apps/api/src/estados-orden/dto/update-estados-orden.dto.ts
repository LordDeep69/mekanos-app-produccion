import { PartialType } from '@nestjs/swagger';
import { CreateEstadosOrdenDto } from './create-estados-orden.dto';

/**
 * DTO para actualizar estados_orden
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateEstadosOrdenDto extends PartialType(CreateEstadosOrdenDto) {}
