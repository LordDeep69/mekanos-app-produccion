import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO para programar una orden
 */
export class ProgramarOrdenDto {
  @IsDateString()
  fechaProgramada!: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
