import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO: Cancelar orden de servicio
 */
export class CancelarOrdenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  motivo_cancelacion: string;
}
