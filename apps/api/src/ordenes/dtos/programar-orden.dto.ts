import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO: Programar orden de servicio
 */
export class ProgramarOrdenDto {
  @IsDateString()
  fecha_programada: string;

  @IsString()
  @IsOptional()
  hora_programada?: string; // Format: "HH:MM:SS"
}
