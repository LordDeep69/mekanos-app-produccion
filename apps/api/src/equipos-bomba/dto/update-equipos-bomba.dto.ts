import { PartialType } from '@nestjs/swagger';
import { CreateEquiposBombaDto } from './create-equipos-bomba.dto';

/**
 * DTO para actualizar equipos_bomba
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateEquiposBombaDto extends PartialType(CreateEquiposBombaDto) {}
