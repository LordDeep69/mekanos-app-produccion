import { PartialType } from '@nestjs/swagger';
import { CreateEvidenciasOrdenDto } from './create-evidencias-orden.dto';

/**
 * DTO para actualizar evidencias_orden
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateEvidenciasOrdenDto extends PartialType(CreateEvidenciasOrdenDto) {}
