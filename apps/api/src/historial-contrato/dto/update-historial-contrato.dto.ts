import { PartialType } from '@nestjs/swagger';
import { CreateHistorialContratoDto } from './create-historial-contrato.dto';

/**
 * DTO para actualizar historial_contrato
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateHistorialContratoDto extends PartialType(CreateHistorialContratoDto) {}
