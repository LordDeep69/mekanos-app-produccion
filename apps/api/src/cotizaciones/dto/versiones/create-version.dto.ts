import { IsInt, IsPositive, IsString, MinLength } from 'class-validator';

/**
 * CreateVersionDto
 * FASE 4.8: DTO crear versión cotización
 */
export class CreateVersionDto {
  @IsString()
  @MinLength(10, { message: 'Motivo cambio debe tener mínimo 10 caracteres' })
  motivo_cambio!: string;

  @IsInt()
  @IsPositive()
  creada_por!: number;
}
