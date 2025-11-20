import { PartialType } from '@nestjs/swagger';
import { CreateLecturasHorometroDto } from './create-lecturas-horometro.dto';

/**
 * DTO para actualizar lecturas_horometro
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateLecturasHorometroDto extends PartialType(CreateLecturasHorometroDto) {}
