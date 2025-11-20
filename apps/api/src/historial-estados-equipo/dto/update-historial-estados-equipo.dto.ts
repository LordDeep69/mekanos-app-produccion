import { PartialType } from '@nestjs/swagger';
import { CreateHistorialEstadosEquipoDto } from './create-historial-estados-equipo.dto';

/**
 * DTO para actualizar historial_estados_equipo
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateHistorialEstadosEquipoDto extends PartialType(CreateHistorialEstadosEquipoDto) {}
