import { IsInt, Min } from 'class-validator';

/**
 * DTO para asignar técnico a orden
 */
export class AsignarTecnicoDto {
  @IsInt()
  @Min(1)
  tecnicoId!: number;
}
