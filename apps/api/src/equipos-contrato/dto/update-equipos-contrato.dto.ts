import { PartialType } from '@nestjs/swagger';
import { CreateEquiposContratoDto } from './create-equipos-contrato.dto';

/**
 * DTO para actualizar equipos_contrato
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateEquiposContratoDto extends PartialType(CreateEquiposContratoDto) {}
