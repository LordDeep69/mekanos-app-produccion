import { PartialType } from '@nestjs/swagger';
import { CreateUsuariosDto } from './create-usuarios.dto';

/**
 * DTO para actualizar usuarios
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class UpdateUsuariosDto extends PartialType(CreateUsuariosDto) {}
