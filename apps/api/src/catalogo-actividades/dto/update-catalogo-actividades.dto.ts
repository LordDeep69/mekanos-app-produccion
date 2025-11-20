import { PartialType } from '@nestjs/swagger';
import { CreateCatalogoActividadesDto } from './create-catalogo-actividades.dto';

/**
 * DTO para actualizar catalogo_actividades
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateCatalogoActividadesDto extends PartialType(CreateCatalogoActividadesDto) {}
