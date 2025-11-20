import { PartialType } from '@nestjs/swagger';
import { CreatePlantillasInformeDto } from './create-plantillas-informe.dto';

/**
 * DTO para actualizar plantillas_informe
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdatePlantillasInformeDto extends PartialType(CreatePlantillasInformeDto) {}
