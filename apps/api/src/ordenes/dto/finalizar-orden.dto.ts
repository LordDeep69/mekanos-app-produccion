import { IsOptional, IsString } from 'class-validator';

/**
 * DTO para finalizar orden con observaciones
 */
export class FinalizarOrdenDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}
