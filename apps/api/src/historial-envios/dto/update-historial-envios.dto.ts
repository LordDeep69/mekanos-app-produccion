import { PartialType } from '@nestjs/swagger';
import { CreateHistorialEnviosDto } from './create-historial-envios.dto';

/**
 * DTO para actualizar historial_envios
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateHistorialEnviosDto extends PartialType(CreateHistorialEnviosDto) {}
