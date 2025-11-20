import { PartialType } from '@nestjs/swagger';
import { CreateCatalogoServiciosDto } from './create-catalogo-servicios.dto';

/**
 * DTO para actualizar catalogo_servicios
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateCatalogoServiciosDto extends PartialType(CreateCatalogoServiciosDto) {}
