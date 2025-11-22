import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { CategoriaServicioEnum } from './crear-catalogo-servicio.dto';

export class ActualizarCatalogoServicioDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nombreServicio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsOptional()
  @IsEnum(CategoriaServicioEnum)
  categoria?: CategoriaServicioEnum;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  tipoServicioId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  tipoEquipoId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(9999)
  duracionEstimadaHoras?: number;

  @IsOptional()
  @IsBoolean()
  requiereCertificacion?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoCertificacionRequerida?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioBase?: number;

  @IsOptional()
  @IsBoolean()
  incluyeRepuestos?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observaciones?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  modificadoPor?: number;
}
