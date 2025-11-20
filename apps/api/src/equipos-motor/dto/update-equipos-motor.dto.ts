import { PartialType } from '@nestjs/swagger';
import { CreateEquiposMotorDto } from './create-equipos-motor.dto';

/**
 * DTO para actualizar equipos_motor
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateEquiposMotorDto extends PartialType(CreateEquiposMotorDto) {}
