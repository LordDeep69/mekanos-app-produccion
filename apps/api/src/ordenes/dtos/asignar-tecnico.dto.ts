import { IsInt } from 'class-validator';

/**
 * DTO: Asignar técnico a orden
 */
export class AsignarTecnicoDto {
  @IsInt()
  id_tecnico: number;
}
