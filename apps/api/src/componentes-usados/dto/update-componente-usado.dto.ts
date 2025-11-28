import { PartialType } from '@nestjs/swagger';
import { CreateComponenteUsadoDto } from './create-componente-usado.dto';

/**
 * DTO para actualizar componente usado - REFACTORIZADO
 * Tabla 12/14 - FASE 3 - camelCase
 * Todos los campos son opcionales (PartialType)
 */
export class UpdateComponenteUsadoDto extends PartialType(CreateComponenteUsadoDto) {}
