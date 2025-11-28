import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, ValidateIf } from 'class-validator';
import { EstadoActividadEnum } from '../application/enums/estado-actividad.enum';

export class CreateActividadDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  idOrdenServicio: number;

  // MODO DUAL: Catálogo XOR Manual
  @ValidateIf((o) => !o.descripcionManual)
  @IsOptional()
  @IsInt()
  @IsPositive()
  idActividadCatalogo?: number;

  @ValidateIf((o) => !o.idActividadCatalogo)
  @IsOptional()
  @IsString()
  descripcionManual?: string;

  // Sistema REQUERIDO si modo manual
  @ValidateIf((o) => o.descripcionManual && !o.idActividadCatalogo)
  @IsNotEmpty({ message: 'sistema es requerido en modo manual' })
  @IsString()
  @MaxLength(100)
  sistema?: string;

  @IsOptional()
  @IsInt()
  @IsPositive({ message: 'ordenSecuencia debe ser > 0' })
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
  @IsPositive({ message: 'tiempoEjecucionMinutos debe ser > 0' })
  tiempoEjecucionMinutos?: number;

  @IsOptional()
  @IsBoolean()
  requiereEvidencia?: boolean;

  @IsOptional()
  @IsBoolean()
  evidenciaCapturada?: boolean;
}

