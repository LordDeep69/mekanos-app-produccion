import { PartialType } from '@nestjs/swagger';
import { CreateEquiposGeneradorDto } from './create-equipos-generador.dto';

/**
 * DTO para actualizar equipos_generador
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateEquiposGeneradorDto extends PartialType(CreateEquiposGeneradorDto) {}
