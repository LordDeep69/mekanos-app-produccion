import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { EstadoActividadEnum } from '../application/enums/estado-actividad.enum';

export class UpdateActividadDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  idOrdenServicio?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  idActividadCatalogo?: number;

  @IsOptional()
  @IsString()
  descripcionManual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sistema?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  ordenSecuencia?: number;

  @IsOptional()
  @IsEnum(EstadoActividadEnum)
  estado?: EstadoActividadEnum;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  ejecutada?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  ejecutadaPor?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  tiempoEjecucionMinutos?: number;

  @IsOptional()
  @IsBoolean()
  requiereEvidencia?: boolean;

  @IsOptional()
  @IsBoolean()
  evidenciaCapturada?: boolean;
}

