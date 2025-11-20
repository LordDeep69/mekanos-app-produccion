import { PartialType } from '@nestjs/swagger';
import { CreateArchivosEquipoDto } from './create-archivos-equipo.dto';

/**
 * DTO para actualizar archivos_equipo
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateArchivosEquipoDto extends PartialType(CreateArchivosEquipoDto) {}
