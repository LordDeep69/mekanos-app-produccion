import { PartialType } from '@nestjs/swagger';
import { CreateActividadesOrdenDto } from './create-actividades-orden.dto';

/**
 * DTO para actualizar actividades_orden
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateActividadesOrdenDto extends PartialType(CreateActividadesOrdenDto) {}
