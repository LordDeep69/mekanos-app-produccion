import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO: Finalizar orden de servicio
 */
export class FinalizarOrdenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  observaciones_cierre: string;
}
